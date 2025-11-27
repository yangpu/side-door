<template>
  <div class="menu-container">
    <Reader v-if="parsedContent" :html="parsedContent" :url="currentTabUrl" :refreshKey="refreshKey" />
    <div v-else-if="loading" class="loading">
      <div class="spinner"></div>
      <p>加载文章中...</p>
    </div>
    <div v-else class="error">
      <p>{{ errorMessage }}</p>
      <button @click="loadArticleFromUrl" class="retry-btn">重试</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import Reader from './Reader.vue';
import { ReadLaterService } from '../services/readLaterService';

const currentTabUrl = ref('');
const parsedContent = ref('');
const refreshKey = ref(0);
const loading = ref(true);
const errorMessage = ref('');

// 从 URL 参数加载文章
async function loadArticleFromUrl() {
  loading.value = true;
  errorMessage.value = '';
  
  try {
    console.log('开始加载文章...');
    console.log('当前URL:', window.location.href);
    
    // 从URL中解析出articleId参数
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('articleId');
    
    console.log('解析到的 articleId:', articleId);
    
    if (!articleId) {
      errorMessage.value = '缺少文章ID参数';
      loading.value = false;
      return;
    }

    console.log('正在从 Supabase 加载文章...');
    
    // 从Supabase加载文章内容
    const article = await ReadLaterService.getArticleById(articleId);
    
    console.log('加载到的文章:', article);
    
    if (article && article.content) {
      // 构造包含文章内容的HTML
      const articleHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${article.title || '文章'}</title>
</head>
<body>
  <article>
    <h1>${article.title || ''}</h1>
    ${article.author ? `<p class="author">作者: ${article.author}</p>` : ''}
    ${article.published_date ? `<p class="date">发布时间: ${new Date(article.published_date).toLocaleDateString('zh-CN')}</p>` : ''}
    <div class="content">${article.content}</div>
  </article>
</body>
</html>`;
      
      console.log('文章 HTML 已构造，长度:', articleHtml.length);
      
      parsedContent.value = articleHtml;
      currentTabUrl.value = article.url || '';
      refreshKey.value++;
      loading.value = false;
      
      console.log('文章加载完成');
    } else {
      console.error('文章数据异常:', article);
      errorMessage.value = article ? '文章内容为空' : '文章不存在';
      loading.value = false;
    }
  } catch (error) {
    console.error('加载文章失败:', error);
    errorMessage.value = `加载文章失败: ${(error as Error).message}`;
    loading.value = false;
  }
}

// 组件挂载时自动加载文章
onMounted(() => {
  setTimeout(() => {
    loadArticleFromUrl();
  }, 100);
});
</script>

<style scoped>
/* 确保菜单组件不会导致横向滚动 */
.menu-container {
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  background-color: var(--sd-background-primary);
  color: var(--sd-text-primary);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--sd-text-primary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--sd-border-color);
  border-top-color: var(--sd-accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #ff4444;
  text-align: center;
  padding: 20px;
}

.error p {
  margin-bottom: 16px;
  font-size: 16px;
}

.retry-btn {
  padding: 8px 16px;
  background: var(--sd-accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover {
  opacity: 0.9;
}

:deep(.reader-content) {
  width: 100%;
}
</style>
