<template>
  <div class="paragraph-translation" @mouseenter="showTranslateButton = true" @mouseleave="showTranslateButton = false">
    <!-- 原文 -->
    <div class="original-text" :class="{ 'show-original': showOriginal || !translatedText }">
      {{ content }}
    </div>

    <!-- 翻译 -->
    <div v-if="enableTranslation" class="translated-text" :class="{ 'show-translation': translatedText }">
      <div v-if="isTranslating" class="translation-loading">翻译中...</div>
      <div v-else-if="translatedText">{{ translatedText }}</div>
    </div>

    <!-- 翻译按钮 -->
    <button v-if="showTranslateButton && enableTranslation && !translatedText" class="translate-button"
      @click="translateParagraph" :disabled="isTranslating">
      翻译
    </button>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { translateText } from '../utils/translation';

const props = defineProps<{
  content: string;
  model: string;
  enableTranslation: boolean;
  showOriginal: boolean;
}>();

const emit = defineEmits<{
  'update:translation': [value: string];
}>();

const showTranslateButton = ref(false);
const isTranslating = ref(false);
const translatedText = ref('');

async function translateParagraph() {
  if (isTranslating.value || !props.enableTranslation) return;

  isTranslating.value = true;
  try {
    const result = await translateText(props.content, props.model);
    translatedText.value = result;
    emit('update:translation', result);
  } catch (error) {
    console.error('翻译段落失败:', error);
  } finally {
    isTranslating.value = false;
  }
}
</script>

<style scoped>
.paragraph-translation {
  position: relative;
  padding: 0.5em;
  border-radius: 4px;
}

.paragraph-translation:hover {
  background-color: var(--hover-bg-color);
}

.original-text,
.translated-text {
  margin: 0;
  line-height: 1.6;
}

.original-text {
  display: none;
}

.original-text.show-original {
  display: block;
}

.translated-text {
  display: none;
}

.translated-text.show-translation {
  display: block;
}

.translation-loading {
  color: var(--text-secondary-color);
  font-style: italic;
}

.translate-button {
  position: absolute;
  top: 0.5em;
  right: 0.5em;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
  cursor: pointer;
  font-size: 0.9em;
  opacity: 0.8;
}

.translate-button:hover {
  opacity: 1;
}

.translate-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>