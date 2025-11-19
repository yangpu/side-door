<template>
  <div class="article-content" ref="contentRef"></div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import { translationService } from '../utils/translationService.js';
import { settings } from '../utils/settings.js';

const props = defineProps<{
  article: any;
}>();

const contentRef = ref<HTMLElement | null>(null);

// 处理段落 - 添加段落指示器
function processParagraph(paragraph: HTMLElement) {
  // 检查是否已经被处理过
  let parent: Element | null = paragraph;
  while (parent) {
    if (parent.classList.contains('paragraph')) {
      console.log('[ArticleContent] Paragraph already processed');
      return parent as HTMLElement;
    }
    parent = parent.parentElement;
  }

  // 创建段落容器
  const container = document.createElement('div');
  container.className = 'paragraph';
  
  paragraph.parentElement?.insertBefore(container, paragraph);
  container.appendChild(paragraph);

  // 创建段落指示器
  const hoverBar = document.createElement('div');
  hoverBar.className = 'paragraph-hover-bar';
  hoverBar.title = '段落指示器';
  container.appendChild(hoverBar);

  console.log('[ArticleContent] Created paragraph container and hover bar');
  return container;
}

// 处理所有段落
function processParagraphs(rootElement: HTMLElement) {
  if (!rootElement) return;

  const paragraphs = rootElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, figure');
  console.log('[ArticleContent] Found paragraphs to process:', paragraphs.length);
  
  paragraphs.forEach((paragraph) => {
    processParagraph(paragraph as HTMLElement);
  });

  // 检查处理后的段落数量
  const processedParagraphs = rootElement.querySelectorAll('.paragraph');
  console.log('[ArticleContent] Processed paragraphs:', processedParagraphs.length);
}

// 翻译内容
async function translateContent(rootElement: HTMLElement) {
  if (!settings.enableTranslation.value) {
    return;
  }

  // 获取所有段落
  const paragraphs = rootElement.querySelectorAll('.paragraph');
  
  paragraphs.forEach((paragraph) => {
    const content = paragraph.querySelector('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, figure') as HTMLElement;
    if (!content) return;

    // 为每个段落创建翻译容器
    let translationContainer = paragraph.querySelector('.translation') as HTMLElement;
    if (!translationContainer) {
      translationContainer = document.createElement('span');
      translationContainer.className = 'translation';
      paragraph.appendChild(translationContainer);
    }

    // 调用翻译服务
    translationService.translateNode(content, translationContainer);
  });
}

// 渲染内容
async function renderContent() {
  if (!props.article?.content || !contentRef.value) {
    console.log('[ArticleContent] No article content or ref');
    return;
  }

  console.log('[ArticleContent] Rendering content');

  let contentElement: HTMLElement;

  // 检查content是HTMLElement还是字符串
  if (props.article.content instanceof HTMLElement) {
    console.log('[ArticleContent] Content is HTMLElement');
    contentElement = props.article.content.cloneNode(true) as HTMLElement;
  } else if (typeof props.article.content === 'string') {
    console.log('[ArticleContent] Content is string');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = props.article.content;
    contentElement = tempDiv;
  } else {
    console.error('[ArticleContent] Unknown content type:', props.article.content);
    return;
  }

  // 清空容器
  contentRef.value.innerHTML = '';
  
  // 将内容添加到容器
  while (contentElement.firstChild) {
    contentRef.value.appendChild(contentElement.firstChild);
  }

  // 等待DOM更新
  await nextTick();

  // 处理段落
  processParagraphs(contentRef.value);

  // 翻译内容
  await nextTick();
  translateContent(contentRef.value);
}

// 监听内容变化
watch(
  () => props.article,
  () => {
    renderContent();
  },
  { deep: true }
);

// 监听翻译设置变化
watch(
  () => settings.enableTranslation.value,
  (enabled) => {
    if (contentRef.value) {
      const translations = contentRef.value.querySelectorAll('.translation');
      translations.forEach((trans) => {
        (trans as HTMLElement).style.display = enabled ? '' : 'none';
      });

      if (enabled) {
        translateContent(contentRef.value);
      }
    }
  }
);

onMounted(() => {
  renderContent();
});
</script>

<style scoped>
.article-content {
  margin-top: 2em;
  position: relative;
}
</style>