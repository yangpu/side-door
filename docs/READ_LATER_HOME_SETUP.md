# 稍后阅读主页设置指南

## 概述

SideDoor 现在支持创建一个独立的稍后阅读主页，该主页可以托管在 Supabase Storage 上，让你可以通过直接访问链接来查看你的稍后阅读列表，而不需要安装浏览器扩展。

## 功能特点

- ✅ 与扩展应用 popup 中的稍后阅读列表完全一致
- ✅ 响应式设计，支持桌面和移动设备
- ✅ 支持暗色/浅色主题切换
- ✅ 分页显示文章列表
- ✅ 支持查看文章详情、HTML/PDF 文件、原文链接
- ✅ 可通过公开链接访问，无需安装扩展

## 使用步骤

### 1. 构建项目

首先，确保项目已经构建：

```bash
npm run build
```

这将在 `.output/chrome-mv3/` 目录下生成 `read-later-home.html` 文件。

### 2. 配置 Supabase Storage

#### 方法一：使用自动上传脚本（推荐）

运行以下命令自动上传到 Supabase Storage：

```bash
npm run upload:read-later-home
```

脚本会自动：
- 检查并创建 `public-pages` bucket（如果不存在）
- 上传 `read-later-home.html` 文件
- 输出公开访问 URL

#### 方法二：手动上传

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 进入你的项目
3. 点击左侧菜单的 "Storage"
4. 创建一个新的 public bucket（如果还没有）：
   - 点击 "New bucket"
   - 名称：`public-pages`
   - 勾选 "Public bucket"
   - 点击 "Create bucket"
5. 进入 `public-pages` bucket
6. 点击 "Upload file"
7. 选择 `.output/chrome-mv3/read-later-home.html` 文件
8. 上传完成后，点击文件获取公开 URL

### 3. 配置 CORS（如果需要）

如果页面无法正常加载资源，需要配置 Supabase Storage 的 CORS：

1. 在 Supabase Dashboard 中，进入 "Storage" > "Configuration"
2. 添加以下 CORS 规则：

```json
[
  {
    "allowedOrigins": ["*"],
    "allowedMethods": ["GET", "HEAD"],
    "allowedHeaders": ["*"],
    "maxAgeSeconds": 3600
  }
]
```

### 4. 访问稍后阅读主页

上传成功后，你将获得一个公开访问 URL，格式类似：

```
https://rimhmaeecdcrhuqbisjv.supabase.co/storage/v1/object/public/public-pages/read-later-home.html
```

你可以：
- 将此链接添加到浏览器书签
- 分享给其他人（如果你希望公开分享）
- 在移动设备上访问
- 设置为浏览器主页

## 注意事项

### 数据访问

- 稍后阅读主页会直接从 Supabase 读取文章数据
- 确保你的 Supabase 项目设置了正确的 RLS（Row Level Security）策略
- 默认情况下，所有人都可以读取公开的文章数据

### 主题同步

- 主页支持暗色/浅色主题切换
- 主题设置保存在浏览器的 localStorage 中
- 在不同设备上需要分别设置主题偏好

### 更新部署

每次修改代码后，需要重新构建并上传：

```bash
npm run build
npm run upload:read-later-home
```

### 性能优化

- 页面默认每页显示 12 篇文章
- 支持分页浏览，不会一次性加载所有文章
- 图片使用 lazy loading 优化加载速度

## 故障排除

### 页面无法加载

1. 检查 Supabase 项目是否正常运行
2. 确认 Storage bucket 设置为 public
3. 检查浏览器控制台是否有 CORS 错误
4. 验证 Supabase URL 和 Anon Key 是否正确配置

### 文章列表为空

1. 确认扩展中已保存了文章
2. 检查 Supabase 数据库中 `articles` 表是否有数据
3. 验证数据库的 RLS 策略允许公开读取

### 样式显示异常

1. 确认 HTML 文件完整上传
2. 清除浏览器缓存后重新访问
3. 检查 Supabase Storage 的 CORS 配置

## 技术细节

### 文件结构

```
entrypoints/read-later-home/
├── index.html              # 入口 HTML
├── main.ts                 # 应用入口
├── App.vue                 # 应用容器组件
├── ReadLaterHomePage.vue   # 主页面组件
└── style.css               # 全局样式
```

### 依赖项

- Vue 3：前端框架
- Supabase Client：数据访问
- ReadLaterService：文章数据服务

### 构建配置

页面通过 WXT 框架构建，配置文件：
- `wxt.config.ts`：扩展配置
- `vite.config.ts`：构建配置

## 更多信息

如有问题或建议，请访问：
- GitHub Issues: [项目地址]
- 文档: [文档链接]
