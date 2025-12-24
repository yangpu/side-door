/**
 * 统一开发服务器
 * 
 * 同时启动：
 * 1. WXT 扩展开发服务器（端口 5173）
 * 2. Web 服务器（端口 8080）- 包含测试页面、稍后阅读主页、文章详情页
 */

import { spawn } from 'child_process';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { networkInterfaces } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 端口配置
const WEB_PORT = 8080;

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
  '.crx': 'application/x-chrome-extension',
  '.zip': 'application/zip',
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

// 获取最新的 CRX 文件
function getLatestCrxFile() {
  const outputDir = join(__dirname, '.output');
  if (!existsSync(outputDir)) return null;
  
  const files = readdirSync(outputDir);
  const crxFiles = files.filter(f => f.endsWith('.crx')).sort().reverse();
  
  if (crxFiles.length > 0) {
    return join(outputDir, crxFiles[0]);
  }
  return null;
}

// 获取最新的 ZIP 文件
function getLatestZipFile() {
  const outputDir = join(__dirname, '.output');
  if (!existsSync(outputDir)) return null;
  
  const files = readdirSync(outputDir);
  const zipFiles = files.filter(f => f.endsWith('.zip') && f.startsWith('side-door')).sort().reverse();
  
  if (zipFiles.length > 0) {
    return join(outputDir, zipFiles[0]);
  }
  return null;
}

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

// 启动 Web 服务器
function startWebServer() {
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
    
    // 1. API 路由优先处理
    if (pathname === '/api/extension-info') {
      const crxFile = getLatestCrxFile();
      const zipFile = getLatestZipFile();
      
      // 读取版本信息
      let version = 'unknown';
      const manifestPath = join(__dirname, '.output/chrome-mv3/manifest.json');
      const packagePath = join(__dirname, 'package.json');
      
      if (existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
          version = manifest.version;
        } catch (e) {
          console.error('读取 manifest.json 失败:', e);
        }
      }
      
      if (version === 'unknown' && existsSync(packagePath)) {
        try {
          const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
          version = pkg.version;
        } catch (e) {
          console.error('读取 package.json 失败:', e);
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        version,
        crxAvailable: !!crxFile,
        zipAvailable: !!zipFile,
        crxUrl: crxFile ? '/download/extension.crx' : null,
        zipUrl: zipFile ? '/download/extension.zip' : null,
        buildRequired: !zipFile && !crxFile,
        buildCommand: 'npm run build:pack',
      }));
      return;
    }
    
    // 2. 下载扩展 CRX 文件
    if (pathname === '/download/extension.crx' || pathname === '/extension.crx') {
      const crxFile = getLatestCrxFile();
      if (crxFile && existsSync(crxFile)) {
        const fileName = crxFile.split('/').pop();
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        if (await sendFile(res, crxFile, 'no-cache')) return;
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'CRX 文件不存在',
          message: '请先运行 npm run build:pack 生成扩展包',
        }));
        return;
      }
    }
    
    // 3. 下载扩展 ZIP 文件
    if (pathname === '/download/extension.zip' || pathname === '/extension.zip') {
      const zipFile = getLatestZipFile();
      if (zipFile && existsSync(zipFile)) {
        const fileName = zipFile.split('/').pop();
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        if (await sendFile(res, zipFile, 'no-cache')) return;
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'ZIP 文件不存在',
          message: '请先运行 npm run build:pack 生成扩展包',
        }));
        return;
      }
    }
    
    // 4. 检查路由映射
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

  server.listen(WEB_PORT, () => {
    console.log(`🌐 Web server: http://localhost:${WEB_PORT}`);
    console.log(`   /           -> 稍后阅读主页`);
    console.log(`   /test       -> 测试页面`);
    console.log(`   /article    -> 文章详情页`);
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

  // 启动服务
  const webServer = startWebServer();
  const wxtProcess = startWxtServer();

  console.log('🔧 Extension dev: http://localhost:5173 (WXT)');
  console.log('');

  const localIPs = getLocalIPs();
  if (localIPs.length > 0) {
    console.log('🌐 局域网访问:');
    localIPs.forEach(ip => {
      console.log(`   http://${ip}:${WEB_PORT}`);
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
    
    webServer.close(() => {
      console.log('✅ Web server 已停止');
    });
    
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
