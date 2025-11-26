<template>
  <div class="article-card">
    <!-- Cover Image -->
    <div v-if="article.cover_image" class="article-cover" @click="handleCardClick">
      <img :src="article.cover_image" :alt="article.title" />
    </div>

    <!-- Content -->
    <div class="article-content" @click="handleCardClick">
      <h3 class="article-title">{{ article.title }}</h3>
      <p v-if="article.ai_summary || article.summary" class="article-summary">
        {{ truncateSummary(article.ai_summary || article.summary || '') }}
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
      <button v-if="article.html_file_url" class="action-btn" @click.stop="handleOpenFile(article.html_file_url)" title="查看HTML">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
        HTML
      </button>
      <button v-if="article.pdf_file_url" class="action-btn" @click.stop="handleOpenFile(article.pdf_file_url)" title="查看PDF">
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
      <button class="action-btn" @click.stop="handleOpenOriginalUrl" title="查看原文">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
        原文
      </button>
      <button class="action-btn delete-btn" @click.stop="handleDelete" title="删除">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        删除
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Article } from '../types/article';

const props = defineProps<{
  article: Article;
  maxSummaryLength?: number;
}>();

const emit = defineEmits(['click', 'openFile', 'openOriginalUrl', 'delete']);

// 点击卡片 - 打开文章详情
function handleCardClick() {
  emit('click', props.article);
}

// 打开文件（HTML或PDF）
function handleOpenFile(fileUrl: string) {
  emit('openFile', fileUrl);
}

// 打开原文
function handleOpenOriginalUrl() {
  emit('openOriginalUrl', props.article.url);
}

// 删除文章
function handleDelete() {
  emit('delete', props.article);
}

// 截断摘要
function truncateSummary(text: string): string {
  const maxLength = props.maxSummaryLength || 60;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// 格式化日期
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
</script>

<style scoped>
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
  border-color: var(--sd-accent-color);
  background: var(--sd-hover-background);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  cursor: pointer;
  min-width: 0;
}

.article-title {
  margin: 0;
  font-size: 14px;
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
  gap: 12px;
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
  flex-shrink: 0;
}

.article-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--sd-border-color);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid var(--sd-border-color);
  border-radius: 4px;
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.action-btn:hover {
  background: var(--sd-hover-background);
  border-color: var(--sd-accent-color);
}

.action-btn svg {
  flex-shrink: 0;
}

.delete-btn:hover {
  background: #fee;
  border-color: #f44;
  color: #f44;
}
</style>
