/**
 * Service Worker - PWA 离线支持 (Workbox 版本)
 * 
 * 缓存策略:
 * - 静态资源: StaleWhileRevalidate (快速响应 + 后台更新)
 * - HTML 页面: NetworkFirst (网络优先)
 * - API 请求: NetworkFirst with Cache Fallback
 * - 图片资源: CacheFirst with Expiration
 * - 翻译/总结: CacheFirst (离线优先)
 */

// 使用 importScripts 加载 Workbox CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// 配置 Workbox
workbox.setConfig({
  debug: false, // 生产环境关闭调试
});

const { registerRoute, NavigationRoute, setDefaultHandler } = workbox.routing;
const { 
  CacheFirst, 
  NetworkFirst, 
  StaleWhileRevalidate,
  NetworkOnly 
} = workbox.strategies;
const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { BackgroundSyncPlugin } = workbox.backgroundSync;

// ==================== 版本和缓存名称 ====================
const CACHE_VERSION = 'v2.0.0';
const CACHE_PREFIX = 'sidedoor';

// 缓存名称
const CACHE_NAMES = {
  static: `${CACHE_PREFIX}-static-${CACHE_VERSION}`,
  pages: `${CACHE_PREFIX}-pages-${CACHE_VERSION}`,
  api: `${CACHE_PREFIX}-api-${CACHE_VERSION}`,
  images: `${CACHE_PREFIX}-images-${CACHE_VERSION}`,
  articles: `${CACHE_PREFIX}-articles-${CACHE_VERSION}`,
  translations: `${CACHE_PREFIX}-translations-${CACHE_VERSION}`,
  summaries: `${CACHE_PREFIX}-summaries-${CACHE_VERSION}`,
  files: `${CACHE_PREFIX}-files-${CACHE_VERSION}`,
};

// ==================== 预缓存核心资源 ====================
const PRECACHE_ASSETS = [
  { url: '/', revision: CACHE_VERSION },
  { url: '/test', revision: CACHE_VERSION },
  { url: '/article', revision: CACHE_VERSION },
  { url: '/manifest.json', revision: CACHE_VERSION },
  { url: '/icon/16.png', revision: '1' },
  { url: '/icon/32.png', revision: '1' },
  { url: '/icon/48.png', revision: '1' },
  { url: '/icon/96.png', revision: '1' },
  { url: '/icon/128.png', revision: '1' },
  { url: '/components/Reader.css', revision: CACHE_VERSION },
];

// 预缓存并路由
precacheAndRoute(PRECACHE_ASSETS);

// 清理旧版本缓存
cleanupOutdatedCaches();

// ==================== 不缓存的模式 ====================
const NO_CACHE_PATTERNS = [
  /chrome-extension:/,
  /^chrome:/,
  /moz-extension:/,
  /\/auth\//,
  /\/admin\//,
  /localhost:5173/, // WXT 开发服务器
  /hot-update/,     // HMR 更新
];

/**
 * 检查是否应该跳过缓存
 */
function shouldSkipCache(url) {
  return NO_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
}

// ==================== 静态资源策略 ====================
// JS, CSS 文件 - StaleWhileRevalidate (快速响应 + 后台更新)
registerRoute(
  ({ request, url }) => {
    if (shouldSkipCache(url)) return false;
    return request.destination === 'script' || 
           request.destination === 'style' ||
           /\.(js|css)$/.test(url.pathname);
  },
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.static,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
      }),
    ],
  })
);

// ==================== 字体资源策略 ====================
registerRoute(
  ({ request, url }) => {
    if (shouldSkipCache(url)) return false;
    return request.destination === 'font' ||
           /\.(woff|woff2|ttf|otf|eot)$/.test(url.pathname);
  },
  new CacheFirst({
    cacheName: `${CACHE_PREFIX}-fonts-${CACHE_VERSION}`,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 年
      }),
    ],
  })
);

// ==================== 图片资源策略 ====================
registerRoute(
  ({ request, url }) => {
    if (shouldSkipCache(url)) return false;
    return request.destination === 'image' ||
           /\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(url.pathname);
  },
  new CacheFirst({
    cacheName: CACHE_NAMES.images,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
        purgeOnQuotaError: true, // 存储空间不足时自动清理
      }),
    ],
  })
);

// ==================== HTML 页面策略 ====================
registerRoute(
  ({ request, url }) => {
    if (shouldSkipCache(url)) return false;
    return request.mode === 'navigate' ||
           request.destination === 'document' ||
           (request.headers.get('Accept') || '').includes('text/html');
  },
  new NetworkFirst({
    cacheName: CACHE_NAMES.pages,
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 天
      }),
    ],
  })
);

// ==================== Supabase API 策略 ====================
registerRoute(
  ({ url }) => {
    return url.hostname.includes('supabase.co') ||
           url.pathname.includes('/rest/v1/');
  },
  new NetworkFirst({
    cacheName: CACHE_NAMES.api,
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 1 天
      }),
    ],
  })
);

// ==================== 文章内容策略 ====================
// 文章 HTML 文件 - CacheFirst (离线优先)
registerRoute(
  ({ url }) => {
    return url.pathname.includes('/articles/') ||
           url.pathname.includes('/html_file/') ||
           url.searchParams.has('article_id');
  },
  new CacheFirst({
    cacheName: CACHE_NAMES.articles,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 90 * 24 * 60 * 60, // 90 天
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ==================== 翻译内容策略 ====================
// 翻译结果 - CacheFirst (离线可用)
registerRoute(
  ({ url }) => {
    return url.pathname.includes('/translations/') ||
           url.pathname.includes('/translate') ||
           url.searchParams.has('translate');
  },
  new CacheFirst({
    cacheName: CACHE_NAMES.translations,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
      }),
    ],
  })
);

// ==================== AI 总结策略 ====================
// 总结结果 - CacheFirst (离线可用)
registerRoute(
  ({ url }) => {
    return url.pathname.includes('/summaries/') ||
           url.pathname.includes('/summary') ||
           url.searchParams.has('summary');
  },
  new CacheFirst({
    cacheName: CACHE_NAMES.summaries,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
      }),
    ],
  })
);

// ==================== PDF/文件策略 ====================
registerRoute(
  ({ url }) => {
    return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md)$/i.test(url.pathname) ||
           url.pathname.includes('/pdf_file/') ||
           url.pathname.includes('/files/');
  },
  new CacheFirst({
    cacheName: CACHE_NAMES.files,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 90 * 24 * 60 * 60, // 90 天
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ==================== 默认策略 ====================
setDefaultHandler(new NetworkFirst({
  cacheName: `${CACHE_PREFIX}-default-${CACHE_VERSION}`,
  networkTimeoutSeconds: 5,
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
  ],
}));

// ==================== 离线回退页面 ====================
const OFFLINE_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>离线模式 - SideDoor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 20px;
    }
    .icon { font-size: 4em; margin-bottom: 20px; }
    h1 { font-size: 1.8em; margin-bottom: 10px; }
    p { font-size: 1.1em; opacity: 0.9; max-width: 400px; margin-bottom: 30px; line-height: 1.6; }
    .buttons { display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; }
    button {
      padding: 12px 28px;
      font-size: 1em;
      border: 2px solid white;
      border-radius: 8px;
      background: transparent;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
    }
    button:hover {
      background: white;
      color: #667eea;
      transform: translateY(-2px);
    }
    button:active { transform: translateY(0); }
    .cached-hint {
      margin-top: 40px;
      padding: 15px 25px;
      background: rgba(255,255,255,0.15);
      border-radius: 10px;
      font-size: 0.95em;
    }
    .cached-hint strong { display: block; margin-bottom: 5px; }
  </style>
</head>
<body>
  <div class="icon">📴</div>
  <h1>您当前处于离线状态</h1>
  <p>请检查网络连接后重试。已缓存的文章和内容仍可在离线状态下访问。</p>
  <div class="buttons">
    <button onclick="location.reload()">🔄 重新加载</button>
    <button onclick="location.href='/'">🏠 返回首页</button>
  </div>
  <div class="cached-hint">
    <strong>💡 离线提示</strong>
    您之前浏览过的文章、翻译和总结已被缓存，可以离线访问。
  </div>
</body>
</html>
`;

// 处理导航请求的离线回退
const navigationHandler = async (params) => {
  try {
    // 尝试网络优先策略
    return await new NetworkFirst({
      cacheName: CACHE_NAMES.pages,
      networkTimeoutSeconds: 5,
    }).handle(params);
  } catch (error) {
    // 网络失败，返回离线页面
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};

// 注册导航路由
const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: NO_CACHE_PATTERNS,
});
registerRoute(navigationRoute);

// ==================== 消息处理 ====================
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      await clearAllCaches();
      event.ports[0]?.postMessage({ success: true });
      break;

    case 'CLEAR_CACHE_BY_TYPE':
      if (payload?.cacheType && CACHE_NAMES[payload.cacheType]) {
        await caches.delete(CACHE_NAMES[payload.cacheType]);
        event.ports[0]?.postMessage({ success: true });
      }
      break;

    case 'GET_CACHE_INFO':
      const info = await getCacheInfo();
      event.ports[0]?.postMessage(info);
      break;

    case 'CACHE_ARTICLE':
      if (payload?.url && payload?.content) {
        const success = await cacheContent(
          CACHE_NAMES.articles,
          payload.url,
          payload.content,
          'text/html'
        );
        event.ports[0]?.postMessage({ success });
      }
      break;

    case 'CACHE_TRANSLATION':
      if (payload?.key && payload?.content) {
        const success = await cacheContent(
          CACHE_NAMES.translations,
          `/translations/${payload.key}`,
          JSON.stringify(payload.content),
          'application/json'
        );
        event.ports[0]?.postMessage({ success });
      }
      break;

    case 'CACHE_SUMMARY':
      if (payload?.key && payload?.content) {
        const success = await cacheContent(
          CACHE_NAMES.summaries,
          `/summaries/${payload.key}`,
          JSON.stringify(payload.content),
          'application/json'
        );
        event.ports[0]?.postMessage({ success });
      }
      break;

    case 'CACHE_IMAGE':
      if (payload?.url) {
        const success = await cacheExternalResource(CACHE_NAMES.images, payload.url);
        event.ports[0]?.postMessage({ success });
      }
      break;

    case 'CACHE_FILE':
      if (payload?.url) {
        const success = await cacheExternalResource(CACHE_NAMES.files, payload.url);
        event.ports[0]?.postMessage({ success });
      }
      break;

    case 'GET_CACHED_TRANSLATION':
      if (payload?.key) {
        const data = await getCachedContent(CACHE_NAMES.translations, `/translations/${payload.key}`);
        event.ports[0]?.postMessage({ data });
      }
      break;

    case 'GET_CACHED_SUMMARY':
      if (payload?.key) {
        const data = await getCachedContent(CACHE_NAMES.summaries, `/summaries/${payload.key}`);
        event.ports[0]?.postMessage({ data });
      }
      break;

    case 'PREFETCH_ARTICLES':
      if (payload?.urls && Array.isArray(payload.urls)) {
        const results = await prefetchResources(CACHE_NAMES.articles, payload.urls);
        event.ports[0]?.postMessage({ results });
      }
      break;
  }
});

// ==================== 缓存辅助函数 ====================

/**
 * 清空所有缓存
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => name.startsWith(CACHE_PREFIX))
      .map(name => caches.delete(name))
  );
}

/**
 * 获取缓存信息
 */
async function getCacheInfo() {
  const info = {
    version: CACHE_VERSION,
    caches: {},
    totalSize: 0,
    totalItems: 0,
  };

  for (const [key, cacheName] of Object.entries(CACHE_NAMES)) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      let size = 0;

      for (const request of keys.slice(0, 50)) { // 限制检查数量
        try {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            size += blob.size;
          }
        } catch (e) {
          // 忽略单个文件错误
        }
      }

      info.caches[key] = {
        name: cacheName,
        itemCount: keys.length,
        estimatedSize: size,
        items: keys.slice(0, 20).map(k => k.url), // 只返回前 20 个
      };
      info.totalItems += keys.length;
      info.totalSize += size;
    } catch (error) {
      info.caches[key] = { error: error.message };
    }
  }

  return info;
}

/**
 * 缓存内容
 */
async function cacheContent(cacheName, url, content, contentType = 'text/html') {
  try {
    const cache = await caches.open(cacheName);
    const response = new Response(content, {
      headers: {
        'Content-Type': `${contentType}; charset=utf-8`,
        'X-Cached-At': new Date().toISOString(),
      },
    });
    await cache.put(url, response);
    return true;
  } catch (error) {
    console.error('[SW] 缓存内容失败:', error);
    return false;
  }
}

/**
 * 获取缓存内容
 */
async function getCachedContent(cacheName, url) {
  try {
    const cache = await caches.open(cacheName);
    const response = await cache.match(url);
    if (response) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return null;
  } catch (error) {
    console.error('[SW] 获取缓存内容失败:', error);
    return null;
  }
}

/**
 * 缓存外部资源
 */
async function cacheExternalResource(cacheName, url) {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(url, response);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[SW] 缓存外部资源失败:', error);
    return false;
  }
}

/**
 * 预取资源
 */
async function prefetchResources(cacheName, urls) {
  const cache = await caches.open(cacheName);
  const results = [];

  for (const url of urls) {
    try {
      const existing = await cache.match(url);
      if (!existing) {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          results.push({ url, success: true });
        } else {
          results.push({ url, success: false, error: `HTTP ${response.status}` });
        }
      } else {
        results.push({ url, success: true, cached: true });
      }
    } catch (error) {
      results.push({ url, success: false, error: error.message });
    }
  }

  return results;
}

// ==================== 后台同步 ====================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-articles') {
    event.waitUntil(syncPendingArticles());
  } else if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncPendingArticles() {
  // 同步待处理的文章操作
  console.log('[SW] 同步待处理文章...');
}

async function syncOfflineActions() {
  // 同步离线操作（如收藏、删除等）
  console.log('[SW] 同步离线操作...');
}

// ==================== Push 通知 ====================
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  const options = {
    body: data.body || '有新内容',
    icon: '/icon/128.png',
    badge: '/icon/48.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SideDoor', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  event.waitUntil(
    clients.openWindow(data?.url || '/')
  );
});

// ==================== 安装和激活 ====================
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...', CACHE_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...', CACHE_VERSION);
  event.waitUntil(
    Promise.all([
      // 清理旧版本缓存
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => {
              return name.startsWith(CACHE_PREFIX) && 
                     !Object.values(CACHE_NAMES).includes(name);
            })
            .map(name => {
              console.log('[SW] 删除旧缓存:', name);
              return caches.delete(name);
            })
        );
      }),
      // 立即接管所有客户端
      self.clients.claim(),
    ])
  );
});

console.log('[SW] Workbox Service Worker 已加载', CACHE_VERSION);
