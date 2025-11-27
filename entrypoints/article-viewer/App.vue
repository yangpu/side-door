<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import ReadLaterDetail from '../../components/ReadLaterDetail.vue';

const articleId = ref('');

onMounted(() => {
  // 从 URL 参数获取 articleId
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('articleId');
  
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
.article-viewer-container {
  width: 100%;
  height: 100vh;
  background-color: var(--sd-background-primary);
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
