/**
 * 稍后阅读主页本地服务器
 * 
 * 功能：
 * - 提供稍后阅读主页的 HTTP 服务
 * - 支持 CORS，可从浏览器扩展访问
 * - 提供正确的 Content-Type
 * 
 * 使用：
 * node serve-read-later.js
 * 
 * 访问：
 * http://localhost:3001
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const HTML_FILE = path.join(__dirname, 'public', 'read-later-standalone.html');

// 检查文件是否存在
if (!fs.existsSync(HTML_FILE)) {
  console.error('❌ 错误: 找不到文件', HTML_FILE);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // 设置 CORS 头，允许跨域访问
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 只处理 GET 请求
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  // 记录请求
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.headers['user-agent'] || 'Unknown'}`);

  // 提供 HTML 文件
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(HTML_FILE, 'utf-8', (err, data) => {
      if (err) {
        console.error('❌ 读取文件失败:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
    return;
  }

  // 健康检查端点
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'read-later-home',
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(70));
  console.log('🚀 SideDoor 稍后阅读主页服务已启动');
  console.log('='.repeat(70));
  console.log('');
  console.log('📍 本地访问:');
  console.log(`   http://localhost:${PORT}`);
  console.log('');
  console.log('🌐 局域网访问:');
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   http://${iface.address}:${PORT}`);
      }
    }
  }
  console.log('');
  console.log('💡 提示:');
  console.log('   - 按 Ctrl+C 停止服务');
  console.log('   - 修改 HTML 文件后刷新浏览器即可看到更新');
  console.log('   - 健康检查: http://localhost:' + PORT + '/health');
  console.log('');
  console.log('='.repeat(70));
  console.log('');
});

// 优雅退出
process.on('SIGTERM', () => {
  console.log('\n\n🛑 收到退出信号，正在关闭服务...');
  server.close(() => {
    console.log('✅ 服务已停止');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n\n🛑 收到退出信号，正在关闭服务...');
  server.close(() => {
    console.log('✅ 服务已停止');
    process.exit(0);
  });
});
