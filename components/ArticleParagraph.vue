<template>
  <div class="article-paragraph" @mouseenter="isHovered = true" @mouseleave="isHovered = false">
    <div ref="paragraphContainer" class="paragraph-container"
      v-if="settings.showOriginalText || !paragraphContainer?.classList.contains('original-text')">
    </div>
    <span ref="translationContainer" class="translation-container" v-if="settings.enableTranslation">
    </span>

    <ParagraphHoverBar :content="content" :is-parent-hovered="isHovered" />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import ParagraphHoverBar from './ParagraphHoverBar.vue';
import { translationService } from '../utils/translationService.js';

const props = defineProps<{
  content: HTMLElement;
}>();

const paragraphContainer = ref<HTMLElement | null>(null);
const translationContainer = ref<HTMLElement | null>(null);
const isHovered = ref(false);

function render() {
  const container = paragraphContainer.value;
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(props.content.cloneNode(true));

}

function translate() {
  const container = paragraphContainer.value;
  const container2 = translationContainer.value;
  if (!container || !container2) return;

  translationService.translateNode(container, container2);
}

onMounted(() => {
  render();
  translate();
});
</script>

<style scoped>
.article-paragraph {
  margin-bottom: 0;
  position: relative;
  transition: all 0.3s ease;
  word-wrap: break-word;
}

.paragraph-container {
  position: relative;
  z-index: 1;
  padding-right: 20px;
}

.paragraph-container li p {
  display: inline;
}

.article-paragraph:hover {
  background-color: var(--hover-bg-color);
}
</style>