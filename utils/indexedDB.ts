/**
 * IndexedDB 封装 - 用于离线数据存储 (增强版)
 * 支持文章、翻译、总结、图片、文件等多种内容的离线缓存
 */

export interface Article {
  id: string;
  title: string;
  url: string;
  author?: string;
  published_date?: string;
  length?: number;
  language?: string;
  summary?: string;
  ai_summary?: string;
  content: string;
  content_text?: string;
  cover_image?: string;
  html_file_url?: string;
  pdf_file_url?: string;
  created_at?: string;
  updated_at?: string;
  cached_at?: number; // 缓存时间戳
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

// 翻译缓存接口
export interface TranslationCache {
  id: string;
  articleId?: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  cached_at: number;
}

// AI 总结缓存接口
export interface SummaryCache {
  id: string;
  articleId?: string;
  sourceText: string;
  summary: string;
  model?: string;
  cached_at: number;
}

// 图片缓存接口
export interface ImageCache {
  url: string;
  blob: Blob;
  mimeType: string;
  size: number;
  cached_at: number;
}

// 文件缓存接口
export interface FileCache {
  url: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  size: number;
  cached_at: number;
}

// 离线操作队列接口
export interface OfflineAction {
  id: string;
  type: 'save' | 'delete' | 'update' | 'sync';
  resource: 'article' | 'translation' | 'summary';
  data: any;
  created_at: number;
  retryCount: number;
}

class IndexedDBService {
  private dbName = 'SideDoorDB';
  private version = 2; // 升级版本号以支持新的 stores
  private db: IDBDatabase | null = null;

  // Store 名称
  private stores = {
    articles: 'articles',
    articlesList: 'articlesList',
    settings: 'settings',
    cache: 'cache',
    translations: 'translations',
    summaries: 'summaries',
    images: 'images',
    files: 'files',
    offlineActions: 'offlineActions',
  };

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      // 使用 globalThis.indexedDB 以兼容 Service Worker 和普通页面环境
      const idb = globalThis.indexedDB || (typeof self !== 'undefined' ? self.indexedDB : undefined);
      if (!idb) {
        reject(new Error('IndexedDB 不可用'));
        return;
      }
      const request = idb.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建 articles store (单篇文章详情)
        if (!db.objectStoreNames.contains(this.stores.articles)) {
          const articlesStore = db.createObjectStore(this.stores.articles, { keyPath: 'id' });
          articlesStore.createIndex('url', 'url', { unique: true });
          articlesStore.createIndex('cached_at', 'cached_at', { unique: false });
        }

        // 创建 articlesList store (文章列表缓存)
        if (!db.objectStoreNames.contains(this.stores.articlesList)) {
          db.createObjectStore(this.stores.articlesList, { keyPath: 'key' });
        }

        // 创建 settings store
        if (!db.objectStoreNames.contains(this.stores.settings)) {
          db.createObjectStore(this.stores.settings, { keyPath: 'key' });
        }

        // 创建通用 cache store
        if (!db.objectStoreNames.contains(this.stores.cache)) {
          const cacheStore = db.createObjectStore(this.stores.cache, { keyPath: 'key' });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // 创建 translations store (翻译缓存)
        if (!db.objectStoreNames.contains(this.stores.translations)) {
          const translationsStore = db.createObjectStore(this.stores.translations, { keyPath: 'id' });
          translationsStore.createIndex('articleId', 'articleId', { unique: false });
          translationsStore.createIndex('cached_at', 'cached_at', { unique: false });
        }

        // 创建 summaries store (AI 总结缓存)
        if (!db.objectStoreNames.contains(this.stores.summaries)) {
          const summariesStore = db.createObjectStore(this.stores.summaries, { keyPath: 'id' });
          summariesStore.createIndex('articleId', 'articleId', { unique: false });
          summariesStore.createIndex('cached_at', 'cached_at', { unique: false });
        }

        // 创建 images store (图片缓存)
        if (!db.objectStoreNames.contains(this.stores.images)) {
          const imagesStore = db.createObjectStore(this.stores.images, { keyPath: 'url' });
          imagesStore.createIndex('cached_at', 'cached_at', { unique: false });
        }

        // 创建 files store (文件缓存)
        if (!db.objectStoreNames.contains(this.stores.files)) {
          const filesStore = db.createObjectStore(this.stores.files, { keyPath: 'url' });
          filesStore.createIndex('cached_at', 'cached_at', { unique: false });
        }

        // 创建 offlineActions store (离线操作队列)
        if (!db.objectStoreNames.contains(this.stores.offlineActions)) {
          const actionsStore = db.createObjectStore(this.stores.offlineActions, { keyPath: 'id' });
          actionsStore.createIndex('type', 'type', { unique: false });
          actionsStore.createIndex('created_at', 'created_at', { unique: false });
        }
      };
    });
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('无法初始化 IndexedDB');
    }
    return this.db;
  }

  // ==================== 文章相关方法 ====================

  /**
   * 保存单篇文章
   * 优化：如果已有完整版本（有 content），不用列表数据（无 content）覆盖
   */
  async saveArticle(article: Article): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.articles], 'readwrite');
    const store = transaction.objectStore(this.stores.articles);

    return new Promise(async (resolve, reject) => {
      try {
        // 1. 先检查是否已有缓存
        const existingRequest = store.get(article.id);
        
        existingRequest.onsuccess = () => {
          const existing = existingRequest.result;
          
          // 2. 如果已有完整文章（有 content），且新数据没有 content，则不覆盖
          const existingHasContent = existing && existing.content && existing.content.length > 0;
          const newHasContent = article.content && article.content.length > 0;
          
          if (existingHasContent && !newHasContent) {
            resolve();
            return;
          }
          
          // 3. 否则正常保存
          const articleWithCache = {
            ...article,
            cached_at: Date.now(),
          };
          
          const putRequest = store.put(articleWithCache);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };
        
        existingRequest.onerror = () => reject(existingRequest.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取单篇文章
   */
  async getArticle(id: string): Promise<Article | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.articles], 'readonly');
    const store = transaction.objectStore(this.stores.articles);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 通过 URL 获取文章
   */
  async getArticleByUrl(url: string): Promise<Article | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.articles], 'readonly');
    const store = transaction.objectStore(this.stores.articles);
    const index = store.index('url');

    return new Promise((resolve, reject) => {
      const request = index.get(url);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 保存文章列表缓存
   */
  async saveArticlesList(
    key: string,
    articles: Article[],
    total: number,
    expiresIn = 5 * 60 * 1000 // 默认 5 分钟过期
  ): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.articlesList], 'readwrite');
    const store = transaction.objectStore(this.stores.articlesList);

    const data = {
      key,
      articles,
      total,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiresIn,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取文章列表缓存
   */
  async getArticlesList(
    key: string
  ): Promise<{ articles: Article[]; total: number; timestamp: number } | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.articlesList], 'readonly');
    const store = transaction.objectStore(this.stores.articlesList);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // 检查是否过期
        if (result.expiresAt && result.expiresAt < Date.now()) {
          // 已过期，删除缓存
          this.deleteArticlesList(key);
          resolve(null);
          return;
        }

        resolve({
          articles: result.articles,
          total: result.total,
          timestamp: result.timestamp,
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除文章列表缓存
   */
  async deleteArticlesList(key: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.articlesList], 'readwrite');
    const store = transaction.objectStore(this.stores.articlesList);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有文章（用于离线浏览）
   */
  async getAllArticles(): Promise<Article[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.articles], 'readonly');
    const store = transaction.objectStore(this.stores.articles);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除文章
   */
  async deleteArticle(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.articles], 'readwrite');
    const store = transaction.objectStore(this.stores.articles);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== 翻译缓存方法 ====================

  /**
   * 保存翻译结果
   */
  async saveTranslation(translation: Omit<TranslationCache, 'cached_at'>): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.translations], 'readwrite');
    const store = transaction.objectStore(this.stores.translations);

    const data: TranslationCache = {
      ...translation,
      cached_at: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取翻译结果
   */
  async getTranslation(id: string): Promise<TranslationCache | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.translations], 'readonly');
    const store = transaction.objectStore(this.stores.translations);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取文章的所有翻译
   */
  async getTranslationsByArticle(articleId: string): Promise<TranslationCache[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.translations], 'readonly');
    const store = transaction.objectStore(this.stores.translations);
    const index = store.index('articleId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(articleId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除翻译
   */
  async deleteTranslation(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.translations], 'readwrite');
    const store = transaction.objectStore(this.stores.translations);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有翻译
   */
  async getAllTranslations(): Promise<TranslationCache[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.translations], 'readonly');
    const store = transaction.objectStore(this.stores.translations);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== AI 总结缓存方法 ====================

  /**
   * 保存 AI 总结
   */
  async saveSummary(summary: Omit<SummaryCache, 'cached_at'>): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.summaries], 'readwrite');
    const store = transaction.objectStore(this.stores.summaries);

    const data: SummaryCache = {
      ...summary,
      cached_at: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取 AI 总结
   */
  async getSummary(id: string): Promise<SummaryCache | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.summaries], 'readonly');
    const store = transaction.objectStore(this.stores.summaries);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取文章的所有总结
   */
  async getSummariesByArticle(articleId: string): Promise<SummaryCache[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.summaries], 'readonly');
    const store = transaction.objectStore(this.stores.summaries);
    const index = store.index('articleId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(articleId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除总结
   */
  async deleteSummary(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.summaries], 'readwrite');
    const store = transaction.objectStore(this.stores.summaries);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有总结
   */
  async getAllSummaries(): Promise<SummaryCache[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.summaries], 'readonly');
    const store = transaction.objectStore(this.stores.summaries);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== 图片缓存方法 ====================

  /**
   * 保存图片
   */
  async saveImage(url: string, blob: Blob): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.images], 'readwrite');
    const store = transaction.objectStore(this.stores.images);

    const data: ImageCache = {
      url,
      blob,
      mimeType: blob.type,
      size: blob.size,
      cached_at: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取图片
   */
  async getImage(url: string): Promise<ImageCache | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.images], 'readonly');
    const store = transaction.objectStore(this.stores.images);

    return new Promise((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取图片 Blob URL
   */
  async getImageBlobUrl(url: string): Promise<string | null> {
    const image = await this.getImage(url);
    if (image) {
      return URL.createObjectURL(image.blob);
    }
    return null;
  }

  /**
   * 删除图片
   */
  async deleteImage(url: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.images], 'readwrite');
    const store = transaction.objectStore(this.stores.images);

    return new Promise((resolve, reject) => {
      const request = store.delete(url);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有图片
   */
  async getAllImages(): Promise<ImageCache[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.images], 'readonly');
    const store = transaction.objectStore(this.stores.images);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== 文件缓存方法 ====================

  /**
   * 保存文件
   */
  async saveFile(url: string, blob: Blob, filename?: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.files], 'readwrite');
    const store = transaction.objectStore(this.stores.files);

    const data: FileCache = {
      url,
      blob,
      filename: filename || url.split('/').pop() || 'file',
      mimeType: blob.type,
      size: blob.size,
      cached_at: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取文件
   */
  async getFile(url: string): Promise<FileCache | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.files], 'readonly');
    const store = transaction.objectStore(this.stores.files);

    return new Promise((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取文件 Blob URL
   */
  async getFileBlobUrl(url: string): Promise<string | null> {
    const file = await this.getFile(url);
    if (file) {
      return URL.createObjectURL(file.blob);
    }
    return null;
  }

  /**
   * 删除文件
   */
  async deleteFile(url: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.files], 'readwrite');
    const store = transaction.objectStore(this.stores.files);

    return new Promise((resolve, reject) => {
      const request = store.delete(url);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有文件
   */
  async getAllFiles(): Promise<FileCache[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.files], 'readonly');
    const store = transaction.objectStore(this.stores.files);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== 离线操作队列方法 ====================

  /**
   * 添加离线操作
   */
  async addOfflineAction(action: Omit<OfflineAction, 'id' | 'created_at' | 'retryCount'>): Promise<string> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.offlineActions], 'readwrite');
    const store = transaction.objectStore(this.stores.offlineActions);

    const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const data: OfflineAction = {
      ...action,
      id,
      created_at: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有待处理的离线操作
   */
  async getPendingOfflineActions(): Promise<OfflineAction[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.offlineActions], 'readonly');
    const store = transaction.objectStore(this.stores.offlineActions);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除离线操作
   */
  async deleteOfflineAction(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.offlineActions], 'readwrite');
    const store = transaction.objectStore(this.stores.offlineActions);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 更新离线操作重试次数
   */
  async updateOfflineActionRetry(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.offlineActions], 'readwrite');
    const store = transaction.objectStore(this.stores.offlineActions);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.retryCount++;
          const putRequest = store.put(action);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // ==================== 设置相关方法 ====================

  /**
   * 保存设置
   */
  async saveSetting<T>(key: string, value: T): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.settings], 'readwrite');
    const store = transaction.objectStore(this.stores.settings);

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取设置
   */
  async getSetting<T>(key: string): Promise<T | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.settings], 'readonly');
    const store = transaction.objectStore(this.stores.settings);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== 通用缓存方法 ====================

  /**
   * 保存到通用缓存
   */
  async setCache<T>(key: string, data: T, expiresIn = 60 * 60 * 1000): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.cache], 'readwrite');
    const store = transaction.objectStore(this.stores.cache);

    const cacheData: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiresIn,
    };

    return new Promise((resolve, reject) => {
      const request = store.put({ key, ...cacheData });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 从通用缓存获取
   */
  async getCache<T>(key: string): Promise<T | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.cache], 'readonly');
    const store = transaction.objectStore(this.stores.cache);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // 检查是否过期
        if (result.expiresAt && result.expiresAt < Date.now()) {
          this.deleteCache(key);
          resolve(null);
          return;
        }

        resolve(result.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除缓存
   */
  async deleteCache(key: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.cache], 'readwrite');
    const store = transaction.objectStore(this.stores.cache);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清理过期的缓存
   */
  async cleanExpiredCache(): Promise<void> {
    const db = await this.ensureDB();
    const now = Date.now();

    // 清理通用缓存
    const cleanStore = async (storeName: string, indexName: string) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      if (store.indexNames.contains(indexName)) {
        const index = store.index(indexName);
        const range = IDBKeyRange.upperBound(now);

        return new Promise<void>((resolve, reject) => {
          const request = index.openCursor(range);
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            } else {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      }
    };

    await cleanStore(this.stores.cache, 'expiresAt');
  }

  /**
   * 清理旧的缓存数据（按时间）
   */
  async cleanOldData(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const db = await this.ensureDB();
    const cutoff = Date.now() - maxAge;

    const cleanByTimestamp = async (storeName: string) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      if (store.indexNames.contains('cached_at')) {
        const index = store.index('cached_at');
        const range = IDBKeyRange.upperBound(cutoff);

        return new Promise<void>((resolve, reject) => {
          const request = index.openCursor(range);
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            } else {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      }
    };

    await Promise.all([
      cleanByTimestamp(this.stores.translations),
      cleanByTimestamp(this.stores.summaries),
      cleanByTimestamp(this.stores.images),
      cleanByTimestamp(this.stores.files),
    ]);
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const storeNames = Object.values(this.stores);
    const transaction = db.transaction(storeNames, 'readwrite');

    const promises = storeNames.map((storeName) => {
      return new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(storeName).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  /**
   * 清空指定类型的缓存
   */
  async clearByType(type: keyof typeof this.stores): Promise<void> {
    const db = await this.ensureDB();
    const storeName = this.stores[type];
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取数据库统计信息
   */
  async getStats(): Promise<{
    articles: number;
    cachedLists: number;
    settings: number;
    cache: number;
    translations: number;
    summaries: number;
    images: number;
    files: number;
    offlineActions: number;
    totalSize?: number;
  }> {
    const db = await this.ensureDB();

    const getCount = (storeName: string): Promise<number> => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const request = transaction.objectStore(storeName).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    };

    const [articles, cachedLists, settings, cache, translations, summaries, images, files, offlineActions] = await Promise.all([
      getCount(this.stores.articles),
      getCount(this.stores.articlesList),
      getCount(this.stores.settings),
      getCount(this.stores.cache),
      getCount(this.stores.translations),
      getCount(this.stores.summaries),
      getCount(this.stores.images),
      getCount(this.stores.files),
      getCount(this.stores.offlineActions),
    ]);

    // 估算存储大小
    let totalSize: number | undefined;
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        totalSize = estimate.usage;
      }
    } catch (e) {
      // 忽略错误
    }

    return { 
      articles, 
      cachedLists, 
      settings, 
      cache, 
      translations, 
      summaries, 
      images, 
      files, 
      offlineActions,
      totalSize,
    };
  }
}

// 导出单例
export const indexedDB = new IndexedDBService();
