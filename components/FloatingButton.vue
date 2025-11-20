<template>
  <div class="floating-button-wrapper" v-show="showPopup">
    <!-- 浮动圆形图标 -->
    <div class="floating-button" @click="togglePopup" @dblclick="enterImmersive" :class="{ active: isPopupVisible }"
      title="旁门 - 帮你简读文章 (双击进入沉浸式阅读)">
      <img src="../assets/icon.png" alt="Side Door" />
    </div>

    <!-- 弹窗 -->
    <div v-if="isPopupCreated" :style="{ display: isPopupVisible ? 'block' : 'none' }" class="popup-wrapper"
      :class="{ minimized: isMinimized, immersive: isImmersive, fullscreen: isFullscreen }">
      <div class="popup-header">
        <div class="popup-title">{{ isMinimized ? '旁门' : '旁门 - 帮你简读文章' }}</div>
        <div class="popup-controls">
          <!-- 根据是否处于沉浸式状态显示不同的按钮 -->
          <button v-if="!isMinimized" @click="refreshIframe" title="刷新">
            ↻
          </button>
          <button v-if="!isImmersive" @click="toggleImmersive" title="沉浸式阅读">
            📖
          </button>
          <button v-else @click="toggleImmersive" title="退出沉浸式">□</button>
          <button v-if="!isMinimized" @click="toggleFullscreen" title="全屏切换">
            {{ isFullscreen ? '⤢' : '⤢' }}
          </button>
          <button @click="toggleMinimize" title="最大化/最小化">
            {{ isMinimized ? '□' : '−' }}
          </button>
          <button @click="closePopup" title="关闭">×</button>
        </div>
      </div>
      <div class="popup-content" v-show="!isMinimized || isImmersive">
        <iframe ref="reader" v-if="popupUrl" :src="popupUrl" frameborder="0"
          allow="clipboard-read; clipboard-write;"></iframe>
      </div>
    </div>

    <!-- 沉浸式背景 -->
    <div v-if="isImmersive && isPopupVisible" class="immersive-background" @click="exitImmersive"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue';

interface PopupState {
  isVisible: boolean;
  isMinimized: boolean;
  isImmersive: boolean;
}

interface StorageResult {
  popupState?: PopupState;
}

const isPopupVisible = ref(false);
const isMinimized = ref(false);
const popupUrl = ref('');
const isImmersive = ref(false);
const isPopupCreated = ref(false);
const showPopup = ref(false);
const isFullscreen = ref(false);

const reader = ref<HTMLIFrameElement | null>(null);

// 添加 ESC 键双击处理函数
let lastEscTime = 0;
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    const currentTime = new Date().getTime();
    if (currentTime - lastEscTime < 500) { // 800ms 内的双击
      togglePopup();
    }
    lastEscTime = currentTime;
  }
};

// 在 script setup 部分添加 PDF 检测函数
function isPDFDocument(): boolean {
  // 检查 Content-Type
  const contentType = document.contentType?.toLowerCase();
  if (contentType?.includes('pdf')) {
    return true;
  }

  // 检查 URL
  const currentUrl = window.location.href.toLowerCase();
  if (currentUrl.endsWith('.pdf')) {
    return true;
  }

  // 检查页面内容
  const embedElements = document.getElementsByTagName('embed');
  const objectElements = document.getElementsByTagName('object');

  // 检查 embed 元素
  for (const embed of embedElements) {
    if (
      embed.type?.toLowerCase().includes('pdf') ||
      embed.src?.toLowerCase().endsWith('.pdf')
    ) {
      return true;
    }
  }

  // 检查 object 元素
  for (const obj of objectElements) {
    if (
      obj.type?.toLowerCase().includes('pdf') ||
      obj.data?.toLowerCase().endsWith('.pdf')
    ) {
      return true;
    }
  }

  return false;
}

// 从存储中读取状态
const loadState = async () => {
  const result = await browser.storage.local.get(['popupState']) as unknown as StorageResult;
  if (result.popupState) {
    isPopupVisible.value = result.popupState.isVisible;
    isImmersive.value = result.popupState.isImmersive;
    isMinimized.value = result.popupState.isImmersive ? false : result.popupState.isMinimized;
    isPopupCreated.value = true;
  }

  if (isPopupVisible.value) {
    setPopupUrl();
  }
};

const setPopupUrl = async () => {
  const url = browser.runtime.getURL('/popup.html');
  const pageUrl = window.location.href;
  
  // 将页面HTML存储到localStorage，避免URL过长
  try {
    const pageHtml = document.documentElement.outerHTML;
    localStorage.setItem('SIDE_DOOR_PAGE_HTML', pageHtml);
    localStorage.setItem('SIDE_DOOR_PAGE_URL', pageUrl);
  } catch (error) {
    console.error('保存页面内容失败:', error);
  }
  
  // 移除时间戳参数，避免不必要的刷新
  const value = `${url}?url=${encodeURIComponent(pageUrl)}`;
  if (popupUrl.value !== value) {
    popupUrl.value = value;
  }
};

// 保存状态到存储
const saveState = async () => {
  await browser.storage.local.set({
    popupState: {
      isVisible: isPopupVisible.value,
      isMinimized: isMinimized.value,
      isImmersive: isImmersive.value,
    },
  });

  if (isPopupVisible.value) {
    setPopupUrl();
  }

};

// 监听状态变化并保存
watch(
  [isPopupVisible, isMinimized, isImmersive, isFullscreen],
  () => {
    saveState();
  },
  { deep: true }
);

// 在 setup 中声明事件处理函数
const handleMessage = (event: MessageEvent) => {
  const type = event.data.type;
  if (!type) return;

  if (type === 'closeReader') {
    // 先退出沉浸模式
    isImmersive.value = false;
    // 然后最小化窗口
    isMinimized.value = true;
  } else if (type === 'togglePopup') {
    togglePopup();
  } else if (type === 'themeChange') {
    // 更新本地存储
    localStorage.setItem('READER_THEME', event.data.theme);
    // 同步所有相关元素的主题
    syncTheme();
  }
};

// 全屏切换函数
const toggleFullscreen = () => {
  if (!isFullscreen.value) {
    const elem = document.querySelector('.popup-wrapper');
    if (elem?.requestFullscreen) {
      elem.requestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
  isFullscreen.value = !isFullscreen.value;
};

// 监听全屏变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

// 修改主题同步逻辑
const syncTheme = () => {
  const theme = localStorage.getItem('READER_THEME') || 'light';
  // 更新根元素主题
  document.documentElement.setAttribute('data-theme', theme);

  // 更新popup-content主题
  const popupContent = document.querySelector('.popup-content');
  if (popupContent) {
    popupContent.setAttribute('data-theme', theme);
  }

  // 同步iframe主题
  // const iframe = document.querySelector('.popup-content iframe') as HTMLIFrameElement;
  const iframe = reader.value;
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({ type: 'themeChange', theme }, '*');
    // 确保iframe加载完成后也能收到主题
    if (iframe.contentDocument) {
      iframe.contentDocument.documentElement.setAttribute('data-theme', theme);
      iframe.contentDocument.body.setAttribute('data-theme', theme);
    }
  }
};

// 在组件挂载时添加事件监听
onMounted(async () => {
  // await new Promise((resolve) => setTimeout(resolve, 100));
  await loadState();

  // 初始同步主题
  syncTheme();

  // 添加全屏变化监听
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  // 添加 ESC 键双击监听
  document.addEventListener('keydown', handleKeyDown);

  // 添加消息监听器
  window.addEventListener('message', handleMessage);

  // 检查页面是否包含side-door元数据
  const sideDoorMeta = document.querySelector('meta[name="side-door"]');

  // 检查是否为PDF文档
  const isPDF = isPDFDocument();

  // 如果是side-door页面或PDF文档，默认隐藏悬浮按钮
  if (sideDoorMeta || isPDF) {
    showPopup.value = false;
    isPopupVisible.value = false;
    isImmersive.value = false;
  } else {
    // 如果是普通页面，显示悬浮按钮
    showPopup.value = true;
  }
});

// 监听 iframe 加载完成
watch(popupUrl, (newUrl) => {
  if (newUrl) {
    nextTick(() => {
      // const iframe = document.querySelector('.popup-content iframe') as HTMLIFrameElement;
      const iframe = reader.value;
      if (iframe) {
        iframe.onload = () => {
          // iframe加载完成后同步主题
          syncTheme();

          // 设置一个短暂延时，确保iframe完全加载
          setTimeout(syncTheme, 500);
        };
      }
    });
  }
});

// 在组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('message', handleMessage);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('keydown', handleKeyDown);
});

const togglePopup = () => {
  isPopupVisible.value = !isPopupVisible.value;
  if (isPopupVisible.value) {
    isPopupCreated.value = true;
    // 立即设置 popup URL 并保存页面内容
    setPopupUrl();
    // 使用nextTick确保DOM更新后再设置焦点
    nextTick(() => {
      const iframe = reader.value;
      if (iframe) {
        // 先让iframe获得焦点
        iframe.focus();
        // 再让iframe内的window获得焦点
        iframe.contentWindow?.focus();
      }
    });
  } else {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }
};

const toggleMinimize = async () => {
  if (isFullscreen.value) {
    await document.exitFullscreen();
  }
  isMinimized.value = !isMinimized.value;
  if (isMinimized.value) {
    isImmersive.value = false;
  }
};

const closePopup = async () => {
  if (isFullscreen.value) {
    await document.exitFullscreen();
  }
  isPopupVisible.value = false;
  isMinimized.value = false;
  isImmersive.value = false;
};

const toggleImmersive = async () => {
  if (isFullscreen.value) {
    await document.exitFullscreen();
  }
  isImmersive.value = !isImmersive.value;
  if (isImmersive.value) {
    isMinimized.value = false;
  }
};

const exitImmersive = () => {
  isImmersive.value = false;
  isPopupVisible.value = false;
};

const enterImmersive = (event: MouseEvent) => {
  event.preventDefault();
  if (!isPopupCreated.value) {
    isPopupCreated.value = true;
  }
  // 立即设置 popup URL 并保存页面内容
  setPopupUrl();
  isPopupVisible.value = true;
  isMinimized.value = false;
  isImmersive.value = true;
};

const refreshIframe = () => {
  // 通过添加时间戳参数强制刷新 iframe
  const url = browser.runtime.getURL('/popup.html');
  const pageUrl = window.location.href;
  
  // 更新 localStorage 中的内容
  try {
    const pageHtml = document.documentElement.outerHTML;
    localStorage.setItem('SIDE_DOOR_PAGE_HTML', pageHtml);
    localStorage.setItem('SIDE_DOOR_PAGE_URL', pageUrl);
  } catch (error) {
    console.error('保存页面内容失败:', error);
  }
  
  // 添加时间戳强制刷新
  popupUrl.value = `${url}?url=${encodeURIComponent(pageUrl)}&t=${Date.now()}`;
};
</script>

<style>
:root {
  /* Light theme variables (default) */
  --sd-background-primary: white;
  --sd-background-secondary: #f5f5f5;
  --sd-text-primary: #333;
  --sd-text-secondary: #666;
  --sd-border-color: #ddd;
  --sd-hover-background: rgba(0, 0, 0, 0.05);
  --sd-accent-color: #ff7b72;
  --sd-overlay-background: rgba(211, 211, 211, 0.9);
  --sd-button-shadow: rgba(0, 0, 0, 0.2);
  --sd-button-hover-shadow: rgba(0, 0, 0, 0.3);
}

/* Dark theme variables */
:root[data-theme='dark'] {
  --sd-background-primary: #1a1a1a;
  --sd-background-secondary: #2d2d2d;
  --sd-text-primary: #e0e0e0;
  --sd-text-secondary: #a0a0a0;
  --sd-border-color: #404040;
  --sd-hover-background: rgba(255, 255, 255, 0.1);
  --sd-accent-color: #ff7b72;
  --sd-overlay-background: rgba(0, 0, 0, 0.8);
  --sd-button-shadow: rgba(0, 0, 0, 0.4);
  --sd-button-hover-shadow: rgba(255, 123, 114, 0.2);
}

.floating-button-wrapper {
  position: fixed !important;
  right: 20px !important;
  bottom: 20px !important;
  z-index: 999999 !important;
  pointer-events: auto !important;
}

.floating-button {
  width: 48px !important;
  height: 48px !important;
  border-radius: 50% !important;
  background: var(--sd-background-secondary) !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 2px 10px var(--sd-button-shadow) !important;
  transition: all 0.3s ease !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  border: 1px solid var(--sd-border-color) !important;
  position: relative !important;
}

.floating-button:hover {
  transform: scale(1.1);
  background: var(--sd-background-secondary);
  box-shadow: 0 4px 15px var(--sd-button-hover-shadow);
  border-color: var(--sd-accent-color);
}

.floating-button img {
  width: 24px;
  height: 24px;
  border: none;
  opacity: 0.8;
  transition: all 0.3s ease;
}

.floating-button.active {
  background: var(--sd-background-primary);
  border-color: var(--sd-accent-color);
  box-shadow: 0 2px 12px var(--sd-accent-color);
}

.floating-button.active img {
  opacity: 1;
}

.popup-wrapper {
  position: fixed;
  right: 20px;
  bottom: 80px;
  /* width: 800px; */
  width: 40%;
  min-width: 500px;
  background: var(--sd-background-primary);
  border-radius: 8px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid var(--sd-border-color);

  &.immersive {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    height: 95vh;
    z-index: 1000000;
  }

  &:fullscreen {
    width: 100%;
    border-radius: 0;
    right: 0;
    bottom: 0;
  }
}

.popup-wrapper.minimized {
  height: auto;
  width: 200px;
  min-width: 200px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background: var(--sd-background-secondary);
  border-bottom: 1px solid var(--sd-border-color);
  height: 40px;
}

.popup-title {
  color: var(--sd-text-primary);
  font-size: small;
}

.popup-controls button {
  margin-left: 8px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  color: var(--sd-text-secondary);
  transition: all 0.2s ease;
}

.popup-controls button:hover {
  background: var(--sd-hover-background);
  border-radius: 4px;
  color: var(--sd-text-primary);
}

.popup-content {
  height: 600px;
  background: var(--sd-background-primary);
}

.immersive .popup-content {
  height: calc(95vh - 40px);
  margin-left: auto;
  margin-right: auto;
}

.fullscreen .popup-content {
  height: calc(100vh - 40px);
  margin-left: auto;
  margin-right: auto;
}

.popup-content iframe {
  width: 100%;
  height: 100%;
  background: var(--sd-background-primary);
}

.immersive-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--sd-overlay-background);
  z-index: 999999;
  backdrop-filter: blur(2px);
}

/* 添加popup-content的主题样式 */
.popup-content[data-theme='light'] {
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
}

.popup-content[data-theme='dark'] {
  background: var(--sd-background-primary);
  color: var(--sd-text-primary);
}
</style>
