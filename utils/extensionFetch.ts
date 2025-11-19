import { browser } from 'wxt/browser';

/**
 * 扩展环境下的 fetch 包装器
 * 通过 background script 代理请求，避免 content script 中的 CORS 限制
 */
export async function extensionFetch(
  url: string | URL,
  options?: RequestInit
): Promise<Response> {
  const urlString = url.toString();

  // console.log('[extensionFetch] Request:', { url: urlString, method: options?.method });

  // 只代理 Ollama 请求，其他请求使用原生 fetch
  if (!urlString.includes('localhost:11434') && !urlString.includes('127.0.0.1:11434')) {
    // console.log('[extensionFetch] Using native fetch for:', urlString);
    return fetch(url, options);
  }

  // console.log('[extensionFetch] Proxying through background script');

  try {
    // 将 Headers 对象转换为普通对象
    let headersObj: Record<string, string> = {};
    if (options?.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headersObj[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headersObj[key] = value;
        });
      } else {
        headersObj = options.headers as Record<string, string>;
      }
    }

    // 通过 background script 发送请求
    const message = {
      type: 'OLLAMA_FETCH',
      payload: {
        url: urlString,
        options: {
          method: options?.method || 'GET',
          headers: headersObj,
          body: options?.body,
        },
      },
    };

    // console.log('[extensionFetch] Sending message to background:', message);

    const response = await browser.runtime.sendMessage(message);

    // console.log('[extensionFetch] Response from background:', response);

    if (!response) {
      throw new Error('No response from background script');
    }

    if (response.error) {
      throw new Error(response.error);
    }

    // 创建一个 Response 对象
    const responseData = typeof response.data === 'string' 
      ? response.data 
      : JSON.stringify(response.data);

    const responseInit: ResponseInit = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    };

    return new Response(responseData, responseInit);
  } catch (error) {
    console.error('[extensionFetch] Error:', error);
    throw error;
  }
}
