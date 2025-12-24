/**
 * PWA 初始化工具 (Workbox 版本)
 * 用于在各个入口点初始化 PWA 功能
 */

import { indexedDB } from './indexedDB';
import { offlineService } from './offlineService';

export interface PWAConfig {
  enableNotifications?: boolean;
  enableBackgroundSync?: boolean;
  cacheMaxAge?: number; // 缓存最大保留时间（毫秒）
  preloadArticles?: boolean; // 是否预加载文章
  enableOfflineFirst?: boolean; // 是否启用离线优先模式
}

// 缓存类型
export type CacheType = 
  | 'static' 
  | 'pages' 
  | 'api' 
  | 'images' 
  | 'articles' 
  | 'translations' 
  | 'summaries' 
  | 'files';

// 缓存信息接口
export interface CacheInfo {
  version: string;
  caches: Record<string, {
    name: string;
    itemCount: number;
    estimatedSize: number;
    items: string[];
  }>;
  totalSize: number;
  totalItems: number;
}

class PWAInitializer {
  private config: PWAConfig = {
    enableNotifications: false,
    enableBackgroundSync: true,
    cacheMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    preloadArticles: true,
    enableOfflineFirst: true,
  };

  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  /**
   * 初始化 PWA
   */
  async init(config: Partial<PWAConfig> = {}): Promise<void> {
    this.config = { ...this.config, ...config };

    try {
      // 1. 初始化 IndexedDB
      await indexedDB.init();

      // 2. 注册 Service Worker (仅在非扩展环境)
      if ('serviceWorker' in navigator && !this.isExtensionContext()) {
        this.registration = await this.registerServiceWorker();
      } else if (this.isExtensionContext()) {
        // 扩展环境使用 IndexedDB 作为离线存储，无需 Service Worker
      } else {
        console.warn('[PWA] 浏览器不支持 Service Worker');
      }

      // 3. 请求通知权限（如果启用）
      if (this.config.enableNotifications) {
        await this.requestNotificationPermission();
      }

      // 4. 清理过期缓存
      await this.cleanOldCache();

      // 5. 监听应用更新
      this.setupUpdateListener();

      // 6. 显示安装提示 (仅在非扩展环境)
      if (!this.isExtensionContext()) {
        this.setupInstallPrompt();
      }

      // 7. 监听网络状态
      this.setupNetworkListener();

    } catch (error) {
      console.error('[PWA] 初始化失败:', error);
      // 不抛出错误，允许应用继续运行
    }
  }

  /**
   * 检查是否在扩展环境中
   */
  private isExtensionContext(): boolean {
    return !!(
      // Chrome 扩展
      (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) ||
      // Firefox 扩展
      (typeof browser !== 'undefined' && browser.runtime && browser.runtime.id) ||
      // 检查 URL 协议
      window.location.protocol === 'chrome-extension:' ||
      window.location.protocol === 'moz-extension:'
    );
  }

  /**
   * 注册 Service Worker
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    // 在扩展环境中跳过 Service Worker 注册
    if (this.isExtensionContext()) {
      return null as any;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // 检查更新
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.showUpdateNotification();
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('[PWA] Service Worker 注册失败:', error);
      throw error;
    }
  }

  /**
   * 请求通知权限
   */
  private async requestNotificationPermission(): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('[PWA] 浏览器不支持通知');
      return;
    }

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  /**
   * 清理过期缓存
   */
  private async cleanOldCache(): Promise<void> {
    try {
      await offlineService.cleanOldCache(this.config.cacheMaxAge);
    } catch (error) {
      console.error('[PWA] 清理缓存失败:', error);
    }
  }

  /**
   * 监听应用更新
   */
  private setupUpdateListener(): void {
    if (!this.registration) return;

    // 定期检查更新（每小时）
    setInterval(() => {
      this.registration?.update().catch((error) => {
        console.error('[PWA] 检查更新失败:', error);
      });
    }, 60 * 60 * 1000);
  }

  /**
   * 显示更新通知
   */
  private showUpdateNotification(): void {
    // 创建自定义事件，让页面处理更新通知
    const event = new CustomEvent('pwa-update-available', {
      detail: { registration: this.registration },
    });
    window.dispatchEvent(event);
  }

  /**
   * 设置安装提示
   */
  private setupInstallPrompt(): void {
    let deferredPrompt: any = null;

    window.addEventListener('beforeinstallprompt', (e) => {
      // 阻止默认的安装提示
      e.preventDefault();
      deferredPrompt = e;

      // 触发自定义事件
      const event = new CustomEvent('pwa-installable', {
        detail: {
          prompt: deferredPrompt,
          install: async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            return outcome;
          },
        },
      });
      window.dispatchEvent(event);
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      // 触发已安装事件
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    });
  }

  /**
   * 监听网络状态
   */
  private setupNetworkListener(): void {
    const updateOnlineStatus = () => {
      const event = new CustomEvent('pwa-network-status', {
        detail: { online: navigator.onLine },
      });
      window.dispatchEvent(event);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  /**
   * 注册后台同步
   */
  async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.config.enableBackgroundSync) return;
    if (!this.registration?.sync) {
      console.warn('[PWA] 浏览器不支持后台同步');
      return;
    }

    try {
      await this.registration.sync.register(tag);
    } catch (error) {
      console.error('[PWA] 注册后台同步失败:', error);
    }
  }

  /**
   * 发送消息到 Service Worker
   */
  async sendMessageToSW<T = any>(message: any): Promise<T | null> {
    if (!navigator.serviceWorker.controller) {
      console.warn('[PWA] Service Worker 未激活');
      return null;
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(event.data.error);
        } else {
          resolve(event.data);
        }
      };

      navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
    });
  }

  // ==================== 缓存管理 API ====================

  /**
   * 清空所有缓存
   */
  async clearAllCache(): Promise<void> {
    try {
      // 清空 Service Worker 缓存
      if (navigator.serviceWorker.controller) {
        await this.sendMessageToSW({ type: 'CLEAR_CACHE' });
      }

      // 清空 IndexedDB
      await indexedDB.clearAll();
    } catch (error) {
      console.error('[PWA] 清空缓存失败:', error);
      throw error;
    }
  }

  /**
   * 清空指定类型的缓存
   */
  async clearCacheByType(cacheType: CacheType): Promise<void> {
    try {
      await this.sendMessageToSW({
        type: 'CLEAR_CACHE_BY_TYPE',
        payload: { cacheType },
      });
    } catch (error) {
      console.error(`[PWA] 清空 ${cacheType} 缓存失败:`, error);
      throw error;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    dbStats: any;
    swCacheInfo?: CacheInfo;
    offlineStats: any;
  }> {
    const dbStats = await indexedDB.getStats();
    const offlineStats = await offlineService.getOfflineStats();

    let swCacheInfo: CacheInfo | undefined;
    try {
      if (navigator.serviceWorker.controller) {
        swCacheInfo = await this.sendMessageToSW<CacheInfo>({ type: 'GET_CACHE_INFO' });
      }
    } catch (error) {
      console.error('[PWA] 获取 SW 缓存信息失败:', error);
    }

    return {
      dbStats,
      swCacheInfo,
      offlineStats,
    };
  }

  // ==================== 文章缓存 API ====================

  /**
   * 缓存文章内容
   */
  async cacheArticle(url: string, content: string): Promise<boolean> {
    try {
      const result = await this.sendMessageToSW<{ success: boolean }>({
        type: 'CACHE_ARTICLE',
        payload: { url, content },
      });
      return result?.success ?? false;
    } catch (error) {
      console.error('[PWA] 缓存文章失败:', error);
      return false;
    }
  }

  /**
   * 预取文章列表
   */
  async prefetchArticles(urls: string[]): Promise<Array<{ url: string; success: boolean }>> {
    try {
      const result = await this.sendMessageToSW<{ results: Array<{ url: string; success: boolean }> }>({
        type: 'PREFETCH_ARTICLES',
        payload: { urls },
      });
      return result?.results ?? [];
    } catch (error) {
      console.error('[PWA] 预取文章失败:', error);
      return urls.map(url => ({ url, success: false }));
    }
  }

  /**
   * 预加载文章
   */
  async preloadArticles(articleIds: string[]): Promise<void> {
    if (!this.config.preloadArticles) return;

    try {
      await offlineService.preloadArticles(articleIds);
    } catch (error) {
      console.error('[PWA] 预加载失败:', error);
    }
  }

  // ==================== 翻译缓存 API ====================

  /**
   * 缓存翻译结果
   */
  async cacheTranslation(key: string, content: any): Promise<boolean> {
    try {
      // 同时存储到 IndexedDB 和 Service Worker 缓存
      await indexedDB.setCache(`translation:${key}`, content, 30 * 24 * 60 * 60 * 1000);
      
      if (navigator.serviceWorker.controller) {
        await this.sendMessageToSW({
          type: 'CACHE_TRANSLATION',
          payload: { key, content },
        });
      }
      return true;
    } catch (error) {
      console.error('[PWA] 缓存翻译失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存的翻译
   */
  async getCachedTranslation(key: string): Promise<any | null> {
    try {
      // 优先从 IndexedDB 获取
      const cached = await indexedDB.getCache<any>(`translation:${key}`);
      if (cached) return cached;

      // 尝试从 Service Worker 缓存获取
      if (navigator.serviceWorker.controller) {
        const result = await this.sendMessageToSW<{ data: any }>({
          type: 'GET_CACHED_TRANSLATION',
          payload: { key },
        });
        return result?.data ?? null;
      }
      return null;
    } catch (error) {
      console.error('[PWA] 获取缓存翻译失败:', error);
      return null;
    }
  }

  // ==================== 总结缓存 API ====================

  /**
   * 缓存 AI 总结结果
   */
  async cacheSummary(key: string, content: any): Promise<boolean> {
    try {
      // 同时存储到 IndexedDB 和 Service Worker 缓存
      await indexedDB.setCache(`summary:${key}`, content, 30 * 24 * 60 * 60 * 1000);
      
      if (navigator.serviceWorker.controller) {
        await this.sendMessageToSW({
          type: 'CACHE_SUMMARY',
          payload: { key, content },
        });
      }
      return true;
    } catch (error) {
      console.error('[PWA] 缓存总结失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存的总结
   */
  async getCachedSummary(key: string): Promise<any | null> {
    try {
      // 优先从 IndexedDB 获取
      const cached = await indexedDB.getCache<any>(`summary:${key}`);
      if (cached) return cached;

      // 尝试从 Service Worker 缓存获取
      if (navigator.serviceWorker.controller) {
        const result = await this.sendMessageToSW<{ data: any }>({
          type: 'GET_CACHED_SUMMARY',
          payload: { key },
        });
        return result?.data ?? null;
      }
      return null;
    } catch (error) {
      console.error('[PWA] 获取缓存总结失败:', error);
      return null;
    }
  }

  // ==================== 图片缓存 API ====================

  /**
   * 缓存图片
   */
  async cacheImage(url: string): Promise<boolean> {
    try {
      if (navigator.serviceWorker.controller) {
        const result = await this.sendMessageToSW<{ success: boolean }>({
          type: 'CACHE_IMAGE',
          payload: { url },
        });
        return result?.success ?? false;
      }
      return false;
    } catch (error) {
      console.error('[PWA] 缓存图片失败:', error);
      return false;
    }
  }

  /**
   * 批量缓存图片
   */
  async cacheImages(urls: string[]): Promise<number> {
    let successCount = 0;
    for (const url of urls) {
      if (await this.cacheImage(url)) {
        successCount++;
      }
    }
    return successCount;
  }

  // ==================== 文件缓存 API ====================

  /**
   * 缓存文件
   */
  async cacheFile(url: string): Promise<boolean> {
    try {
      if (navigator.serviceWorker.controller) {
        const result = await this.sendMessageToSW<{ success: boolean }>({
          type: 'CACHE_FILE',
          payload: { url },
        });
        return result?.success ?? false;
      }
      return false;
    } catch (error) {
      console.error('[PWA] 缓存文件失败:', error);
      return false;
    }
  }

  // ==================== 其他 API ====================

  /**
   * 强制激活新的 Service Worker
   */
  async skipWaiting(): Promise<void> {
    if (!navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * 检查是否有更新可用
   */
  hasUpdate(): boolean {
    return this.updateAvailable;
  }

  /**
   * 获取 Service Worker 注册对象
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * 检查是否在线
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * 检查 Service Worker 是否已激活
   */
  isServiceWorkerActive(): boolean {
    return !!navigator.serviceWorker.controller;
  }
}

// 导出单例
export const pwaInit = new PWAInitializer();
