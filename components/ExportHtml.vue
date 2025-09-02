<template>
  <div class="export-html">
    <button class="export-btn" @click="showExportDialog" :disabled="isExporting">
      <span v-if="isExporting">导出中...</span>
      <span v-else>导出 HTML</span>
    </button>

    <!-- 导出设置对话框 -->
    <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog">
        <h3>导出 HTML 设置</h3>
        <div class="dialog-content">
          <!-- 文件名设置 -->
          <div class="form-group">
            <label>文件名</label>
            <input v-model="fileName" class="dialog-input" placeholder="输入文件名（不含扩展名）" />
          </div>

          <!-- 样式设置 -->
          <div class="form-group">
            <label>样式选项</label>
            <div class="checkbox-group">
              <label>
                <input type="checkbox" v-model="includeStyles">
                包含样式
              </label>
              <label>
                <input type="checkbox" v-model="inlineStyles">
                内联样式
              </label>
            </div>
          </div>

          <!-- 内容设置 -->
          <div class="form-group">
            <label>内容选项</label>
            <div class="checkbox-group">
              <label>
                <input type="checkbox" v-model="includeTitle">
                包含标题
              </label>
              <label>
                <input type="checkbox" v-model="includeMeta">
                包含元信息
              </label>
            </div>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="action-btn cancel-btn" @click="closeDialog">取消</button>
          <button class="action-btn confirm-btn" @click="exportHtml" :disabled="!fileName || isExporting">
            导出
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { sanitize } from 'dompurify';

const props = defineProps<{
  content: string;
  title?: string;
  styles?: string;
  meta?: {
    author?: string;
    description?: string;
    keywords?: string;
    [key: string]: string | undefined;
  };
}>();

// 状态
const showDialog = ref(false);
const isExporting = ref(false);
const fileName = ref('');
const includeStyles = ref(true);
const inlineStyles = ref(false);
const includeTitle = ref(true);
const includeMeta = ref(true);

// 显示导出对话框
function showExportDialog() {
  fileName.value = props.title ?
    props.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') :
    'exported-content';
  showDialog.value = true;
}

// 关闭对话框
function closeDialog() {
  showDialog.value = false;
}

// 生成 HTML
function generateHtml(): string {
  const doc = new DOMParser().parseFromString('<!DOCTYPE html><html><head></head><body></body></html>', 'text/html');

  // 添加 meta 标签
  if (includeMeta.value && props.meta) {
    Object.entries(props.meta).forEach(([name, content]) => {
      if (content) {
        const meta = doc.createElement('meta');
        meta.setAttribute('name', name);
        meta.setAttribute('content', content);
        doc.head.appendChild(meta);
      }
    });
  }

  // 添加标题
  if (includeTitle.value && props.title) {
    const title = doc.createElement('title');
    title.textContent = props.title;
    doc.head.appendChild(title);
  }

  // 添加样式
  if (includeStyles.value && props.styles) {
    if (inlineStyles.value) {
      const style = doc.createElement('style');
      style.textContent = props.styles;
      doc.head.appendChild(style);
    } else {
      // 创建一个包含样式的 Blob URL
      const styleBlob = new Blob([props.styles], { type: 'text/css' });
      const styleUrl = URL.createObjectURL(styleBlob);
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = styleUrl;
      doc.head.appendChild(link);
    }
  }

  // 添加内容
  const sanitizedContent = sanitize(props.content);
  doc.body.innerHTML = sanitizedContent;

  // 返回完整的 HTML
  return doc.documentElement.outerHTML;
}

// 导出 HTML
async function exportHtml() {
  if (!fileName.value) return;

  isExporting.value = true;
  try {
    const html = generateHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // 创建下载链接
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName.value}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 清理
    URL.revokeObjectURL(url);
    closeDialog();
  } catch (error) {
    console.error('导出失败:', error);
  } finally {
    isExporting.value = false;
  }
}
</script>

<style scoped>
.export-html {
  display: inline-block;
}

.export-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
  cursor: pointer;
  font-size: 0.9em;
}

.export-btn:hover {
  opacity: 0.9;
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.form-group {
  margin-bottom: 1em;
}

.form-group label {
  display: block;
  margin-bottom: 0.5em;
  color: var(--text-color);
}

.dialog-input {
  width: 100%;
  padding: 0.5em;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg-color);
  color: var(--text-color);
}

.checkbox-group {
  display: flex;
  gap: 1em;
  margin-top: 0.5em;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5em;
  cursor: pointer;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5em;
  margin-top: 1.5em;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
  cursor: pointer;
  font-size: 0.9em;
}

.cancel-btn {
  background-color: var(--button-secondary-bg-color);
}

.confirm-btn {
  background-color: var(--primary-color);
}

.action-btn:hover {
  opacity: 0.9;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>