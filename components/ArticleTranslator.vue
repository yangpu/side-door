<template>
  <div class="article-translator">
    <!-- 标题翻译 -->
    <div v-if="title" class="title-translation">
      <h1>{{ isTranslatedTitle ? translatedTitle : title }}</h1>
      <button @click="translateTitle" :disabled="isTranslatingTitle">
        {{ isTranslatingTitle ? '翻译中...' : '翻译标题' }}
      </button>
    </div>

    <!-- 摘要翻译 -->
    <div v-if="excerpt" class="excerpt-translation">
      <p>{{ isTranslatedExcerpt ? translatedExcerpt : excerpt }}</p>
      <button @click="translateExcerpt" :disabled="isTranslatingExcerpt">
        {{ isTranslatingExcerpt ? '翻译中...' : '翻译摘要' }}
      </button>
    </div>

    <!-- 段落翻译 -->
    <div class="content-translation">
      <template v-for="(paragraph, index) in paragraphs" :key="index">
        <ParagraphTranslation :content="paragraph" :model="ollamaModel" :enable-translation="enableTranslation"
          :show-original="showOriginalText" @update:translation="updateParagraphTranslation(index, $event)" />
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import ParagraphTranslation from './ParagraphTranslation.vue';
import { translateText } from '../utils/translation';

const props = defineProps<{
  title: string;
  excerpt: string;
  content: string;
  ollamaModel: string;
  enableTranslation: boolean;
  showOriginalText: boolean;
}>();

const emit = defineEmits<{
  'update:translatedTitle': [value: string];
  'update:translatedExcerpt': [value: string];
  'update:isTranslatedTitle': [value: boolean];
  'update:isTranslatedExcerpt': [value: boolean];
}>();

// 翻译状态
const isTranslatingTitle = ref(false);
const isTranslatingExcerpt = ref(false);
const translatedTitle = ref('');
const translatedExcerpt = ref('');
const isTranslatedTitle = ref(false);
const isTranslatedExcerpt = ref(false);

// 将内容分割成段落
const paragraphs = computed(() => {
  return props.content
    .split('\n')
    .filter(p => p.trim())
    .map(p => p.trim());
});

// 翻译标题
async function translateTitle() {
  if (!props.title || isTranslatingTitle.value) return;

  isTranslatingTitle.value = true;
  try {
    const result = await translateText(props.title, props.ollamaModel);
    translatedTitle.value = result;
    isTranslatedTitle.value = true;
    emit('update:translatedTitle', result);
    emit('update:isTranslatedTitle', true);
  } catch (error) {
    console.error('翻译标题失败:', error);
  } finally {
    isTranslatingTitle.value = false;
  }
}

// 翻译摘要
async function translateExcerpt() {
  if (!props.excerpt || isTranslatingExcerpt.value) return;

  isTranslatingExcerpt.value = true;
  try {
    const result = await translateText(props.excerpt, props.ollamaModel);
    translatedExcerpt.value = result;
    isTranslatedExcerpt.value = true;
    emit('update:translatedExcerpt', result);
    emit('update:isTranslatedExcerpt', true);
  } catch (error) {
    console.error('翻译摘要失败:', error);
  } finally {
    isTranslatingExcerpt.value = false;
  }
}

// 更新段落翻译
function updateParagraphTranslation(index: number, translation: string) {
  // 这里可以添加段落翻译的状态管理逻辑
  console.log(`段落 ${index} 翻译完成:`, translation);
}
</script>

<style scoped>
.article-translator {
  width: 100%;
}

.title-translation,
.excerpt-translation {
  margin-bottom: 1em;
}

.content-translation {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

button {
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
  cursor: pointer;
  font-size: 0.9em;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}
</style>