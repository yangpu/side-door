# SideDoor PWA 离线支持

> **让 SideDoor 无论在线还是离线都能为您提供流畅的阅读体验** ✨

## 🎯 核心特性

### ✅ 已实现

- **离线优先**: 缓存优先加载，后台自动更新
- **Service Worker**: 智能缓存静态资源和 API 响应
- **IndexedDB**: 持久化存储文章内容和列表
- **网络感知**: 实时检测在线/离线状态和服务可用性
- **自动缓存**: 保存文章时自动缓存到本地
- **预加载**: 支持批量预加载文章内容
- **PWA 安装**: 支持作为独立应用安装
- **版本管理**: Service Worker 自动更新和版本控制

### 🌟 用户体验

- **快速响应**: 缓存优先，毫秒级加载
- **离线可用**: 完全离线也能浏览已缓存内容
- **平滑降级**: 网络失败时无缝切换到缓存
- **实时提示**: 清晰的离线状态提示
- **自动恢复**: 网络恢复时自动更新数据

## 🚀 快速开始

### 1. 基本设置

在应用入口文件中初始化 PWA：

```typescript
import { pwaInit } from './utils/pwaInit';

pwaInit.init({
  enableBackgroundSync: true,
  preloadArticles: true,
});
```

### 2. 使用离线优先服务

```typescript
import { offlineService } from './utils/offlineService';

// 加载文章列表
const articles = await offlineService.getArticles({ page: 1, pageSize: 12 });

// 加载单篇文章
const article = await offlineService.getArticle(articleId);

// 检查离线状态
const isOffline = offlineService.shouldUseOfflineData();
```

### 3. 添加离线状态提示

```vue
<template>
  <div v-if="offlineMessage" class="offline-banner">
    {{ offlineMessage }}
  </div>
</template>

<script setup>
const networkStatus = ref(offlineService.getNetworkStatus());
const offlineMessage = computed(() => {
  if (!networkStatus.value.online) return '离线模式';
  if (!networkStatus.value.supabaseAvailable) return '服务暂时不可用';
  return '';
});
</script>
```

## 📁 项目结构

```
side-door/
├── utils/
│   ├── indexedDB.ts          # IndexedDB 封装
│   ├── offlineService.ts     # 离线服务逻辑
│   ├── offlineCache.ts       # 离线缓存工具
│   └── pwaInit.ts           # PWA 初始化
├── public/
│   ├── sw.js                # Service Worker
│   └── manifest.json        # PWA Manifest
├── entrypoints/
│   ├── read-later-home/     # 稍后阅读主页（已集成 PWA）
│   ├── article-viewer/      # 文章查看器（已集成 PWA）
│   ├── reader/             # 阅读器（已集成 PWA）
│   └── background.ts       # 后台脚本（支持离线缓存）
└── docs/
    ├── PWA_SUPPORT.md      # 详细文档
    ├── PWA_QUICK_START.md  # 快速入门
    └── CHANGELOG_PWA.md    # 更新日志
```

## 🔧 核心模块

### 1. IndexedDB (`utils/indexedDB.ts`)

持久化本地存储：

```typescript
// 保存文章
await indexedDB.saveArticle(article);

// 获取文章
const article = await indexedDB.getArticle(articleId);

// 保存列表缓存
await indexedDB.saveArticlesList(key, articles, total);

// 获取统计
const stats = await indexedDB.getStats();
```

### 2. 离线服务 (`utils/offlineService.ts`)

智能数据加载：

```typescript
// 离线优先获取文章
const articles = await offlineService.getArticles({ page: 1, pageSize: 12 });

// 检查网络状态
const status = offlineService.getNetworkStatus();

// 预加载文章
await offlineService.preloadArticles(['id1', 'id2']);
```

### 3. Service Worker (`public/sw.js`)

缓存策略：

- **静态资源**: Cache First（缓存优先）
- **API 请求**: Network First（网络优先，失败时用缓存）
- **自动更新**: 检测新版本并提示用户

### 4. PWA 初始化 (`utils/pwaInit.ts`)

统一管理：

```typescript
// 初始化
await pwaInit.init(config);

// 清空缓存
await pwaInit.clearAllCache();

// 获取统计
const stats = await pwaInit.getCacheStats();
```

## 📊 数据流

```
用户请求文章
    ↓
离线服务检查网络状态
    ↓
    ├─ 在线
    │   ├─ 先返回缓存（快速响应）
    │   └─ 后台更新缓存
    │
    └─ 离线
        └─ 仅使用缓存数据
    ↓
IndexedDB 存储/读取
    ↓
返回数据给用户
```

## 🎨 离线状态 UI

```vue
<!-- 离线状态横幅 -->
<div v-if="offlineMessage" class="offline-banner">
  <svg><!-- 离线图标 --></svg>
  <span>{{ offlineMessage }}</span>
</div>

<style>
.offline-banner {
  background: linear-gradient(135deg, #ffd93d 0%, #ffb938 100%);
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
```

## 📱 PWA 安装

### Manifest 配置

```json
{
  "name": "SideDoor - 稍后阅读",
  "short_name": "SideDoor",
  "start_url": "/read-later-home.html",
  "display": "standalone",
  "theme_color": "#ff7b72",
  "icons": [...]
}
```

### 安装提示

```typescript
window.addEventListener('pwa-installable', (event) => {
  const { install } = event.detail;
  showInstallButton(() => install());
});
```

## 🔍 调试技巧

### Chrome DevTools

1. **Application 面板**
   - Service Workers: 查看状态和更新
   - Storage → IndexedDB: 查看缓存数据
   - Cache Storage: 查看 SW 缓存

2. **Network 面板**
   - 勾选 "Offline" 测试离线模式
   - 查看请求来源（from ServiceWorker）

3. **Console**
   ```javascript
   // 查看统计
   await indexedDB.getStats();
   
   // 检查状态
   offlineService.getNetworkStatus();
   
   // 清空缓存
   await pwaInit.clearAllCache();
   ```

## 📈 性能优化

### 缓存策略

- **静态资源**: 永久缓存，版本更新时清理
- **API 数据**: 5 分钟过期
- **文章内容**: 7 天过期
- **自动清理**: 启动时清理过期数据

### 预加载优化

```typescript
// 预加载可见文章
const articleIds = articles.map(a => a.id);
await offlineService.preloadArticles(articleIds);
```

## 🌐 浏览器支持

| 浏览器 | 版本 | Service Worker | IndexedDB | PWA 安装 |
|--------|------|---------------|-----------|----------|
| Chrome | 88+ | ✅ | ✅ | ✅ |
| Edge | 88+ | ✅ | ✅ | ✅ |
| Firefox | 90+ | ✅ | ✅ | ✅ |
| Safari | 15.4+ | ⚠️ | ✅ | ⚠️ |
| iOS Safari | 15.4+ | ⚠️ | ✅ | ⚠️ |

⚠️ = 部分功能受限

## 🐛 故障排查

### Service Worker 未注册

**症状**: Console 无 SW 注册成功日志

**解决**:
1. 确保使用 HTTPS（或 localhost）
2. 检查 `sw.js` 文件路径
3. 清空浏览器缓存

### 离线数据不显示

**症状**: 离线时显示空白

**解决**:
1. 确保先在线访问过（缓存数据）
2. 检查 IndexedDB 是否有数据
3. 查看 Console 错误信息

### 缓存占用过大

**症状**: 存储空间警告

**解决**:
```typescript
// 调整缓存过期时间
pwaInit.init({
  cacheMaxAge: 3 * 24 * 60 * 60 * 1000  // 改为 3 天
});

// 手动清理
await pwaInit.clearAllCache();
```

## 📚 文档

- [详细文档](./docs/PWA_SUPPORT.md) - 完整的功能说明和 API 文档
- [快速入门](./docs/PWA_QUICK_START.md) - 快速上手指南
- [更新日志](./docs/CHANGELOG_PWA.md) - 版本更新记录

## 🔮 未来规划

- [ ] 后台同步上传功能
- [ ] 推送通知集成
- [ ] 更智能的预加载
- [ ] 离线编辑支持
- [ ] 多设备同步
- [ ] 离线搜索功能

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

与 SideDoor 主项目相同

---

**Made with ❤️ for offline reading experience**
