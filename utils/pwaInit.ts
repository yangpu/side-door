/**
 * PWA 初始化工具
 * 用于在各个入口点初始化 PWA 功能
 */

import { indexedDB } from './indexedDB';
import { offlineService } from './offlineService';

export interface PWAConfig {
  enableNotifications?: boolean;
  enableBackgroundSync?: boolean;
  cacheMaxAge?: number; // 缓存最大保留时间（毫秒）
  preloadArticles?: boolean; // 是否预加载文章
}

class PWAInitializer {
  private config: PWAConfig = {
    enableNotifications: false,
    enableBackgroundSync: true,
    cacheMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    preloadArticles: true,
  };

  private registration: ServiceWorkerRegistration | null = null;

  /**
   * 初始化 PWA
   */
  async init(config: Partial<PWAConfig> = {}): Promise<void> {
    this.config = { ...this.config, ...config };

    // console.log('[PWA] 开始初始化...');

    try {
      // 1. 初始化 IndexedDB
      await indexedDB.init();
      // console.log('[PWA] IndexedDB 初始化完成');

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

      // console.log('[PWA] 初始化完成');
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
      // 扩展已有 background service worker，无需额外注册
      return null as any;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // console.log('[PWA] Service Worker 已注册:', registration.scope);

      // 检查更新
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // console.log('[PWA] 新版本可用');
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
      const permission = await Notification.requestPermission();
      // console.log('[PWA] 通知权限:', permission);
    }
  }

  /**
   * 清理过期缓存
   */
  private async cleanOldCache(): Promise<void> {
    try {
      await offlineService.cleanOldCache(this.config.cacheMaxAge);
      // console.log('[PWA] 已清理过期缓存');
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
    // 可以在这里显示一个提示条或对话框
    // console.log('[PWA] 显示更新通知');

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

      // console.log('[PWA] 可以安装应用');

      // 触发自定义事件
      const event = new CustomEvent('pwa-installable', {
        detail: {
          prompt: deferredPrompt,
          install: async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            // console.log('[PWA] 安装结果:', outcome);
            deferredPrompt = null;
          },
        },
      });
      window.dispatchEvent(event);
    });

    window.addEventListener('appinstalled', () => {
      // console.log('[PWA] 应用已安装');
      deferredPrompt = null;
    });
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
      // console.log('[PWA] 后台同步已注册:', tag);
    } catch (error) {
      console.error('[PWA] 注册后台同步失败:', error);
    }
  }

  /**
   * 发送消息到 Service Worker
   */
  async sendMessageToSW(message: any): Promise<any> {
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

      // console.log('[PWA] 所有缓存已清空');
    } catch (error) {
      console.error('[PWA] 清空缓存失败:', error);
      throw error;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    dbStats: any;
    swCacheSize?: number;
    offlineStats: any;
  }> {
    const dbStats = await indexedDB.getStats();
    const offlineStats = await offlineService.getOfflineStats();

    let swCacheSize: number | undefined;
    try {
      if (navigator.serviceWorker.controller) {
        const result = await this.sendMessageToSW({ type: 'GET_CACHE_SIZE' });
        swCacheSize = result?.size;
      }
    } catch (error) {
      console.error('[PWA] 获取 SW 缓存大小失败:', error);
    }

    return {
      dbStats,
      swCacheSize,
      offlineStats,
    };
  }

  /**
   * 强制激活新的 Service Worker
   */
  async skipWaiting(): Promise<void> {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * 预加载文章
   */
  async preloadArticles(articleIds: string[]): Promise<void> {
    if (!this.config.preloadArticles) return;

    try {
      await offlineService.preloadArticles(articleIds);
      // console.log('[PWA] 预加载完成');
    } catch (error) {
      console.error('[PWA] 预加载失败:', error);
    }
  }

  /**
   * 获取 Service Worker 注册对象
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }
}

// 导出单例
export const pwaInit = new PWAInitializer();
