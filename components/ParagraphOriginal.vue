<template>
  <div class="paragraph-original" :class="{ 'is-visible': isVisible }">
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  isVisible: boolean;
}>();
</script>

<style scoped>
.paragraph-original {
  display: none;
  margin: 0;
  line-height: 1.6;
}

.paragraph-original.is-visible {
  display: block;
}

:deep(p) {
  margin: 0.5em 0;
}

:deep(pre) {
  margin: 1em 0;
}

:deep(blockquote) {
  margin: 1em 0;
}

:deep(ul),
:deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

:deep(h1),
:deep(h2),
:deep(h3),
:deep(h4),
:deep(h5),
:deep(h6) {
  margin: 1em 0 0.5em;
  line-height: 1.4;
}
</style>