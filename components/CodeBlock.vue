<template>
  <div class="code-block" :class="{ 'show-line-numbers': showLineNumbers }">
    <!-- 代码块头部 -->
    <div class="code-header">
      <div class="language-tag" v-if="language">{{ language }}</div>
      <div class="actions">
        <button v-if="showLineNumbers" class="action-btn" @click="toggleLineNumbers" title="切换行号">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="9" y1="6" x2="20" y2="6"></line>
            <line x1="9" y1="12" x2="20" y2="12"></line>
            <line x1="9" y1="18" x2="20" y2="18"></line>
            <line x1="5" y1="6" x2="5" y2="6"></line>
            <line x1="5" y1="12" x2="5" y2="12"></line>
            <line x1="5" y1="18" x2="5" y2="18"></line>
          </svg>
        </button>
        <button class="action-btn" @click="copyCode" :title="copyStatus">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- 代码内容 -->
    <div class="code-content" ref="codeContainer">
      <pre><code :class="codeClass" ref="codeElement"><slot></slot></code></pre>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import hljs from 'highlight.js';

const props = defineProps<{
  language?: string;
  showLineNumbers?: boolean;
}>();

const codeElement = ref<HTMLElement | null>(null);
const codeContainer = ref<HTMLElement | null>(null);
const hasLineNumbers = ref(props.showLineNumbers ?? true);
const copyStatus = ref('复制代码');

const codeClass = computed(() => {
  return props.language ? `language-${props.language}` : '';
});

// 初始化代码高亮
onMounted(() => {
  if (codeElement.value) {
    hljs.highlightElement(codeElement.value);
    if (hasLineNumbers.value) {
      addLineNumbers();
    }
  }
});

// 添加行号
function addLineNumbers() {
  if (!codeElement.value) return;

  const lines = codeElement.value.textContent?.split('\n') || [];
  const lineNumbers = document.createElement('div');
  lineNumbers.className = 'line-numbers';

  lines.forEach((_, index) => {
    const span = document.createElement('span');
    span.textContent = (index + 1).toString();
    lineNumbers.appendChild(span);
  });

  codeContainer.value?.insertBefore(lineNumbers, codeElement.value);
}

// 切换行号显示
function toggleLineNumbers() {
  hasLineNumbers.value = !hasLineNumbers.value;
  const lineNumbers = codeContainer.value?.querySelector('.line-numbers');
  if (lineNumbers) {
    lineNumbers.remove();
  }
  if (hasLineNumbers.value) {
    addLineNumbers();
  }
}

// 复制代码
async function copyCode() {
  if (!codeElement.value?.textContent) return;

  try {
    await navigator.clipboard.writeText(codeElement.value.textContent);
    copyStatus.value = '已复制！';
    setTimeout(() => {
      copyStatus.value = '复制代码';
    }, 2000);
  } catch (error) {
    console.error('复制失败:', error);
    copyStatus.value = '复制失败';
  }
}

// 监听语言变化
watch(() => props.language, () => {
  if (codeElement.value) {
    hljs.highlightElement(codeElement.value);
  }
});
</script>

<style scoped>
.code-block {
  margin: 1em 0;
  border-radius: 8px;
  background: var(--code-bg-color);
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--code-header-bg-color);
  border-bottom: 1px solid var(--border-color);
}

.language-tag {
  font-size: 0.9em;
  color: var(--text-secondary-color);
  text-transform: uppercase;
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px;
  background: none;
  border: none;
  color: var(--text-secondary-color);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--hover-bg-color);
  color: var(--text-color);
}

.code-content {
  position: relative;
  padding: 16px;
  overflow-x: auto;
}

pre {
  margin: 0;
  padding: 0;
  background: none;
}

code {
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
  line-height: 1.5;
  tab-size: 2;
}

.line-numbers {
  position: absolute;
  left: 0;
  top: 16px;
  padding: 0 8px;
  color: var(--text-secondary-color);
  border-right: 1px solid var(--border-color);
  user-select: none;
}

.line-numbers span {
  display: block;
  text-align: right;
  font-size: 0.9em;
  line-height: 1.5;
}

.show-line-numbers pre {
  margin-left: 3.5em;
}

:deep(.hljs) {
  background: none;
  padding: 0;
}
</style>