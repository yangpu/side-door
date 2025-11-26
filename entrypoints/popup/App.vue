<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { browser } from 'wxt/browser';
import PopupHome from './PopupHome.vue';
import PopupReadLaterList from './PopupReadLaterList.vue';
import PopupBlocklistManager from './PopupBlocklistManager.vue';
import ReadLaterDetail from '../../components/ReadLaterDetail.vue';
import type { Article } from '../../types/article';

type Page = 'home' | 'articles' | 'blocklist' | 'article-detail';

const currentPage = ref<Page>('home');
const previousPage = ref<Page>('home');
const selectedArticleId = ref<string | null>(null);

// 同步主题
const syncTheme = () => {
  const theme = localStorage.getItem('READER_THEME') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
};

// 页面导航
function navigateTo(page: Page) {
  if (currentPage.value !== 'article-detail') {
    previousPage.value = currentPage.value;
  }
  currentPage.value = page;
  if (page !== 'article-detail') {
    selectedArticleId.value = null;
  }
}

// 打开文章详情
function openArticleDetail(articleId: string) {
  previousPage.value = currentPage.value;
  selectedArticleId.value = articleId;
  currentPage.value = 'article-detail';
}

// 从详情页返回
function backFromDetail() {
  selectedArticleId.value = null;
  currentPage.value = previousPage.value;
}

// 在新标签页打开文章
function openArticleInNewTab(article: Article) {
  window.open(article.url, '_blank');
}

onMounted(async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs[0] && tabs[0].url) {
    updateTooltip(tabs[0].url);
  }

  // 初始同步主题
  syncTheme();

  // 监听来自父窗口的消息
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'syncTheme') {
      localStorage.setItem('READER_THEME', event.data.theme);
      syncTheme();
    }
  });

  // 监听主题变化
  window.addEventListener('storage', (e) => {
    if (e.key === 'READER_THEME') {
      syncTheme();
    }
  });
});

function updateTooltip(url: string) {
  let tooltip = '旁门 - 管理中心';
  browser.action.setTitle({ title: tooltip });
}
</script>

<template>
  <div class="app-container">
    <!-- Home Page -->
    <PopupHome v-if="currentPage === 'home'" @navigate="navigateTo" @openArticleDetail="openArticleDetail" />

    <!-- Articles List Page -->
    <PopupReadLaterList v-else-if="currentPage === 'articles'" @navigate="navigateTo"
      @openArticleDetail="openArticleDetail" />

    <!-- Blocklist Manager Page -->
    <PopupBlocklistManager v-else-if="currentPage === 'blocklist'" @navigate="navigateTo" />

    <!-- Article Detail Page -->
    <ReadLaterDetail v-else-if="currentPage === 'article-detail' && selectedArticleId" :articleId="selectedArticleId"
      @back="backFromDetail" @close="backFromDetail" />
  </div>
</template>

<style>
:root {
  /* Light theme variables (default) */
  --sd-background-primary: white;
  --sd-background-secondary: #f5f5f5;
  --sd-text-primary: #333;
  --sd-text-secondary: #666;
  --sd-border-color: #ddd;
  --sd-hover-background: rgba(0, 0, 0, 0.05);
  --sd-accent-color: #ff7b72;
  --sd-overlay-background: rgba(211, 211, 211, 0.9);
}

/* Dark theme variables */
[data-theme='dark'] {
  --sd-background-primary: #1a1a1a;
  --sd-background-secondary: #2d2d2d;
  --sd-text-primary: #e0e0e0;
  --sd-text-secondary: #a0a0a0;
  --sd-border-color: #404040;
  --sd-hover-background: rgba(255, 255, 255, 0.05);
  --sd-accent-color: #ff7b72;
  --sd-overlay-background: rgba(0, 0, 0, 0.8);
}

/* 添加 body 主题样式 */
body {
  background-color: var(--sd-background-primary);
  color: var(--sd-text-primary);
}

body[data-theme='dark'] {
  background-color: var(--sd-background-primary);
  color: var(--sd-text-primary);
}

.app-container {
  width: 100%;
  height: 100%;
  background-color: var(--sd-background-primary);
  overflow-x: hidden;
  box-sizing: border-box;
  color: var(--sd-text-primary);
}
</style>
