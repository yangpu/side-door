# PWA 快速入门指南

## 快速开始

### 1. 初始化 PWA

在你的应用入口文件（如 `main.ts`）中初始化 PWA：

```typescript
import { pwaInit } from '../../utils/pwaInit';

// 初始化 PWA 功能
pwaInit.init({
  enableNotifications: false,     // 是否启用推送通知
  enableBackgroundSync: true,     // 是否启用后台同步
  preloadArticles: true,          // 是否预加载文章
  cacheMaxAge: 7 * 24 * 60 * 60 * 1000,  // 缓存保留时间（默认 7 天）
}).catch(error => {
  console.error('PWA 初始化失败:', error);
});
```

### 2. 在 HTML 中添加 Manifest 和 Service Worker

在你的 HTML 文件 `<head>` 中添加：

```html
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icon/128.png" />
<meta name="theme-color" content="#ff7b72">

<script>
  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => console.log('Service Worker 注册成功'))
      .catch(error => console.error('Service Worker 注册失败:', error));
  }
</script>
```

### 3. 使用离线优先服务加载数据

在 Vue 组件中使用：

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { offlineService } from '../../utils/offlineService';
import { indexedDB } from '../../utils/indexedDB';

const articles = ref([]);
const loading = ref(false);
const isOffline = ref(false);
const networkStatus = ref(null);

// 计算离线提示消息
const offlineMessage = computed(() => {
  if (!networkStatus.value) return '';
  if (!networkStatus.value.online) return '离线模式 - 显示缓存数据';
  if (!networkStatus.value.supabaseAvailable) return '服务暂时不可用 - 显示缓存数据';
  return '';
});

// 加载文章列表（离线优先）
async function loadArticles() {
  loading.value = true;
  try {
    // 更新网络状态
    networkStatus.value = offlineService.getNetworkStatus();
    isOffline.value = offlineService.shouldUseOfflineData();

    // 使用离线优先服务加载
    const result = await offlineService.getArticles({
      page: 1,
      pageSize: 12,
    });
    
    articles.value = result.articles;
  } catch (error) {
    console.error('加载失败:', error);
    
    // 降级到 IndexedDB
    const allArticles = await indexedDB.getAllArticles();
    articles.value = allArticles.slice(0, 12);
    isOffline.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  // 初始化 IndexedDB
  await indexedDB.init();
  
  // 加载数据
  loadArticles();
  
  // 监听网络状态变化
  window.addEventListener('online', loadArticles);
  window.addEventListener('offline', () => {
    isOffline.value = true;
  });
});
</script>

<template>
  <div>
    <!-- 离线状态提示 -->
    <div v-if="offlineMessage" class="offline-banner">
      {{ offlineMessage }}
    </div>
    
    <!-- 文章列表 -->
    <div v-if="!loading">
      <article v-for="article in articles" :key="article.id">
        <h2>{{ article.title }}</h2>
        <p>{{ article.summary }}</p>
      </article>
    </div>
    
    <!-- 加载状态 -->
    <div v-else>加载中...</div>
  </div>
</template>
```

### 4. 保存文章到离线缓存

当用户保存文章时，自动缓存到本地：

```typescript
import { ReadLaterService } from '../services/readLaterService';
import { OfflineCache } from '../utils/offlineCache';

async function saveArticle(article) {
  // 1. 保存到 Supabase
  const result = await ReadLaterService.saveArticle(article);
  
  if (result.success) {
    // 2. 保存到离线缓存（已在 ReadLaterService 中自动完成）
    console.log('文章已保存并缓存');
  }
}
```

### 5. 离线查看文章详情

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { offlineService } from '../../utils/offlineService';

const props = defineProps<{ articleId: string }>();
const article = ref(null);
const loading = ref(false);

async function loadArticle() {
  loading.value = true;
  try {
    // 使用离线优先策略加载文章
    article.value = await offlineService.getArticle(props.articleId);
  } catch (error) {
    console.error('加载失败:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadArticle();
});
</script>

<template>
  <div v-if="article">
    <h1>{{ article.title }}</h1>
    <div v-html="article.content"></div>
  </div>
</template>
```

## 常用 API

### 离线服务（offlineService）

```typescript
import { offlineService } from '../../utils/offlineService';

// 获取网络状态
const status = offlineService.getNetworkStatus();
// { online: true, supabaseAvailable: true, lastCheck: 1234567890 }

// 是否应该使用离线数据
const isOffline = offlineService.shouldUseOfflineData();

// 获取文章列表（离线优先）
const result = await offlineService.getArticles({ page: 1, pageSize: 12 });

// 获取单篇文章（离线优先）
const article = await offlineService.getArticle(articleId);

// 预加载文章
await offlineService.preloadArticles(['id1', 'id2', 'id3']);

// 清理过期缓存
await offlineService.cleanOldCache(7 * 24 * 60 * 60 * 1000);

// 获取离线统计
const stats = await offlineService.getOfflineStats();
```

### IndexedDB（indexedDB）

```typescript
import { indexedDB } from '../../utils/indexedDB';

// 初始化数据库
await indexedDB.init();

// 保存文章
await indexedDB.saveArticle(article);

// 获取文章
const article = await indexedDB.getArticle(articleId);

// 通过 URL 获取文章
const article = await indexedDB.getArticleByUrl(url);

// 获取所有文章
const articles = await indexedDB.getAllArticles();

// 保存文章列表缓存
await indexedDB.saveArticlesList('key', articles, total, 5 * 60 * 1000);

// 获取文章列表缓存
const cached = await indexedDB.getArticlesList('key');

// 保存设置
await indexedDB.saveSetting('theme', 'dark');

// 获取设置
const theme = await indexedDB.getSetting('theme');

// 通用缓存
await indexedDB.setCache('myKey', { data: 'value' }, 60 * 60 * 1000);
const cached = await indexedDB.getCache('myKey');

// 获取统计信息
const stats = await indexedDB.getStats();
// { articles: 123, cachedLists: 5, settings: 10, cache: 50 }

// 清空所有数据
await indexedDB.clearAll();
```

### 离线缓存辅助工具（OfflineCache）

```typescript
import { OfflineCache } from '../../utils/offlineCache';

// 保存文章
await OfflineCache.saveArticle(article);

// 获取文章
const article = await OfflineCache.getArticle(articleId);

// 批量保存
const count = await OfflineCache.saveArticles([article1, article2]);

// 检查是否已缓存
const isCached = await OfflineCache.isArticleCached(articleId);

// 获取缓存统计
const stats = await OfflineCache.getCacheStats();

// 清空缓存
await OfflineCache.clearCache();
```

### PWA 初始化器（pwaInit）

```typescript
import { pwaInit } from '../../utils/pwaInit';

// 初始化
await pwaInit.init(config);

// 注册后台同步
await pwaInit.registerBackgroundSync('sync-articles');

// 发送消息到 Service Worker
const response = await pwaInit.sendMessageToSW({ type: 'PING' });

// 清空所有缓存
await pwaInit.clearAllCache();

// 获取缓存统计
const stats = await pwaInit.getCacheStats();

// 强制激活新的 Service Worker
await pwaInit.skipWaiting();

// 预加载文章
await pwaInit.preloadArticles(['id1', 'id2']);

// 获取 Service Worker 注册对象
const registration = pwaInit.getRegistration();
```

## 事件监听

### PWA 更新事件

```typescript
window.addEventListener('pwa-update-available', (event) => {
  console.log('新版本可用');
  const { registration } = event.detail;
  
  // 显示更新提示
  if (confirm('有新版本可用，是否更新？')) {
    pwaInit.skipWaiting();
    window.location.reload();
  }
});
```

### PWA 可安装事件

```typescript
window.addEventListener('pwa-installable', (event) => {
  const { install } = event.detail;
  
  // 显示安装按钮
  showInstallButton(() => {
    install();
  });
});
```

### 网络状态变化

```typescript
window.addEventListener('online', () => {
  console.log('网络已连接');
  // 重新加载数据
  loadArticles();
});

window.addEventListener('offline', () => {
  console.log('网络已断开');
  // 显示离线提示
  showOfflineMessage();
});
```

## 样式示例

### 离线状态横幅

```vue
<template>
  <div v-if="offlineMessage" class="offline-banner">
    <svg><!-- 离线图标 --></svg>
    <span>{{ offlineMessage }}</span>
  </div>
</template>

<style scoped>
.offline-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #ffd93d 0%, #ffb938 100%);
  color: #333;
  border-radius: 8px;
  margin-bottom: 24px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(255, 185, 56, 0.3);
}
</style>
```

## 调试技巧

### 查看缓存内容

```javascript
// 在浏览器控制台中执行

// 查看 IndexedDB 统计
const stats = await indexedDB.getStats();
console.table(stats);

// 查看所有缓存的文章
const articles = await indexedDB.getAllArticles();
console.log(articles);

// 查看离线状态
const status = offlineService.getNetworkStatus();
console.log(status);
```

### 测试离线模式

1. 打开 Chrome DevTools
2. 切换到 Network 面板
3. 勾选 "Offline" 复选框
4. 刷新页面测试离线功能

### 清空缓存

```javascript
// 清空所有 PWA 缓存
await pwaInit.clearAllCache();

// 只清空 IndexedDB
await indexedDB.clearAll();

// 卸载 Service Worker
const registrations = await navigator.serviceWorker.getRegistrations();
for (const registration of registrations) {
  await registration.unregister();
}
```

## 注意事项

1. **HTTPS 要求**: Service Worker 需要 HTTPS 环境（localhost 除外）
2. **浏览器兼容性**: 检查目标浏览器是否支持 PWA 功能
3. **存储限制**: 注意浏览器的存储配额限制
4. **缓存过期**: 定期清理过期缓存，避免占用过多空间
5. **错误处理**: 始终处理离线和缓存错误情况
6. **用户提示**: 明确告知用户当前是否使用缓存数据

## 常见问题

**Q: Service Worker 注册失败？**
A: 确保使用 HTTPS 或 localhost，检查 sw.js 文件路径是否正确。

**Q: 离线数据不显示？**
A: 确保先在线访问过一次，让数据被缓存。

**Q: 更新后仍显示旧版本？**
A: 清空浏览器缓存或手动卸载 Service Worker 后重试。

**Q: 缓存占用空间太大？**
A: 调整 cacheMaxAge 参数，或定期调用 cleanOldCache()。
