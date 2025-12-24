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
      <!-- Search Box with Refresh Button -->
      <div class="search-box">
        <div class="search-input-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="search-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            v-model="searchKeyword"
            placeholder="搜索文章标题、作者、摘要..."
            class="search-input"
            @input="onSearchInput"
          />
          <button v-if="searchKeyword" class="clear-btn" @click="clearSearch" aria-label="清除搜索">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div v-if="searching" class="search-spinner"></div>
        </div>
        <button class="refresh-btn" @click="refreshArticles" :disabled="loading || searching" title="刷新列表">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            :class="{ 'spinning': loading || searching }">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>

      <!-- Offline Status Banner -->
      <div v-if="offlineMessage" class="offline-banner">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
        <span>{{ offlineMessage }}</span>
      </div>

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
              <button class="action-btn delete-btn" @click="deleteArticle(article)" title="删除">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                删除
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
import { ref, onMounted, computed } from 'vue';
import { offlineService } from '../../utils/offlineService';
import { indexedDB } from '../../utils/indexedDB';
import type { Article } from '../../types/article';

const loading = ref(false);
const articles = ref<Article[]>([]);
const currentPage = ref(1);
const pageSize = ref(12);
const totalPages = ref(0);
const total = ref(0);
const isDarkMode = ref(false);
const isOffline = ref(false);
const networkStatus = ref<any>(null);
const searchKeyword = ref('');
const searching = ref(false);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// 计算显示的离线状态提示
const offlineMessage = computed(() => {
  if (!networkStatus.value) return '';
  if (!networkStatus.value.online) return '离线模式 - 显示缓存数据';
  if (!networkStatus.value.supabaseAvailable) return '服务暂时不可用 - 显示缓存数据';
  return '';
});

// 加载文章列表（使用离线优先策略）
async function loadArticles() {
  loading.value = true;
  try {
    // 更新网络状态
    networkStatus.value = offlineService.getNetworkStatus();
    isOffline.value = offlineService.shouldUseOfflineData();

    // 使用离线优先服务加载文章
    const result = await offlineService.getArticles({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value.trim() || undefined,
    });
    
    articles.value = result.articles;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (error) {
    console.error('加载文章列表失败:', error);
    
    // 如果加载失败，尝试从 IndexedDB 获取所有文章
    try {
      let allArticles = await indexedDB.getAllArticles();
      
      // 本地搜索过滤
      if (searchKeyword.value.trim()) {
        const keyword = searchKeyword.value.trim().toLowerCase();
        allArticles = allArticles.filter(article => 
          article.title?.toLowerCase().includes(keyword) ||
          article.author?.toLowerCase().includes(keyword) ||
          article.summary?.toLowerCase().includes(keyword) ||
          article.ai_summary?.toLowerCase().includes(keyword)
        );
      }
      
      const start = (currentPage.value - 1) * pageSize.value;
      const end = start + pageSize.value;
      articles.value = allArticles.slice(start, end);
      total.value = allArticles.length;
      totalPages.value = Math.ceil(allArticles.length / pageSize.value);
      isOffline.value = true;
    } catch (dbError) {
      console.error('从 IndexedDB 加载失败:', dbError);
    }
  } finally {
    loading.value = false;
    searching.value = false;
  }
}

// 搜索输入处理（防抖）
function onSearchInput() {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searching.value = true;
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    loadArticles();
  }, 500);
}

// 清除搜索
function clearSearch() {
  searchKeyword.value = '';
  currentPage.value = 1;
  loadArticles();
}

// 刷新文章列表
async function refreshArticles() {
  searchKeyword.value = '';
  currentPage.value = 1;
  await loadArticles();
}

// 打开文章（在阅读器中打开，支持离线缓存）
function openArticle(article: Article) {
  // 使用 article-viewer 页面（支持 PWA 离线优先）
  const readerUrl = `/article-viewer.html?articleId=${article.id}`;
  window.open(readerUrl, '_blank');
}

// 打开原文
function openOriginalUrl(url: string) {
  window.open(url, '_blank');
}

// 删除文章
async function deleteArticle(article: Article) {
  if (!confirm(`确定要删除「${article.title}」吗？\n\n此操作不可撤销。`)) {
    return;
  }

  try {
    const { ReadLaterService } = await import('../../services/readLaterService');
    const result = await ReadLaterService.deleteArticle(article.id!);
    if (result.success) {
      // 同时从 IndexedDB 删除
      try {
        await indexedDB.deleteArticle(article.id!);
      } catch (error) {
        console.warn('从缓存删除失败:', error);
      }
      
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
onMounted(async () => {
  // 初始化 IndexedDB
  await indexedDB.init();
  
  // 加载文章
  loadArticles();
  
  // 检查当前主题
  const theme = localStorage.getItem('READER_THEME') || 'light';
  isDarkMode.value = theme === 'dark';
  
  // 监听在线状态变化
  window.addEventListener('online', () => {
    loadArticles();
  });
  
  window.addEventListener('offline', () => {
    isOffline.value = true;
  });
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

/* Search Box */
.search-box {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid var(--sd-border-color);
  border-radius: 10px;
  background: var(--sd-background-primary);
  transition: all 0.2s;
}

.search-input-wrapper:focus-within {
  border-color: var(--sd-accent-color);
  box-shadow: 0 0 0 3px rgba(255, 123, 114, 0.1);
}

.search-icon {
  color: var(--sd-text-secondary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  background: transparent;
  color: var(--sd-text-primary);
}

.search-input::placeholder {
  color: var(--sd-text-secondary);
}

.clear-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--sd-text-secondary);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: var(--sd-hover-background);
  color: var(--sd-text-primary);
}

.search-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--sd-border-color);
  border-top-color: var(--sd-accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 1px solid var(--sd-border-color);
  border-radius: 10px;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--sd-accent-color);
  color: var(--sd-accent-color);
  background: var(--sd-hover-background);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn svg.spinning {
  animation: spin 1s linear infinite;
}

/* Offline Banner */
.offline-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #ffd93d 0%, #ffb938 100%);
  color: #333;
  border-radius: 8px;
  margin-bottom: 24px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(255, 185, 56, 0.3);
}

.offline-banner svg {
  flex-shrink: 0;
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
