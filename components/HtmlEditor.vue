<template>
  <div class="html-editor" :class="{ 'is-editing': isEditing }">
    <!-- 预览模式 -->
    <div v-if="!isEditing" class="preview-mode">
      <div class="editor-header">
        <span class="mode-label">预览模式</span>
        <div class="editor-actions">
          <button class="action-btn" @click="copyHtml" :disabled="isCopying">
            <span v-if="isCopying">已复制</span>
            <span v-else>复制 HTML</span>
          </button>
          <button class="action-btn" @click="startEditing">
            编辑
          </button>
        </div>
      </div>
      <div class="preview-content" v-html="sanitizedHtml"></div>
    </div>

    <!-- 编辑模式 -->
    <div v-else class="edit-mode">
      <div class="editor-header">
        <span class="mode-label">编辑模式</span>
        <div class="editor-actions">
          <button class="action-btn preview-btn" @click="togglePreview">
            {{ isPreviewVisible ? '隐藏预览' : '显示预览' }}
          </button>
          <button class="action-btn save-btn" @click="saveChanges">
            保存
          </button>
          <button class="action-btn cancel-btn" @click="cancelEditing">
            取消
          </button>
        </div>
      </div>

      <div class="editor-container" :class="{ 'with-preview': isPreviewVisible }">
        <!-- 编辑区域 -->
        <div class="edit-area">
          <textarea ref="editor" v-model="editingContent" class="html-textarea" spellcheck="false"
            @keydown.tab.prevent="handleTab"></textarea>
        </div>

        <!-- 实时预览 -->
        <div v-if="isPreviewVisible" class="live-preview">
          <div class="preview-content" v-html="sanitizedEditingHtml"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import type { DOMPurifyI } from 'dompurify';
import DOMPurify from 'dompurify';

const props = defineProps<{
  html: string;
}>();

const emit = defineEmits<{
  (e: 'update:html', value: string): void;
}>();

// 状态
const isEditing = ref(false);
const isCopying = ref(false);
const isPreviewVisible = ref(true);
const editingContent = ref(props.html);
const editor = ref<HTMLTextAreaElement | null>(null);

// 计算属性
const sanitizedHtml = computed(() => {
  return DOMPurify.sanitize(props.html);
});

const sanitizedEditingHtml = computed(() => {
  return DOMPurify.sanitize(editingContent.value);
});

// 复制 HTML
async function copyHtml() {
  try {
    await navigator.clipboard.writeText(props.html);
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
  editingContent.value = props.html;
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
  emit('update:html', editingContent.value);
  isEditing.value = false;
}

// 取消编辑
function cancelEditing() {
  editingContent.value = props.html;
  isEditing.value = false;
}

// 切换预览
function togglePreview() {
  isPreviewVisible.value = !isPreviewVisible.value;
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
.html-editor {
  margin: 1em 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5em 1em;
  background-color: var(--background-secondary-color);
  border-bottom: 1px solid var(--border-color);
}

.mode-label {
  font-size: 0.9em;
  color: var(--text-secondary-color);
}

.editor-actions {
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

.preview-content {
  padding: 1em;
  line-height: 1.6;
}

.editor-container {
  display: flex;
  min-height: 200px;
}

.editor-container.with-preview {
  border-top: 1px solid var(--border-color);
}

.edit-area {
  flex: 1;
  min-width: 0;
}

.html-textarea {
  width: 100%;
  min-height: 200px;
  padding: 1em;
  border: none;
  background-color: var(--background-color);
  color: var(--text-color);
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
  line-height: 1.5;
  resize: none;
  outline: none;
}

.live-preview {
  flex: 1;
  min-width: 0;
  border-left: 1px solid var(--border-color);
  background-color: var(--background-color);
  overflow: auto;
}

:deep(img) {
  max-width: 100%;
  height: auto;
}

:deep(pre) {
  background-color: var(--code-bg-color);
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
}

:deep(code) {
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
}

:deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

:deep(th),
:deep(td) {
  border: 1px solid var(--border-color);
  padding: 0.5em;
}

:deep(th) {
  background-color: var(--background-secondary-color);
}

:deep(blockquote) {
  margin: 1em 0;
  padding-left: 1em;
  border-left: 4px solid var(--border-color);
  color: var(--text-secondary-color);
}
</style>