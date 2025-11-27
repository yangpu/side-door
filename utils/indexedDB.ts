/**
 * IndexedDB 封装 - 用于离线数据存储
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

class IndexedDBService {
  private dbName = 'SideDoorDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  // Store 名称
  private stores = {
    articles: 'articles',
    articlesList: 'articlesList',
    settings: 'settings',
    cache: 'cache',
  };

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.version);

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
    const transaction = db.transaction([this.stores.cache], 'readwrite');
    const store = transaction.objectStore(this.stores.cache);
    const index = store.index('expiresAt');

    const now = Date.now();
    const range = IDBKeyRange.upperBound(now);

    return new Promise((resolve, reject) => {
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
   * 获取数据库统计信息
   */
  async getStats(): Promise<{
    articles: number;
    cachedLists: number;
    settings: number;
    cache: number;
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

    const [articles, cachedLists, settings, cache] = await Promise.all([
      getCount(this.stores.articles),
      getCount(this.stores.articlesList),
      getCount(this.stores.settings),
      getCount(this.stores.cache),
    ]);

    return { articles, cachedLists, settings, cache };
  }
}

// 导出单例
export const indexedDB = new IndexedDBService();
