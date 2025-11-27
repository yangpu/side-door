/**
 * Service Worker - PWA 离线支持
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `sidedoor-cache-${CACHE_VERSION}`;

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/read-later-home.html',
  '/article-viewer.html',
  '/reader.html',
  '/icon/128.png',
  '/icon/48.png',
  '/icon/32.png',
  '/icon/16.png',
];

// 需要缓存的 API 路径模式
const API_CACHE_PATTERNS = [
  /\/articles/,
  /\.supabase\.co/,
];

// 不应该缓存的路径
const NO_CACHE_PATTERNS = [
  /\/auth\//,
  /\/admin\//,
  /chrome-extension:/,
];

/**
 * Service Worker 安装事件
 */
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...', CACHE_VERSION);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 缓存静态资源');
        // 尝试缓存静态资源，失败不影响安装
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn('[SW] 缓存部分静态资源失败:', error);
        });
      })
      .then(() => {
        console.log('[SW] 安装完成');
        // 强制激活新的 Service Worker
        return self.skipWaiting();
      })
  );
});

/**
 * Service Worker 激活事件
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...', CACHE_VERSION);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        // 删除旧版本的缓存
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] 激活完成');
        // 立即接管所有页面
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

  // 跳过 chrome-extension 和不需要缓存的请求
  if (shouldSkipCache(url)) {
    return;
  }

  // 根据请求类型选择不同的缓存策略
  if (isStaticAsset(url)) {
    // 静态资源: Cache First (缓存优先)
    event.respondWith(cacheFirst(request));
  } else if (isAPIRequest(url)) {
    // API 请求: Network First (网络优先，失败时使用缓存)
    event.respondWith(networkFirst(request));
  } else {
    // 其他请求: Network First
    event.respondWith(networkFirst(request));
  }
});

/**
 * 判断是否应该跳过缓存
 */
function shouldSkipCache(url) {
  return NO_CACHE_PATTERNS.some((pattern) => pattern.test(url.href));
}

/**
 * 判断是否为静态资源
 */
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

/**
 * 判断是否为 API 请求
 */
function isAPIRequest(url) {
  return API_CACHE_PATTERNS.some((pattern) => pattern.test(url.href));
}

/**
 * 缓存优先策略 (Cache First)
 * 适用于静态资源
 */
async function cacheFirst(request) {
  try {
    // 1. 先从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // 2. 缓存未命中，从网络获取
    const networkResponse = await fetch(request);

    // 3. 缓存响应（仅缓存成功的 GET 请求）
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone()).catch((error) => {
        console.warn('[SW] 缓存失败:', error);
      });
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache First 失败:', error);

    // 返回离线页面或默认响应
    return new Response('离线访问受限', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/**
 * 网络优先策略 (Network First)
 * 适用于 API 请求和动态内容
 */
async function networkFirst(request) {
  try {
    // 1. 先尝试从网络获取
    const networkResponse = await fetch(request);

    // 2. 缓存成功的响应
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone()).catch((error) => {
        console.warn('[SW] 缓存失败:', error);
      });
    }

    return networkResponse;
  } catch (error) {
    // 3. 网络失败，尝试从缓存获取
    console.warn('[SW] 网络请求失败，尝试使用缓存:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // 4. 缓存也没有，返回离线响应
    console.error('[SW] Network First 失败，无缓存:', error);
    
    // 对于 HTML 请求，返回离线页面
    if (request.headers.get('Accept')?.includes('text/html')) {
      return caches.match('/read-later-home.html').then(response => {
        return response || new Response('离线模式 - 无法访问此页面', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      });
    }

    // 对于 API 请求，返回错误信息
    return new Response(JSON.stringify({ error: '离线模式，无法连接服务器' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

/**
 * 后台同步事件
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] 后台同步:', event.tag);

  if (event.tag === 'sync-articles') {
    event.waitUntil(syncArticles());
  }
});

/**
 * 同步文章数据
 */
async function syncArticles() {
  try {
    console.log('[SW] 开始同步文章...');
    // 这里可以添加后台同步逻辑
    // 例如：上传离线保存的文章、下载新文章等
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] 同步文章失败:', error);
    throw error;
  }
}

/**
 * 消息事件 - 与页面通信
 */
self.addEventListener('message', (event) => {
  console.log('[SW] 收到消息:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] 缓存已清空');
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }

  if (event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      getCacheSize().then((size) => {
        event.ports[0]?.postMessage({ size });
      })
    );
  }
});

/**
 * 获取缓存大小
 */
async function getCacheSize() {
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

    return totalSize;
  } catch (error) {
    console.error('[SW] 计算缓存大小失败:', error);
    return 0;
  }
}

/**
 * Push 通知事件（可选）
 */
self.addEventListener('push', (event) => {
  console.log('[SW] 收到推送:', event);

  const options = {
    body: event.data ? event.data.text() : '新的文章已添加到稍后阅读',
    icon: '/icon/128.png',
    badge: '/icon/48.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification('SideDoor', options)
  );
});

/**
 * 通知点击事件
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 通知被点击:', event);

  event.notification.close();

  event.waitUntil(
    clients.openWindow('/read-later-home.html')
  );
});

console.log('[SW] Service Worker 已加载');
