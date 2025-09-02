<template>
  <div class="article-info">
    <!-- 文章链接 -->
    <div class="article-url">
      <a :href="url" target="_blank" rel="noopener noreferrer">{{ url }}</a>
    </div>

    <!-- 文章标题 -->
    <h1 class="article-title">
      <span v-if="isTranslatedTitle && translatedTitle">{{ translatedTitle }}</span>
      <span v-else>{{ title }}</span>
    </h1>

    <!-- 文章元信息 -->
    <div class="article-meta">
      <span class="meta-item-label">时间：</span><span class="meta-item-value">{{ publishTime }}</span>
      <span class="meta-item-label">长度：</span><span class="meta-item-value">{{ length }} 字</span>
      <span class="meta-item-label">语言：</span><span class="meta-item-value">{{ lang }}</span>
      <span class="meta-item-label">作者：</span><span class="meta-item-value">{{ byline }}</span>
      <span class="meta-item-label">来源：</span><span class="meta-item-value">{{ siteName }}</span>
    </div>

    <!-- 文章摘要 -->
    <div v-if="excerpt" class="article-excerpt">
      <span class="meta-item-label">摘要：</span>
      <p>
        <span>{{ excerpt }}</span>
        <span v-if="isTranslatedExcerpt && translatedExcerpt">{{ translatedExcerpt }}</span>
      </p>
    </div>

    <!-- 文章总结 -->
    <ArticleSummary :article="article" />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { franc } from 'franc';
import { extractDates } from '../utils/dateExtractor';
import ArticleSummary from './ArticleSummary.vue';

const props = defineProps<{
  article: any;
  url: string;
}>();

// 翻译状态
const translatedTitle = ref('');
const translatedExcerpt = ref('');
const isTranslatedTitle = ref(false);
const isTranslatedExcerpt = ref(false);

// 文章信息
const title = ref('--');
const excerpt = ref('--');
const length = ref('--');
const byline = ref('--');
const siteName = ref('--');
const lang = ref('--');
const publishTime = ref('--');

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '--';
  }
  return date.toISOString().split('T')[0];
}

// 从URL获取网站名称
function getSiteNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    console.warn('解析URL失败:', error);
    return '--';
  }
}

function renderArticleInfo(article: any) {
  // 更新基本信息
  title.value = article.title || '--';
  excerpt.value = article.excerpt || '--';
  length.value = article.length?.toString() || '--';
  byline.value = article.byline || '--';
  siteName.value = article.siteName || getSiteNameFromUrl(props.url) || '--';

  // 更新语言
  updateLanguage(article);

  // 更新发布时间
  updatePublishTime(article);
}

function updateLanguage(article: any) {
  let detectedLang = article.lang || '--';
  if (detectedLang !== 'zh-CN') {
    const detected = franc(article.textContent || '');
    if (['cmn', 'chi'].includes(detected)) {
      detectedLang = 'zh-CN';
    }
  }
  lang.value = detectedLang;
}

function updatePublishTime(article: any) {
  let time = '--';
  if (article.publishedTime) {
    time = formatDate(article.publishedTime);
  } else {
    const datesFromContent = extractDates(article.textContent || '', 1);
    if (datesFromContent.length > 0) {
      time = formatDate(datesFromContent[0]);
    } else {
      const datesFromHtml = extractDates(article.textContent || '', 3);
      if (datesFromHtml.length > 0) {
        const mostRecentDate = datesFromHtml
          .map((date) => new Date(date).getTime())
          .reduce((latest, current) => Math.max(latest, current));
        publishTime.value = formatDate(new Date(mostRecentDate).toISOString());
      } else {
        time = '--';
      }
    }
  }

  publishTime.value = time;
}

// 监听文章变化
watch(() => props.article, (article) => {
  renderArticleInfo(article);
}, { immediate: true });
</script>

<style scoped>
.article-info {
  margin-bottom: 2em;
}

.article-url {
  margin-bottom: 1em;
  word-break: break-all;
}

.article-url a {
  color: var(--link-color);
  text-decoration: none;
}

.article-url a:hover {
  text-decoration: underline;
}

.article-title {
  margin: 0 0 0.5em;
  font-size: 2em;
  line-height: 1.4;
  color: var(--text-color);
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  /* gap: 0.8em; */
  margin-bottom: 1.5em;
  color: var(--secondary-text-color);
  font-size: 0.9em;
  line-height: 1.6;
}

.meta-item-label {
  color: var(--secondary-text-color);
  font-weight: 500;
  /* margin-right: 0.3em; */
}

.meta-item-value {
  color: var(--text-color);
  margin-right: 20px;
  font-weight: 600;
}

.article-excerpt {
  /* margin: 1em 0; */
  /* padding: 0.8em 1em; */
  background-color: var(--background-secondary-color);
  border-radius: 4px;
  /* border-left: 3px solid var(--border-color); */
}

.article-excerpt p {
  margin: 0.5em 0 0;
  line-height: 1.6;
  color: var(--text-color);
}

/* .article-excerpt .meta-item-label {
  display: block;
  margin-bottom: 0.3em;
  font-weight: 500;
  color: var(--secondary-text-color);
} */
</style>