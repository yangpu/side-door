<template>
  <div class="model-settings">
    <!-- 文本模型 -->
    <div class="model-select">
      <label>文本模型</label>
      <select v-model="textModel">
        <option value="">请选择模型</option>
        <option v-for="model in textModels" :key="model.value" :value="model.value">
          {{ model.label }}
        </option>
      </select>
    </div>

    <!-- 视觉模型 -->
    <div class="model-select">
      <label>视觉模型</label>
      <select v-model="visionModel">
        <option value="">请选择模型</option>
        <option v-for="model in visionModels" :key="model.value" :value="model.value">
          {{ model.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { getModelService } from '../utils/modelService';

// 添加本地存储的key常量
const STORAGE_KEY = {
  TEXT_MODEL: 'side-door-text-model',
  VISION_MODEL: 'side-door-vision-model'
};

const props = defineProps<{
  textModelValue: string;
  visionModelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:textModelValue', value: string): void;
  (e: 'update:visionModelValue', value: string): void;
}>();

const textModels = ref<{ value: string; label: string }[]>([]);
const visionModels = ref<{ value: string; label: string }[]>([]);
const textModel = ref(props.textModelValue);
const visionModel = ref(props.visionModelValue);

// 监听外部值变化
watch(() => props.textModelValue, (newValue) => {
  textModel.value = newValue;
});

watch(() => props.visionModelValue, (newValue) => {
  visionModel.value = newValue;
});

// 监听内部值变化
watch(textModel, (newValue) => {
  emit('update:textModelValue', newValue);
  // 保存到本地存储
  localStorage.setItem(STORAGE_KEY.TEXT_MODEL, newValue);
});

watch(visionModel, (newValue) => {
  emit('update:visionModelValue', newValue);
  // 保存到本地存储
  localStorage.setItem(STORAGE_KEY.VISION_MODEL, newValue);
});

// 加载模型列表
async function loadModels() {
  try {
    const modelService = getModelService();
    const modelList = await modelService.listModels();

    // 所有模型都可以用作文本模型
    textModels.value = modelList.map(model => ({
      value: model.name,
      label: model.name
    }));

    // 筛选视觉模型
    visionModels.value = modelList
      .filter(model => {
        const name = model.name.toLowerCase();
        return name.includes('vision') ||
          name.includes('llava') ||
          name.includes('cogvlm') ||
          name.includes('qwen-vl');
      })
      .map(model => ({
        value: model.name,
        label: model.name
      }));

    // 从本地存储加载上次的选择
    const savedTextModel = localStorage.getItem(STORAGE_KEY.TEXT_MODEL);
    const savedVisionModel = localStorage.getItem(STORAGE_KEY.VISION_MODEL);

    // 如果有本地存储的值且模型仍然存在，则使用保存的值
    if (savedTextModel && textModels.value.some(m => m.value === savedTextModel)) {
      emit('update:textModelValue', savedTextModel);
    } else if (!textModel.value && textModels.value.length > 0) {
      // 否则使用默认模型
      const defaultModel = textModels.value.find(m => m.value.includes('qwen')) || textModels.value[0];
      if (defaultModel) {
        emit('update:textModelValue', defaultModel.value);
      }
    }

    if (savedVisionModel && visionModels.value.some(m => m.value === savedVisionModel)) {
      emit('update:visionModelValue', savedVisionModel);
    } else if (!visionModel.value && visionModels.value.length > 0) {
      const defaultModel = visionModels.value.find(m => m.value.toLowerCase().includes('vision')) || visionModels.value[0];
      if (defaultModel) {
        emit('update:visionModelValue', defaultModel.value);
      }
    }
  } catch (error) {
    console.error('获取模型列表失败:', error);
  }
}

onMounted(() => {
  loadModels();
});
</script>

<style scoped>
.model-settings {
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.model-select {
  flex: 1;
}

.model-select label {
  display: block;
  margin-bottom: 4px;
  color: var(--text-color);
  font-weight: 500;
  font-size: 12px;
}

.model-select select {
  width: 100%;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: var(--background-color);
  color: var(--text-color);
  font-size: 12px;
  box-shadow: 0 0 0 1px var(--border-color);
  transition: box-shadow 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  padding-right: 32px;
}

.model-select select:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--primary-color);
}

.model-select select:hover {
  box-shadow: 0 0 0 1px var(--primary-color);
}
</style>