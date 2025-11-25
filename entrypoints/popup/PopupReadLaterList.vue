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
        <div v-for="article in articles" :key="article.id" class="article-card">
          <!-- Cover Image -->
          <div v-if="article.cover_image" class="article-cover" @click="openArticle(article)">
            <img :src="article.cover_image" :alt="article.title" />
          </div>

          <!-- Content -->
          <div class="article-content" @click="openArticle(article)">
            <h3 class="article-title">{{ article.title }}</h3>
            <p v-if="article.ai_summary || article.summary" class="article-summary">
              {{ article.ai_summary || article.summary }}
            </p>
            <div class="article-meta">
              <span v-if="article.author" class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {{ article.author }}
              </span>
              <span v-if="article.published_date" class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {{ formatDate(article.published_date) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="article-actions">
            <button class="action-btn primary" @click.stop="openArticleInNewTab(article)" title="在新标签页中打开">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              打开
            </button>
            <button class="action-btn" @click.stop="deleteArticle(article)" title="删除">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
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
import { ReadLaterService } from '../../services/readLaterService';
import type { Article } from '../../types/article';

const emit = defineEmits(['navigate']);

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

// 打开文章（在新标签页中）
function openArticle(article: Article) {
  window.open(article.url, '_blank');
}

// 在新标签页中打开
function openArticleInNewTab(article: Article) {
  window.open(article.url, '_blank');
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

// 格式化日期
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
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

.article-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--sd-border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
  background: var(--sd-background-primary);
}

.article-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: var(--sd-accent-color);
}

.article-cover {
  width: 100%;
  height: 120px;
  overflow: hidden;
  cursor: pointer;
  background: var(--sd-background-secondary);
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.article-cover:hover img {
  transform: scale(1.05);
}

.article-content {
  flex: 1;
  padding: 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.article-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--sd-text-primary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-summary {
  margin: 0;
  font-size: 12px;
  color: var(--sd-text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: var(--sd-text-secondary);
  margin-top: auto;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.meta-item svg {
  opacity: 0.7;
}

.article-actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid var(--sd-border-color);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid var(--sd-border-color);
  border-radius: 4px;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--sd-hover-background);
  border-color: var(--sd-accent-color);
}

.action-btn.primary {
  flex: 1;
  background: var(--sd-accent-color);
  color: white;
  border-color: var(--sd-accent-color);
}

.action-btn.primary:hover {
  opacity: 0.9;
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
