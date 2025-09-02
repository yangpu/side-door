import { ref, watch } from 'vue';
import { storage, StorageKeys } from './storage.js';

// 设置对象
export const settings = {
  // 主题设置
  theme: ref<'light' | 'dark'>(storage.get(StorageKeys.READER_THEME)),

  // 字体缩放
  fontScale: ref<number>(storage.get(StorageKeys.FONT_SCALE)),

  // 翻译设置
  enableTranslation: ref<boolean>(storage.get(StorageKeys.ENABLE_TRANSLATION)),
  showOriginalText: ref<boolean>(storage.get(StorageKeys.SHOW_ORIGINAL_TEXT)),
  translationColor: ref<string>(storage.get(StorageKeys.TRANSLATION_COLOR)),

  // 摘要设置
  enableSummary: ref<boolean>(storage.get(StorageKeys.ENABLE_SUMMARY)),

  // AI 模型设置
  textModel: ref<string>(storage.get(StorageKeys.OLLAMA_MODEL)),
  visionModel: ref<string>(storage.get(StorageKeys.OLLAMA_VISION_MODEL)),

  // UI 状态
  showSettingsPanel: ref(false),
};

// 监听设置变化并保存
watch(
  () => settings.theme.value,
  (value) => {
    storage.set(StorageKeys.READER_THEME, value);
  }
);

watch(
  () => settings.fontScale.value,
  (value) => {
    storage.set(StorageKeys.FONT_SCALE, value);
    document.documentElement.style.setProperty('--font-scale', `${value}`);
  },
  { immediate: true }
);

watch(
  () => settings.enableTranslation.value,
  (value) => {
    storage.set(StorageKeys.ENABLE_TRANSLATION, value);
  }
);

watch(
  () => settings.showOriginalText.value,
  (value) => {
    storage.set(StorageKeys.SHOW_ORIGINAL_TEXT, value);
  }
);

watch(
  () => settings.translationColor.value,
  (value) => {
    storage.set(StorageKeys.TRANSLATION_COLOR, value);
    document.documentElement.style.setProperty('--translated-bg-color', value);
  },
  { immediate: true }
);

watch(
  () => settings.enableSummary.value,
  (value) => {
    storage.set(StorageKeys.ENABLE_SUMMARY, value);
  }
);

watch(
  () => settings.textModel.value,
  (value) => {
    storage.set(StorageKeys.OLLAMA_MODEL, value);
  }
);

watch(
  () => settings.visionModel.value,
  (value) => {
    storage.set(StorageKeys.OLLAMA_VISION_MODEL, value);
  }
);
