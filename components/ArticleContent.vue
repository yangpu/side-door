<template>
  <div class="article-content">
    <ArticleParagraph v-for="(paragraph, index) in paragraphs" :key="index" :content="paragraph" />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import ArticleParagraph from './ArticleParagraph.vue';

const props = defineProps<{
  article: any;
}>();

const paragraphs = ref<HTMLElement[]>([]);

function renderContent() {
  const content = props.article?.content;
  if (!content) return;

  // 获取所有段落元素
  const elements: HTMLElement[] = Array.from(content.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, figure'));

  // 过滤掉父节点已经在集合中的元素
  const filteredElements = elements.filter((element: HTMLElement) => {
    let parent = element.parentElement;
    while (parent && parent !== content) {
      if (elements.includes(parent)) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  });

  paragraphs.value = filteredElements;
}

// 监听内容变化
watch(
  () => props.article,
  () => {
    renderContent();
  },
);

onMounted(() => {
  renderContent();
});
</script>

<style scoped>
.article-content {
  margin-top: 2em;
}
</style>