import { browser } from 'wxt/browser';

// 监听标签页更新事件
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 根据当前页面URL更新tooltip
    updateTooltip(tab.url);
  }
});

// 更新tooltip的函数
function updateTooltip(url: string) {
  let tooltip = '旁门-帮你简读文章'; // 修改这里的默认tooltip

  // 如果需要根据URL自定义tooltip，可以保留这部分逻辑
  // 如果不需要，可以删除这个if-else块
  if (url.includes('news')) {
    tooltip = '旁门-帮你简读新闻';
  } else if (url.includes('blog')) {
    tooltip = '旁门-帮你简读博客';
  }

  // 设置新的tooltip
  browser.action.setTitle({ title: tooltip });
}

// 监听来自 content script 的消息，用于代理 Ollama 请求
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log('[Background] Received message:', message);

  if (message.type === 'OLLAMA_FETCH') {
    // 在 background script 中执行 fetch，避免 CORS 问题
    const { url, options } = message.payload;
    
    // console.log('[Background] Fetching:', url, options);

    fetch(url, options)
      .then(async (response) => {
        // console.log('[Background] Response status:', response.status);

        const isOk = response.ok;
        const status = response.status;
        const statusText = response.statusText;
        const headers: Record<string, string> = {};
        
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        // 根据 content-type 决定如何处理响应
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        // console.log('[Background] Response data:', data);

        const result = {
          ok: isOk,
          status,
          statusText,
          headers,
          data,
        };

        // console.log('[Background] Sending response:', result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error('[Background] Fetch error:', error);
        
        sendResponse({
          ok: false,
          status: 0,
          statusText: error.message,
          headers: {},
          data: null,
          error: error.message,
        });
      });

    // 返回 true 表示异步发送响应
    return true;
  }

  // 处理离线文章保存请求
  if (message.type === 'SAVE_ARTICLE_OFFLINE') {
    const { article } = message.payload;
    
    // 使用 IndexedDB 保存文章
    import('../utils/indexedDB').then(({ indexedDB }) => {
      return indexedDB.saveArticle(article);
    }).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('[Background] 保存离线文章失败:', error);
      sendResponse({ success: false, error: error.message });
    });

    return true;
  }

  // 处理获取离线文章请求
  if (message.type === 'GET_ARTICLE_OFFLINE') {
    const { articleId } = message.payload;
    
    import('../utils/indexedDB').then(({ indexedDB }) => {
      return indexedDB.getArticle(articleId);
    }).then((article) => {
      sendResponse({ success: true, article });
    }).catch((error) => {
      console.error('[Background] 获取离线文章失败:', error);
      sendResponse({ success: false, error: error.message });
    });

    return true;
  }
});

export default defineBackground(() => {
  console.log('[Background] Side Door background service started');
});
