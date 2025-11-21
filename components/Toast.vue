<template>
  <Transition name="toast">
    <div v-if="visible" :class="['toast', type]">
      <div class="toast-icon">
        <span v-if="type === 'success'">✓</span>
        <span v-else-if="type === 'error'">✕</span>
        <span v-else-if="type === 'info'">ℹ</span>
        <span v-else>⚠</span>
      </div>
      <div class="toast-message">{{ message }}</div>
      <button class="toast-close" @click="handleClose" aria-label="关闭">×</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  visible?: boolean;
}

const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info',
  duration: 3000,
  visible: false,
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const visible = ref(props.visible);

let timer: number | null = null;

const handleClose = () => {
  if (timer) clearTimeout(timer);
  visible.value = false;
  emit('close');
};

watch(
  () => props.visible,
  (newVal) => {
    visible.value = newVal;
    if (newVal) {
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => {
        handleClose();
      }, props.duration);
    }
  }
);
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 280px;
  max-width: 400px;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  font-size: 14px;
  line-height: 1.5;
}

.toast-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 16px;
  font-weight: bold;
}

.toast-message {
  flex: 1;
  color: #333;
}

.toast-close {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #999;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.toast-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

.toast.success {
  border-left: 4px solid #52c41a;
}

.toast.success .toast-icon {
  background: #f6ffed;
  color: #52c41a;
}

.toast.error {
  border-left: 4px solid #ff4d4f;
}

.toast.error .toast-icon {
  background: #fff2f0;
  color: #ff4d4f;
}

.toast.warning {
  border-left: 4px solid #faad14;
}

.toast.warning .toast-icon {
  background: #fffbe6;
  color: #faad14;
}

.toast.info {
  border-left: 4px solid #1890ff;
}

.toast.info .toast-icon {
  background: #e6f7ff;
  color: #1890ff;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
