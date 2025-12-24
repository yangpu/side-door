<template>
  <div class="read-later-container">
    <!-- Header -->
    <div class="read-later-header">
      <h2>稍后阅读</h2>
      <button class="close-btn" @click="$emit('close')" aria-label="关闭">×</button>
    </div>

    <!-- Search Box -->
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
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          :class="{ 'spinning': loading || searching }">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="read-later-content">
      <!-- Offline/Cache Status Banner -->
      <div v-if="offlineMessage" class="status-banner" :class="{ 'cache-banner': fromCache && !isOffline, 'offline-banner': isOffline }">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
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
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { offlineService } from '../utils/offlineService';
import { indexedDB } from '../utils/indexedDB';
import type { Article } from '../types/article';
import { toast } from '../utils/toast';

const emit = defineEmits(['close', 'openArticle']);

const loading = ref(false);
const searching = ref(false);
const articles = ref<Article[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const totalPages = ref(0);
const total = ref(0);
const isOffline = ref(false);
const fromCache = ref(false);
const searchKeyword = ref('');

// RxJS Subject 用于搜索输入
const searchSubject = new Subject<string>();
let searchSubscription: Subscription | null = null;

// 离线状态提示
const offlineMessage = computed(() => {
  if (fromCache.value && !isOffline.value) {
    return '⚡ 从缓存加载（瞬时响应）';
  }
  if (isOffline.value) {
    return '📡 离线模式 - 显示缓存数据';
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
      toast.error('搜索失败');
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

// 刷新文章列表
async function refreshArticles() {
  searchKeyword.value = '';
  currentPage.value = 1;
  await loadArticles();
}

// 搜索文章
async function searchArticles(keyword: string) {
  try {
    const { ReadLaterService } = await import('../services/readLaterService');
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
    toast.error('搜索失败: ' + (error as Error).message);
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

// 内部加载文章方法（不设置 loading 状态）
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
    // console.log(`[PWA] 文章列表加载完成，耗时: ${loadTime.toFixed(2)}ms`);
    
    articles.value = result.articles;
    total.value = result.total;
    totalPages.value = result.totalPages;
    
    // 检查是否从缓存加载
    fromCache.value = loadTime < 100; // 如果加载时间小于100ms，很可能是缓存
    isOffline.value = offlineService.shouldUseOfflineData();
    
    // 显示加载来源提示
    if (fromCache.value && !isOffline.value) {
      // console.log('[PWA] ⚡ 瞬时响应：从缓存加载');
    }
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
      
      toast.warning('网络不可用，显示离线数据');
    } catch (dbError) {
      console.error('从 IndexedDB 加载失败:', dbError);
      toast.error('加载失败: ' + (error as Error).message);
    }
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
    const { ReadLaterService } = await import('../services/readLaterService');
    const result = await ReadLaterService.deleteArticle(article.id!);
    if (result.success) {
      // 同时从 IndexedDB 删除
      try {
        await indexedDB.deleteArticle(article.id!);
        // console.log('[PWA] 已从缓存删除文章');
      } catch (error) {
        console.warn('[PWA] 从缓存删除失败:', error);
      }
      
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
onMounted(async () => {
  // 初始化搜索订阅
  initSearchSubscription();
  
  // 初始化 IndexedDB
  await indexedDB.init().catch(err => {
    console.warn('[PWA] IndexedDB 初始化失败:', err);
  });
  
  // 加载文章
  loadArticles();
  
  // 监听在线状态变化
  const handleOnline = () => {
    // console.log('[PWA] 网络已连接，重新加载数据');
    loadArticles();
  };
  
  const handleOffline = () => {
    // console.log('[PWA] 网络已断开，使用离线数据');
    isOffline.value = true;
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // 组件卸载时清理事件监听
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
});

// 组件卸载时清理订阅
onUnmounted(() => {
  if (searchSubscription) {
    searchSubscription.unsubscribe();
  }
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

/* Search Box */
.search-box {
  display: flex;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--background-color);
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-color);
  transition: all 0.2s;
}

.search-input-wrapper:focus-within {
  border-color: var(--primary-color, #007bff);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.search-icon {
  color: var(--secondary-text-color);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
  color: var(--text-color);
}

.search-input::placeholder {
  color: var(--secondary-text-color);
}

.clear-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--secondary-text-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: var(--hover-bg-color);
  color: var(--text-color);
}

.search-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color, #007bff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-color);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--primary-color, #007bff);
  color: var(--primary-color, #007bff);
  background: var(--hover-bg-color);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn svg.spinning {
  animation: spin 1s linear infinite;
}

.read-later-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* Status Banner */
.status-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 13px;
  font-weight: 500;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cache-banner {
  background: linear-gradient(135deg, #d4f1d4 0%, #b8e6b8 100%);
  color: #2d5f2d;
  border: 1px solid #8fdb8f;
}

.offline-banner {
  background: linear-gradient(135deg, #ffd93d 0%, #ffb938 100%);
  color: #664d00;
  border: 1px solid #ffb938;
}

.status-banner svg {
  flex-shrink: 0;
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
