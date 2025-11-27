# SideDoor PWA 离线支持文档

## 概述

SideDoor 现已全面支持 PWA（Progressive Web App），提供离线优先的阅读体验。即使在网络断开或 Supabase 服务不可用的情况下，用户仍然可以访问已缓存的文章和数据。

## 主要功能

### 1. 离线优先策略

- **缓存优先加载**: 首先从本地缓存读取数据，然后在后台更新
- **网络失败降级**: 当网络请求失败时，自动使用缓存数据
- **智能更新**: 在线时自动更新缓存，确保数据新鲜度

### 2. Service Worker

- **静态资源缓存**: 缓存所有静态文件（JS、CSS、图片等）
- **动态数据缓存**: 缓存 API 响应和文章内容
- **后台同步**: 支持后台数据同步（可选）
- **推送通知**: 支持推送通知（可选，需用户授权）

### 3. IndexedDB 存储

- **文章详情存储**: 缓存单篇文章的完整内容
- **文章列表缓存**: 缓存文章列表，支持分页
- **设置存储**: 保存用户偏好设置
- **通用缓存**: 灵活的键值对缓存系统

### 4. 离线状态提示

- **实时状态检测**: 自动检测网络和服务可用性
- **用户友好提示**: 在离线模式下显示明确的状态提示
- **平滑降级**: 离线时无缝切换到缓存数据

## 技术架构

### 核心模块

```
utils/
├── indexedDB.ts         # IndexedDB 封装
├── offlineService.ts    # 离线服务逻辑
├── offlineCache.ts      # 离线缓存辅助工具
└── pwaInit.ts          # PWA 初始化管理器

public/
├── sw.js               # Service Worker 脚本
└── manifest.json       # PWA Manifest 配置
```

### 数据流

```
用户请求
    ↓
离线服务 (offlineService)
    ↓
检查网络状态
    ├─ 在线 → 缓存优先 → 后台更新
    └─ 离线 → 仅使用缓存
    ↓
IndexedDB (indexedDB)
    ↓
返回数据
```

## 使用方法

### 初始化 PWA

在应用入口（main.ts）中初始化：

```typescript
import { pwaInit } from '../../utils/pwaInit';

pwaInit.init({
  enableNotifications: false,    // 是否启用通知
  enableBackgroundSync: true,    // 是否启用后台同步
  preloadArticles: true,         // 是否预加载文章
  cacheMaxAge: 7 * 24 * 60 * 60 * 1000,  // 缓存保留时间（7天）
});
```

### 使用离线优先服务

```typescript
import { offlineService } from '../../utils/offlineService';

// 获取文章列表（离线优先）
const result = await offlineService.getArticles({
  page: 1,
  pageSize: 12,
});

// 获取单篇文章（离线优先）
const article = await offlineService.getArticle(articleId);

// 检查网络状态
const status = offlineService.getNetworkStatus();
const isOffline = offlineService.shouldUseOfflineData();
```

### 使用 IndexedDB

```typescript
import { indexedDB } from '../../utils/indexedDB';

// 保存文章
await indexedDB.saveArticle(article);

// 获取文章
const article = await indexedDB.getArticle(articleId);

// 保存文章列表缓存
await indexedDB.saveArticlesList(key, articles, total, expiresIn);

// 获取文章列表缓存
const cached = await indexedDB.getArticlesList(key);
```

### 使用离线缓存辅助工具

```typescript
import { OfflineCache } from '../../utils/offlineCache';

// 保存文章到离线缓存
await OfflineCache.saveArticle(article);

// 获取离线文章
const article = await OfflineCache.getArticle(articleId);

// 批量保存
const count = await OfflineCache.saveArticles(articles);

// 获取缓存统计
const stats = await OfflineCache.getCacheStats();
```

## Service Worker 缓存策略

### 静态资源（Cache First）

1. 先检查缓存
2. 缓存命中 → 返回缓存
3. 缓存未命中 → 请求网络 → 缓存响应 → 返回数据

### API 请求（Network First）

1. 先尝试网络请求
2. 请求成功 → 更新缓存 → 返回数据
3. 请求失败 → 返回缓存数据
4. 缓存也没有 → 返回离线错误

## 缓存管理

### 自动清理

- PWA 初始化时自动清理过期缓存
- 默认保留 7 天内的缓存数据
- Service Worker 更新时删除旧版本缓存

### 手动清理

```typescript
import { pwaInit } from '../../utils/pwaInit';

// 清空所有缓存
await pwaInit.clearAllCache();

// 获取缓存统计
const stats = await pwaInit.getCacheStats();
```

### IndexedDB 统计

```typescript
import { indexedDB } from '../../utils/indexedDB';

const stats = await indexedDB.getStats();
// {
//   articles: 123,        // 缓存的文章数
//   cachedLists: 5,       // 缓存的列表数
//   settings: 10,         // 设置项数
//   cache: 50            // 通用缓存项数
// }
```

## 离线状态处理

### 检测离线状态

```typescript
import { offlineService } from '../../utils/offlineService';

const status = offlineService.getNetworkStatus();
// {
//   online: true,              // 浏览器在线状态
//   supabaseAvailable: true,   // Supabase 服务可用性
//   lastCheck: 1234567890     // 最后检查时间戳
// }

const isOffline = offlineService.shouldUseOfflineData();
```

### 显示离线提示

```vue
<template>
  <div v-if="offlineMessage" class="offline-banner">
    <svg>...</svg>
    <span>{{ offlineMessage }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { offlineService } from '../../utils/offlineService';

const networkStatus = ref(offlineService.getNetworkStatus());

const offlineMessage = computed(() => {
  if (!networkStatus.value.online) return '离线模式 - 显示缓存数据';
  if (!networkStatus.value.supabaseAvailable) return '服务暂时不可用 - 显示缓存数据';
  return '';
});
</script>
```

## 预加载优化

### 预加载文章

```typescript
import { offlineService } from '../../utils/offlineService';

// 预加载指定文章
await offlineService.preloadArticles(['article-id-1', 'article-id-2']);
```

### 自动预加载

在文章列表页面，可以自动预加载可见文章：

```typescript
const articles = await offlineService.getArticles({ page: 1, pageSize: 12 });

// 预加载当前页的所有文章
const articleIds = articles.articles.map(a => a.id);
await offlineService.preloadArticles(articleIds);
```

## 应用更新

### 检测更新

PWA 会自动检测 Service Worker 更新：

```typescript
window.addEventListener('pwa-update-available', (event) => {
  console.log('新版本可用');
  // 显示更新提示
  showUpdateNotification();
});
```

### 强制更新

```typescript
import { pwaInit } from '../../utils/pwaInit';

// 强制激活新的 Service Worker
await pwaInit.skipWaiting();

// 刷新页面以使用新版本
window.location.reload();
```

## 安装为应用

### 检测可安装性

```typescript
window.addEventListener('pwa-installable', (event) => {
  const { install } = event.detail;
  
  // 显示安装按钮
  showInstallButton(() => {
    install();
  });
});
```

### 手动触发安装

```html
<button @click="installApp">安装应用</button>

<script setup>
let installPrompt = null;

window.addEventListener('pwa-installable', (event) => {
  installPrompt = event.detail.install;
});

function installApp() {
  if (installPrompt) {
    installPrompt();
  }
}
</script>
```

## 浏览器支持

### 完整支持
- Chrome/Edge 88+
- Firefox 90+
- Safari 15.4+（部分功能受限）

### 部分支持
- Safari < 15.4（不支持后台同步）
- iOS Safari（不支持安装到主屏幕的某些功能）

### 不支持
- IE（已停止支持）

## 调试技巧

### Chrome DevTools

1. **Application 面板**
   - Service Workers: 查看 SW 状态、更新、卸载
   - Storage: 查看 IndexedDB、Cache Storage
   - Manifest: 检查 manifest.json 配置

2. **Network 面板**
   - 勾选 "Offline" 模拟离线环境
   - 查看请求来源（from ServiceWorker / from cache）

3. **Console 面板**
   - 查看 PWA 初始化日志
   - 监控缓存操作

### 常用命令

```javascript
// 在控制台中执行

// 获取缓存统计
const stats = await indexedDB.getStats();
console.log(stats);

// 检查离线状态
const status = offlineService.getNetworkStatus();
console.log(status);

// 清空缓存
await pwaInit.clearAllCache();
```

## 性能优化

### 缓存大小控制

- Service Worker 缓存: 限制静态资源数量
- IndexedDB: 定期清理过期数据
- 图片优化: 压缩图片，使用 WebP 格式

### 加载优化

- 懒加载: 仅加载可见内容
- 预加载: 智能预加载相关文章
- 分页: 避免一次加载过多数据

### 更新策略

- 后台更新: 不阻塞用户操作
- 增量更新: 仅更新变化的数据
- 版本控制: Service Worker 版本管理

## 故障排查

### Service Worker 未注册

**问题**: SW 注册失败或未激活

**解决方案**:
1. 检查浏览器控制台错误
2. 确保使用 HTTPS（或 localhost）
3. 检查 sw.js 文件路径
4. 清除浏览器缓存后重试

### IndexedDB 错误

**问题**: 数据保存或读取失败

**解决方案**:
1. 检查浏览器是否支持 IndexedDB
2. 确保有足够的存储空间
3. 检查是否在隐私模式（某些浏览器限制）
4. 清空 IndexedDB 后重试

### 离线数据不更新

**问题**: 数据更新后离线仍显示旧数据

**解决方案**:
1. 检查缓存过期时间设置
2. 手动清空缓存
3. 检查网络状态检测逻辑
4. 重启应用

## 最佳实践

1. **渐进增强**: PWA 功能应该是增强，不应影响基础功能
2. **用户提示**: 明确告知用户离线状态和数据来源
3. **缓存策略**: 根据数据类型选择合适的缓存策略
4. **版本管理**: Service Worker 更新时提示用户
5. **错误处理**: 优雅处理离线和缓存错误
6. **性能监控**: 定期检查缓存大小和性能指标

## 未来计划

- [ ] 支持后台同步上传文章
- [ ] 推送通知集成
- [ ] 更智能的预加载策略
- [ ] 离线编辑功能
- [ ] 更细粒度的缓存控制
- [ ] PWA 安装引导流程优化
