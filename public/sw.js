/**
 * Service Worker - PWA 离线支持
 * 
 * 缓存策略:
 * - 静态资源: Cache First (缓存优先)
 * - HTML 页面: Network First (网络优先)
 * - API 请求: Network First with Cache Fallback
 * - 图片资源: Cache First with Network Fallback
 */

const CACHE_VERSION = 'v1.1.0';
const CACHE_NAME = `sidedoor-cache-${CACHE_VERSION}`;

// 需要预缓存的核心资源
const PRECACHE_ASSETS = [
  '/',
  '/test',
  '/article',
  '/manifest.json',
  '/icon/16.png',
  '/icon/32.png',
  '/icon/48.png',
  '/icon/96.png',
  '/icon/128.png',
  '/components/Reader.css',
];

// API 缓存模式
const API_PATTERNS = [
  /\.supabase\.co/,
  /\/rest\/v1\//,
];

// 不缓存的模式
const NO_CACHE_PATTERNS = [
  /chrome-extension:/,
  /^chrome:/,
  /\/auth\//,
  /\/admin\//,
  /localhost:5173/, // WXT 开发服务器
];

// 静态资源扩展名
const STATIC_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
  '.ico', '.webp', '.woff', '.woff2', '.ttf'
];

/**
 * 安装事件 - 预缓存核心资源
 */
self.addEventListener('install', (event) => {
  //console.log('[SW] 安装中...', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        //console.log('[SW] 预缓存核心资源');
        // 逐个缓存，失败不影响整体
        return Promise.allSettled(
          PRECACHE_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] 缓存失败: ${url}`, err.message);
            })
          )
        );
      })
      .then(() => {
        //console.log('[SW] 安装完成');
        return self.skipWaiting();
      })
  );
});

/**
 * 激活事件 - 清理旧缓存
 */
self.addEventListener('activate', (event) => {
  //console.log('[SW] 激活中...', CACHE_VERSION);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('sidedoor-cache-') && name !== CACHE_NAME)
            .map(name => {
              //console.log('[SW] 删除旧缓存:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        //console.log('[SW] 激活完成');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch 事件 - 实现缓存策略
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过不需要缓存的请求
  if (shouldSkipCache(url, request)) {
    return;
  }

  // 根据请求类型选择策略
  if (isHTMLRequest(request)) {
    // HTML 页面: Network First
    event.respondWith(networkFirst(request));
  } else if (isAPIRequest(url)) {
    // API 请求: Network First with Cache
    event.respondWith(networkFirstWithCache(request));
  } else if (isStaticAsset(url)) {
    // 静态资源: Cache First
    event.respondWith(cacheFirst(request));
  } else {
    // 其他: Network First
    event.respondWith(networkFirst(request));
  }
});

/**
 * 判断是否跳过缓存
 */
function shouldSkipCache(url, request) {
  // 非 GET 请求不缓存
  if (request.method !== 'GET') return true;

  // 匹配不缓存模式
  return NO_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
}

/**
 * 判断是否为 HTML 请求
 */
function isHTMLRequest(request) {
  const accept = request.headers.get('Accept') || '';
  return accept.includes('text/html');
}

/**
 * 判断是否为 API 请求
 */
function isAPIRequest(url) {
  return API_PATTERNS.some(pattern => pattern.test(url.href));
}

/**
 * 判断是否为静态资源
 */
function isStaticAsset(url) {
  return STATIC_EXTENSIONS.some(ext => url.pathname.endsWith(ext));
}

/**
 * Cache First 策略 - 适用于静态资源
 */
async function cacheFirst(request) {
  try {
    // 1. 先查缓存
    const cached = await caches.match(request);
    if (cached) {
      // 后台更新缓存
      updateCache(request);
      return cached;
    }

    // 2. 缓存未命中，从网络获取
    const response = await fetch(request);

    // 3. 缓存成功的响应
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => { });
    }

    return response;
  } catch (error) {
    console.warn('[SW] Cache First 失败:', request.url);

    // 尝试返回缓存
    const cached = await caches.match(request);
    if (cached) return cached;

    // 返回离线占位
    return createOfflineResponse(request);
  }
}

/**
 * Network First 策略 - 适用于 HTML 页面
 */
async function networkFirst(request) {
  try {
    // 1. 先尝试网络
    const response = await fetch(request);

    // 2. 缓存成功的响应
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => { });
    }

    return response;
  } catch (error) {
    console.warn('[SW] Network First 失败，使用缓存:', request.url);

    // 3. 网络失败，尝试缓存
    const cached = await caches.match(request);
    if (cached) return cached;

    // 4. 返回离线页面
    return createOfflineResponse(request);
  }
}

/**
 * Network First with Cache 策略 - 适用于 API 请求
 */
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => { });
    }

    return response;
  } catch (error) {
    console.warn('[SW] API 请求失败，尝试缓存:', request.url);

    const cached = await caches.match(request);
    if (cached) {
      // 添加标记表示这是缓存数据
      const headers = new Headers(cached.headers);
      headers.set('X-Cache-Status', 'HIT');
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      });
    }

    // 返回离线 JSON 响应
    return new Response(
      JSON.stringify({
        error: '离线模式',
        message: '无法连接服务器，请检查网络连接',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}

/**
 * 后台更新缓存 (Stale While Revalidate)
 */
async function updateCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response);
    }
  } catch (error) {
    // 静默失败
  }
}

/**
 * 创建离线响应
 */
function createOfflineResponse(request) {
  const accept = request.headers.get('Accept') || '';

  if (accept.includes('text/html')) {
    return new Response(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>离线模式 - SideDoor</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 20px;
          }
          h1 { font-size: 3em; margin-bottom: 10px; }
          p { font-size: 1.2em; opacity: 0.9; max-width: 400px; }
          button {
            margin-top: 20px;
            padding: 12px 24px;
            font-size: 1em;
            border: 2px solid white;
            border-radius: 8px;
            background: transparent;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
          }
          button:hover {
            background: white;
            color: #667eea;
          }
        </style>
      </head>
      <body>
        <h1>📴</h1>
        <h2>您当前处于离线状态</h2>
        <p>请检查网络连接后重试。已缓存的内容仍可访问。</p>
        <button onclick="location.reload()">重新加载</button>
        <button onclick="location.href='/'">返回首页</button>
      </body>
      </html>
    `, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (accept.includes('application/json')) {
    return new Response(
      JSON.stringify({ error: '离线模式', offline: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  return new Response('离线模式', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/**
 * 消息事件 - 与页面通信
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.delete(CACHE_NAME).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;

    case 'GET_CACHE_INFO':
      event.waitUntil(
        getCacheInfo().then(info => {
          event.ports[0]?.postMessage(info);
        })
      );
      break;

    case 'CACHE_ARTICLE':
      if (payload?.url) {
        event.waitUntil(
          cacheArticle(payload.url, payload.content).then(success => {
            event.ports[0]?.postMessage({ success });
          })
        );
      }
      break;
  }
});

/**
 * 获取缓存信息
 */
async function getCacheInfo() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    let totalSize = 0;

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }

    return {
      version: CACHE_VERSION,
      name: CACHE_NAME,
      itemCount: keys.length,
      totalSize,
      items: keys.map(k => k.url),
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * 缓存文章内容
 */
async function cacheArticle(url, content) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(content, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
    await cache.put(url, response);
    return true;
  } catch (error) {
    console.error('[SW] 缓存文章失败:', error);
    return false;
  }
}

/**
 * 后台同步
 */
self.addEventListener('sync', (event) => {
  //console.log('[SW] 后台同步:', event.tag);

  if (event.tag === 'sync-articles') {
    event.waitUntil(syncPendingArticles());
  }
});

async function syncPendingArticles() {
  // 实现离线文章同步逻辑
  //console.log('[SW] 同步待处理文章...');
}

/**
 * Push 通知
 */
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  const options = {
    body: data.body || '有新内容',
    icon: '/icon/128.png',
    badge: '/icon/48.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SideDoor', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

//console.log('[SW] Service Worker 已加载', CACHE_VERSION);
