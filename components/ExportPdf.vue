<template>
  <div class="export-pdf">
    <button class="export-btn" @click="showExportDialog" :disabled="isExporting">
      <span v-if="isExporting">导出中...</span>
      <span v-else>导出 PDF</span>
    </button>

    <!-- 导出设置对话框 -->
    <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog">
        <h3>导出 PDF 设置</h3>
        <div class="dialog-content">
          <!-- 文件名设置 -->
          <div class="form-group">
            <label>文件名</label>
            <input v-model="fileName" class="dialog-input" placeholder="输入文件名（不含扩展名）" />
          </div>

          <!-- 页面设置 -->
          <div class="form-group">
            <label>页面大小</label>
            <select v-model="pageSize" class="dialog-select">
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
              <option value="legal">Legal</option>
            </select>
          </div>

          <!-- 方向设置 -->
          <div class="form-group">
            <label>页面方向</label>
            <div class="radio-group">
              <label>
                <input type="radio" v-model="orientation" value="portrait">
                纵向
              </label>
              <label>
                <input type="radio" v-model="orientation" value="landscape">
                横向
              </label>
            </div>
          </div>

          <!-- 边距设置 -->
          <div class="form-group">
            <label>页面边距 (mm)</label>
            <div class="margin-inputs">
              <input type="number" v-model.number="margins.top" placeholder="上" class="margin-input">
              <input type="number" v-model.number="margins.right" placeholder="右" class="margin-input">
              <input type="number" v-model.number="margins.bottom" placeholder="下" class="margin-input">
              <input type="number" v-model.number="margins.left" placeholder="左" class="margin-input">
            </div>
          </div>

          <!-- 内容设置 -->
          <div class="form-group">
            <label>内容选项</label>
            <div class="checkbox-group">
              <label>
                <input type="checkbox" v-model="includeHeader">
                包含页眉
              </label>
              <label>
                <input type="checkbox" v-model="includeFooter">
                包含页脚
              </label>
              <label>
                <input type="checkbox" v-model="includePageNumbers">
                包含页码
              </label>
            </div>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="action-btn cancel-btn" @click="closeDialog">取消</button>
          <button class="action-btn confirm-btn" @click="exportPdf" :disabled="!fileName || isExporting">
            导出
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const props = defineProps<{
  content: string;
  title?: string;
  author?: string;
}>();

// 状态
const showDialog = ref(false);
const isExporting = ref(false);
const fileName = ref('');
const pageSize = ref('a4');
const orientation = ref<'portrait' | 'landscape'>('portrait');
const margins = ref({
  top: 15,
  right: 15,
  bottom: 15,
  left: 15
});
const includeHeader = ref(true);
const includeFooter = ref(true);
const includePageNumbers = ref(true);

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

// 创建临时容器
function createContainer(): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.innerHTML = props.content;
  document.body.appendChild(container);
  return container;
}

// 获取页面尺寸
function getPageDimensions() {
  const sizes = {
    a4: { width: 210, height: 297 },
    letter: { width: 215.9, height: 279.4 },
    legal: { width: 215.9, height: 355.6 }
  };

  const size = sizes[pageSize.value as keyof typeof sizes];
  return orientation.value === 'portrait' ? size : { width: size.height, height: size.width };
}

// 导出 PDF
async function exportPdf() {
  if (!fileName.value) return;

  isExporting.value = true;
  const container = createContainer();

  try {
    // 创建 PDF 文档
    const dimensions = getPageDimensions();
    const pdf = new jsPDF({
      orientation: orientation.value,
      unit: 'mm',
      format: pageSize.value
    });

    // 设置文档属性
    if (props.title) pdf.setProperties({ title: props.title });
    if (props.author) pdf.setProperties({ author: props.author });

    // 转换为图片
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    // 计算缩放比例
    const contentWidth = dimensions.width - margins.value.left - margins.value.right;
    const contentHeight = dimensions.height - margins.value.top - margins.value.bottom;
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(contentWidth / imgWidth, contentHeight / imgHeight);

    // 添加内容
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(
      imgData,
      'JPEG',
      margins.value.left,
      margins.value.top,
      imgWidth * ratio,
      imgHeight * ratio
    );

    // 添加页眉
    if (includeHeader.value && props.title) {
      pdf.setFontSize(10);
      pdf.text(props.title, margins.value.left, 10);
    }

    // 添加页脚
    if (includeFooter.value) {
      const footerY = dimensions.height - 10;
      pdf.setFontSize(8);
      if (includePageNumbers.value) {
        pdf.text('第 1 页', dimensions.width / 2, footerY, { align: 'center' });
      }
      if (props.author) {
        pdf.text(props.author, margins.value.left, footerY);
      }
    }

    // 保存文件
    pdf.save(`${fileName.value}.pdf`);
    closeDialog();
  } catch (error) {
    console.error('导出失败:', error);
  } finally {
    document.body.removeChild(container);
    isExporting.value = false;
  }
}
</script>

<style scoped>
.export-pdf {
  display: inline-block;
}

.export-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: var(--link-color);
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
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
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.dialog {
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.dialog h3 {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.dialog-content {
  margin-bottom: 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-color);
  font-size: 14px;
  font-weight: 500;
}

.dialog-input,
.dialog-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--background-color);
  color: var(--text-color);
  font-size: 14px;
}

.dialog-input:focus,
.dialog-select:focus {
  outline: none;
  border-color: var(--link-color);
}

.margin-inputs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.margin-input {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--background-color);
  color: var(--text-color);
  text-align: center;
  font-size: 14px;
}

.margin-input:focus {
  outline: none;
  border-color: var(--link-color);
}

.radio-group,
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.radio-group label,
.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--text-color);
  font-size: 14px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.2s;
}

.cancel-btn {
  background-color: var(--hover-bg-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.confirm-btn {
  background-color: var(--link-color);
  color: white;
}

.action-btn:hover {
  opacity: 0.85;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>