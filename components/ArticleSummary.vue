<template>
  <div v-if="settings.enableSummary.value" class="article-summary">
    <h3 @click="regenerateSummary" class="clickable" title="点击重新生成总结">总结</h3>
    <p v-if="summary" v-html="summary"></p>
    <p v-else-if="isGenerating" class="loading">{{ loadingText }}</p>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { settings } from '../utils/settings';
import { getModelService, type ModelResponse, type AbortableAsyncGenerator } from '../utils/modelService';
import { marked } from 'marked';

interface Article {
  title: string;
  content: any;
  textContent: string;
}

const props = defineProps<{
  article: Article;
}>();

const MIN_CONTENT_LENGTH = 100;
const content = ref('');
const summary = ref('');
const isGenerating = ref(false);
const loadingText = ref('正在生成总结...');

const modelService = getModelService();
let currentGenerator: AbortableAsyncGenerator<ModelResponse> | null = null;

async function generateSummary() {
  content.value = props.article.textContent;

  if (isGenerating.value || !settings.enableSummary.value || !settings.textModel.value || content.value.length < MIN_CONTENT_LENGTH) return;

  // 取消之前的请求
  abortSummary();

  isGenerating.value = true;
  loadingText.value = '正在生成总结...';
  summary.value = '';

  try {
    currentGenerator = await modelService.chating({
      model: settings.textModel.value,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的文章摘要生成器，请为以下内容生成一个简短中文概要。必须中文返回，长度不要超过300字，必须用markdown格式返回，前后不要添加任何其他内容:'
        },
        {
          role: 'user',
          content: props.article.textContent
        }
      ],
    });

    let partialSummary = '';

    for await (const part of currentGenerator.generator) {
      if (isGenerating.value) {
        isGenerating.value = false;
      }
      partialSummary += part.content;
      summary.value = partialSummary;
    }

    // 去掉可能存在的markdown标记
    const cleanSummary = partialSummary.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    summary.value = await marked(cleanSummary);

  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('生成摘要失败:', error);
      summary.value = '生成摘要失败，请稍后重试';
    }
  } finally {
    isGenerating.value = false;
    currentGenerator = null;
  }
}

function regenerateSummary() {
  isGenerating.value = false;

  generateSummary();
}

function abortSummary() {
  if (currentGenerator) {
    currentGenerator.abort();
    currentGenerator = null;
  }
}

// 当内容或模型变化时重新生成摘要
watch(
  [() => settings.textModel.value, () => settings.enableSummary.value, () => props.article],
  () => {
    if (settings.enableSummary.value) {
      generateSummary();
    } else {
      abortSummary();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.article-summary {
  margin: 1.5em 0;
  padding: 1em;
  background-color: var(--summary-bg-color);
  border-radius: 4px;
}

.article-summary h3 {
  margin: 0 0 0.5em;
  font-size: 1.2em;
  color: var(--text-color);
}

.article-summary p {
  margin: 0;
  line-height: 1.6;
  color: var(--text-color);
}

.loading {
  color: var(--secondary-text-color);
  font-style: italic;
}

.clickable {
  cursor: pointer;
}

.clickable:hover {
  opacity: 0.8;
}
</style>