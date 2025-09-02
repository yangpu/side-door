<template>
  <div class="color-picker-wrapper">
    <div class="color-picker" ref="colorPickerEl" :style="{ background: modelValue }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import Pickr from '@simonwep/pickr';
import '@simonwep/pickr/dist/themes/classic.min.css';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const colorPickerEl = ref<HTMLElement | null>(null);
let pickr: Pickr | null = null;

onMounted(() => {
  if (colorPickerEl.value) {
    pickr = Pickr.create({
      el: colorPickerEl.value,
      theme: 'classic',
      default: props.modelValue,
      swatches: [
        '#ffeb3b',
        '#fff176',
        '#fff59d',
        '#fff9c4',
        '#fffde7',
        '#fdd835',
        '#fbc02d',
        '#f9a825',
        '#f57f17'
      ],
      components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: {
          hex: true,
          rgba: true,
          hsla: false,
          hsva: false,
          cmyk: false,
          input: true,
          clear: true,
          save: false
        }
      }
    });

    // 阻止颜色选择器的点击事件冒泡
    colorPickerEl.value.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // 阻止 Pickr 面板的点击事件冒泡
    pickr.on('init', (instance: any) => {
      const pickrApp = instance.getRoot().app;
      if (pickrApp) {
        pickrApp.addEventListener('click', (e: Event) => {
          e.stopPropagation();
        });
      }
    });

    pickr.on('change', (color: any) => {
      if (color) {
        const rgba = color.toRGBA();
        const rgbaString = `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3]})`;
        emit('update:modelValue', rgbaString);
        pickr?.applyColor(true);
      }
    });

    pickr.on('clear', () => {
      emit('update:modelValue', 'transparent');
    });
  }
});

onBeforeUnmount(() => {
  pickr?.destroy();
});
</script>

<style scoped>
.color-picker {
  width: 100%;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  cursor: pointer;
}
</style>