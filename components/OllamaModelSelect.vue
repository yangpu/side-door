<template>
  <div class="model-select">
    <!-- 模型选择 -->
    <div class="select-group">
      <label>{{ label }}</label>
      <select v-model="selectedModel" :disabled="loading" @change="handleModelChange">
        <option value="">选择模型</option>
        <option v-for="model in availableModels" :key="model.name" :value="model.name">
          {{ model.name }} ({{ formatSize(model.size) }})
        </option>
      </select>
    </div>

    <!-- 设置按钮 -->
    <div class="settings-container">
      <button v-if="selectedModel" class="settings-btn" @click="showConfig = true" title="模型配置">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z">
          </path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </button>
    </div>

    <!-- 模型配置对话框 -->
    <div v-if="showConfig" class="config-dialog">
      <div class="dialog-content">
        <h3>模型配置</h3>
        <div class="config-form">
          <!-- 温度 -->
          <div class="form-group">
            <label>温度 ({{ modelConfig.temperature }})</label>
            <input type="range" v-model="modelConfig.temperature" min="0" max="2" step="0.1" />
            <div class="range-labels">
              <span>精确</span>
              <span>平衡</span>
              <span>创意</span>
            </div>
          </div>

          <!-- 上下文长度 -->
          <div class="form-group">
            <label>上下文长度</label>
            <input type="number" v-model="modelConfig.contextLength" min="512" max="8192" step="512" />
          </div>

          <!-- 系统提示词 -->
          <div class="form-group">
            <label>系统提示词</label>
            <textarea v-model="modelConfig.systemPrompt" rows="3" placeholder="输入系统提示词..."></textarea>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="cancel-btn" @click="showConfig = false">取消</button>
          <button class="confirm-btn" @click="saveConfig">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';

interface Model {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
}

interface ModelConfig {
  temperature: number;
  contextLength: number;
  systemPrompt: string;
}

const props = defineProps<{
  label: string;
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'config:update': [config: ModelConfig];
}>();

const loading = ref(false);
const showConfig = ref(false);
const availableModels = ref<Model[]>([]);
const selectedModel = ref(props.modelValue);

const modelConfig = ref<ModelConfig>({
  temperature: 0.7,
  contextLength: 2048,
  systemPrompt: '',
});

// 加载可用模型
async function loadModels() {
  loading.value = true;
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) throw new Error('获取模型列表失败');
    const data = await response.json();
    availableModels.value = data.models;
  } catch (error) {
    console.error('加载模型失败:', error);
  } finally {
    loading.value = false;
  }
}

// 处理模型变更
function handleModelChange() {
  emit('update:modelValue', selectedModel.value);
}

// 保存配置
function saveConfig() {
  emit('config:update', { ...modelConfig.value });
  showConfig.value = false;
}

// 格式化文件大小
function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// 初始化
onMounted(() => {
  loadModels();
});

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  selectedModel.value = newValue;
});
</script>

<style scoped>
.model-select {
  position: relative;
}

.select-group {
  margin-bottom: 1em;
}

.select-group label {
  display: block;
  margin-bottom: 0.5em;
  color: var(--text-color);
}

.select-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg-color);
  color: var(--text-color);
  font-size: 0.9em;
}

.settings-container {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 100;
}

.settings-btn {
  width: 40px;
  height: 40px;
  padding: 8px;
  background-color: var(--primary-color);
  border: none;
  border-radius: 50%;
  color: var(--button-text-color);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-btn:hover {
  transform: rotate(30deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.settings-btn svg {
  width: 20px;
  height: 20px;
}

.config-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: var(--background-color);
  border-radius: 8px;
  padding: 1.5em;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.dialog-content h3 {
  margin: 0 0 1em;
  color: var(--text-color);
}

.config-form {
  margin-bottom: 1.5em;
}

.form-group {
  margin-bottom: 1em;
}

.form-group label {
  display: block;
  margin-bottom: 0.5em;
  color: var(--text-color);
}

input[type="range"] {
  width: 100%;
  margin: 0.5em 0;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8em;
  color: var(--text-secondary-color);
}

input[type="number"] {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg-color);
  color: var(--text-color);
}

textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg-color);
  color: var(--text-color);
  resize: vertical;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.dialog-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: opacity 0.2s;
}

.cancel-btn {
  background-color: var(--button-secondary-bg-color);
  color: var(--button-text-color);
}

.confirm-btn {
  background-color: var(--primary-color);
  color: var(--button-text-color);
}

.dialog-actions button:hover {
  opacity: 0.9;
}
</style>