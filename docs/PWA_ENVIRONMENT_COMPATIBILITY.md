# PWA 环境兼容性说明

## 概述

SideDoor 的 PWA 实现支持在多种环境中运行，并能自动适配不同环境的特性和限制。

## 支持的环境

### 1. Chrome/Edge 扩展环境 ✅

**特点：**
- 扩展已有自己的 background service worker
- 无法注册额外的 Service Worker（会报错）
- 支持 IndexedDB 离线存储

**自动适配：**
- ✅ 自动检测扩展环境
- ✅ 跳过 Service Worker 注册
- ✅ 仅使用 IndexedDB 作为离线存储
- ✅ 保留完整的离线优先功能

**检测方式：**
```typescript
const isExtension = !!(
  (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) ||
  window.location.protocol === 'chrome-extension:'
);
```

### 2. Firefox 扩展环境 ✅

**特点：**
- 类似 Chrome 扩展
- 使用 `browser` 全局对象而非 `chrome`
- URL 协议为 `moz-extension:`

**自动适配：**
- ✅ 自动检测 Firefox 扩展
- ✅ 跳过 Service Worker 注册
- ✅ 使用 IndexedDB

### 3. 独立 Web 应用（PWA） ✅

**特点：**
- 完整的 PWA 支持
- 可注册 Service Worker
- 支持安装到桌面

**功能：**
- ✅ Service Worker 缓存（Cache First / Network First）
- ✅ IndexedDB 离线存储
- ✅ 安装提示
- ✅ 后台同步
- ✅ 离线模式

**访问方式：**
- 独立服务：`http://localhost:3000/read-later-home.html`
- 生产部署：`https://yourdomain.com/read-later-home.html`

### 4. 普通浏览器页面 ✅

**特点：**
- 在浏览器中直接访问
- 支持 Service Worker（如果协议为 HTTPS 或 localhost）
- 无扩展权限

**功能：**
- ✅ Service Worker（仅 HTTPS）
- ✅ IndexedDB
- ✅ 离线优先加载

## 环境检测逻辑

### PWA 初始化器 (`utils/pwaInit.ts`)

```typescript
private isExtensionContext(): boolean {
  return !!(
    // Chrome 扩展
    (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) ||
    // Firefox 扩展
    (typeof browser !== 'undefined' && browser.runtime && browser.runtime.id) ||
    // 检查 URL 协议
    window.location.protocol === 'chrome-extension:' ||
    window.location.protocol === 'moz-extension:'
  );
}
```

### 初始化流程

```typescript
async init(config: Partial<PWAConfig> = {}): Promise<void> {
  // 1. IndexedDB - 所有环境都支持
  await indexedDB.init();
  
  // 2. Service Worker - 仅非扩展环境
  if ('serviceWorker' in navigator && !this.isExtensionContext()) {
    this.registration = await this.registerServiceWorker();
  } else if (this.isExtensionContext()) {
    console.log('[PWA] 扩展环境，使用 IndexedDB 作为离线存储');
  }
  
  // 3. 其他初始化...
}
```

## 功能对比表

| 功能 | Chrome扩展 | Firefox扩展 | 独立PWA | 普通页面 |
|------|-----------|------------|---------|---------|
| IndexedDB 离线存储 | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ❌ | ❌ | ✅ | ✅* |
| 静态资源缓存 | ⚠️** | ⚠️** | ✅ | ✅* |
| 离线优先加载 | ✅ | ✅ | ✅ | ✅ |
| 后台同步 | ⚠️*** | ⚠️*** | ✅ | ✅* |
| 安装提示 | ❌ | ❌ | ✅ | ✅* |
| 推送通知 | ✅**** | ✅**** | ✅ | ✅* |

**说明：**
- `*` 需要 HTTPS 协议（localhost 除外）
- `**` 扩展环境通过浏览器缓存实现
- `***` 扩展环境可使用 chrome.alarms API
- `****` 扩展环境使用 chrome.notifications API

## 常见问题

### Q1: 为什么在扩展中无法注册 Service Worker？

**A:** Chrome/Firefox 扩展已经有自己的 background service worker，不允许页面再注册额外的 SW。这是浏览器的安全限制。

### Q2: 扩展环境下如何实现离线功能？

**A:** 通过 IndexedDB 实现：
- ✅ 文章数据缓存到 IndexedDB
- ✅ 离线优先加载策略
- ✅ 自动后台更新缓存
- ❌ 无法缓存静态资源（依赖浏览器缓存）

### Q3: 如何测试不同环境？

**扩展环境：**
```bash
npm run dev        # 启动开发服务器
# 加载扩展到 Chrome/Edge
```

**独立 PWA：**
```bash
npm run serve      # 启动独立 Web 服务
# 访问 http://localhost:3000/read-later-home.html
```

### Q4: 控制台显示 "Worker disallowed" 错误？

**A:** 这个错误已被正确处理：
- ✅ 自动检测扩展环境
- ✅ 跳过 Service Worker 注册
- ✅ 不影响其他功能

如果仍然看到错误，请确保：
1. 已更新到最新代码
2. 清除浏览器缓存
3. 重新加载扩展

## 最佳实践

### 1. 统一使用 PWA 初始化器

```typescript
import { pwaInit } from './utils/pwaInit';

// 自动适配环境
await pwaInit.init({
  enableBackgroundSync: true,
  preloadArticles: true,
});
```

### 2. 使用离线优先服务

```typescript
import { offlineService } from './utils/offlineService';

// 自动选择最佳数据源（缓存优先）
const articles = await offlineService.getArticles({ page: 1 });
```

### 3. 检查离线状态

```typescript
const isOffline = offlineService.shouldUseOfflineData();
const networkStatus = offlineService.getNetworkStatus();

if (isOffline) {
  console.log('当前离线，使用缓存数据');
}
```

## 日志输出示例

### 扩展环境
```
[PWA] 开始初始化...
IndexedDB 初始化成功
[PWA] IndexedDB 初始化完成
[PWA] 扩展环境，使用 IndexedDB 作为离线存储
[PWA] 初始化完成
```

### 独立 PWA 环境
```
[PWA] 开始初始化...
IndexedDB 初始化成功
[PWA] IndexedDB 初始化完成
Service Worker 已注册: http://localhost:3000/
[PWA] Service Worker 注册完成
[PWA] 初始化完成
```

## 总结

SideDoor 的 PWA 实现：
- ✅ **智能环境适配**：自动检测并适配不同环境
- ✅ **零配置**：开发者无需关心环境差异
- ✅ **优雅降级**：在限制环境中仍能提供离线功能
- ✅ **一致体验**：所有环境都支持离线优先加载
