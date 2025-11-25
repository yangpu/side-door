import { browser } from 'wxt/browser';

/**
 * 屏蔽项类型
 */
export interface BlocklistItem {
  id: string;
  type: 'page' | 'domain'; // 页面或域名
  url: string; // 完整URL或域名
  title?: string; // 页面标题
  addedAt: number; // 添加时间戳
}

/**
 * 屏蔽列表管理服务
 */
export class BlocklistService {
  private static STORAGE_KEY = 'SIDE_DOOR_BLOCKLIST';

  /**
   * 获取所有屏蔽项
   */
  static async getBlocklist(): Promise<BlocklistItem[]> {
    try {
      const result = await browser.storage.local.get([this.STORAGE_KEY]);
      return result[this.STORAGE_KEY] || [];
    } catch (error) {
      console.error('获取屏蔽列表失败:', error);
      return [];
    }
  }

  /**
   * 添加屏蔽项
   */
  static async addBlocklistItem(item: Omit<BlocklistItem, 'id' | 'addedAt'>): Promise<void> {
    try {
      const blocklist = await this.getBlocklist();
      const newItem: BlocklistItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        addedAt: Date.now(),
      };
      blocklist.push(newItem);
      await browser.storage.local.set({ [this.STORAGE_KEY]: blocklist });
    } catch (error) {
      console.error('添加屏蔽项失败:', error);
      throw error;
    }
  }

  /**
   * 删除屏蔽项
   */
  static async removeBlocklistItem(id: string): Promise<void> {
    try {
      const blocklist = await this.getBlocklist();
      const filtered = blocklist.filter((item) => item.id !== id);
      await browser.storage.local.set({ [this.STORAGE_KEY]: filtered });
    } catch (error) {
      console.error('删除屏蔽项失败:', error);
      throw error;
    }
  }

  /**
   * 检查URL是否被屏蔽
   */
  static async isBlocked(url: string): Promise<boolean> {
    try {
      const blocklist = await this.getBlocklist();
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      return blocklist.some((item) => {
        if (item.type === 'page') {
          // 页面级屏蔽：完整URL匹配
          return item.url === url;
        } else {
          // 域名级屏蔽：域名匹配
          return item.url === domain;
        }
      });
    } catch (error) {
      console.error('检查屏蔽状态失败:', error);
      return false;
    }
  }

  /**
   * 查找特定URL的页面级屏蔽项
   */
  static async findPageBlockItem(url: string): Promise<BlocklistItem | null> {
    try {
      const blocklist = await this.getBlocklist();
      return blocklist.find((item) => item.type === 'page' && item.url === url) || null;
    } catch (error) {
      console.error('查找页面屏蔽项失败:', error);
      return null;
    }
  }

  /**
   * 查找特定域名的域名级屏蔽项
   */
  static async findDomainBlockItem(domain: string): Promise<BlocklistItem | null> {
    try {
      const blocklist = await this.getBlocklist();
      return blocklist.find((item) => item.type === 'domain' && item.url === domain) || null;
    } catch (error) {
      console.error('查找域名屏蔽项失败:', error);
      return null;
    }
  }

  /**
   * 获取URL的域名
   */
  static getDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * 清空屏蔽列表
   */
  static async clearBlocklist(): Promise<void> {
    try {
      await browser.storage.local.set({ [this.STORAGE_KEY]: [] });
    } catch (error) {
      console.error('清空屏蔽列表失败:', error);
      throw error;
    }
  }
}
