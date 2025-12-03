# PWA 快速参考卡片

## 🚀 快速启动

```typescript
// main.ts
import { pwaInit } from './utils/pwaInit';
await pwaInit.init();
```

## 📦 核心 API

### offlineService

```typescript
import { offlineService } from './utils/offlineService';

// 获取文章列表（离线优先）
const list = await offlineService.getArticles({ page: 1, pageSize: 12 });

// 获取单篇文章（离线优先）
const article = await offlineService.getArticle(articleId);

// 检查是否离线
const isOffline = offlineService.shouldUseOfflineData();

// 获取网络状态
const status = offlineService.getNetworkStatus();
// { online: true, supabaseAvailable: true, lastCheck: 1234567890 }

// 预加载文章
await offlineService.preloadArticles(['id1', 'id2']);
```

### indexedDB

```typescript
import { indexedDB } from './utils/indexedDB';

// 初始化
await indexedDB.init();

// 保存文章
await indexedDB.saveArticle(article);

// 获取文章
const article = await indexedDB.getArticle(articleId);

// 获取所有文章
const articles = await indexedDB.getAllArticles();

// 获取统计
const stats = await indexedDB.getStats();
```

### pwaInit

```typescript
import { pwaInit } from './utils/pwaInit';

// 初始化 PWA
await pwaInit.init({
  enableBackgroundSync: true,
  preloadArticles: true,
});

// 清空缓存
await pwaInit.clearAllCache();

// 获取统计
const stats = await pwaInit.getCacheStats();
```

## 🎨 Vue 组件模板

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { offlineService } from '../../utils/offlineService';
import { indexedDB } from '../../utils/indexedDB';

const articles = ref([]);
const networkStatus = ref(offlineService.getNetworkStatus());

const offlineMessage = computed(() => {
  if (!networkStatus.value.online) return '离线模式';
  if (!networkStatus.value.supabaseAvailable) return '服务不可用';
  return '';
});

async function loadArticles() {
  const result = await offlineService.getArticles({ page: 1, pageSize: 12 });
  articles.value = result.articles;
}

onMounted(async () => {
  await indexedDB.init();
  loadArticles();
  
  window.addEventListener('online', loadArticles);
  window.addEventListener('offline', () => {
    networkStatus.value = offlineService.getNetworkStatus();
  });
});
</script>

<template>
  <div>
    <div v-if="offlineMessage" class="offline-banner">
      {{ offlineMessage }}
    </div>
    <article v-for="article in articles" :key="article.id">
      {{ article.title }}
    </article>
  </div>
</template>
```

## 🔍 调试命令

```javascript
// 查看统计
await indexedDB.getStats()

// 查看网络状态
offlineService.getNetworkStatus()

// 查看所有文章
await indexedDB.getAllArticles()

// 清空缓存
await pwaInit.clearAllCache()

// 查看 Service Worker
await navigator.serviceWorker.getRegistrations()
```

## 📱 HTML 模板

```html
<head>
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/icon/128.png" />
  <meta name="theme-color" content="#ff7b72">
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  </script>
</head>
```

## 🎯 离线状态样式

```css
.offline-banner {
  background: linear-gradient(135deg, #ffd93d 0%, #ffb938 100%);
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}
```

## 📊 缓存策略

| 类型 | 策略 | 过期时间 |
|------|------|---------|
| 静态资源 | Cache First | 永久（版本更新时清理） |
| API 数据 | Network First | 5 分钟 |
| 文章内容 | Cache First + 后台更新 | 7 天 |

## 🔧 配置选项

```typescript
pwaInit.init({
  enableNotifications: false,     // 推送通知
  enableBackgroundSync: true,     // 后台同步
  preloadArticles: true,          // 预加载文章
  cacheMaxAge: 7 * 24 * 60 * 60 * 1000,  // 缓存保留时间
});
```

## 📂 文件结构

```
utils/
├── indexedDB.ts          # 本地存储
├── offlineService.ts     # 离线逻辑
├── offlineCache.ts       # 缓存工具
└── pwaInit.ts           # PWA 管理

public/
├── sw.js                # Service Worker
└── manifest.json        # PWA Manifest
```

## 🎉 快速测试

1. 在线访问文章列表
2. 切换到离线模式（DevTools → Network → Offline）
3. 刷新页面
4. ✅ 文章列表应该正常显示

## 📚 文档链接

- [完整文档](./docs/PWA_SUPPORT.md)
- [快速入门](./docs/PWA_QUICK_START.md)
- [测试指南](./docs/PWA_TESTING_GUIDE.md)
- [更新日志](./docs/CHANGELOG_PWA.md)

---

**一句话总结**: 导入 `offlineService`，使用 `getArticles()` 和 `getArticle()`，即可实现离线优先加载！
