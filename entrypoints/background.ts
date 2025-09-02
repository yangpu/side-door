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

export default defineBackground(() => {
  // console.log('Hello pu: background!', { id: browser.runtime.id });
});
