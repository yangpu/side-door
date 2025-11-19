<template>
  <div class="paragraph" @mouseenter="isHovered = true" @mouseleave="isHovered = false">
    <!-- 正常显示模式 -->
    <div v-if="!isEditing" ref="paragraphContainer" class="paragraph-content"></div>
    <span ref="translationContainer" class="translation" v-if="settings.enableTranslation.value && !isEditing"></span>

    <!-- 简单编辑模式 -->
    <div v-if="isEditing" class="paragraph-editor">
      <div v-if="editMode === 'html'" class="html-edit-area">
        <textarea 
          ref="htmlEditor"
          v-model="editContent" 
          class="edit-textarea"
          placeholder="编辑HTML内容..."
        ></textarea>
      </div>
      
      <div class="editor-actions">
        <button class="action-btn save-btn" @click="saveEdit">保存</button>
        <button class="action-btn cancel-btn" @click="cancelEdit">取消</button>
      </div>
    </div>

    <ParagraphHoverBar 
      v-if="paragraphContainer && !isEditing" 
      :content="paragraphContainer" 
      :is-parent-hovered="isHovered"
      @edit="startEdit"
      @addText="addText"
      @addCode="addCode"
      @delete="deleteParagraph"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import ParagraphHoverBar from './ParagraphHoverBar.vue';
import { translationService } from '../utils/translationService.js';
import { settings } from '../utils/settings';

const props = defineProps<{
  content: HTMLElement;
}>();

const emit = defineEmits<{
  (e: 'update', newContent: HTMLElement): void;
  (e: 'delete'): void;
}>();

const paragraphContainer = ref<HTMLElement | null>(null);
const translationContainer = ref<HTMLElement | null>(null);
const htmlEditor = ref<HTMLTextAreaElement | null>(null);
const isHovered = ref(false);
const isEditing = ref(false);
const editMode = ref<'html'>('html');
const editContent = ref('');

function render() {
  const container = paragraphContainer.value;
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(props.content.cloneNode(true));
}

function translate() {
  const container = paragraphContainer.value;
  const transContainer = translationContainer.value;
  if (!container || !transContainer) return;

  translationService.translateNode(container, transContainer);
}

// 编辑功能
function startEdit() {
  const content = paragraphContainer.value;
  if (!content) return;

  editMode.value = 'html';
  editContent.value = content.innerHTML;
  isEditing.value = true;

  nextTick(() => {
    htmlEditor.value?.focus();
  });
}

function saveEdit() {
  if (!paragraphContainer.value) return;

  paragraphContainer.value.innerHTML = editContent.value;
  isEditing.value = false;

  const newContent = paragraphContainer.value.firstChild as HTMLElement || paragraphContainer.value;
  emit('update', newContent);
  
  // 重新翻译
  if (settings.enableTranslation.value) {
    translate();
  }
}

function cancelEdit() {
  isEditing.value = false;
}

function addText() {
  console.log('添加文本');
  // TODO: 实现添加文本段落
}

function addCode() {
  console.log('添加代码');
  // TODO: 实现添加代码段落
}

function deleteParagraph() {
  if (confirm('确定要删除这个段落吗？')) {
    emit('delete');
  }
}

// 监听翻译设置变化
watch(
  () => settings.enableTranslation.value,
  (enabled) => {
    if (enabled) {
      translate();
    } else {
      // 隐藏翻译内容
      if (translationContainer.value) {
        translationContainer.value.style.display = 'none';
      }
    }
  }
);

// 监听显示原文设置变化
watch(
  () => settings.showOriginalText.value,
  (show) => {
    if (paragraphContainer.value) {
      if (show) {
        paragraphContainer.value.style.display = '';
      } else {
        // 如果有翻译，隐藏原文
        if (translationContainer.value?.classList.contains('translated')) {
          paragraphContainer.value.style.display = 'none';
        }
      }
    }
  }
);

onMounted(() => {
  render();
  if (settings.enableTranslation.value) {
    translate();
  }
});
</script>

<style scoped>
.paragraph {
  position: relative;
  margin-bottom: 0;
  padding-right: 30px;
  transition: background-color 0.3s ease;
  word-wrap: break-word;
}

.paragraph:hover {
  background-color: var(--hover-bg-color);
}

.paragraph-content {
  position: relative;
  z-index: 1;
}

.paragraph-content li p {
  display: inline;
}

.translation {
  display: block;
  line-height: 1.5;
}

.translation.translating {
  color: var(--secondary-text-color);
  font-style: italic;
}

.translation.translated {
  background-color: var(--translated-bg-color);
  color: var(--translated-text-color);
  padding: 2px 4px;
  border-radius: 2px;
}

.paragraph-editor {
  position: relative;
  z-index: 10;
  background-color: var(--bg-color);
  border: 2px solid var(--primary-color);
  border-radius: 4px;
  padding: 8px;
  margin: 8px 0;
}

.html-edit-area {
  width: 100%;
}

.edit-textarea {
  width: 100%;
  min-height: 150px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-color);
  color: var(--text-color);
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
}

.edit-textarea:focus {
  border-color: var(--primary-color);
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.action-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.save-btn {
  background-color: var(--primary-color);
  color: white;
}

.save-btn:hover {
  opacity: 0.9;
}

.cancel-btn {
  background-color: var(--secondary-bg-color);
  color: var(--text-color);
}

.cancel-btn:hover {
  background-color: var(--hover-bg-color);
}
</style>