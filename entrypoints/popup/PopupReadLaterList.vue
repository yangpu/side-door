<template>
  <div class="popup-article-list">
    <!-- Header -->
    <div class="list-header">
      <button @click="$emit('navigate', 'home')" class="back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h2>稍后阅读</h2>
      <div class="header-spacer"></div>
    </div>

    <!-- Content -->
    <div class="list-content">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="articles.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <h3>暂无文章</h3>
        <p>点击网页中的旁门按钮保存文章</p>
      </div>

      <!-- Article List -->
      <div v-else class="article-grid">
        <ArticleCard 
          v-for="article in articles" 
          :key="article.id" 
          :article="article"
          @click="openArticleInNewTab"
          @openFile="openFile"
          @openOriginalUrl="openOriginalUrl"
          @delete="deleteArticle"
        />
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button class="pagination-btn" @click="previousPage" :disabled="currentPage === 1">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <span class="pagination-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="pagination-btn" @click="nextPage" :disabled="currentPage === totalPages">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { browser } from 'wxt/browser';
import { ReadLaterService } from '../../services/readLaterService';
import ArticleCard from '../../components/ArticleCard.vue';
import type { Article } from '../../types/article';

const emit = defineEmits(['navigate', 'openArticleDetail']);

const loading = ref(false);
const articles = ref<Article[]>([]);
const currentPage = ref(1);
const pageSize = ref(9); // 3x3 grid
const totalPages = ref(0);
const total = ref(0);

// 加载文章列表
async function loadArticles() {
  loading.value = true;
  try {
    const result = await ReadLaterService.getArticles({
      page: currentPage.value,
      pageSize: pageSize.value,
    });
    articles.value = result.articles;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (error) {
    console.error('加载文章列表失败:', error);
  } finally {
    loading.value = false;
  }
}

// 在新标签页中打开文章内容（阅读模式）
// 使用reader页面打开，保持和阅读器弹窗完全一致的渲染效果
async function openArticleInNewTab(article: Article) {
  try {
    // 在新标签页中打开reader页面，并通过URL参数传递文章ID
    const readerBasePath = browser.runtime.getURL('/reader.html');
    const readerUrl = `${readerBasePath}?articleId=${article.id}`;
    window.open(readerUrl, '_blank');
  } catch (error) {
    console.error('打开文章失败:', error);
    alert('打开文章失败: ' + (error as Error).message);
  }
}

// 打开原文
function openOriginalUrl(url: string) {
  window.open(url, '_blank');
}

// 打开 HTML 或 PDF 文件
// HTML文件：图片base64编码的单文件，适合离线阅读但加载较慢
// PDF文件：直接打开
async function openFile(fileUrl: string) {
  if (!fileUrl) {
    alert('文件URL不存在');
    return;
  }

  // PDF 直接打开
  if (fileUrl.toLowerCase().endsWith('.pdf')) {
    window.open(fileUrl, '_blank');
    return;
  }

  // HTML 文件（base64编码图片的单文件版本）
  try {
    // 异步获取 HTML 内容
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const htmlContent = await response.text();
    
    // 创建 Blob URL 并在新标签页打开
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    
    // 页面加载后清理 Blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch (error) {
    console.error('打开HTML文件失败:', error);
    alert('无法打开HTML文件: ' + (error as Error).message);
  }
}

// 删除文章
async function deleteArticle(article: Article) {
  if (!confirm(`确定要删除「${article.title}」吗？`)) {
    return;
  }

  try {
    const result = await ReadLaterService.deleteArticle(article.id!);
    if (result.success) {
      // 从列表中移除
      articles.value = articles.value.filter((a) => a.id !== article.id);
      total.value--;

      // 如果当前页没有文章了，返回上一页
      if (articles.value.length === 0 && currentPage.value > 1) {
        currentPage.value--;
        await loadArticles();
      }
    } else {
      alert('删除失败: ' + (result.error || '未知错误'));
    }
  } catch (error) {
    console.error('删除文章失败:', error);
    alert('删除失败，请重试');
  }
}

// 上一页
async function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    await loadArticles();
  }
}

// 下一页
async function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    await loadArticles();
  }
}

onMounted(() => {
  loadArticles();
});
</script>

<style scoped>
.popup-article-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
}

/* Header */
.list-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--sd-border-color);
  background: var(--sd-background-primary);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--sd-border-color);
  border-radius: 6px;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--sd-hover-background);
  border-color: var(--sd-accent-color);
}

.list-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-spacer {
  width: 32px;
}

/* Content */
.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--sd-text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--sd-border-color);
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

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--sd-text-secondary);
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--sd-text-primary);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Article Grid */
.article-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid var(--sd-border-color);
  background: var(--sd-background-primary);
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--sd-border-color);
  border-radius: 6px;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--sd-hover-background);
  border-color: var(--sd-accent-color);
}

.pagination-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 13px;
  color: var(--sd-text-secondary);
  min-width: 60px;
  text-align: center;
}

/* Scrollbar */
.list-content::-webkit-scrollbar {
  width: 6px;
}

.list-content::-webkit-scrollbar-track {
  background: var(--sd-background-secondary);
}

.list-content::-webkit-scrollbar-thumb {
  background: var(--sd-border-color);
  border-radius: 3px;
}

.list-content::-webkit-scrollbar-thumb:hover {
  background: var(--sd-text-secondary);
}
</style>
