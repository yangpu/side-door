<template>
  <div class="theme-switch">
    <label>主题</label>
    <div class="theme-toggle" @click="toggleTheme">
      <input type="checkbox" :checked="modelValue === 'dark'" />
      <span class="toggle-track">
        <span class="toggle-text toggle-text-light">浅色</span>
        <span class="toggle-text toggle-text-dark">深色</span>
        <span class="toggle-indicator">
          <span class="checkmark">
            <span class="theme-icon">{{ modelValue === 'dark' ? '🌙' : '☀️' }}</span>
          </span>
        </span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: 'light' | 'dark'
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: 'light' | 'dark'): void
}>();

const theme = ref(props.modelValue);

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  theme.value = newValue;
  applyTheme(newValue);
});

// 切换主题
function toggleTheme() {
  const newTheme = theme.value === 'light' ? 'dark' : 'light';
  theme.value = newTheme;
  emit('update:modelValue', newTheme);
  applyTheme(newTheme);
}

// 应用主题到 document
function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);

  // 设置系统状态栏颜色（仅在 macOS 上生效）
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#ffffff' : '#1a1a1a');
  }

  // 通知父窗口主题变化
  window.parent.postMessage({ type: 'themeChange', theme }, '*');
}

// 初始化主题
applyTheme(theme.value);
</script>

<style scoped>
.theme-switch {
  width: 100%;
}

.theme-switch>label {
  display: block;
  margin-bottom: 4px;
  color: var(--text-color);
  font-weight: 500;
  font-size: 12px;
}

.theme-toggle {
  position: relative;
  width: 80px;
  height: 32px;
  cursor: pointer;
}

.theme-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--sd-background-secondary);
  border: 1px solid var(--sd-border-color);
  transition: .4s;
  border-radius: 34px;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle-text {
  font-size: 12px;
  color: var(--sd-text-secondary);
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  transition: color 0.4s;
}

.toggle-text-light {
  left: 8px;
  opacity: 1;
}

.toggle-text-dark {
  right: 8px;
  opacity: 0.6;
}

.theme-toggle input:checked~.toggle-track .toggle-text-light {
  opacity: 0.6;
}

.theme-toggle input:checked~.toggle-track .toggle-text-dark {
  opacity: 1;
  color: var(--sd-text-primary);
}

.toggle-indicator {
  position: absolute;
  width: 26px;
  height: 26px;
  background-color: var(--sd-background-primary);
  transition: .4s;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transform: translateX(2px);
  z-index: 1;
}

.theme-toggle input:checked~.toggle-track .toggle-indicator {
  transform: translateX(50px);
  background-color: var(--sd-accent-color);
}

.theme-toggle input:checked~.toggle-track {
  background-color: var(--sd-background-secondary);
  border-color: var(--sd-accent-color);
}

.theme-icon {
  font-size: 14px;
  line-height: 1;
}

.checkmark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* 悬停效果 */
.theme-toggle:hover .toggle-track {
  border-color: var(--sd-accent-color);
}

.theme-toggle:hover .toggle-indicator {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>