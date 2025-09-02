<template>
  <div class="settings-panel" role="dialog">
    <div class="panel-header">
      <h3>设置</h3>
      <button class="close-btn" @click="$emit('close')" aria-label="关闭设置">×</button>
    </div>

    <div class="panel-body">
      <!-- 主题设置 -->
      <div class="setting-item">
        <ThemeSwitch v-model="settings.theme.value" />
      </div>

      <!-- 字体大小 -->
      <div class="setting-item">
        <label>字体大小</label>
        <div class="font-size-control">
          <input type="range" v-model="settings.fontScale.value" min="0.5" max="3" step="0.01" />
          <span class="font-size-value" @click="settings.fontScale.value = 1" title="重置为默认大小">{{
            Math.round(settings.fontScale.value *
            100) }}%</span>
        </div>
      </div>

      <!-- 翻译设置 -->
      <div class="setting-item">
        <label>翻译设置</label>
        <div class="translation-options">
          <label>
            <input type="checkbox" v-model="settings.enableTranslation.value" />
            启用翻译
          </label>
          <label>
            <input type="checkbox" v-model="settings.showOriginalText.value" />
            显示原文
          </label>
        </div>
        <div class="translation-color" v-if="settings.enableTranslation.value">
          <label>翻译文本背景色</label>
          <ColorPicker v-model="settings.translationColor.value" />
        </div>
      </div>

      <!-- 摘要设置 -->
      <div class="setting-item">
        <!-- <label>摘要设置</label> -->
        <div class="summary-options">
          <label>
            <input type="checkbox" v-model="settings.enableSummary.value" />
            启用摘要生成
          </label>
        </div>
      </div>

      <!-- AI 模型设置 -->
      <div class="setting-item">
        <ModelSettings v-model:textModelValue="settings.textModel.value"
          v-model:visionModelValue="settings.visionModel.value" />
      </div>

      <!-- 导出选项 -->
      <div class="setting-item">
        <label>导出</label>
        <div class="export-options">
          <button @click="exportHtml">导出 HTML</button>
          <button @click="exportPdf">导出 PDF</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { settings } from '../utils/settings.js';
import ColorPicker from './ColorPicker.vue';
import ModelSettings from './ModelSettings.vue';
import ThemeSwitch from './ThemeSwitch.vue';

const exportHtml = async () => {
  // TODO: 实现导出 HTML 功能
  console.log('导出 HTML');
};

const exportPdf = async () => {
  // TODO: 实现导出 PDF 功能
  console.log('导出 PDF');
};

defineEmits(['close']);
</script>

<style scoped>
.settings-panel {
  background: var(--background-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 280px;
  border: 1px solid var(--border-color);
  z-index: 2000;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--secondary-text-color);
  cursor: pointer;
  padding: 2px;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-color);
}

.panel-body {
  padding: 8px 12px;
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.setting-item {
  margin-bottom: 12px;
  width: 100%;
  box-sizing: border-box;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item>label {
  display: block;
  margin-bottom: 4px;
  color: var(--text-color);
  font-weight: 500;
  font-size: 12px;
}

.theme-options,
.translation-options,
.summary-options {
  display: flex;
  gap: 12px;
  font-size: 12px;
  flex-wrap: wrap;
}

.theme-options label,
.translation-options label,
.summary-options label {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-color);
  cursor: pointer;
}

.translation-color {
  margin-top: 8px;
  display: flex;
  gap: 20px;
}

.translation-color label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--text-color);
}

.color-picker {
  width: 100%;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  cursor: pointer;
}

.font-size-control {
  display: flex;
  align-items: center;
}

.font-size-control input[type="range"] {
  flex: 1;
  height: 4px;
}

.font-size-value {
  min-width: 36px;
  text-align: right;
  color: var(--secondary-text-color);
  font-size: 12px;
  cursor: pointer;
}

select {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-color);
  color: var(--text-color);
  font-size: 12px;
}

.export-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.export-options button {
  flex: 1;
  min-width: 80px;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-color);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  white-space: nowrap;
}

.export-options button:hover {
  background: var(--hover-bg-color);
}
</style>