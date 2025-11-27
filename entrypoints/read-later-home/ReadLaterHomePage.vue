<template>
  <div class="read-later-home">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="header-title">
          <img src="/icon/128.png" alt="SideDoor" class="logo" />
          <h1>SideDoor - 稍后阅读</h1>
        </div>
        <div class="header-actions">
          <button @click="toggleTheme" class="theme-toggle-btn" :title="isDarkMode ? '切换到浅色模式' : '切换到深色模式'">
            <svg v-if="!isDarkMode" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="articles.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <h2>暂无稍后阅读文章</h2>
        <p>安装 SideDoor 浏览器扩展，在网页中点击旁门按钮保存文章</p>
      </div>

      <!-- Article Grid -->
      <div v-else class="articles-container">
        <div class="article-grid">
          <article 
            v-for="article in articles" 
            :key="article.id" 
            class="article-card"
            @click="openArticle(article)"
          >
            <!-- 文章封面图 -->
            <div v-if="article.cover_image" class="article-cover">
              <img :src="article.cover_image" :alt="article.title" />
            </div>
            
            <div class="article-content">
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
              </div>
            </div>
            
            <div class="article-actions" @click.stop>
              <button 
                v-if="article.html_file_url" 
                class="action-btn" 
                @click="openFile(article.html_file_url)" 
                title="查看HTML"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                HTML
              </button>
              <button 
                v-if="article.pdf_file_url" 
                class="action-btn" 
                @click="openFile(article.pdf_file_url)" 
                title="查看PDF"
              >
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
              <button class="action-btn" @click="openOriginalUrl(article.url)" title="查看原文">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                原文
              </button>
            </div>
          </article>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <button 
            class="pagination-btn" 
            @click="previousPage" 
            :disabled="currentPage === 1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            上一页
          </button>
          <span class="pagination-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
          <button 
            class="pagination-btn" 
            @click="nextPage" 
            :disabled="currentPage === totalPages"
          >
            下一页
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <p>Powered by <a href="https://github.com/yourusername/side-door" target="_blank">SideDoor</a></p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ReadLaterService } from '../../services/readLaterService';
import type { Article } from '../../types/article';

const loading = ref(false);
const articles = ref<Article[]>([]);
const currentPage = ref(1);
const pageSize = ref(12);
const totalPages = ref(0);
const total = ref(0);
const isDarkMode = ref(false);

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

// 打开文章（在阅读器中打开）
function openArticle(article: Article) {
  // 使用独立的文章详情页面
  const readerUrl = `/article-detail.html?articleId=${article.id}`;
  window.open(readerUrl, '_blank');
}

// 打开原文
function openOriginalUrl(url: string) {
  window.open(url, '_blank');
}

// 打开 HTML 或 PDF 文件
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
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const htmlContent = await response.text();
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch (error) {
    console.error('打开HTML文件失败:', error);
    alert('无法打开HTML文件: ' + (error as Error).message);
  }
}

// 上一页
async function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    await loadArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// 下一页
async function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    await loadArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

// 切换主题
function toggleTheme() {
  const currentTheme = localStorage.getItem('READER_THEME') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('READER_THEME', newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
  document.body.setAttribute('data-theme', newTheme);
  isDarkMode.value = newTheme === 'dark';
}

// 初始化
onMounted(() => {
  loadArticles();
  
  // 检查当前主题
  const theme = localStorage.getItem('READER_THEME') || 'light';
  isDarkMode.value = theme === 'dark';
});
</script>

<style scoped>
.read-later-home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
}

/* Header */
.header {
  background: var(--sd-background-primary);
  border-bottom: 1px solid var(--sd-border-color);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  width: 48px;
  height: 48px;
  border-radius: 12px;
}

.header-title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--sd-text-primary);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.theme-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--sd-border-color);
  border-radius: 8px;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.theme-toggle-btn:hover {
  background: var(--sd-hover-background);
  border-color: var(--sd-accent-color);
}

/* Main Content */
.main-content {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 32px;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 20px;
  color: var(--sd-text-secondary);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--sd-border-color);
  border-top-color: var(--sd-accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 20px;
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
  padding: 120px 20px;
  text-align: center;
  color: var(--sd-text-secondary);
}

.empty-state svg {
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state h2 {
  margin: 0 0 12px 0;
  font-size: 24px;
  color: var(--sd-text-primary);
}

.empty-state p {
  margin: 0;
  font-size: 16px;
  max-width: 500px;
}

/* Articles Container */
.articles-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Article Grid */
.article-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.article-card {
  background: var(--sd-background-primary);
  border: 1px solid var(--sd-border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.article-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
  border-color: var(--sd-accent-color);
}

.article-cover {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: var(--sd-background-secondary);
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.article-card:hover .article-cover img {
  transform: scale(1.05);
}

.article-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  flex: 1;
}

.article-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--sd-text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-summary {
  margin: 0;
  font-size: 14px;
  color: var(--sd-text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: var(--sd-text-secondary);
  margin-top: auto;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-item svg {
  opacity: 0.7;
  flex-shrink: 0;
}

.article-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--sd-border-color);
  background: var(--sd-background-secondary);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid var(--sd-border-color);
  border-radius: 6px;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.action-btn:hover {
  background: var(--sd-hover-background);
  border-color: var(--sd-accent-color);
  color: var(--sd-accent-color);
}

.action-btn svg {
  flex-shrink: 0;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 40px 20px;
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 15px;
  border: 1px solid var(--sd-border-color);
  border-radius: 8px;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--sd-hover-background);
  border-color: var(--sd-accent-color);
  color: var(--sd-accent-color);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 15px;
  color: var(--sd-text-secondary);
  font-weight: 500;
}

/* Footer */
.footer {
  padding: 24px 32px;
  text-align: center;
  border-top: 1px solid var(--sd-border-color);
  background: var(--sd-background-secondary);
}

.footer p {
  margin: 0;
  font-size: 14px;
  color: var(--sd-text-secondary);
}

.footer a {
  color: var(--sd-accent-color);
  text-decoration: none;
  transition: opacity 0.2s;
}

.footer a:hover {
  opacity: 0.8;
}

/* Responsive Design */
@media (max-width: 768px) {
  .header-content {
    padding: 16px 20px;
  }

  .header-title h1 {
    font-size: 20px;
  }

  .logo {
    width: 40px;
    height: 40px;
  }

  .main-content {
    padding: 24px 20px;
  }

  .article-grid {
    grid-template-columns: 1fr;
  }

  .pagination-btn {
    padding: 10px 16px;
    font-size: 14px;
  }
}
</style>
