<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import ReadLaterDetail from '../../components/ReadLaterDetail.vue';

const articleId = ref('');

onMounted(() => {
  // 从 URL 参数获取 articleId
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('articleId');
  
  console.log('Article Viewer App mounted');
  console.log('URL:', window.location.href);
  console.log('articleId:', id);
  
  if (id) {
    articleId.value = id;
  } else {
    console.error('缺少 articleId 参数');
  }
});

// 关闭窗口
function handleClose() {
  window.close();
}

// 返回（关闭窗口或返回上一页）
function handleBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
}
</script>

<template>
  <div class="article-viewer-container">
    <ReadLaterDetail 
      v-if="articleId" 
      :articleId="articleId"
      @close="handleClose"
      @back="handleBack"
    />
    <div v-else class="error-state">
      <p>缺少文章ID参数</p>
    </div>
  </div>
</template>

<style>
:root {
  /* Light theme variables (default) */
  --background-color: white;
  --text-color: #333;
  --secondary-text-color: #666;
  --border-color: #ddd;
  --hover-bg-color: rgba(0, 0, 0, 0.02);
  --primary-color: #007bff;
}

/* Dark theme variables */
[data-theme='dark'] {
  --background-color: #1a1a1a;
  --text-color: #e0e0e0;
  --secondary-text-color: #a0a0a0;
  --border-color: #404040;
  --hover-bg-color: rgba(255, 255, 255, 0.05);
  --primary-color: #66b1ff;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
    'Helvetica Neue', sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
}

#app {
  width: 100%;
  height: 100%;
}

.article-viewer-container {
  width: 100%;
  height: 100vh;
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: #ff4444;
  font-size: 16px;
}
</style>
