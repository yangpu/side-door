<template>
  <div class="menu-container">
    <!-- <p class="current-url">{{ currentTabUrl }}</p> -->
    <Reader v-if="parsedContent" :html="parsedContent" :url="currentTabUrl" />
    <p v-else class="loading">旁门帮你简读文章...</p>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Reader from './Reader_before_refactor.vue';

const currentTabUrl = ref('');
const parsedContent = ref('');
let currentTab = -1;

let tabUrlListener:
  | ((tabId: number, changeInfo: any, tab: any) => void)
  | null = null;

// 解析当前标签页的主要内容
async function parseAndShowContent(url?: string | null) {
  try {
    const query = url ? { url } : { active: true, currentWindow: true };
    let tabs = await browser.tabs.query(query);
    if (url && tabs.length === 0) {
      tabs = await browser.tabs.query({ active: true, currentWindow: true });
    }
    if (tabs.length === 0) {
      console.error('无法获取标签页');
      return;
    }
    const activeTab = tabs[0];
    currentTab = activeTab.id!;
    currentTabUrl.value = activeTab.url || '';

    if (activeTab.id !== undefined) {
      const results = await browser.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: getPageContent,
      }) as { result: string }[];

      if (results && results[0] && results[0].result) {
        const article = results[0].result as string;
        parsedContent.value = article;
      } else {
        console.error('无法解析文章内容');
      }
    } else {
      console.error('无法获取标签页 ID');
    }
  } catch (error) {
    console.error('解析内容时出错:', error);
  }
}

// 内容脚本中执行的函数
function getPageContent() {
  return (async function () {
    const clonedDoc = document.documentElement.cloneNode(true) as HTMLElement;

    // 处理所有 pre 元素
    const preElements = clonedDoc.getElementsByTagName('pre');
    for (let pre of preElements) {
      let code = pre.querySelector('code');
      if (!code) {
        code = document.createElement('code');
        let content = '';

        // 内联处理节点内容
        function processNode(node: Node) {
          if (node.nodeName.toLowerCase() === '#text') {
            // TEXT_NODE
            content += node.textContent || '';
          } else if (node.nodeName.toLowerCase() === 'br') {
            content += '\n';
          } else {
            for (const child of Array.from(node.childNodes)) {
              processNode(child);
              if (child.nodeName.toLowerCase() === 'div' || child.nodeName.toLowerCase() === 'p') {
                content += '\n';
              }
            }
          }
        }

        processNode(pre);
        code.textContent = content.trim();
        pre.innerHTML = '';
        pre.appendChild(code);
      } else {
        code.innerHTML = code.textContent || '';
        // pre.innerHTML = code.textContent || '';
      }

      // 如果code节点没有language-前缀的类名
      if (!code?.classList.contains('language-')) {
        // 检查pre的父节点class是否包含highlight
        const parent = pre.parentElement;
        if (parent && parent.classList.contains('highlight')) {
          // 获取highlight后的下一个class名称
          const classes = Array.from(parent.classList);
          const highlightIndex = classes.indexOf('highlight');
          if (highlightIndex >= 0 && highlightIndex + 1 < classes.length) {
            const lang = classes[highlightIndex + 1];
            if (lang.startsWith('language-')) {
              code.classList.add(lang);
            } else if (lang.startsWith('highlight-source-')) {
              const languageClass = `language-${lang.replace('highlight-source-', '')}`;
              code.classList.add(languageClass);
            } else {
              const languageClass = `language-${lang}`;
              code.classList.add(languageClass);
            }
          }
        }
      }
    }

    // 处理picture元素
    const pictures = clonedDoc.getElementsByTagName('picture');
    for (let picture of pictures) {
      const sources = picture.getElementsByTagName('source');
      while (sources.length > 0) {
        sources[0].remove();
      }
    }

    return clonedDoc.outerHTML;
  })();
}

// 添加标签页 URL 变化的侦听器
function setupTabUrlListener() {
  // 创建监听器函数
  tabUrlListener = (tabId: number, changeInfo: any, tab: any) => {
    if (currentTab === tabId && tab.status === 'complete') {
      // 检查新 URL 是否与当前 URL 不同
      if (currentTabUrl.value !== tab.url) {
        currentTabUrl.value = tab.url;

        setTimeout(() => {
          parseAndShowContent(tab.url); // 重新解析新页面的内容
        }, 100);
      }
    };
  }

  // 添加监听器
  browser.tabs.onUpdated.addListener(tabUrlListener);
}

// 组件挂载时自动解析并显示内容
onMounted(() => {
  setTimeout(() => {
    // 从URL中解析出url参数
    const urlParams = new URLSearchParams(window.location.search);
    const url = urlParams.get('url');
    
    // 尝试从localStorage获取页面HTML（从FloatingButton传递）
    try {
      const storedHtml = localStorage.getItem('SIDE_DOOR_PAGE_HTML');
      const storedUrl = localStorage.getItem('SIDE_DOOR_PAGE_URL');
      
      // 如果localStorage中有HTML且URL匹配，直接使用
      if (storedHtml && storedUrl === url) {
        parsedContent.value = storedHtml;
        currentTabUrl.value = url || '';
        // 清理localStorage
        localStorage.removeItem('SIDE_DOOR_PAGE_HTML');
        setupTabUrlListener();
        return;
      }
    } catch (error) {
      console.error('读取localStorage失败:', error);
    }
    
    // 否则使用原有的解析方式
    parseAndShowContent(url);
    setupTabUrlListener();
  }, 100);
});

onUnmounted(() => {
  if (tabUrlListener) {
    browser.tabs.onUpdated.removeListener(tabUrlListener);
    tabUrlListener = null;
  }
});
</script>

<style scoped>
/* 确保菜单组件不会导致横向滚动 */
.menu-container {
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  background-color: var(--sd-background-primary);
  color: var(--sd-text-primary);
}

.current-url {
  font-size: 14px;
  color: var(--sd-text-secondary);
  margin: 20px;
  word-break: break-all;
}

.loading {
  font-size: 16px;
  color: var(--sd-text-primary);
  text-align: center;
  margin-top: 40px;
}

:deep(.reader-content) {
  width: 100%;
}
</style>
