<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import ReadLaterHomePage from './ReadLaterHomePage.vue';

// 同步主题
const syncTheme = () => {
  const theme = localStorage.getItem('READER_THEME') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
};

onMounted(() => {
  // 初始同步主题
  syncTheme();

  // 监听主题变化
  window.addEventListener('storage', (e) => {
    if (e.key === 'READER_THEME') {
      syncTheme();
    }
  });
});
</script>

<template>
  <div class="app-container">
    <ReadLaterHomePage />
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

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--sd-background-primary);
  color: var(--sd-text-primary);
}

.app-container {
  width: 100%;
  min-height: 100vh;
  background-color: var(--sd-background-primary);
  color: var(--sd-text-primary);
}
</style>
