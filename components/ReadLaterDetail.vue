<template>
  <div class="read-later-detail">
    <!-- Header -->
    <div class="detail-header">
      <button class="back-btn" @click="$emit('back')" title="返回列表">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        返回
      </button>
      <button class="close-btn" @click="$emit('close')" aria-label="关闭">×</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- Article Content -->
    <div v-else-if="article" class="detail-content">
      <div class="article-header">
        <h1 class="article-title">{{ article.title }}</h1>
        <div class="article-meta">
          <span v-if="article.author" class="meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {{ article.author }}
          </span>
          <span v-if="article.published_date" class="meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {{ formatDate(article.published_date) }}
          </span>
          <span v-if="article.length" class="meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            {{ article.length }} 字
          </span>
          <button class="original-link-btn" @click="openOriginalUrl" title="查看原文">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            查看原文
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div v-if="article.summary" class="article-summary">
        <h3>摘要</h3>
        <div v-html="article.summary"></div>
      </div>

      <!-- Main Content -->
      <div class="article-body" v-html="displayContent"></div>
    </div>

    <!-- Error State -->
    <div v-else class="error-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h3>加载失败</h3>
      <p>无法加载文章内容</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ReadLaterService } from '../services/readLaterService';
import type { Article } from '../types/article';

const props = defineProps<{
  articleId: string;
}>();

const emit = defineEmits(['close', 'back']);

const loading = ref(false);
const article = ref<Article | null>(null);

// 加载文章详情
async function loadArticle() {
  loading.value = true;
  try {
    const result = await ReadLaterService.getArticleById(props.articleId);
    if (result) {
      article.value = result;
    }
  } catch (error) {
    console.error('加载文章详情失败:', error);
  } finally {
    loading.value = false;
  }
}

// 显示内容(优先使用替换后的图片URL)
const displayContent = computed(() => {
  return article.value?.content || '';
});

// 打开原文
function openOriginalUrl() {
  if (article.value?.url) {
    window.open(article.value.url, '_blank');
  }
}

// 格式化日期
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// 组件挂载时加载文章
onMounted(() => {
  loadArticle();
});
</script>

<style scoped>
.read-later-detail {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--background-color);
  color: var(--text-color);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--background-color);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 14px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-color);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--hover-bg-color);
  border-color: var(--primary-color, #007bff);
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--secondary-text-color);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  line-height: 1;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--hover-bg-color);
  color: var(--text-color);
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

/* Loading & Error States */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 60px 20px;
  color: var(--secondary-text-color);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color, #007bff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
  color: #f44;
}

.error-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--text-color);
}

.error-state p {
  margin: 0;
  font-size: 14px;
}

/* Article Header */
.article-header {
  margin-bottom: 32px;
}

.article-title {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 16px 0;
  color: var(--text-color);
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  font-size: 14px;
  color: var(--secondary-text-color);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-item svg {
  opacity: 0.7;
}

.original-link-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-color);
  color: var(--primary-color, #007bff);
  cursor: pointer;
  transition: all 0.2s;
}

.original-link-btn:hover {
  background: var(--hover-bg-color);
  border-color: var(--primary-color, #007bff);
}

/* Article Summary */
.article-summary {
  padding: 20px;
  background: var(--hover-bg-color, #f5f5f5);
  border-left: 4px solid var(--primary-color, #007bff);
  border-radius: 6px;
  margin-bottom: 32px;
}

.article-summary h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.article-summary :deep(p) {
  margin: 0;
  line-height: 1.6;
  color: var(--secondary-text-color);
}

/* Article Body */
.article-body {
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-color);
}

.article-body :deep(h1),
.article-body :deep(h2),
.article-body :deep(h3),
.article-body :deep(h4),
.article-body :deep(h5),
.article-body :deep(h6) {
  margin: 24px 0 16px 0;
  font-weight: 600;
  line-height: 1.3;
}

.article-body :deep(p) {
  margin: 0 0 16px 0;
}

.article-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
}

.article-body :deep(pre) {
  background: var(--hover-bg-color, #f5f5f5);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 16px 0;
}

.article-body :deep(code) {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 14px;
}

.article-body :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 20px;
  border-left: 4px solid var(--border-color);
  background: var(--hover-bg-color, #f5f5f5);
  border-radius: 4px;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: 16px 0;
  padding-left: 24px;
}

.article-body :deep(li) {
  margin: 8px 0;
}

.article-body :deep(a) {
  color: var(--primary-color, #007bff);
  text-decoration: none;
}

.article-body :deep(a:hover) {
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .detail-content {
    padding: 20px;
  }

  .article-title {
    font-size: 24px;
  }

  .article-body {
    font-size: 15px;
  }
}
</style>
