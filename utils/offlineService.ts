/**
 * 离线服务 - 处理离线优先的数据加载策略
 */

import { indexedDB } from './indexedDB';
import type { Article } from './indexedDB';
import type { PaginatedArticles } from '../types/article';

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

  constructor() {
    // 监听在线/离线状态
    window.addEventListener('online', () => {
      this.networkStatus.online = true;
      this.checkSupabaseAvailability();
    });

    window.addEventListener('offline', () => {
      this.networkStatus.online = false;
      this.networkStatus.supabaseAvailable = false;
    });

    // 定期检查 Supabase 可用性
    this.startPeriodicCheck();
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
    if (!this.networkStatus.online) {
      this.networkStatus.supabaseAvailable = false;
      return false;
    }

    try {
      // 简单的健康检查 - 尝试导入 supabase 并测试连接
      const { supabase } = await import('../utils/supabase');
      
      // 尝试执行一个简单的查询
      const { error } = await supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .limit(1);

      this.networkStatus.supabaseAvailable = !error;
      this.networkStatus.lastCheck = Date.now();
      
      if (error) {
        console.warn('Supabase 不可用:', error.message);
      }

      return this.networkStatus.supabaseAvailable;
    } catch (error) {
      console.error('检查 Supabase 可用性失败:', error);
      this.networkStatus.supabaseAvailable = false;
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
    // 注意：html_file_url 和 pdf_file_url 只是链接，不算完整内容
    const hasContent = cached && cached.content && cached.content.length > 0;
    
    // 4. 在线时，如果有完整缓存，优先返回缓存，然后后台更新
    if (hasContent) {
      // 异步更新
      this.refreshArticleCache(id).catch((error) => {
        console.error('后台更新文章缓存失败:', error);
      });
      return cached;
    }

    // 5. 如果缓存不完整（只有列表数据，没有 content），从网络获取完整数据
    // 6. 没有缓存或缓存不完整时，从网络获取
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
   * 清理旧缓存
   */
  async cleanOldCache(maxAge = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    // 7 天
    await indexedDB.cleanExpiredCache();
  }

  /**
   * 获取离线数据统计
   */
  async getOfflineStats() {
    const stats = await indexedDB.getStats();
    const networkStatus = this.getNetworkStatus();

    return {
      ...stats,
      networkStatus,
      isOffline: this.shouldUseOfflineData(),
    };
  }
}

// 导出单例
export const offlineService = new OfflineService();
