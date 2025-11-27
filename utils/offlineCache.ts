/**
 * 离线缓存辅助工具
 * 用于在扩展的各个部分保存和获取离线数据
 */

import { browser } from 'wxt/browser';
import type { Article } from '../types/article';

export class OfflineCache {
  /**
   * 保存文章到离线缓存（通过 background script）
   */
  static async saveArticle(article: Article): Promise<boolean> {
    try {
      // 如果在扩展环境中，通过 background script 保存
      if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
        const response = await browser.runtime.sendMessage({
          type: 'SAVE_ARTICLE_OFFLINE',
          payload: { article },
        });
        return response.success;
      }

      // 如果在网页环境中，直接使用 IndexedDB
      const { indexedDB } = await import('./indexedDB');
      await indexedDB.saveArticle(article);
      return true;
    } catch (error) {
      console.error('保存离线文章失败:', error);
      return false;
    }
  }

  /**
   * 从离线缓存获取文章（通过 background script）
   */
  static async getArticle(articleId: string): Promise<Article | null> {
    try {
      // 如果在扩展环境中，通过 background script 获取
      if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
        const response = await browser.runtime.sendMessage({
          type: 'GET_ARTICLE_OFFLINE',
          payload: { articleId },
        });
        return response.success ? response.article : null;
      }

      // 如果在网页环境中，直接使用 IndexedDB
      const { indexedDB } = await import('./indexedDB');
      return await indexedDB.getArticle(articleId);
    } catch (error) {
      console.error('获取离线文章失败:', error);
      return null;
    }
  }

  /**
   * 批量保存文章到离线缓存
   */
  static async saveArticles(articles: Article[]): Promise<number> {
    let successCount = 0;
    for (const article of articles) {
      const success = await this.saveArticle(article);
      if (success) successCount++;
    }
    return successCount;
  }

  /**
   * 检查文章是否已缓存
   */
  static async isArticleCached(articleId: string): Promise<boolean> {
    const article = await this.getArticle(articleId);
    return article !== null;
  }

  /**
   * 获取离线缓存统计信息
   */
  static async getCacheStats(): Promise<{
    articles: number;
    totalSize?: number;
  }> {
    try {
      const { indexedDB } = await import('./indexedDB');
      const stats = await indexedDB.getStats();
      return {
        articles: stats.articles,
      };
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      return { articles: 0 };
    }
  }

  /**
   * 清空离线缓存
   */
  static async clearCache(): Promise<boolean> {
    try {
      const { indexedDB } = await import('./indexedDB');
      await indexedDB.clearAll();
      return true;
    } catch (error) {
      console.error('清空缓存失败:', error);
      return false;
    }
  }
}
