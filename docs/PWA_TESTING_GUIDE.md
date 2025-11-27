# PWA 功能测试指南

本文档提供详细的测试步骤，帮助你验证 SideDoor 的 PWA 离线功能是否正常工作。

## 🧪 测试前准备

### 1. 构建项目

```bash
# 安装依赖
npm install

# 构建项目
npm run build
```

### 2. 启动本地服务器

PWA 需要 HTTPS 或 localhost 环境：

```bash
# 方法 1: 使用项目的开发服务器
npm run dev:with-server

# 方法 2: 使用 http-server（需先安装）
npx http-server .output/chrome-mv3-dev -p 8080

# 方法 3: 使用 serve
npx serve .output/chrome-mv3-dev -p 8080
```

### 3. 打开浏览器

```
http://localhost:8080/read-later-home.html
```

## ✅ 测试清单

### 测试 1: Service Worker 注册

**目标**: 验证 Service Worker 是否成功注册

**步骤**:
1. 打开 Chrome DevTools (F12)
2. 切换到 `Application` 面板
3. 左侧菜单选择 `Service Workers`
4. 检查是否有 Service Worker 注册

**预期结果**:
- ✅ 显示 Service Worker 状态为 "activated and is running"
- ✅ Scope 为 `/`
- ✅ Console 输出 "Service Worker 注册成功"

**截图位置**: `Application > Service Workers`

---

### 测试 2: IndexedDB 初始化

**目标**: 验证 IndexedDB 数据库是否创建成功

**步骤**:
1. 打开 Chrome DevTools
2. 切换到 `Application` 面板
3. 左侧菜单选择 `Storage > IndexedDB`
4. 展开 `SideDoorDB`

**预期结果**:
- ✅ 存在数据库 `SideDoorDB`
- ✅ 包含 4 个 Object Stores:
  - `articles`
  - `articlesList`
  - `settings`
  - `cache`

**截图位置**: `Application > IndexedDB > SideDoorDB`

---

### 测试 3: 在线加载文章列表

**目标**: 验证在线时能正常加载和缓存文章

**步骤**:
1. 确保网络在线
2. 访问 `http://localhost:8080/read-later-home.html`
3. 等待文章列表加载完成
4. 打开 DevTools 查看 IndexedDB

**预期结果**:
- ✅ 文章列表正常显示
- ✅ IndexedDB 中 `articles` store 包含文章数据
- ✅ IndexedDB 中 `articlesList` store 包含列表缓存
- ✅ Console 输出缓存相关日志

**验证方法**:
```javascript
// 在 Console 中执行
const stats = await indexedDB.getStats();
console.log(stats);
// 应该显示 articles > 0
```

---

### 测试 4: 离线浏览文章列表

**目标**: 验证离线时能显示缓存的文章列表

**步骤**:
1. 确保已完成测试 3（有缓存数据）
2. 打开 DevTools → Network 面板
3. 勾选 "Offline" 复选框
4. 刷新页面

**预期结果**:
- ✅ 页面顶部显示离线提示横幅
- ✅ 文章列表正常显示（来自缓存）
- ✅ 横幅显示 "离线模式 - 显示缓存数据"
- ✅ Network 面板显示请求来自 Service Worker

**截图**: 离线横幅和文章列表

---

### 测试 5: 离线查看文章详情

**目标**: 验证离线时能查看单篇文章

**步骤**:
1. 在线时打开一篇文章（确保被缓存）
2. 回到文章列表
3. 切换到离线模式（DevTools → Network → Offline）
4. 再次点击该文章

**预期结果**:
- ✅ 文章内容正常显示
- ✅ 图片正常加载（如果已缓存）
- ✅ Console 输出 "使用离线缓存文章"

**验证方法**:
```javascript
// 在 Console 中执行
const article = await indexedDB.getArticle('article-id');
console.log(article);
```

---

### 测试 6: 网络恢复自动更新

**目标**: 验证网络恢复时自动更新缓存

**步骤**:
1. 离线模式下浏览文章
2. 取消 "Offline" 复选框（恢复在线）
3. 观察 Network 面板
4. 等待几秒

**预期结果**:
- ✅ Console 输出 "网络已连接，重新加载数据"
- ✅ Network 面板显示新的 API 请求
- ✅ 页面顶部的离线横幅消失
- ✅ 数据自动更新

---

### 测试 7: 缓存优先策略

**目标**: 验证在线时优先使用缓存，然后后台更新

**步骤**:
1. 清空 Network 面板日志
2. 在线状态下刷新页面
3. 观察页面加载速度和 Network 请求

**预期结果**:
- ✅ 页面几乎瞬间显示（缓存优先）
- ✅ Network 面板显示后台 API 请求
- ✅ 数据在后台更新
- ✅ Console 输出 "缓存已更新"

**性能对比**:
- 首次加载（无缓存）: ~1-2 秒
- 缓存加载: ~100-300 毫秒

---

### 测试 8: Service Worker 缓存

**目标**: 验证静态资源缓存

**步骤**:
1. 打开 DevTools → Application → Cache Storage
2. 展开缓存名称（如 `sidedoor-cache-v1.0.0`）
3. 查看缓存内容

**预期结果**:
- ✅ 缓存包含 HTML 文件
- ✅ 缓存包含 JS/CSS 文件
- ✅ 缓存包含图标文件
- ✅ 离线时静态资源仍可访问

**截图位置**: `Application > Cache Storage`

---

### 测试 9: PWA Manifest

**目标**: 验证 PWA Manifest 配置正确

**步骤**:
1. 打开 DevTools → Application → Manifest
2. 查看 Manifest 信息

**预期结果**:
- ✅ Name: "SideDoor - 稍后阅读"
- ✅ Short name: "SideDoor"
- ✅ Theme color: "#ff7b72"
- ✅ Icons: 显示 4 个尺寸的图标
- ✅ Display: "standalone"

**截图位置**: `Application > Manifest`

---

### 测试 10: 保存文章自动缓存

**目标**: 验证保存文章时自动缓存到本地

**步骤**:
1. 在浏览器中打开任意网页
2. 点击 SideDoor 扩展按钮
3. 保存文章到稍后阅读
4. 切换到离线模式
5. 访问稍后阅读列表

**预期结果**:
- ✅ 新保存的文章在列表中显示
- ✅ 离线时能查看新保存的文章
- ✅ IndexedDB 包含该文章数据

**验证方法**:
```javascript
// 查看所有缓存的文章
const articles = await indexedDB.getAllArticles();
console.log(articles.length);
```

---

### 测试 11: 预加载功能

**目标**: 验证文章预加载功能

**步骤**:
1. 访问文章列表页
2. 等待列表加载完成
3. 打开 Console
4. 观察预加载日志

**预期结果**:
- ✅ Console 输出 "开始预加载 X 篇文章"
- ✅ Console 输出 "预加载完成"
- ✅ IndexedDB 包含预加载的文章
- ✅ 后台 Network 请求预加载文章内容

---

### 测试 12: 缓存统计

**目标**: 验证缓存统计功能

**步骤**:
1. 打开 Console
2. 执行统计命令

**命令**:
```javascript
// IndexedDB 统计
const dbStats = await indexedDB.getStats();
console.table(dbStats);

// 离线服务统计
const offlineStats = await offlineService.getOfflineStats();
console.log(offlineStats);

// PWA 缓存统计
const pwaStats = await pwaInit.getCacheStats();
console.log(pwaStats);
```

**预期结果**:
- ✅ 显示缓存的文章数量
- ✅ 显示网络状态
- ✅ 显示 Service Worker 缓存大小

---

### 测试 13: 清空缓存

**目标**: 验证清空缓存功能

**步骤**:
1. 在 Console 执行清空命令
2. 刷新页面
3. 查看 IndexedDB 和 Cache Storage

**命令**:
```javascript
// 清空所有缓存
await pwaInit.clearAllCache();

// 验证
const stats = await indexedDB.getStats();
console.log(stats); // 应该全为 0
```

**预期结果**:
- ✅ IndexedDB 数据被清空
- ✅ Cache Storage 被清空
- ✅ 页面重新从网络加载数据

---

### 测试 14: 更新检测

**目标**: 验证 Service Worker 更新检测

**步骤**:
1. 修改 `public/sw.js` 的版本号
2. 刷新页面
3. 观察 Console 和 DevTools

**预期结果**:
- ✅ Console 输出 "新版本可用"
- ✅ 触发 `pwa-update-available` 事件
- ✅ Application 面板显示新的 Service Worker

**验证方法**:
```javascript
window.addEventListener('pwa-update-available', (event) => {
  console.log('检测到更新！', event.detail);
});
```

---

### 测试 15: 完整离线场景

**目标**: 模拟真实离线使用场景

**步骤**:
1. 在线时浏览 10 篇文章（确保缓存）
2. 完全断开网络（关闭 WiFi）
3. 关闭浏览器
4. 重新打开浏览器
5. 访问 `http://localhost:8080/read-later-home.html`

**预期结果**:
- ✅ 应用正常启动
- ✅ 显示离线横幅
- ✅ 文章列表显示 10 篇文章
- ✅ 可以正常查看文章详情
- ✅ 所有缓存的图片正常显示

---

## 🔧 常用测试命令

### 在 Console 中执行

```javascript
// ===== 初始化 =====
// 确保 IndexedDB 已初始化
await indexedDB.init();

// ===== 查看数据 =====
// 查看所有文章
const articles = await indexedDB.getAllArticles();
console.table(articles);

// 查看统计信息
const stats = await indexedDB.getStats();
console.table(stats);

// 查看网络状态
const status = offlineService.getNetworkStatus();
console.log(status);

// ===== 测试功能 =====
// 获取文章列表
const list = await offlineService.getArticles({ page: 1, pageSize: 12 });
console.log(list);

// 获取单篇文章
const article = await offlineService.getArticle('article-id');
console.log(article);

// 预加载文章
await offlineService.preloadArticles(['id1', 'id2']);

// ===== 清理 =====
// 清空所有缓存
await pwaInit.clearAllCache();

// 只清空 IndexedDB
await indexedDB.clearAll();

// 清理过期缓存
await offlineService.cleanOldCache();

// ===== Service Worker =====
// 查看 SW 注册
const registrations = await navigator.serviceWorker.getRegistrations();
console.log(registrations);

// 卸载 SW
registrations.forEach(r => r.unregister());

// 强制更新 SW
await pwaInit.skipWaiting();
```

## 📊 性能基准

### 加载时间对比

| 场景 | 首次加载 | 缓存加载 | 离线加载 |
|------|---------|---------|---------|
| 文章列表 | 1-2s | 100-300ms | 50-150ms |
| 文章详情 | 800ms-1.5s | 50-100ms | 30-80ms |
| 静态资源 | 500ms-1s | 10-50ms | 10-50ms |

### 缓存大小

| 类型 | 平均大小 |
|------|---------|
| 单篇文章 | 50-100 KB |
| 文章列表 | 10-20 KB |
| 静态资源 | 5-20 MB |
| 总计 | < 100 MB |

## 🐛 常见问题排查

### Service Worker 未激活

**检查**:
```javascript
navigator.serviceWorker.getRegistrations()
  .then(r => console.log(r));
```

**解决**: 刷新页面或重启浏览器

### IndexedDB 为空

**检查**:
```javascript
const stats = await indexedDB.getStats();
console.log(stats);
```

**解决**: 先在线浏览几篇文章，确保数据被缓存

### 离线不显示数据

**检查**:
```javascript
const isOffline = offlineService.shouldUseOfflineData();
console.log(isOffline);
```

**解决**: 确保已访问过数据（已缓存）

## ✅ 测试完成检查表

- [ ] Service Worker 成功注册
- [ ] IndexedDB 正确初始化
- [ ] 在线加载文章列表
- [ ] 离线浏览文章列表
- [ ] 离线查看文章详情
- [ ] 网络恢复自动更新
- [ ] 缓存优先策略工作
- [ ] 静态资源缓存
- [ ] PWA Manifest 正确
- [ ] 保存文章自动缓存
- [ ] 预加载功能正常
- [ ] 缓存统计准确
- [ ] 清空缓存功能
- [ ] 更新检测功能
- [ ] 完整离线场景

## 📝 测试报告模板

```markdown
# PWA 功能测试报告

**测试日期**: YYYY-MM-DD
**测试人员**: [您的名字]
**浏览器**: Chrome [版本号]
**环境**: [开发/生产]

## 测试结果

### 通过的测试
- [x] 测试 1: Service Worker 注册
- [x] 测试 2: IndexedDB 初始化
- ...

### 失败的测试
- [ ] 测试 X: [描述问题]
  - 错误信息: ...
  - 截图: ...

### 性能数据
- 文章列表加载时间: XX ms
- 缓存命中率: XX%
- 离线可用率: XX%

### 建议
1. ...
2. ...
```

## 🎉 测试成功标志

如果所有 15 项测试都通过，你应该能够：

1. ✅ 在完全离线的情况下浏览已缓存的文章
2. ✅ 看到清晰的离线状态提示
3. ✅ 体验到缓存优先带来的快速加载
4. ✅ 网络恢复时自动更新数据
5. ✅ 保存新文章时自动缓存到本地

**恭喜！SideDoor 的 PWA 功能已完美运行！** 🎊
