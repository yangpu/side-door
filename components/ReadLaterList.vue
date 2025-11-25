<template>
  <div class="read-later-container">
    <!-- Header -->
    <div class="read-later-header">
      <h2>稍后阅读</h2>
      <button class="close-btn" @click="$emit('close')" aria-label="关闭">×</button>
    </div>

    <!-- Content -->
    <div class="read-later-content">
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
        <p>点击设置中的「稍后阅读」保存文章</p>
      </div>

      <!-- Article List -->
      <div v-else class="article-list">
        <div v-for="article in articles" :key="article.id" class="article-card">
          <!-- 文章封面图 -->
          <div v-if="article.cover_image" class="article-cover" @click="openArticle(article)">
            <img :src="article.cover_image" :alt="article.title" />
          </div>
          
          <div class="article-card-content" @click="openArticle(article)">
            <h3 class="article-title">{{ article.title }}</h3>
            <p v-if="article.ai_summary || article.summary" class="article-summary">
              {{ article.ai_summary || article.summary }}
            </p>
            <div class="article-meta">
              <span v-if="article.author" class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {{ article.author }}
              </span>
              <span v-if="article.published_date" class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {{ formatDate(article.published_date) }}
              </span>
              <span v-if="article.length" class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                {{ article.length }} 字
              </span>
              <span v-if="article.language" class="meta-item">{{ article.language }}</span>
            </div>
          </div>
          
          <div class="article-actions">
            <button v-if="article.html_file_url" class="action-btn" @click.stop="openFile(article.html_file_url)" title="查看HTML">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              HTML
            </button>
            <button v-if="article.pdf_file_url" class="action-btn" @click.stop="openFile(article.pdf_file_url)" title="查看PDF">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              PDF
            </button>
            <button class="action-btn" @click.stop="openOriginalUrl(article.url)" title="查看原文">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              原文
            </button>
            <button class="action-btn delete-btn" @click.stop="deleteArticle(article)" title="删除">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              删除
            </button>
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
          上一页
        </button>
        <span class="pagination-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button class="pagination-btn" @click="nextPage" :disabled="currentPage === totalPages">
          下一页
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ReadLaterService } from '../services/readLaterService';
import type { Article } from '../types/article';
import { toast } from '../utils/toast';

const emit = defineEmits(['close', 'openArticle']);

const loading = ref(false);
const articles = ref<Article[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
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
    toast.error('加载失败: ' + (error as Error).message);
  } finally {
    loading.value = false;
  }
}

// 打开文章
function openArticle(article: Article) {
  emit('openArticle', article);
}

// 打开原文
function openOriginalUrl(url: string) {
  window.open(url, '_blank');
}

// 打开 HTML 或 PDF 文件
async function openFile(fileUrl: string) {
  // PDF 直接打开
  if (!fileUrl.includes('.html')) {
    window.open(fileUrl, '_blank');
    return;
  }

  // HTML 文件需要特殊处理以确保渲染而非显示源码
  try {
    // 先打开一个新窗口（避免 popup 被拦截）
    const newWindow = window.open('about:blank', '_blank');
    if (!newWindow) {
      toast.error('请允许弹出窗口');
      return;
    }

    // 显示加载提示
    newWindow.document.write('<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div>加载中...</div></body></html>');

    // 异步获取 HTML 内容
    const response = await fetch(fileUrl);
    const htmlContent = await response.text();
    
    // 创建 Blob URL 并加载
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    
    // 在新窗口中加载内容
    newWindow.location.href = blobUrl;
    
    // 页面加载后清理 Blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch (error) {
    console.error('打开HTML文件失败:', error);
    toast.error('无法打开HTML文件');
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
      toast.success('文章已删除');
      // 从列表中移除
      articles.value = articles.value.filter((a) => a.id !== article.id);
      total.value--;
      
      // 如果当前页没有文章了，返回上一页
      if (articles.value.length === 0 && currentPage.value > 1) {
        currentPage.value--;
        await loadArticles();
      }
    } else {
      toast.error('删除失败: ' + (result.error || '未知错误'));
    }
  } catch (error) {
    console.error('删除文章失败:', error);
    toast.error('删除失败: ' + (error as Error).message);
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
    return date.toLocaleDateString('zh-CN');
  } catch {
    return dateStr;
  }
}

// 组件挂载时加载文章
onMounted(() => {
  loadArticles();
});
</script>

<style scoped>
.read-later-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--background-color);
  color: var(--text-color);
}

.read-later-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--background-color);
}

.read-later-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
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

.read-later-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--secondary-text-color);
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--text-color);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Article List */
.article-list {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.article-card {
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.article-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: var(--primary-color, #007bff);
}

.article-cover {
  width: 100%;
  height: 180px;
  overflow: hidden;
  cursor: pointer;
  background: var(--hover-bg-color);
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

.article-card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  flex: 1;
  cursor: pointer;
}

.article-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-summary {
  margin: 0;
  font-size: 14px;
  color: var(--secondary-text-color);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--secondary-text-color);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-item svg {
  opacity: 0.7;
}

.article-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-color);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.action-btn:hover {
  background: var(--hover-bg-color);
  border-color: var(--primary-color, #007bff);
}

.action-btn svg {
  flex-shrink: 0;
}

.delete-btn:hover {
  background: #fee;
  border-color: #f44;
  color: #f44;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding: 16px;
}

.pagination-btn {
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

.pagination-btn:hover:not(:disabled) {
  background: var(--hover-bg-color);
  border-color: var(--primary-color, #007bff);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: var(--secondary-text-color);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .article-list {
    grid-template-columns: 1fr;
  }
}
</style>
