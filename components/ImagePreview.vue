<template>
  <div class="image-preview">
    <!-- 缩略图 -->
    <div class="thumbnail" @click="showFullscreen = true">
      <img :src="src" :alt="alt" loading="lazy" />
      <div class="zoom-hint">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </div>
    </div>

    <!-- 全屏预览 -->
    <div v-if="showFullscreen" class="fullscreen-preview" @click.self="showFullscreen = false">
      <div class="preview-content">
        <img :src="src" :alt="alt" ref="fullImage" @load="initZoom" />

        <!-- 工具栏 -->
        <div class="toolbar">
          <button @click="zoomIn" title="放大">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button @click="zoomOut" title="缩小">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button @click="resetZoom" title="重置">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 2v6h6"></path>
              <path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path>
              <path d="M21 22v-6h-6"></path>
              <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
            </svg>
          </button>
          <button @click="showFullscreen = false" title="关闭">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const props = defineProps<{
  src: string;
  alt?: string;
}>();

const showFullscreen = ref(false);
const fullImage = ref<HTMLImageElement | null>(null);
const scale = ref(1);

// 初始化缩放
function initZoom() {
  scale.value = 1;
  if (fullImage.value) {
    fullImage.value.style.transform = `scale(${scale.value})`;
  }
}

// 放大
function zoomIn() {
  scale.value = Math.min(scale.value + 0.2, 3);
  updateZoom();
}

// 缩小
function zoomOut() {
  scale.value = Math.max(scale.value - 0.2, 0.5);
  updateZoom();
}

// 重置缩放
function resetZoom() {
  scale.value = 1;
  updateZoom();
}

// 更新缩放
function updateZoom() {
  if (fullImage.value) {
    fullImage.value.style.transform = `scale(${scale.value})`;
  }
}
</script>

<style scoped>
.image-preview {
  display: inline-block;
}

.thumbnail {
  position: relative;
  cursor: zoom-in;
}

.thumbnail img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.zoom-hint {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.thumbnail:hover .zoom-hint {
  opacity: 1;
}

.zoom-hint svg {
  display: block;
  width: 20px;
  height: 20px;
  color: white;
}

.fullscreen-preview {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.preview-content img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  transition: transform 0.2s;
}

.toolbar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px;
  border-radius: 8px;
}

.toolbar button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: white;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.toolbar button:hover {
  opacity: 1;
}

.toolbar svg {
  display: block;
  width: 20px;
  height: 20px;
}
</style>