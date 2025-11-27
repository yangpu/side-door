import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { pwaInit } from '../../utils/pwaInit';

// 初始化 PWA（启用离线缓存和预加载）
pwaInit.init({
  enableNotifications: false,
  enableBackgroundSync: true,
  preloadArticles: true,
}).catch(error => {
  console.error('PWA 初始化失败:', error);
});

createApp(App).mount('#app');
