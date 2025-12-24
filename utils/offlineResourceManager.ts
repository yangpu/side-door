/**
 * 离线资源管理器
 * 统一管理文章、翻译、总结、图片、文件等离线资源
 */

import { indexedDB, type Article, type TranslationCache, type SummaryCache, type ImageCache, type FileCache } from './indexedDB';
import { pwaInit } from './pwaInit';

// 资源类型
export type ResourceType = 'article' | 'translation' | 'summary' | 'image' | 'file';

// 下载进度回调
export type ProgressCallback = (progress: {
  type: ResourceType;
  current: number;
  total: number;
  url?: string;
  error?: string;
}) => void;

// 资源下载选项
export interface DownloadOptions {
  includeImages?: boolean;
  includeFiles?: boolean;
  onProgress?: ProgressCallback;
  concurrency?: number;
}

// 离线资源统计
export interface OfflineResourceStats {
  articles: {
    count: number;
    withContent: number;
    withTranslation: number;
    withSummary: number;
  };
  translations: number;
  summaries: number;
  images: {
    count: number;
    totalSize: number;
  };
  files: {
    count: number;
    totalSize: number;
  };
  totalSize?: number;
}

class OfflineResourceManager {
  private downloadQueue: Map<string, Promise<boolean>> = new Map();

  // ==================== 文章离线下载 ====================

  /**
   * 下载文章供离线阅读
   * 包括文章内容、图片、翻译、总结等
   */
  async downloadArticleForOffline(
    article: Article,
    options: DownloadOptions = {}
  ): Promise<boolean> {
    const {
      includeImages = true,
      includeFiles = true,
      onProgress,
      concurrency = 3,
    } = options;

    try {
      // 1. 保存文章基本信息
      await indexedDB.saveArticle(article);
      onProgress?.({ type: 'article', current: 1, total: 1, url: article.url });

      // 2. 下载文章中的图片
      if (includeImages && article.content) {
        const imageUrls = this.extractImageUrls(article.content);
        if (article.cover_image) {
          imageUrls.unshift(article.cover_image);
        }
        await this.downloadImages(imageUrls, onProgress, concurrency);
      }

      // 3. 下载关联文件（PDF 等）
      if (includeFiles) {
        const fileUrls: string[] = [];
        if (article.html_file_url) fileUrls.push(article.html_file_url);
        if (article.pdf_file_url) fileUrls.push(article.pdf_file_url);
        await this.downloadFiles(fileUrls, onProgress, concurrency);
      }

      return true;
    } catch (error) {
      console.error('[OfflineManager] 下载文章失败:', error);
      return false;
    }
  }

  /**
   * 批量下载文章
   */
  async downloadArticlesForOffline(
    articles: Article[],
    options: DownloadOptions = {}
  ): Promise<{ success: number; failed: number }> {
    const { onProgress, concurrency = 2 } = options;
    let success = 0;
    let failed = 0;

    // 分批处理
    for (let i = 0; i < articles.length; i += concurrency) {
      const batch = articles.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map((article, idx) =>
          this.downloadArticleForOffline(article, {
            ...options,
            onProgress: (progress) => {
              onProgress?.({
                ...progress,
                current: i + idx + 1,
                total: articles.length,
              });
            },
          })
        )
      );

      results.forEach((result) => {
        if (result) success++;
        else failed++;
      });
    }

    return { success, failed };
  }

  /**
   * 检查文章是否已离线可用
   */
  async isArticleAvailableOffline(articleId: string): Promise<boolean> {
    const article = await indexedDB.getArticle(articleId);
    return !!(article && article.content && article.content.length > 0);
  }

  /**
   * 删除文章的离线数据
   */
  async removeArticleOfflineData(articleId: string): Promise<void> {
    // 删除文章
    await indexedDB.deleteArticle(articleId);

    // 删除关联的翻译
    const translations = await indexedDB.getTranslationsByArticle(articleId);
    await Promise.all(translations.map((t: TranslationCache) => indexedDB.deleteTranslation(t.id)));

    // 删除关联的总结
    const summaries = await indexedDB.getSummariesByArticle(articleId);
    await Promise.all(summaries.map((s: SummaryCache) => indexedDB.deleteSummary(s.id)));
  }

  // ==================== 翻译缓存管理 ====================

  /**
   * 缓存翻译结果
   */
  async cacheTranslation(params: {
    articleId?: string;
    sourceText: string;
    translatedText: string;
    sourceLang: string;
    targetLang: string;
  }): Promise<string> {
    const id = this.generateTranslationId(params.sourceText, params.sourceLang, params.targetLang);
    
    await indexedDB.saveTranslation({
      id,
      articleId: params.articleId,
      sourceText: params.sourceText,
      translatedText: params.translatedText,
      sourceLang: params.sourceLang,
      targetLang: params.targetLang,
    });

    // 同时缓存到 Service Worker
    await pwaInit.cacheTranslation(id, {
      translatedText: params.translatedText,
      sourceLang: params.sourceLang,
      targetLang: params.targetLang,
    });

    return id;
  }

  /**
   * 获取缓存的翻译
   */
  async getCachedTranslation(
    sourceText: string,
    sourceLang: string,
    targetLang: string
  ): Promise<TranslationCache | null> {
    const id = this.generateTranslationId(sourceText, sourceLang, targetLang);
    return await indexedDB.getTranslation(id);
  }

  /**
   * 检查是否有缓存的翻译
   */
  async hasTranslationCache(
    sourceText: string,
    sourceLang: string,
    targetLang: string
  ): Promise<boolean> {
    const translation = await this.getCachedTranslation(sourceText, sourceLang, targetLang);
    return !!translation;
  }

  /**
   * 生成翻译缓存 ID
   */
  private generateTranslationId(sourceText: string, sourceLang: string, targetLang: string): string {
    // 使用文本的前 100 个字符和语言对生成 ID
    const textKey = sourceText.substring(0, 100);
    return `trans_${sourceLang}_${targetLang}_${this.hashString(textKey)}`;
  }

  // ==================== AI 总结缓存管理 ====================

  /**
   * 缓存 AI 总结
   */
  async cacheSummary(params: {
    articleId?: string;
    sourceText: string;
    summary: string;
    model?: string;
  }): Promise<string> {
    const id = this.generateSummaryId(params.sourceText, params.model);
    
    await indexedDB.saveSummary({
      id,
      articleId: params.articleId,
      sourceText: params.sourceText,
      summary: params.summary,
      model: params.model,
    });

    // 同时缓存到 Service Worker
    await pwaInit.cacheSummary(id, {
      summary: params.summary,
      model: params.model,
    });

    return id;
  }

  /**
   * 获取缓存的总结
   */
  async getCachedSummary(sourceText: string, model?: string): Promise<SummaryCache | null> {
    const id = this.generateSummaryId(sourceText, model);
    return await indexedDB.getSummary(id);
  }

  /**
   * 检查是否有缓存的总结
   */
  async hasSummaryCache(sourceText: string, model?: string): Promise<boolean> {
    const summary = await this.getCachedSummary(sourceText, model);
    return !!summary;
  }

  /**
   * 生成总结缓存 ID
   */
  private generateSummaryId(sourceText: string, model?: string): string {
    const textKey = sourceText.substring(0, 100);
    const modelKey = model || 'default';
    return `sum_${modelKey}_${this.hashString(textKey)}`;
  }

  // ==================== 图片缓存管理 ====================

  /**
   * 下载并缓存图片
   */
  async downloadImage(url: string): Promise<boolean> {
    // 防止重复下载
    if (this.downloadQueue.has(url)) {
      return this.downloadQueue.get(url)!;
    }

    const downloadPromise = (async () => {
      try {
        // 检查是否已缓存
        const existing = await indexedDB.getImage(url);
        if (existing) return true;

        // 下载图片
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) return false;

        const blob = await response.blob();
        await indexedDB.saveImage(url, blob);

        // 同时通知 Service Worker 缓存
        await pwaInit.cacheImage(url);

        return true;
      } catch (error) {
        console.error('[OfflineManager] 下载图片失败:', url, error);
        return false;
      } finally {
        this.downloadQueue.delete(url);
      }
    })();

    this.downloadQueue.set(url, downloadPromise);
    return downloadPromise;
  }

  /**
   * 批量下载图片
   */
  async downloadImages(
    urls: string[],
    onProgress?: ProgressCallback,
    concurrency = 3
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map(async (url, idx) => {
          const result = await this.downloadImage(url);
          onProgress?.({
            type: 'image',
            current: i + idx + 1,
            total: urls.length,
            url,
            error: result ? undefined : '下载失败',
          });
          return result;
        })
      );

      results.forEach((result) => {
        if (result) success++;
        else failed++;
      });
    }

    return { success, failed };
  }

  /**
   * 获取图片（优先使用缓存）
   */
  async getImage(url: string): Promise<string | null> {
    // 先尝试从 IndexedDB 获取
    const blobUrl = await indexedDB.getImageBlobUrl(url);
    if (blobUrl) return blobUrl;

    // 如果在线，尝试下载
    if (navigator.onLine) {
      const success = await this.downloadImage(url);
      if (success) {
        return await indexedDB.getImageBlobUrl(url);
      }
    }

    return null;
  }

  /**
   * 从 HTML 内容中提取图片 URL
   */
  extractImageUrls(html: string): string[] {
    const urls: string[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const url = match[1];
      // 过滤 data URLs 和相对路径
      if (url && url.startsWith('http') && !url.startsWith('data:')) {
        urls.push(url);
      }
    }

    return [...new Set(urls)]; // 去重
  }

  // ==================== 文件缓存管理 ====================

  /**
   * 下载并缓存文件
   */
  async downloadFile(url: string, filename?: string): Promise<boolean> {
    // 防止重复下载
    if (this.downloadQueue.has(url)) {
      return this.downloadQueue.get(url)!;
    }

    const downloadPromise = (async () => {
      try {
        // 检查是否已缓存
        const existing = await indexedDB.getFile(url);
        if (existing) return true;

        // 下载文件
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) return false;

        const blob = await response.blob();
        await indexedDB.saveFile(url, blob, filename);

        // 同时通知 Service Worker 缓存
        await pwaInit.cacheFile(url);

        return true;
      } catch (error) {
        console.error('[OfflineManager] 下载文件失败:', url, error);
        return false;
      } finally {
        this.downloadQueue.delete(url);
      }
    })();

    this.downloadQueue.set(url, downloadPromise);
    return downloadPromise;
  }

  /**
   * 批量下载文件
   */
  async downloadFiles(
    urls: string[],
    onProgress?: ProgressCallback,
    concurrency = 2
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map(async (url, idx) => {
          const result = await this.downloadFile(url);
          onProgress?.({
            type: 'file',
            current: i + idx + 1,
            total: urls.length,
            url,
            error: result ? undefined : '下载失败',
          });
          return result;
        })
      );

      results.forEach((result) => {
        if (result) success++;
        else failed++;
      });
    }

    return { success, failed };
  }

  /**
   * 获取文件（优先使用缓存）
   */
  async getFile(url: string): Promise<string | null> {
    // 先尝试从 IndexedDB 获取
    const blobUrl = await indexedDB.getFileBlobUrl(url);
    if (blobUrl) return blobUrl;

    // 如果在线，尝试下载
    if (navigator.onLine) {
      const success = await this.downloadFile(url);
      if (success) {
        return await indexedDB.getFileBlobUrl(url);
      }
    }

    return null;
  }

  // ==================== 离线操作队列 ====================

  /**
   * 添加离线操作到队列
   */
  async queueOfflineAction(
    type: 'save' | 'delete' | 'update' | 'sync',
    resource: 'article' | 'translation' | 'summary',
    data: any
  ): Promise<string> {
    return await indexedDB.addOfflineAction({ type, resource, data });
  }

  /**
   * 处理离线操作队列
   */
  async processOfflineQueue(): Promise<{ processed: number; failed: number }> {
    if (!navigator.onLine) {
      return { processed: 0, failed: 0 };
    }

    const actions = await indexedDB.getPendingOfflineActions();
    let processed = 0;
    let failed = 0;

    for (const action of actions) {
      try {
        // 根据操作类型处理
        switch (action.type) {
          case 'save':
            // 实现保存逻辑
            break;
          case 'delete':
            // 实现删除逻辑
            break;
          case 'update':
            // 实现更新逻辑
            break;
          case 'sync':
            // 实现同步逻辑
            break;
        }

        // 处理成功，删除操作
        await indexedDB.deleteOfflineAction(action.id);
        processed++;
      } catch (error) {
        console.error('[OfflineManager] 处理离线操作失败:', action.id, error);
        
        // 更新重试次数
        await indexedDB.updateOfflineActionRetry(action.id);
        
        // 如果重试次数过多，删除操作
        if (action.retryCount >= 3) {
          await indexedDB.deleteOfflineAction(action.id);
        }
        
        failed++;
      }
    }

    return { processed, failed };
  }

  // ==================== 统计和清理 ====================

  /**
   * 获取离线资源统计
   */
  async getStats(): Promise<OfflineResourceStats> {
    const dbStats = await indexedDB.getStats();
    const allArticles = await indexedDB.getAllArticles();
    const allImages = await indexedDB.getAllImages();
    const allFiles = await indexedDB.getAllFiles();

    // 统计文章详情
    const articlesWithContent = allArticles.filter(
      (a: Article) => a.content && a.content.length > 0
    ).length;

    // 获取有翻译和总结的文章数
    const translations = await indexedDB.getAllTranslations();
    const summaries = await indexedDB.getAllSummaries();
    
    const articleIdsWithTranslation = new Set(
      translations.filter((t: TranslationCache) => t.articleId).map((t: TranslationCache) => t.articleId)
    );
    const articleIdsWithSummary = new Set(
      summaries.filter((s: SummaryCache) => s.articleId).map((s: SummaryCache) => s.articleId)
    );

    // 计算图片和文件大小
    const imagesTotalSize = allImages.reduce((sum: number, img: ImageCache) => sum + img.size, 0);
    const filesTotalSize = allFiles.reduce((sum: number, file: FileCache) => sum + file.size, 0);

    return {
      articles: {
        count: dbStats.articles,
        withContent: articlesWithContent,
        withTranslation: articleIdsWithTranslation.size,
        withSummary: articleIdsWithSummary.size,
      },
      translations: dbStats.translations,
      summaries: dbStats.summaries,
      images: {
        count: dbStats.images,
        totalSize: imagesTotalSize,
      },
      files: {
        count: dbStats.files,
        totalSize: filesTotalSize,
      },
      totalSize: dbStats.totalSize,
    };
  }

  /**
   * 清理旧的离线数据
   */
  async cleanOldData(maxAgeDays = 30): Promise<void> {
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
    await indexedDB.cleanOldData(maxAge);
  }

  /**
   * 清空所有离线数据
   */
  async clearAllOfflineData(): Promise<void> {
    await indexedDB.clearAll();
    await pwaInit.clearAllCache();
  }

  /**
   * 清空指定类型的离线数据
   */
  async clearByType(type: 'articles' | 'translations' | 'summaries' | 'images' | 'files'): Promise<void> {
    await indexedDB.clearByType(type);
  }

  // ==================== 辅助方法 ====================

  /**
   * 简单的字符串哈希
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 格式化文件大小
   */
  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 导出单例
export const offlineResourceManager = new OfflineResourceManager();
