/**
 * 统一开发服务器
 * 
 * 同时启动：
 * 1. WXT 扩展开发服务器（端口 5173）
 * 2. test-page 测试页面服务器（端口 8080）
 * 3. read-later 稍后阅读主页服务器（端口 3001）
 */

import { spawn } from 'child_process';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { networkInterfaces } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 端口配置
const TEST_PAGE_PORT = 8080;
const READ_LATER_PORT = 3001;

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

// 启动 test-page 服务器
function startTestPageServer() {
  const server = createServer(async (req, res) => {
    let filePath = req.url === '/' ? '/test-page.html' : req.url;
    filePath = join(__dirname, filePath);

    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const content = await readFile(filePath);
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    }
  });

  server.listen(TEST_PAGE_PORT, () => {
    console.log(`📝 Test page server: http://localhost:${TEST_PAGE_PORT}`);
  });

  return server;
}

// 启动 read-later 服务器
function startReadLaterServer() {
  const HTML_FILE = join(__dirname, 'public', 'read-later-standalone.html');
  const FAVICON_FILE = join(__dirname, 'public', 'icon', '128.png');

  if (!existsSync(HTML_FILE)) {
    console.error('❌ 错误: 找不到文件', HTML_FILE);
    return null;
  }

  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    // 处理 favicon
    if (req.url === '/favicon.ico') {
      if (existsSync(FAVICON_FILE)) {
        readFile(FAVICON_FILE).then(data => {
          res.writeHead(200, { 'Content-Type': 'image/png' });
          res.end(data);
        }).catch(() => {
          res.writeHead(404);
          res.end();
        });
      } else {
        res.writeHead(404);
        res.end();
      }
      return;
    }

    // 处理 icon 图片请求
    if (req.url.startsWith('/icon/')) {
      const iconPath = join(__dirname, 'public', req.url);
      if (existsSync(iconPath)) {
        readFile(iconPath).then(data => {
          res.writeHead(200, { 'Content-Type': 'image/png' });
          res.end(data);
        }).catch(() => {
          res.writeHead(404);
          res.end();
        });
      } else {
        res.writeHead(404);
        res.end();
      }
      return;
    }

    // 处理文章查看页面 - 代理到 WXT 开发服务器
    if (req.url.startsWith('/article-viewer.html')) {
      const { default: fetch } = await import('node-fetch');
      const wxtUrl = `http://localhost:5173${req.url}`;
      
      try {
        const response = await fetch(wxtUrl);
        const html = await response.text();
        
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        });
        res.end(html);
      } catch (err) {
        console.error('❌ 代理到 WXT 失败:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Failed to load article viewer');
      }
      return;
    }

    // 处理根路径和 index.html
    if (req.url === '/' || req.url === '/index.html') {
      readFile(HTML_FILE, 'utf-8').then(data => {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        });
        res.end(data);
      }).catch(err => {
        console.error('❌ 读取文件失败:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      });
      return;
    }

    // 处理健康检查
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'read-later-home',
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // 处理 public 目录下的静态文件（如 article-detail.html）
    // 去除 URL 中的查询参数
    const urlPath = req.url.split('?')[0];
    const publicFilePath = join(__dirname, 'public', urlPath);
    
    if (existsSync(publicFilePath)) {
      const ext = extname(publicFilePath);
      const contentType = MIME_TYPES[ext] || 'text/html';
      
      readFile(publicFilePath).then(data => {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        });
        res.end(data);
      }).catch(err => {
        console.error('❌ 读取文件失败:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      });
      return;
    }

    // 处理 components 目录下的静态文件（如 Reader.css）
    const componentsFilePath = join(__dirname, urlPath.substring(1)); // 去除开头的 /
    
    if (existsSync(componentsFilePath)) {
      const ext = extname(componentsFilePath);
      const contentType = MIME_TYPES[ext] || 'text/css';
      
      readFile(componentsFilePath).then(data => {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        });
        res.end(data);
      }).catch(err => {
        console.error('❌ 读取文件失败:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });

  server.listen(READ_LATER_PORT, () => {
    console.log(`📖 Read later home: http://localhost:${READ_LATER_PORT}`);
  });

  return server;
}

// 启动 WXT 开发服务器
function startWxtServer() {
  const wxt = spawn('npx', ['wxt'], {
    stdio: 'inherit',
    shell: true
  });

  wxt.on('error', (err) => {
    console.error('❌ WXT 启动失败:', err);
  });

  return wxt;
}

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

// 主函数
async function main() {
  console.log('');
  console.log('='.repeat(70));
  console.log('🚀 SideDoor 开发环境启动中...');
  console.log('='.repeat(70));
  console.log('');

  // 启动三个服务
  const testPageServer = startTestPageServer();
  const readLaterServer = startReadLaterServer();
  const wxtProcess = startWxtServer();

  console.log('🔧 Extension dev: http://localhost:5173 (WXT)');
  console.log('');

  const localIPs = getLocalIPs();
  if (localIPs.length > 0) {
    console.log('🌐 局域网访问:');
    localIPs.forEach(ip => {
      console.log(`   Test page: http://${ip}:${TEST_PAGE_PORT}`);
      console.log(`   Read later: http://${ip}:${READ_LATER_PORT}`);
    });
    console.log('');
  }

  console.log('💡 提示:');
  console.log('   - 按 Ctrl+C 停止所有服务');
  console.log('   - 修改文件后浏览器会自动刷新（WXT 热重载）');
  console.log('   - 修改 HTML 文件后手动刷新浏览器');
  console.log('');
  console.log('='.repeat(70));
  console.log('');

  // 优雅退出
  const cleanup = () => {
    console.log('\n\n🛑 正在关闭所有服务...');
    
    testPageServer.close(() => {
      console.log('✅ Test page server 已停止');
    });
    
    if (readLaterServer) {
      readLaterServer.close(() => {
        console.log('✅ Read later server 已停止');
      });
    }
    
    wxtProcess.kill();
    console.log('✅ WXT 已停止');
    
    console.log('👋 再见！');
    process.exit(0);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

main().catch(err => {
  console.error('❌ 启动失败:', err);
  process.exit(1);
});
