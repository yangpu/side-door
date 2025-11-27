import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import { pwaInit } from '../../utils/pwaInit';

// 初始化 PWA
pwaInit.init({
  enableNotifications: false,
  enableBackgroundSync: true,
  preloadArticles: true,
}).catch(error => {
  console.error('PWA 初始化失败:', error);
});

createApp(App).mount('#app');
