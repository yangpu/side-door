/**
 * SideDoor 统一 Web 服务器
 * 
 * 端口: 8080
 * 
 * 路由:
 * - /                    -> 稍后阅读主页
 * - /test                -> 测试页面
 * - /article             -> 文章详情页
 * - /favicon.ico         -> 网站图标 (使用扩展图标)
 * - /manifest.json       -> PWA manifest
 * - /sw.js               -> Service Worker
 * - /icon/*              -> 图标资源
 * - /assets/*            -> 静态资源
 * 
 * PWA 特性:
 * - Service Worker 离线缓存
 * - Web App Manifest
 * - 离线优先策略
 */

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { networkInterfaces } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// 路由配置
const ROUTES = {
  '/': 'public/read-later-standalone.html',
  '/index.html': 'public/read-later-standalone.html',
  '/test': 'test-page.html',
  '/test.html': 'test-page.html',
  '/article': 'public/article-detail.html',
  '/article.html': 'public/article-detail.html',
};

// 获取 MIME 类型
function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// 发送文件响应
async function sendFile(res, filePath, cacheControl = 'no-cache') {
  try {
    const content = await readFile(filePath);
    const mimeType = getMimeType(filePath);
    
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(content);
    return true;
  } catch (error) {
    return false;
  }
}

// 发送 404 响应
function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - 页面未找到</title>
      <style>
        body { font-family: system-ui; text-align: center; padding: 50px; background: #f5f5f5; }
        h1 { color: #ff7b72; }
        a { color: #667eea; }
      </style>
    </head>
    <body>
      <h1>404</h1>
      <p>页面未找到</p>
      <p><a href="/">返回首页</a> | <a href="/test">测试页面</a></p>
    </body>
    </html>
  `);
}

// 创建服务器
const server = createServer(async (req, res) => {
  // 解析 URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;
  
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // 只处理 GET 请求
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);
  
  // 1. 检查路由映射
  if (ROUTES[pathname]) {
    const filePath = join(__dirname, ROUTES[pathname]);
    if (await sendFile(res, filePath)) return;
  }
  
  // 2. 处理带查询参数的路由 (如 /article?articleId=xxx)
  const basePathname = pathname.split('?')[0];
  if (ROUTES[basePathname]) {
    const filePath = join(__dirname, ROUTES[basePathname]);
    if (await sendFile(res, filePath)) return;
  }
  
  // 3. 处理 Service Worker
  if (pathname === '/sw.js') {
    const filePath = join(__dirname, 'public/sw.js');
    if (await sendFile(res, filePath, 'no-cache')) return;
  }
  
  // 4. 处理 manifest.json
  if (pathname === '/manifest.json') {
    const filePath = join(__dirname, 'public/manifest.json');
    if (await sendFile(res, filePath, 'no-cache')) return;
  }
  
  // 5. 处理 favicon.ico - 使用扩展应用的图标
  if (pathname === '/favicon.ico') {
    const filePath = join(__dirname, 'public/icon/32.png');
    if (await sendFile(res, filePath, 'max-age=86400')) return;
  }
  
  // 6. 处理图标请求
  if (pathname.startsWith('/icon/')) {
    const filePath = join(__dirname, 'public', pathname);
    if (existsSync(filePath)) {
      if (await sendFile(res, filePath, 'max-age=86400')) return;
    }
  }
  
  // 7. 处理 public 目录下的静态文件
  const publicPath = join(__dirname, 'public', pathname);
  if (existsSync(publicPath)) {
    if (await sendFile(res, publicPath, 'max-age=3600')) return;
  }
  
  // 8. 处理 components 目录下的文件 (如 Reader.css)
  if (pathname.startsWith('/components/')) {
    const filePath = join(__dirname, pathname.substring(1));
    if (existsSync(filePath)) {
      if (await sendFile(res, filePath, 'max-age=3600')) return;
    }
  }
  
  // 9. 处理根目录下的静态文件
  const rootPath = join(__dirname, pathname.substring(1));
  if (existsSync(rootPath) && !pathname.includes('..')) {
    if (await sendFile(res, rootPath, 'max-age=3600')) return;
  }
  
  // 10. 健康检查
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'sidedoor-web',
      timestamp: new Date().toISOString(),
      routes: Object.keys(ROUTES),
    }));
    return;
  }
  
  // 404
  send404(res);
});

// 获取局域网 IP
function getLocalIPs() {
  const ips = [];
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// 启动服务器
server.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(70));
  console.log('🚀 SideDoor Web 服务器已启动');
  console.log('='.repeat(70));
  console.log('');
  console.log('📍 本地访问:');
  console.log(`   http://localhost:${PORT}`);
  console.log('');
  console.log('📖 路由:');
  console.log(`   /           -> 稍后阅读主页`);
  console.log(`   /test       -> 测试页面`);
  console.log(`   /article    -> 文章详情页`);
  console.log(`   /health     -> 健康检查`);
  console.log('');
  
  const localIPs = getLocalIPs();
  if (localIPs.length > 0) {
    console.log('🌐 局域网访问:');
    localIPs.forEach(ip => {
      console.log(`   http://${ip}:${PORT}`);
    });
    console.log('');
  }
  
  console.log('💡 PWA 支持:');
  console.log('   - Service Worker: /sw.js');
  console.log('   - Manifest: /manifest.json');
  console.log('   - 支持离线访问');
  console.log('');
  console.log('按 Ctrl+C 停止服务');
  console.log('='.repeat(70));
  console.log('');
});

// 优雅退出
process.on('SIGTERM', () => {
  console.log('\n🛑 收到退出信号，正在关闭服务...');
  server.close(() => {
    console.log('✅ 服务已停止');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 收到退出信号，正在关闭服务...');
  server.close(() => {
    console.log('✅ 服务已停止');
    process.exit(0);
  });
});
