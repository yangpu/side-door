<script lang="ts" setup>
import { shallowRef, watch } from 'vue';
import { Readability } from '@mozilla/readability';
import ArticleInfo from './ArticleInfo.vue';
import ArticleContent from './ArticleContent.vue';
import SettingsButton from './SettingsButton.vue';

const props = defineProps<{
  html: string;
  url: string;
}>();

// 文章内容
const article = shallowRef<any>(null);

// 处理文章内容
async function processArticle() {
  if (!props.html) return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(props.html, 'text/html');

  // 使用 Readability 解析文档
  const reader = new Readability(doc, {
    keepClasses: true,
    serializer: (element) => element,
  });
  article.value = reader.parse();
}

// 监听HTML变化
watch(() => props.html, () => {
  if (props.html) {
    processArticle();
  }
}, { immediate: true });

</script>

<template>
  <div class="reader-sidedoor">
    <div class="reader-container" tabindex="0">
      <ArticleInfo v-if="article" :article="article" :url="url" />

      <ArticleContent v-if="article" :article="article" />

      <SettingsButton />
    </div>
  </div>
</template>

<style>
@import './Reader.css';
</style>