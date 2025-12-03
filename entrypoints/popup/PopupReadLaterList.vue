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
      <h2>
        稍后阅读
        <span v-if="cacheStatus" class="cache-indicator" :title="fromCache && !isOffline ? '从缓存加载' : '离线模式'">
          {{ cacheStatus }}
        </span>
      </h2>
      <a href="http://localhost:8080" target="_blank" class="home-link" title="打开稍后阅读主页">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </a>
    </div>

    <!-- Search Box -->
    <div class="search-box">
      <div class="search-input-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="search-icon">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索文章..."
          class="search-input"
          @input="onSearchInput"
        />
        <button v-if="searchKeyword" class="clear-btn" @click="clearSearch" aria-label="清除搜索">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div v-if="searching" class="search-spinner"></div>
      </div>
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
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { browser } from 'wxt/browser';
import { offlineService } from '../../utils/offlineService';
import { indexedDB } from '../../utils/indexedDB';
import ArticleCard from '../../components/ArticleCard.vue';
import type { Article } from '../../types/article';

const emit = defineEmits(['navigate', 'openArticleDetail']);

const loading = ref(false);
const searching = ref(false);
const articles = ref<Article[]>([]);
const currentPage = ref(1);
const pageSize = ref(9); // 3x3 grid
const totalPages = ref(0);
const total = ref(0);
const fromCache = ref(false);
const isOffline = ref(false);
const searchKeyword = ref('');

// RxJS Subject 用于搜索输入
const searchSubject = new Subject<string>();
let searchSubscription: Subscription | null = null;

// 缓存状态指示
const cacheStatus = computed(() => {
  if (fromCache.value && !isOffline.value) {
    return '⚡';
  }
  if (isOffline.value) {
    return '📡';
  }
  return '';
});

// 初始化搜索订阅
function initSearchSubscription() {
  searchSubscription = searchSubject.pipe(
    tap(() => {
      searching.value = true;
    }),
    debounceTime(500), // 500ms 去抖动
    distinctUntilChanged(), // 只有值变化时才触发
    switchMap(async (keyword) => {
      // switchMap 会自动取消之前未完成的请求
      currentPage.value = 1; // 搜索时重置到第一页
      if (keyword.trim()) {
        return searchArticles(keyword);
      } else {
        return loadArticlesInternal();
      }
    })
  ).subscribe({
    next: () => {
      searching.value = false;
    },
    error: (error) => {
      console.error('搜索出错:', error);
      searching.value = false;
    }
  });
}

// 搜索输入处理
function onSearchInput() {
  searchSubject.next(searchKeyword.value);
}

// 清除搜索
function clearSearch() {
  searchKeyword.value = '';
  searchSubject.next('');
}

// 搜索文章
async function searchArticles(keyword: string) {
  try {
    const { ReadLaterService } = await import('../../services/readLaterService');
    const result = await ReadLaterService.searchArticles(keyword, {
      page: currentPage.value,
      pageSize: pageSize.value,
    });
    
    articles.value = result.articles;
    total.value = result.total;
    totalPages.value = result.totalPages;
    fromCache.value = false;
    isOffline.value = false;
  } catch (error) {
    console.error('搜索文章失败:', error);
  }
}

// 加载文章列表（使用离线优先策略）
async function loadArticles() {
  // 如果有搜索关键字，使用搜索
  if (searchKeyword.value.trim()) {
    searching.value = true;
    await searchArticles(searchKeyword.value);
    searching.value = false;
    return;
  }
  
  loading.value = true;
  await loadArticlesInternal();
  loading.value = false;
}

// 内部加载文章方法
async function loadArticlesInternal() {
  fromCache.value = false;
  
  try {
    const startTime = performance.now();
    
    // 使用离线优先服务加载文章
    const result = await offlineService.getArticles({
      page: currentPage.value,
      pageSize: pageSize.value,
    });
    
    const loadTime = performance.now() - startTime;
    
    articles.value = result.articles;
    total.value = result.total;
    totalPages.value = result.totalPages;
    
    // 检查是否从缓存加载
    fromCache.value = loadTime < 100;
    isOffline.value = offlineService.shouldUseOfflineData();
  } catch (error) {
    console.error('加载文章列表失败:', error);
    
    // 如果加载失败，尝试从 IndexedDB 获取所有文章
    try {
      const allArticles = await indexedDB.getAllArticles();
      const start = (currentPage.value - 1) * pageSize.value;
      const end = start + pageSize.value;
      articles.value = allArticles.slice(start, end);
      total.value = allArticles.length;
      totalPages.value = Math.ceil(allArticles.length / pageSize.value);
      isOffline.value = true;
      fromCache.value = true;
    } catch (dbError) {
      console.error('从 IndexedDB 加载失败:', dbError);
    }
  }
}

// 在新标签页中打开文章内容（阅读模式）
// 使用article-viewer页面打开，支持PWA离线缓存
async function openArticleInNewTab(article: Article) {
  try {
    if (!article.id) {
      console.error('文章ID不存在');
      return;
    }
    
    // 预加载文章数据到缓存（提升打开速度）
    offlineService.getArticle(article.id).catch(err => {
      console.warn('[PWA Popup] 预加载文章失败:', err);
    });
    
    // 在新标签页中打开article-viewer页面
    const viewerBasePath = browser.runtime.getURL('/article-viewer.html');
    const viewerUrl = `${viewerBasePath}?articleId=${article.id}`;
    window.open(viewerUrl, '_blank');
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

onMounted(async () => {
  // 初始化搜索订阅
  initSearchSubscription();
  
  // 初始化 IndexedDB
  await indexedDB.init().catch(err => {
    console.warn('IndexedDB 初始化失败:', err);
  });
  
  // 加载文章
  loadArticles();
  
  // 监听在线状态变化
  const handleOnline = () => {
    loadArticles();
  };
  
  const handleOffline = () => {
    isOffline.value = true;
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
});

// 组件卸载时清理订阅
onUnmounted(() => {
  if (searchSubscription) {
    searchSubscription.unsubscribe();
  }
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
  display: flex;
  align-items: center;
  gap: 6px;
}

.cache-indicator {
  display: inline-flex;
  align-items: center;
  font-size: 16px;
  opacity: 0.8;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 0.8;
    transform: scale(1);
  }
}

.home-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--sd-border-color);
  border-radius: 6px;
  background: var(--sd-background-primary);
  color: var(--sd-text-secondary);
  text-decoration: none;
  transition: all 0.2s;
}

.home-link:hover {
  background: var(--sd-hover-background);
  border-color: var(--sd-accent-color);
  color: var(--sd-accent-color);
}

/* Search Box */
.search-box {
  padding: 8px 16px;
  border-bottom: 1px solid var(--sd-border-color);
  background: var(--sd-background-primary);
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--sd-border-color);
  border-radius: 6px;
  background: var(--sd-background-primary);
  transition: all 0.2s;
}

.search-input-wrapper:focus-within {
  border-color: var(--sd-accent-color);
  box-shadow: 0 0 0 2px rgba(255, 123, 114, 0.1);
}

.search-icon {
  color: var(--sd-text-secondary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
  color: var(--sd-text-primary);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--sd-text-secondary);
}

.clear-btn {
  background: none;
  border: none;
  padding: 2px;
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
  width: 14px;
  height: 14px;
  border: 2px solid var(--sd-border-color);
  border-top-color: var(--sd-accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
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
