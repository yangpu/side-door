<template>
  <div>
    <button ref="buttonRef" class="settings-button" @click="isOpen = !isOpen">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z">
        </path>
      </svg>
    </button>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isOpen" ref="floating" :style="floatingStyles" class="floating">
          <div class="arrow"></div>
          <SettingsPanel @close="isOpen = false" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useFloating } from '@floating-ui/vue';
import { offset, flip, shift, autoUpdate } from '@floating-ui/dom';
import type { VirtualElement } from '@floating-ui/dom';
import SettingsPanel from './SettingsPanel.vue';

const isOpen = ref(false);
const buttonRef = ref<HTMLElement | null>(null);
const floating = ref<HTMLElement | null>(null);

const { floatingStyles } = useFloating(buttonRef, floating, {
  placement: 'top-end',
  middleware: [
    offset(8),
    flip(),
    shift({ padding: 8 })
  ],
  whileElementsMounted: (reference: Element | VirtualElement, floating: HTMLElement, update: () => void) => {
    const cleanup = autoUpdate(reference, floating, update);
    return cleanup;
  }
});

// 处理点击外部关闭
function handleClickOutside(event: MouseEvent) {
  if (
    isOpen.value &&
    buttonRef.value &&
    floating.value &&
    !buttonRef.value.contains(event.target as Node) &&
    !floating.value.contains(event.target as Node)
  ) {
    isOpen.value = false;
  }
}

// 监听点击事件
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.settings-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2000;
}

.settings-button:hover {
  background: var(--hover-bg-color);
  transform: scale(1.05);
}

.settings-button svg {
  color: var(--text-color);
}

.floating {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
}

.arrow {
  position: absolute;
  bottom: -4px;
  right: 20px;
  width: 8px;
  height: 8px;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>