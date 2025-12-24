/**
 * 离线服务 - 处理离线优先的数据加载策略 (增强版)
 * 集成 Workbox Service Worker 和 IndexedDB
 */

import { indexedDB } from './indexedDB';
import type { Article } from './indexedDB';
import type { PaginatedArticles } from '../types/article';
import { offlineResourceManager } from './offlineResourceManager';

export interface NetworkStatus {
  online: boolean;
  supabaseAvailable: boolean;
  lastCheck: number;
}

class OfflineService {
  private networkStatus: NetworkStatus = {
    online: navigator.onLine,
    supabaseAvailable: true,
    lastCheck: Date.now(),
  };

  private checkInterval: number | null = null;
  private listeners: Set<(status: NetworkStatus) => void> = new Set();

  constructor() {
    // 监听在线/离线状态
    window.addEventListener('online', () => {
      this.networkStatus.online = true;
      this.checkSupabaseAvailability();
      this.notifyListeners();
      
      // 在线时尝试处理离线操作队列
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.networkStatus.online = false;
      this.networkStatus.supabaseAvailable = false;
      this.notifyListeners();
    });

    // 定期检查 Supabase 可用性
    this.startPeriodicCheck();
  }

  /**
   * 添加网络状态监听器
   */
  addNetworkStatusListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const status = this.getNetworkStatus();
    this.listeners.forEach((listener) => listener(status));
  }

  /**
   * 开始定期检查
   */
  private startPeriodicCheck(): void {
    // 每 30 秒检查一次 Supabase 可用性
    this.checkInterval = window.setInterval(() => {
      if (this.networkStatus.online) {
        this.checkSupabaseAvailability();
      }
    }, 30000);
  }

  /**
   * 停止定期检查
   */
  stopPeriodicCheck(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 检查 Supabase 可用性
   */
  async checkSupabaseAvailability(): Promise<boolean> {
    // 离线时直接返回不可用，避免发送网络请求
    if (!this.networkStatus.online) {
      const wasAvailable = this.networkStatus.supabaseAvailable;
      this.networkStatus.supabaseAvailable = false;
      this.networkStatus.lastCheck = Date.now();
      
      if (wasAvailable !== false) {
        this.notifyListeners();
      }
      return false;
    }

    try {
      // 简单的健康检查 - 尝试导入 supabase 并测试连接
      const { supabase } = await import('../utils/supabase');
      
      // 使用 AbortController 设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // 尝试执行一个简单的查询
      const { error } = await supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .limit(1)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      const wasAvailable = this.networkStatus.supabaseAvailable;
      this.networkStatus.supabaseAvailable = !error;
      this.networkStatus.lastCheck = Date.now();
      
      if (error) {
        // AbortError 是正常的超时行为，不需要警告
        if (error.message && !error.message.includes('abort')) {
          console.warn('[OfflineService] Supabase 不可用:', error.message);
        }
      }

      // 如果状态变化，通知监听器
      if (wasAvailable !== this.networkStatus.supabaseAvailable) {
        this.notifyListeners();
      }

      return this.networkStatus.supabaseAvailable;
    } catch (error) {
      const errorMessage = (error as Error).message || '';
      // AbortError 是正常的超时行为，不需要警告
      if (!errorMessage.includes('abort')) {
        console.warn('[OfflineService] 检查 Supabase 可用性失败:', errorMessage);
      }
      this.networkStatus.supabaseAvailable = false;
      this.networkStatus.lastCheck = Date.now();
      return false;
    }
  }

  /**
   * 获取网络状态
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * 是否应该使用离线数据
   */
  shouldUseOfflineData(): boolean {
    return !this.networkStatus.online || !this.networkStatus.supabaseAvailable;
  }

  /**
   * 获取文章列表（离线优先）
   */
  async getArticles(params: {
    page: number;
    pageSize: number;
  }): Promise<PaginatedArticles> {
    const cacheKey = `articles_list_${params.page}_${params.pageSize}`;

    // 1. 先尝试从缓存获取
    const cached = await indexedDB.getArticlesList(cacheKey);
    
    // 2. 如果离线或 Supabase 不可用，返回缓存数据或空数据
    if (this.shouldUseOfflineData()) {
      if (cached) {
        return {
          articles: cached.articles,
          total: cached.total,
          totalPages: Math.ceil(cached.total / params.pageSize),
          currentPage: params.page,
          pageSize: params.pageSize,
        };
      }

      // 如果没有缓存，尝试从所有本地文章中分页
      const allArticles = await indexedDB.getAllArticles();
      const start = (params.page - 1) * params.pageSize;
      const end = start + params.pageSize;
      const articles = allArticles.slice(start, end);

      return {
        articles,
        total: allArticles.length,
        totalPages: Math.ceil(allArticles.length / params.pageSize),
        currentPage: params.page,
        pageSize: params.pageSize,
      };
    }

    // 3. 在线时，优先返回缓存（快速响应），然后在后台更新
    if (cached) {
      // 异步更新缓存
      this.refreshArticlesCache(params, cacheKey).catch((error) => {
        console.error('后台更新缓存失败:', error);
      });

      return {
        articles: cached.articles,
        total: cached.total,
        totalPages: Math.ceil(cached.total / params.pageSize),
        currentPage: params.page,
        pageSize: params.pageSize,
      };
    }

    // 4. 没有缓存时，从网络获取并缓存
    return await this.fetchAndCacheArticles(params, cacheKey);
  }

  /**
   * 从网络获取文章并缓存
   */
  private async fetchAndCacheArticles(
    params: { page: number; pageSize: number },
    cacheKey: string
  ): Promise<PaginatedArticles> {
    try {
      const { ReadLaterService } = await import('../services/readLaterService');
      const result = await ReadLaterService.getArticles(params);

      // 缓存列表数据（5 分钟过期）
      await indexedDB.saveArticlesList(cacheKey, result.articles, result.total, 5 * 60 * 1000);

      // 同时缓存每篇文章的详情
      await Promise.all(
        result.articles.map((article) => indexedDB.saveArticle(article))
      );

      return result;
    } catch (error) {
      console.error('从网络获取文章失败:', error);
      throw error;
    }
  }

  /**
   * 后台刷新文章缓存
   */
  private async refreshArticlesCache(
    params: { page: number; pageSize: number },
    cacheKey: string
  ): Promise<void> {
    try {
      await this.fetchAndCacheArticles(params, cacheKey);
    } catch (error) {
      console.error('刷新缓存失败:', error);
    }
  }

  /**
   * 获取单篇文章（离线优先）
   */
  async getArticle(id: string): Promise<Article | null> {
    // 1. 先从缓存获取
    const cached = await indexedDB.getArticle(id);

    // 2. 如果离线，返回缓存数据（即使不完整）
    if (this.shouldUseOfflineData()) {
      return cached;
    }

    // 3. 检查缓存的文章是否包含完整 content 字段
    const hasContent = cached && cached.content && cached.content.length > 0;
    
    // 4. 在线时，如果有完整缓存，优先返回缓存，然后后台更新
    if (hasContent) {
      // 异步更新
      this.refreshArticleCache(id).catch((error) => {
        console.error('后台更新文章缓存失败:', error);
      });
      return cached;
    }

    // 5. 如果缓存不完整，从网络获取完整数据
    return await this.fetchAndCacheArticle(id);
  }

  /**
   * 从网络获取文章并缓存
   */
  private async fetchAndCacheArticle(id: string): Promise<Article | null> {
    try {
      const { ReadLaterService } = await import('../services/readLaterService');
      const article = await ReadLaterService.getArticleById(id);

      if (article) {
        await indexedDB.saveArticle(article);
      }

      return article;
    } catch (error) {
      console.error('从网络获取文章失败:', error);
      throw error;
    }
  }

  /**
   * 后台刷新文章缓存
   */
  private async refreshArticleCache(id: string): Promise<void> {
    try {
      await this.fetchAndCacheArticle(id);
    } catch (error) {
      console.error('刷新文章缓存失败:', error);
    }
  }

  /**
   * 预加载文章（在后台缓存文章）
   */
  async preloadArticles(articleIds: string[]): Promise<void> {
    if (this.shouldUseOfflineData()) {
      return;
    }

    // 并发限制为 3
    const concurrency = 3;
    for (let i = 0; i < articleIds.length; i += concurrency) {
      const batch = articleIds.slice(i, i + concurrency);
      await Promise.all(
        batch.map((id) =>
          this.fetchAndCacheArticle(id).catch((error) => {
            console.error(`预加载文章 ${id} 失败:`, error);
          })
        )
      );
    }
  }

  /**
   * 下载文章供离线阅读（包括图片等资源）
   */
  async downloadForOffline(article: Article, options?: {
    includeImages?: boolean;
    includeFiles?: boolean;
  }): Promise<boolean> {
    return await offlineResourceManager.downloadArticleForOffline(article, options);
  }

  /**
   * 批量下载文章供离线阅读
   */
  async batchDownloadForOffline(articles: Article[], options?: {
    includeImages?: boolean;
    includeFiles?: boolean;
    onProgress?: (current: number, total: number) => void;
  }): Promise<{ success: number; failed: number }> {
    return await offlineResourceManager.downloadArticlesForOffline(articles, {
      ...options,
      onProgress: options?.onProgress 
        ? (progress) => options.onProgress!(progress.current, progress.total)
        : undefined,
    });
  }

  /**
   * 检查文章是否可离线访问
   */
  async isAvailableOffline(articleId: string): Promise<boolean> {
    return await offlineResourceManager.isArticleAvailableOffline(articleId);
  }

  /**
   * 清理旧缓存
   */
  async cleanOldCache(maxAge = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    await indexedDB.cleanExpiredCache();
    await offlineResourceManager.cleanOldData(Math.floor(maxAge / (24 * 60 * 60 * 1000)));
  }

  /**
   * 处理离线操作队列
   */
  async processOfflineQueue(): Promise<void> {
    if (this.shouldUseOfflineData()) return;
    
    try {
      const result = await offlineResourceManager.processOfflineQueue();
      if (result.processed > 0) {
        console.log(`[OfflineService] 处理了 ${result.processed} 个离线操作`);
      }
    } catch (error) {
      console.error('[OfflineService] 处理离线队列失败:', error);
    }
  }

  /**
   * 获取离线数据统计
   */
  async getOfflineStats() {
    const stats = await indexedDB.getStats();
    const resourceStats = await offlineResourceManager.getStats();
    const networkStatus = this.getNetworkStatus();

    return {
      ...stats,
      resourceStats,
      networkStatus,
      isOffline: this.shouldUseOfflineData(),
    };
  }

  /**
   * 获取翻译（优先使用缓存）
   */
  async getTranslation(
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    translateFn?: () => Promise<string>
  ): Promise<string | null> {
    // 1. 检查缓存
    const cached = await offlineResourceManager.getCachedTranslation(
      sourceText,
      sourceLang,
      targetLang
    );
    
    if (cached) {
      return cached.translatedText;
    }

    // 2. 如果离线且没有缓存，返回 null
    if (this.shouldUseOfflineData()) {
      return null;
    }

    // 3. 在线时，调用翻译函数并缓存
    if (translateFn) {
      try {
        const translatedText = await translateFn();
        await offlineResourceManager.cacheTranslation({
          sourceText,
          translatedText,
          sourceLang,
          targetLang,
        });
        return translatedText;
      } catch (error) {
        console.error('[OfflineService] 翻译失败:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * 获取 AI 总结（优先使用缓存）
   */
  async getSummary(
    sourceText: string,
    model?: string,
    summarizeFn?: () => Promise<string>
  ): Promise<string | null> {
    // 1. 检查缓存
    const cached = await offlineResourceManager.getCachedSummary(sourceText, model);
    
    if (cached) {
      return cached.summary;
    }

    // 2. 如果离线且没有缓存，返回 null
    if (this.shouldUseOfflineData()) {
      return null;
    }

    // 3. 在线时，调用总结函数并缓存
    if (summarizeFn) {
      try {
        const summary = await summarizeFn();
        await offlineResourceManager.cacheSummary({
          sourceText,
          summary,
          model,
        });
        return summary;
      } catch (error) {
        console.error('[OfflineService] 总结失败:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * 获取图片（优先使用缓存）
   */
  async getImage(url: string): Promise<string | null> {
    return await offlineResourceManager.getImage(url);
  }

  /**
   * 获取文件（优先使用缓存）
   */
  async getFile(url: string): Promise<string | null> {
    return await offlineResourceManager.getFile(url);
  }
}

// 导出单例
export const offlineService = new OfflineService();
