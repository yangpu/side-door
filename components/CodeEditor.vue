<template>
  <div class="code-editor" :class="{ 'is-editing': isEditing }">
    <!-- 代码显示模式 -->
    <div v-if="!isEditing" class="code-display">
      <div class="code-header">
        <span v-if="language" class="language-label">{{ language }}</span>
        <div class="code-actions">
          <button class="action-btn" @click="copyCode" :disabled="isCopying">
            <span v-if="isCopying">已复制</span>
            <span v-else>复制</span>
          </button>
          <button class="action-btn" @click="startEditing">
            编辑
          </button>
        </div>
      </div>
      <pre><code :class="codeClass" v-html="highlightedCode"></code></pre>
    </div>

    <!-- 代码编辑模式 -->
    <div v-else class="code-edit-mode">
      <div class="edit-header">
        <input v-model="editingLanguage" class="language-input" placeholder="输入语言（如：javascript, python）" />
        <div class="edit-actions">
          <button class="action-btn save-btn" @click="saveChanges">
            保存
          </button>
          <button class="action-btn cancel-btn" @click="cancelEditing">
            取消
          </button>
        </div>
      </div>
      <textarea ref="editor" v-model="editingContent" class="code-textarea" spellcheck="false"
        @keydown.tab.prevent="handleTab"></textarea>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import hljs from 'highlight.js';

const props = defineProps<{
  code: string;
  language?: string;
}>();

const emit = defineEmits<{
  (e: 'update:code', value: string): void;
  (e: 'update:language', value: string): void;
}>();

// 状态
const isEditing = ref(false);
const isCopying = ref(false);
const editingContent = ref(props.code);
const editingLanguage = ref(props.language || '');
const editor = ref<HTMLTextAreaElement | null>(null);

// 计算属性
const codeClass = computed(() => {
  return props.language ? `language-${props.language}` : '';
});

const highlightedCode = computed(() => {
  if (!props.code) return '';

  try {
    if (props.language) {
      return hljs.highlight(props.code, { language: props.language }).value;
    } else {
      return hljs.highlightAuto(props.code).value;
    }
  } catch (error) {
    console.warn('代码高亮失败:', error);
    return props.code;
  }
});

// 复制代码
async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.code);
    isCopying.value = true;
    setTimeout(() => {
      isCopying.value = false;
    }, 2000);
  } catch (error) {
    console.error('复制失败:', error);
  }
}

// 开始编辑
function startEditing() {
  editingContent.value = props.code;
  editingLanguage.value = props.language || '';
  isEditing.value = true;
  // 等待 DOM 更新后聚焦
  nextTick(() => {
    if (editor.value) {
      editor.value.focus();
    }
  });
}

// 保存更改
function saveChanges() {
  emit('update:code', editingContent.value);
  if (editingLanguage.value !== props.language) {
    emit('update:language', editingLanguage.value);
  }
  isEditing.value = false;
}

// 取消编辑
function cancelEditing() {
  editingContent.value = props.code;
  editingLanguage.value = props.language || '';
  isEditing.value = false;
}

// 处理Tab键
function handleTab(e: KeyboardEvent) {
  const target = e.target as HTMLTextAreaElement;
  const start = target.selectionStart;
  const end = target.selectionEnd;

  // 插入两个空格
  editingContent.value = editingContent.value.substring(0, start) + '  ' +
    editingContent.value.substring(end);

  // 移动光标位置
  nextTick(() => {
    target.selectionStart = target.selectionEnd = start + 2;
  });
}

// 自动调整文本框高度
function adjustTextareaHeight() {
  if (editor.value) {
    editor.value.style.height = 'auto';
    editor.value.style.height = editor.value.scrollHeight + 'px';
  }
}

// 监听编辑内容变化
watch(editingContent, () => {
  nextTick(adjustTextareaHeight);
});

onMounted(() => {
  if (editor.value) {
    adjustTextareaHeight();
  }
});
</script>

<style scoped>
.code-editor {
  margin: 1em 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.code-header,
.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5em 1em;
  background-color: var(--code-header-bg-color);
  border-bottom: 1px solid var(--border-color);
}

.language-label {
  font-size: 0.9em;
  color: var(--text-secondary-color);
  text-transform: lowercase;
}

.code-actions,
.edit-actions {
  display: flex;
  gap: 0.5em;
}

.action-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
  font-size: 0.9em;
  cursor: pointer;
}

.action-btn:hover {
  opacity: 0.9;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-btn {
  background-color: var(--primary-color);
}

pre {
  margin: 0;
  padding: 1em;
  background-color: var(--code-bg-color);
  overflow-x: auto;
}

code {
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
  line-height: 1.5;
}

.code-edit-mode {
  background-color: var(--code-bg-color);
}

.language-input {
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg-color);
  color: var(--text-color);
  font-size: 0.9em;
  width: 200px;
}

.code-textarea {
  width: 100%;
  min-height: 100px;
  padding: 1em;
  border: none;
  background-color: var(--code-bg-color);
  color: var(--text-color);
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
  line-height: 1.5;
  resize: none;
  outline: none;
}

.code-textarea:focus {
  outline: none;
}
</style>