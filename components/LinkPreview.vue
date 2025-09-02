<template>
  <div class="link-preview" @mouseenter="showPreview = true" @mouseleave="showPreview = false">
    <a :href="url" target="_blank" rel="noopener noreferrer">
      <slot></slot>
    </a>

    <!-- 预览卡片 -->
    <div v-if="showPreview && previewData" class="preview-card">
      <div v-if="previewData.image" class="preview-image">
        <img :src="previewData.image" :alt="previewData.title" />
      </div>
      <div class="preview-content">
        <h3 class="preview-title">{{ previewData.title }}</h3>
        <p class="preview-description">{{ previewData.description }}</p>
        <span class="preview-domain">{{ getDomain(url) }}</span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="showPreview && isLoading" class="preview-loading">
      加载预览中...
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';

const props = defineProps<{
  url: string;
}>();

interface PreviewData {
  title: string;
  description: string;
  image?: string;
}

const showPreview = ref(false);
const isLoading = ref(false);
const previewData = ref<PreviewData | null>(null);

// 获取域名
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// 加载预览数据
async function loadPreview() {
  if (previewData.value || isLoading.value) return;

  isLoading.value = true;
  try {
    const response = await fetch(`/api/link-preview?url=${encodeURIComponent(props.url)}`);
    if (!response.ok) throw new Error('获取预览失败');
    previewData.value = await response.json();
  } catch (error) {
    console.error('加载预览失败:', error);
  } finally {
    isLoading.value = false;
  }
}

// 监听鼠标进入事件
watch(showPreview, (value) => {
  if (value) loadPreview();
});
</script>

<style scoped>
.link-preview {
  position: relative;
  display: inline-block;
}

.preview-card {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  width: 300px;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-top: 8px;
}

.preview-image {
  width: 100%;
  height: 150px;
  overflow: hidden;
}

.preview-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-content {
  padding: 12px;
}

.preview-title {
  margin: 0 0 8px;
  font-size: 1em;
  font-weight: 600;
  color: var(--text-color);
}

.preview-description {
  margin: 0 0 8px;
  font-size: 0.9em;
  color: var(--text-secondary-color);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-domain {
  font-size: 0.8em;
  color: var(--text-secondary-color);
}

.preview-loading {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  padding: 8px;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--text-secondary-color);
}
</style>