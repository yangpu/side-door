<script lang="ts" setup>
import Menu from '../../components/Menu.vue';
import { onMounted } from 'vue';
import { browser } from 'wxt/browser';

// 同步主题
const syncTheme = () => {
  const theme = localStorage.getItem('READER_THEME') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  // 确保 body 也有正确的主题类
  document.body.setAttribute('data-theme', theme);
};

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
  let tooltip = '旁门-帮你简读文章';

  if (url.includes('news')) {
    tooltip = '旁门-帮你简读新闻';
  } else if (url.includes('blog')) {
    tooltip = '旁门-帮你简读博客';
  }

  browser.action.setTitle({ title: tooltip });
}
</script>

<template>
  <div class="app-container">
    <Menu />
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
  min-height: 100vh;
  background-color: var(--sd-background-primary);
  overflow-x: hidden;
  box-sizing: border-box;
  color: var(--sd-text-primary);
}
</style>
