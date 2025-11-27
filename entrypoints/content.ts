import { browser } from 'wxt/browser';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    let isInitialized = false;

    const cleanup = () => {
      const floatingButton = document.getElementById(
        'side-door-floating-button'
      );

      if (floatingButton) {
        floatingButton.remove();
      }
    };

    const addElementIds = () => {
      const elements = document.querySelectorAll('img, canvas, video, embed');
      let index = 1;

      elements.forEach((element) => {
        if (!element.id) {
          element.id = `side_${index}`;
        }
        index++;
      });

      // console.log('元素ID添加完成' + index);
    };

    // 创建悬浮按钮的核心函数
    const createFloatingElements = async (document: Document) => {
      try {
        const { createApp } = await import('vue');
        const FloatingButtonModule = await import('../components/FloatingButton.vue');
        const FloatingButton = FloatingButtonModule.default;
        
        const floatingContainer = document.createElement('div');
        floatingContainer.id = 'side-door-floating-button';
        document.body.appendChild(floatingContainer);

        const app = createApp(FloatingButton);
        const instance = app.mount('#side-door-floating-button');

        setTimeout(() => {
          (instance as any).openPopup?.();
        }, 100);
      } catch (error) {
        console.error('Failed to create floating elements:', error);
      }
    };

    const initialize = () => {
      if (isInitialized) return;

      cleanup();

      if (document.body) {
        // 添加元素ID
        addElementIds();

        createFloatingElements(document);
        isInitialized = true;
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
          createFloatingElements(document);
          isInitialized = true;
          obs.disconnect();
        }
      });

      observer.observe(document, {
        childList: true,
        subtree: true,
      });
    };

    // 监听 URL 变化
    const urlObserver = new MutationObserver(() => {
      initialize();
    });

    // 观察 URL 变化
    const titleElement = document.querySelector('head > title');
    if (titleElement) {
      urlObserver.observe(titleElement, {
        subtree: true,
        characterData: true,
        childList: true,
      });
    }

    initialize();

    // 监听历史记录变化
    window.addEventListener('popstate', () => {
      // 给一个小延时确保DOM已更新
      setTimeout(initialize, 100);
    });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // 当页面从隐藏变为可见时（包括从其他标签页返回）
        initialize();
      }
    });

    // 监听来自 popup 的重新注入消息
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'REINJECT_FAB') {
        isInitialized = false;
        initialize();
      }
    });
  },
});