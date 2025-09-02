<template>
  <div class="content-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button class="toolbar-btn" @click="insertHeading(1)" title="标题1">H1</button>
        <button class="toolbar-btn" @click="insertHeading(2)" title="标题2">H2</button>
        <button class="toolbar-btn" @click="insertHeading(3)" title="标题3">H3</button>
      </div>
      <div class="toolbar-group">
        <button class="toolbar-btn" @click="toggleBold" title="加粗">B</button>
        <button class="toolbar-btn" @click="toggleItalic" title="斜体">I</button>
        <button class="toolbar-btn" @click="toggleUnderline" title="下划线">U</button>
      </div>
      <div class="toolbar-group">
        <button class="toolbar-btn" @click="insertLink" title="插入链接">
          <span class="icon">🔗</span>
        </button>
        <button class="toolbar-btn" @click="insertImage" title="插入图片">
          <span class="icon">🖼️</span>
        </button>
        <button class="toolbar-btn" @click="insertCode" title="插入代码">
          <span class="icon">📝</span>
        </button>
      </div>
      <div class="toolbar-group">
        <button class="toolbar-btn" @click="toggleList('ul')" title="无序列表">
          <span class="icon">•</span>
        </button>
        <button class="toolbar-btn" @click="toggleList('ol')" title="有序列表">
          <span class="icon">1.</span>
        </button>
        <button class="toolbar-btn" @click="insertQuote" title="引用">
          <span class="icon">❝</span>
        </button>
      </div>
    </div>

    <!-- 编辑区域 -->
    <div class="editor-container">
      <!-- 编辑器 -->
      <div class="edit-area">
        <textarea ref="editor" v-model="content" class="content-textarea" :placeholder="placeholder"
          @input="handleInput" @keydown="handleKeydown" @select="handleSelect"></textarea>
      </div>

      <!-- 预览区域 -->
      <div v-if="showPreview" class="preview-area">
        <div class="preview-content" v-html="renderedContent"></div>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <div class="editor-footer">
      <div class="editor-status">
        <span class="word-count">{{ wordCount }} 字</span>
      </div>
      <div class="editor-actions">
        <button class="action-btn" @click="togglePreview">
          {{ showPreview ? '隐藏预览' : '显示预览' }}
        </button>
        <button class="action-btn" @click="formatContent">
          格式化
        </button>
      </div>
    </div>

    <!-- 链接对话框 -->
    <div v-if="showLinkDialog" class="dialog-overlay" @click.self="closeLinkDialog">
      <div class="dialog">
        <h3>插入链接</h3>
        <div class="dialog-content">
          <input v-model="linkUrl" placeholder="输入链接地址" class="dialog-input" />
          <input v-model="linkText" placeholder="输入链接文字" class="dialog-input" />
        </div>
        <div class="dialog-actions">
          <button class="action-btn cancel-btn" @click="closeLinkDialog">取消</button>
          <button class="action-btn confirm-btn" @click="confirmLink">确定</button>
        </div>
      </div>
    </div>

    <!-- 图片对话框 -->
    <div v-if="showImageDialog" class="dialog-overlay" @click.self="closeImageDialog">
      <div class="dialog">
        <h3>插入图片</h3>
        <div class="dialog-content">
          <input v-model="imageUrl" placeholder="输入图片地址" class="dialog-input" />
          <input v-model="imageAlt" placeholder="输入图片描述" class="dialog-input" />
        </div>
        <div class="dialog-actions">
          <button class="action-btn cancel-btn" @click="closeImageDialog">取消</button>
          <button class="action-btn confirm-btn" @click="confirmImage">确定</button>
        </div>
      </div>
    </div>

    <!-- 代码对话框 -->
    <div v-if="showCodeDialog" class="dialog-overlay" @click.self="closeCodeDialog">
      <div class="dialog">
        <h3>插入代码</h3>
        <div class="dialog-content">
          <input v-model="codeLanguage" placeholder="输入代码语言" class="dialog-input" />
          <textarea v-model="codeContent" placeholder="输入代码内容" class="dialog-textarea"></textarea>
        </div>
        <div class="dialog-actions">
          <button class="action-btn cancel-btn" @click="closeCodeDialog">取消</button>
          <button class="action-btn confirm-btn" @click="confirmCode">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, nextTick } from 'vue';
import type { MarkedOptions } from 'marked';
import { marked } from 'marked';
import type { DOMPurifyI } from 'dompurify';
import DOMPurify from 'dompurify';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

// 编辑器状态
const content = ref(props.modelValue);
const editor = ref<HTMLTextAreaElement | null>(null);
const showPreview = ref(true);
const selection = ref({ start: 0, end: 0 });

// 对话框状态
const showLinkDialog = ref(false);
const showImageDialog = ref(false);
const showCodeDialog = ref(false);

// 对话框数据
const linkUrl = ref('');
const linkText = ref('');
const imageUrl = ref('');
const imageAlt = ref('');
const codeLanguage = ref('');
const codeContent = ref('');

// 计算属性
const renderedContent = computed(() => {
  const html = marked(content.value);
  return DOMPurify.sanitize(html);
});

const wordCount = computed(() => {
  return content.value.trim().length;
});

// 内容处理
function handleInput() {
  emit('update:modelValue', content.value);
}

function handleKeydown(e: KeyboardEvent) {
  // 处理Tab键
  if (e.key === 'Tab') {
    e.preventDefault();
    insertText('  ');
  }
}

function handleSelect() {
  if (!editor.value) return;
  selection.value = {
    start: editor.value.selectionStart,
    end: editor.value.selectionEnd
  };
}

// 工具栏功能
function insertText(text: string, moveOffset = 0) {
  if (!editor.value) return;

  const start = editor.value.selectionStart;
  const end = editor.value.selectionEnd;
  const before = content.value.substring(0, start);
  const after = content.value.substring(end);

  content.value = before + text + after;
  emit('update:modelValue', content.value);

  // 设置光标位置
  nextTick(() => {
    if (!editor.value) return;
    const newPosition = start + text.length + moveOffset;
    editor.value.setSelectionRange(newPosition, newPosition);
    editor.value.focus();
  });
}

function wrapText(before: string, after: string) {
  if (!editor.value) return;

  const start = editor.value.selectionStart;
  const end = editor.value.selectionEnd;
  const selectedText = content.value.substring(start, end);
  const wrappedText = before + selectedText + after;

  insertText(wrappedText, 0);
}

// 标题
function insertHeading(level: number) {
  const prefix = '#'.repeat(level) + ' ';
  insertText(prefix);
}

// 格式化
function toggleBold() {
  wrapText('**', '**');
}

function toggleItalic() {
  wrapText('*', '*');
}

function toggleUnderline() {
  wrapText('<u>', '</u>');
}

// 列表
function toggleList(type: 'ul' | 'ol') {
  const prefix = type === 'ul' ? '- ' : '1. ';
  insertText(prefix);
}

// 引用
function insertQuote() {
  insertText('> ');
}

// 链接
function insertLink() {
  linkUrl.value = '';
  linkText.value = '';
  showLinkDialog.value = true;
}

function closeLinkDialog() {
  showLinkDialog.value = false;
}

function confirmLink() {
  const link = `[${linkText.value || linkUrl.value}](${linkUrl.value})`;
  insertText(link);
  closeLinkDialog();
}

// 图片
function insertImage() {
  imageUrl.value = '';
  imageAlt.value = '';
  showImageDialog.value = true;
}

function closeImageDialog() {
  showImageDialog.value = false;
}

function confirmImage() {
  const image = `![${imageAlt.value}](${imageUrl.value})`;
  insertText(image);
  closeImageDialog();
}

// 代码
function insertCode() {
  codeLanguage.value = '';
  codeContent.value = '';
  showCodeDialog.value = true;
}

function closeCodeDialog() {
  showCodeDialog.value = false;
}

function confirmCode() {
  const code = `\`\`\`${codeLanguage.value}\n${codeContent.value}\n\`\`\`\n`;
  insertText(code);
  closeCodeDialog();
}

// 预览切换
function togglePreview() {
  showPreview.value = !showPreview.value;
}

// 格式化内容
function formatContent() {
  // TODO: 实现内容格式化
  console.log('格式化内容');
}

// 监听 props 变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== content.value) {
    content.value = newValue;
  }
});
</script>

<style scoped>
.content-editor {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  gap: 1em;
  padding: 0.5em;
  background-color: var(--background-secondary-color);
  border-bottom: 1px solid var(--border-color);
}

.toolbar-group {
  display: flex;
  gap: 0.25em;
}

.toolbar-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--text-color);
  font-size: 0.9em;
  cursor: pointer;
}

.toolbar-btn:hover {
  background-color: var(--hover-color);
}

.editor-container {
  display: flex;
  min-height: 300px;
}

.edit-area {
  flex: 1;
  min-width: 0;
}

.content-textarea {
  width: 100%;
  height: 100%;
  min-height: 300px;
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

.preview-area {
  flex: 1;
  min-width: 0;
  padding: 1em;
  border-left: 1px solid var(--border-color);
  background-color: var(--background-color);
  overflow: auto;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5em 1em;
  background-color: var(--background-secondary-color);
  border-top: 1px solid var(--border-color);
}

.word-count {
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

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background-color: var(--background-color);
  border-radius: 8px;
  padding: 1.5em;
  width: 90%;
  max-width: 500px;
}

.dialog h3 {
  margin: 0 0 1em;
  font-size: 1.2em;
  color: var(--text-color);
}

.dialog-content {
  margin-bottom: 1em;
}

.dialog-input {
  width: 100%;
  padding: 0.5em;
  margin-bottom: 0.5em;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg-color);
  color: var(--text-color);
}

.dialog-textarea {
  width: 100%;
  min-height: 150px;
  padding: 0.5em;
  margin-bottom: 0.5em;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg-color);
  color: var(--text-color);
  font-family: 'Fira Code', monospace;
  resize: vertical;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5em;
}

.cancel-btn {
  background-color: var(--button-secondary-bg-color);
}

.confirm-btn {
  background-color: var(--primary-color);
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

:deep(blockquote) {
  margin: 1em 0;
  padding-left: 1em;
  border-left: 4px solid var(--border-color);
  color: var(--text-secondary-color);
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
</style>