# 🚪 Side Door (旁门)

Your agent to summarize the page and translate it to Chinese.

## ✨ 新功能：稍后阅读主页

通过独立的 Web 服务访问你的稍后阅读列表！

### 🚀 本地运行（推荐）

```bash
# 启动本地 Web 服务
npm run serve:read-later

# 浏览器访问
http://localhost:3001
```

### 📖 文档

- **[本地运行指南](./docs/本地运行稍后阅读主页.md)** ⭐ 快速开始
- **[部署到云服务器](./docs/部署到云服务器.md)** - 使用 Nginx 部署
- **[nginx.conf.example](./nginx.conf.example)** - Nginx 配置示例

### ✅ 功能特点

- 💻 **本地访问**：无需云服务，本地即可运行
- 🌐 **局域网共享**：手机、平板同网络访问
- 🎨 **现代设计**：响应式布局，支持暗色主题
- 🔄 **实时同步**：与扩展中的列表完全一致
- 🚀 **易于部署**：可部署到任何支持 Nginx 的服务器
- 📚 **分页浏览**：流畅的阅读体验

### 🛠️ 部署选项

1. **本地服务**（开发/个人使用）
   - 运行 `npm run serve:read-later`
   - 访问 `http://localhost:3001`

2. **云服务器**（公网访问）
   - 使用 Nginx 提供静态文件
   - 或使用 PM2 运行 Node.js 服务
   - 支持 HTTPS

---

## 关于 Side Door

Your agent to summarize the page and translate it to Chinese.
