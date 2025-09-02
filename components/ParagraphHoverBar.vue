<template>
  <div class="paragraph-hover-bar" :class="{ active: isParentHovered || isHovered }" @mouseenter.stop="handleMouseEnter"
    @mouseleave.stop="handleMouseLeave">
    <div class="action-area" v-show="isParentHovered || isHovered" @mouseenter.stop @mouseleave.stop>
      <div class="add-trigger" title="插入内容">+</div>
      <div class="add-buttons">
        <button class="hover-btn add-text-btn" @click="handleAddText">添加文本</button>
        <button class="hover-btn add-code-btn" @click="handleAddCode">添加代码</button>
        <button class="hover-btn delete-btn" @click="handleDelete">删除段落</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const props = defineProps<{
  content: HTMLElement;
  isParentHovered: boolean;
}>();

const isHovered = ref(false);

const handleMouseEnter = () => {
  isHovered.value = true;
};

const handleMouseLeave = () => {
  isHovered.value = false;
};

const handleAddText = () => {
  // 实现添加文本功能
  console.log('添加文本');
};

const handleAddCode = () => {
  // 实现添加代码功能
  console.log('添加代码');
};

const handleDelete = () => {
  // 实现删除功能
  console.log('删除段落');
};
</script>

<style scoped>
.paragraph-hover-bar {
  position: absolute;
  right: -20px;
  top: 0;
  bottom: 0;
  width: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  z-index: 1001;
  opacity: 0;
  pointer-events: auto;
}

.paragraph-hover-bar::after {
  content: '';
  position: absolute;
  width: 3px;
  height: 100%;
  background-color: #e0e0e0;
  border-radius: 2px;
  transition: all 0.3s ease;
  transform: scaleY(0.5);
  transform-origin: center;
  pointer-events: auto;
}

/* 鼠标悬停到段落时显示50%高度 */
.paragraph-hover-bar.active::after {
  background-color: var(--translated-bg-color);
  transform: scaleY(0.5);
  opacity: 0.6;
}

/* 鼠标悬停到指示器时显示80%高度 */
.paragraph-hover-bar:hover::after {
  background-color: var(--translated-bg-color);
  transform: scaleY(0.8);
  opacity: 0.8;
}

/* 点击指示器时显示100%高度 */
.paragraph-hover-bar:active::after {
  transform: scaleY(1);
  opacity: 1;
}

.paragraph-hover-bar.active {
  opacity: 1;
  z-index: 1010;
}

/* 添加按钮区域样式 */
.action-area {
  position: absolute;
  left: 50%;
  bottom: -22px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  z-index: 1002;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  pointer-events: auto;
  /* 确保可以接收鼠标事件 */
}

.paragraph-hover-bar:hover .action-area {
  opacity: 1;
  visibility: visible;
}

.add-trigger {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: var(--translated-bg-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 15px;
  transition: all 0.2s ease;
  opacity: 0.6;
  position: relative;
  z-index: 1003;
}

.add-trigger::before {
  content: '';
  position: absolute;
  top: 50%;
  right: 100%;
  width: 8px;
  height: 30px;
  transform: translateY(-50%);
  z-index: 1003;
}

.add-trigger:hover {
  opacity: 1;
}

.add-buttons {
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  opacity: 0;
  visibility: hidden;
  flex-direction: column;
  gap: 2px;
  display: flex;
  transition: all 0.2s ease;
  z-index: 1004;
  margin-right: 8px;
}

.dark .add-buttons {
  background-color: var(--bg-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.add-trigger:hover+.add-buttons,
.add-buttons:hover {
  opacity: 1;
  visibility: visible;
}

.hover-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  color: var(--text-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  background-color: var(--bg-color);
  width: 100px;
  font-weight: 500;
}

.hover-btn:hover {
  background-color: var(--hover-bg-color);
  color: var(--primary-color);
}

.add-text-btn {
  color: var(--primary-color);
}

.add-code-btn {
  color: var(--primary-color);
}

.delete-btn {
  color: var(--error-color);
  border-top: 1px solid var(--border-color);
  margin-top: 2px;
  padding-top: 6px;
}

.delete-btn:hover {
  color: var(--error-color);
  /* background-color: var(--error-hover-bg-color); */
}
</style>