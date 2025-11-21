import { createApp, h } from 'vue';
import Toast from '../components/Toast.vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

let toastInstance: any = null;

export function showToast(options: ToastOptions | string) {
  const opts: ToastOptions = typeof options === 'string' 
    ? { message: options } 
    : options;

  // 移除之前的 toast
  if (toastInstance) {
    toastInstance.unmount();
    toastInstance = null;
  }

  const container = document.createElement('div');
  document.body.appendChild(container);

  toastInstance = createApp({
    render() {
      return h(Toast, {
        ...opts,
        visible: true,
        onClose: () => {
          toastInstance.unmount();
          document.body.removeChild(container);
          toastInstance = null;
        },
      });
    },
  });

  toastInstance.mount(container);
}

// 便捷方法
export const toast = {
  success: (message: string, duration?: number) => 
    showToast({ message, type: 'success', duration }),
  error: (message: string, duration?: number) => 
    showToast({ message, type: 'error', duration }),
  warning: (message: string, duration?: number) => 
    showToast({ message, type: 'warning', duration }),
  info: (message: string, duration?: number) => 
    showToast({ message, type: 'info', duration }),
};
