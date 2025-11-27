<template>
  <div class="popup-home">
    <!-- Header -->
    <div class="popup-home-header">
      <div class="header-title">
        <img src="/icon/128.png" alt="SideDoor" class="logo" />
        <h1>旁门</h1>
        <a href="http://localhost:3001" target="_blank" class="home-link" title="打开稍后阅读主页">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      </div>
    </div>

    <!-- Recent Articles Section -->
    <div class="recent-section">
      <div class="section-header">
        <h2>最近阅读</h2>
        <button v-if="recentArticles.length > 0" @click="viewAllArticles" class="view-all-btn">
          查看全部
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="recentArticles.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <p>暂无稍后阅读文章</p>
        <span class="hint">在网页中点击旁门按钮保存文章</span>
      </div>

      <!-- Recent Articles List -->
      <div v-else class="article-list">
        <ArticleCard 
          v-for="article in recentArticles" 
          :key="article.id" 
          :article="article"
          @click="openArticleInNewTab"
          @openFile="openFile"
          @openOriginalUrl="openOriginalUrl"
          @delete="deleteArticle"
        />
      </div>
    </div>

    <!-- Quick Actions Section -->
    <div class="actions-section">
      <h2>快捷操作</h2>
      <div class="action-grid">
        <button @click="blockCurrentPage" class="action-btn" :class="{ 'is-blocked': isPageBlocked }">
          <svg v-if="!isPageBlocked" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{{ isPageBlocked ? '解除屏蔽页面' : '屏蔽当前页面' }}</span>
        </button>
        <button @click="blockCurrentDomain" class="action-btn" :class="{ 'is-blocked': isDomainBlocked }">
          <svg v-if="!isDomainBlocked" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M2 12h20"></path>
            <path
              d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z">
            </path>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{{ isDomainBlocked ? '解除屏蔽网站' : '屏蔽当前网站' }}</span>
        </button>
        <button @click="manageBlocklist" class="action-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"></line>
            <line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line>
            <line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="1" y1="14" x2="7" y2="14"></line>
            <line x1="9" y1="8" x2="15" y2="8"></line>
            <line x1="17" y1="16" x2="23" y2="16"></line>
          </svg>
          <span>屏蔽管理</span>
        </button>
      </div>
    </div>

    <!-- Footer Info -->
    <div class="popup-footer">
      <p class="current-page-info">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        {{ currentPageTitle }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { browser } from 'wxt/browser';
import { ReadLaterService } from '../../services/readLaterService';
import { BlocklistService } from '../../services/blocklistService';
import ArticleCard from '../../components/ArticleCard.vue';
import type { Article } from '../../types/article';

const emit = defineEmits(['navigate', 'openArticleDetail']);

const loading = ref(false);
const recentArticles = ref<Article[]>([]);
const currentPageTitle = ref('当前页面');
const currentPageUrl = ref('');
const isPageBlocked = ref(false);
const isDomainBlocked = ref(false);

// 加载最近3篇文章
async function loadRecentArticles() {
  loading.value = true;
  try {
    const result = await ReadLaterService.getArticles({
      page: 1,
      pageSize: 3,
    });
    recentArticles.value = result.articles;
  } catch (error) {
    console.error('加载文章列表失败:', error);
  } finally {
    loading.value = false;
  }
}

// 获取当前标签页信息
async function loadCurrentTabInfo() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      currentPageTitle.value = tabs[0].title || '当前页面';
      currentPageUrl.value = tabs[0].url || '';
      
      // 检查屏蔽状态
      await checkBlockStatus();
    }
  } catch (error) {
    console.error('获取当前标签页信息失败:', error);
  }
}

// 检查当前页面的屏蔽状态
async function checkBlockStatus() {
  if (!currentPageUrl.value) return;
  
  try {
    // 检查页面级屏蔽
    const pageBlockItem = await BlocklistService.findPageBlockItem(currentPageUrl.value);
    isPageBlocked.value = !!pageBlockItem;
    
    // 检查域名级屏蔽
    const domain = BlocklistService.getDomain(currentPageUrl.value);
    if (domain) {
      const domainBlockItem = await BlocklistService.findDomainBlockItem(domain);
      isDomainBlocked.value = !!domainBlockItem;
    }
  } catch (error) {
    console.error('检查屏蔽状态失败:', error);
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
      recentArticles.value = recentArticles.value.filter((a) => a.id !== article.id);
      alert('文章已删除');
    } else {
      alert('删除失败: ' + (result.error || '未知错误'));
    }
  } catch (error) {
    console.error('删除文章失败:', error);
    alert('删除失败，请重试');
  }
}

// 查看所有文章
function viewAllArticles() {
  emit('navigate', 'articles');
}

// 屏蔽当前页面
async function blockCurrentPage() {
  if (!currentPageUrl.value) {
    alert('无法获取当前页面信息');
    return;
  }

  try {
    if (isPageBlocked.value) {
      // 解除屏蔽
      const pageBlockItem = await BlocklistService.findPageBlockItem(currentPageUrl.value);
      if (pageBlockItem) {
        await BlocklistService.removeBlocklistItem(pageBlockItem.id);
        isPageBlocked.value = false;
        alert('已解除屏蔽当前页面');
        
        // 通知当前标签页重新注入FAB按钮
        await reInjectFAB();
      }
    } else {
      // 添加屏蔽
      await BlocklistService.addBlocklistItem({
        type: 'page',
        url: currentPageUrl.value,
        title: currentPageTitle.value,
      });
      isPageBlocked.value = true;
      alert('已屏蔽当前页面，刷新页面后生效');
      
      // 刷新页面
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await browser.tabs.reload(tabs[0].id);
      }
    }
  } catch (error) {
    console.error('操作失败:', error);
    alert('操作失败，请重试');
  }
}

// 屏蔽当前网站
async function blockCurrentDomain() {
  if (!currentPageUrl.value) {
    alert('无法获取当前页面信息');
    return;
  }

  const domain = BlocklistService.getDomain(currentPageUrl.value);
  if (!domain) {
    alert('无法解析当前网站域名');
    return;
  }

  try {
    if (isDomainBlocked.value) {
      // 解除屏蔽
      const domainBlockItem = await BlocklistService.findDomainBlockItem(domain);
      if (domainBlockItem) {
        await BlocklistService.removeBlocklistItem(domainBlockItem.id);
        isDomainBlocked.value = false;
        alert(`已解除屏蔽网站 ${domain}`);
        
        // 通知当前标签页重新注入FAB按钮
        await reInjectFAB();
      }
    } else {
      // 添加屏蔽
      await BlocklistService.addBlocklistItem({
        type: 'domain',
        url: domain,
        title: `${domain} (整站)`,
      });
      isDomainBlocked.value = true;
      alert(`已屏蔽网站 ${domain}，刷新页面后生效`);
      
      // 刷新页面
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await browser.tabs.reload(tabs[0].id);
      }
    }
  } catch (error) {
    console.error('操作失败:', error);
    alert('操作失败，请重试');
  }
}

// 重新注入FAB按钮
async function reInjectFAB() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      // 发送消息给 content script
      await browser.tabs.sendMessage(tabs[0].id, { type: 'REINJECT_FAB' });
    }
  } catch (error) {
    console.error('重新注入FAB失败:', error);
  }
}

// 管理屏蔽列表
function manageBlocklist() {
  emit('navigate', 'blocklist');
}

onMounted(() => {
  loadRecentArticles();
  loadCurrentTabInfo();
});
</script>

<style scoped>
.popup-home {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
}

/* Header */
.popup-home-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--sd-border-color);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.header-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--sd-text-primary);
}

.home-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
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

/* Recent Section */
.recent-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--sd-border-color);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--sd-text-primary);
}

.view-all-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid var(--sd-border-color);
  border-radius: 6px;
  background: var(--sd-background-primary);
  color: var(--sd-accent-color);
  cursor: pointer;
  transition: all 0.2s;
}

.view-all-btn:hover {
  background: var(--sd-hover-background);
  border-color: var(--sd-accent-color);
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: var(--sd-text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--sd-border-color);
  border-top-color: var(--sd-accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
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
  padding: 32px 20px;
  text-align: center;
  color: var(--sd-text-secondary);
}

.empty-state svg {
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: var(--sd-text-primary);
}

.empty-state .hint {
  font-size: 12px;
  color: var(--sd-text-secondary);
}

/* Article List */
.article-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Actions Section */
.actions-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--sd-border-color);
}

.actions-section h2 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--sd-text-primary);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: 1px solid var(--sd-border-color);
  border-radius: 8px;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.action-btn:hover {
  background: var(--sd-hover-background);
  border-color: var(--sd-accent-color);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-btn.is-blocked {
  background: var(--sd-accent-color);
  color: white;
  border-color: var(--sd-accent-color);
}

.action-btn.is-blocked:hover {
  opacity: 0.9;
}

.action-btn svg {
  color: var(--sd-accent-color);
}

.action-btn.is-blocked svg {
  color: white;
}

.action-btn span {
  text-align: center;
  line-height: 1.3;
}

/* Footer */
.popup-footer {
  padding: 12px 20px;
  margin-top: auto;
}

.current-page-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12px;
  color: var(--sd-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.current-page-info svg {
  flex-shrink: 0;
  opacity: 0.7;
}

/* Scrollbar */
.popup-home::-webkit-scrollbar {
  width: 6px;
}

.popup-home::-webkit-scrollbar-track {
  background: var(--sd-background-secondary);
}

.popup-home::-webkit-scrollbar-thumb {
  background: var(--sd-border-color);
  border-radius: 3px;
}

.popup-home::-webkit-scrollbar-thumb:hover {
  background: var(--sd-text-secondary);
}
</style>
