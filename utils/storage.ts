// 存储键名常量
export const StorageKeys = {
  ENABLE_TRANSLATION: 'ENABLE_TRANSLATION',
  SHOW_ORIGINAL_TEXT: 'SHOW_ORIGINAL_TEXT',
  READER_THEME: 'READER_THEME',
  ENABLE_SUMMARY: 'ENABLE_SUMMARY',
  FONT_SCALE: 'FONT_SCALE',
  OLLAMA_MODEL: 'OLLAMA_MODEL',
  OLLAMA_VISION_MODEL: 'OLLAMA_VISION_MODEL',
  TRANSLATION_COLOR: 'TRANSLATION_COLOR',
} as const;

// 存储默认值
const DefaultValues = {
  [StorageKeys.ENABLE_TRANSLATION]: true as boolean,
  [StorageKeys.SHOW_ORIGINAL_TEXT]: true as boolean,
  [StorageKeys.READER_THEME]: 'light' as 'light' | 'dark',
  [StorageKeys.ENABLE_SUMMARY]: false as boolean,
  [StorageKeys.FONT_SCALE]: 1 as number,
  [StorageKeys.OLLAMA_MODEL]: '' as string,
  [StorageKeys.OLLAMA_VISION_MODEL]: '' as string,
  [StorageKeys.TRANSLATION_COLOR]: '#4CAF50' as string,
} as const;

// 存储类型定义
type StorageKey = keyof typeof StorageKeys;
type StorageValue<K extends StorageKey> = (typeof DefaultValues)[K];

class StorageManager {
  private storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  // 获取存储值
  get<K extends StorageKey>(key: K): StorageValue<K> {
    const value = this.storage.getItem(StorageKeys[key]);
    if (value === null) {
      return DefaultValues[key];
    }

    try {
      // 尝试解析 JSON
      return JSON.parse(value);
    } catch {
      // 如果解析失败，返回原始值
      return value as StorageValue<K>;
    }
  }

  // 设置存储值
  set<K extends StorageKey>(key: K, value: StorageValue<K>): void {
    const valueToStore =
      typeof value === 'string' ? value : JSON.stringify(value);
    this.storage.setItem(StorageKeys[key], valueToStore);
  }

  // 删除存储值
  remove(key: StorageKey): void {
    this.storage.removeItem(StorageKeys[key]);
  }

  // 清除所有存储
  clear(): void {
    this.storage.clear();
  }

  // 获取阅读器设置
  getReaderSettings() {
    return {
      enableTranslation: this.get('ENABLE_TRANSLATION'),
      showOriginalText: this.get('SHOW_ORIGINAL_TEXT'),
      theme: this.get('READER_THEME'),
      enableSummary: this.get('ENABLE_SUMMARY'),
      fontScale: this.get('FONT_SCALE'),
      textModel: this.get('OLLAMA_MODEL'),
      visionModel: this.get('OLLAMA_VISION_MODEL'),
      translationColor: this.get('TRANSLATION_COLOR'),
    };
  }

  // 保存阅读器设置
  saveReaderSettings(
    settings: Partial<ReturnType<typeof this.getReaderSettings>>
  ) {
    Object.entries(settings).forEach(([key, value]) => {
      const storageKey = key.toUpperCase() as StorageKey;
      if (storageKey in StorageKeys) {
        this.set(storageKey, value as any);
      }
    });
  }
}

// 导出单例实例
// 使用 appStorage 名称避免与 WXT 内置 storage 冲突
export const appStorage = new StorageManager();
