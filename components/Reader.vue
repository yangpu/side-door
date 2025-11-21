<script lang="ts" setup>
import { ref, onMounted, nextTick, watch, onUnmounted, shallowRef } from 'vue';
import { Readability } from '@mozilla/readability';
import { extractDates } from '../utils/dateExtractor';
import { Ollama } from 'ollama/browser';
import { franc } from 'franc'; // 导入 franc 用于语言检测
import { removeThinkTags } from '../utils/thinkTagFilter';
import html2pdf from 'html2pdf.js';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css'; // 使用 GitHub 风格的主题
import Pickr from '@simonwep/pickr';
import '@simonwep/pickr/dist/themes/classic.min.css';

import { showImages } from 'vue-img-viewr';
import 'vue-img-viewr/styles/index.css';
import { createPopper } from '@popperjs/core';

// 添加 PDF.js 相关导入
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

// 设置 PDF.js worker 路径
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// 添加Quill编辑器相关的响应式变量
import 'quill/dist/quill.snow.css';
import Quill from 'quill';
import type { default as QuillType } from 'quill';

// 在 setup 中添加 marked 函数
import { marked } from 'marked';
import { html as htmlBeautify } from 'js-beautify';

// 在script部分顶部添加monaco-editor的导入
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// 导入稍后阅读服务
import { ReadLaterService } from '../services/readLaterService';
import type { Article } from '../types/article';
import ReadLaterList from './ReadLaterList.vue';
import ReadLaterDetail from './ReadLaterDetail.vue';

// 导入 toast
import { toast } from '../utils/toast';

// 配置 Monaco Editor 的 worker
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  }
};

// 添加ollama model配置
const OLLAMA_MODEL = ref('');
const OLLAMA_VISION_MODEL = ref('');

// 添加模型列表的响应式变量
const OLLAMA_MODELS = ref<{ value: string; label: string }[]>([]);
const OLLAMA_VISION_MODELS = ref<{ value: string; label: string }[]>([]);

const ollama = new Ollama();

// 添加获取模型列表的函数
async function fetchOllamaModels() {
  try {
    OLLAMA_MODEL.value = localStorage.getItem('OLLAMA_MODEL') || '';
    OLLAMA_VISION_MODEL.value = localStorage.getItem('OLLAMA_VISION_MODEL') || '';

    const response = await ollama.list();
    const models = response.models || [];

    // 分离普通模型和视觉模型
    const normalModels: { value: string; label: string }[] = [];
    const visionModels: { value: string; label: string }[] = [];

    models.forEach(model => {
      const modelName = model.name;
      visionModels.push({ value: modelName, label: modelName });
      normalModels.push({ value: modelName, label: modelName });
    });

    OLLAMA_MODELS.value = normalModels;
    OLLAMA_VISION_MODELS.value = visionModels;

    // 如果没有设置默认模型，或者设置的模型不在列表中，则使用第一个可用的模型
    if (!normalModels.find(m => m.value === OLLAMA_MODEL.value)) {
      const model = normalModels.find(m => m.value.includes('qwen'))
      OLLAMA_MODEL.value = model?.value || normalModels[0]?.value || '';
      localStorage.setItem('OLLAMA_MODEL', OLLAMA_MODEL.value);
    }

    if (!visionModels.find(m => m.value === OLLAMA_VISION_MODEL.value)) {
      // 优先选择带有vision的模型
      const visionModel = visionModels.find(m => m.value.toLowerCase().includes('vision'));
      OLLAMA_VISION_MODEL.value = visionModel?.value || visionModels[0]?.value || '';
      localStorage.setItem('OLLAMA_VISION_MODEL', OLLAMA_VISION_MODEL.value);
    }
  } catch (error) {
    console.error('获取Ollama模型列表失败:', error);
  }
}

// 添加保存模型选择的函数
function saveModelSelection(model: string, isVision = false) {
  if (isVision) {
    OLLAMA_VISION_MODEL.value = model;
    localStorage.setItem('OLLAMA_VISION_MODEL', model);
  } else {
    OLLAMA_MODEL.value = model;
    localStorage.setItem('OLLAMA_MODEL', model);
  }
}

// 添加口定义
interface ArticlePreview {
  title: string;
  excerpt: string;
  imageUrl: string | null;
  isLoading: boolean;
  url?: string; // 添加 url 字段
}

// 修改 props 定义，添加 url 参数
const props = defineProps<{
  html: string;
  url: string; // 新增的 url 参数
  refreshKey?: number; // 用于手动触发刷新的键值
}>();

const content = ref<HTMLElement | null>(null);
const title = ref('');
const summary = ref('');
const isLoading = ref(true); // 新增的加载状态

// 新增的响应式变量
const publishedTime = ref('--');
const length = ref('--');
const byline = ref('--');
const dir = ref('--');
const siteName = ref('--');
const lang = ref('--');
const excerpt = ref('--');

// 修改响应式变量
const translatedTitle = ref('');
const translatedExcerpt = ref('');
const isTranslatedTitle = ref(false);
const isTranslatedExcerpt = ref(false);

// 添加 translationCounter 的定义
const translationCounter = ref(0);

// 修改 SKIP_SELECTORS 常量
const SKIP_SELECTORS = [
  'a', // 链接
  'code', // 代码
  'pre', // 预格式化文本
  'table', // 表格
  '.highlight', // 代码高亮
  '.markdown', // markdown内容
  '.translated', // 已翻译内容
  'script', // 脚本
  'style', // 样式
  'img', // 图片
  'svg', // SVG
  'video', // 视频
  'audio', // 音频
  'iframe', // iframe
  'button', // 按钮
  'input', // 输入框
  'textarea', // 文本域
  'figure', // 图片容器
  'figcaption', // 图片说明
].join(',');

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '无发布时间';
  }
  return date.toISOString().split('T')[0]; // 这将返回 YYYY-MM-DD 格式
}

// 添加新的响应式变量
const enableSummary = ref(localStorage.getItem('ENABLE_SUMMARY') === 'true');
const isSummaryGenerated = ref(false);
let summaryResponsing: any;

// 修改 toggleSummary 函数
async function toggleSummary(enabled: boolean) {
  enableSummary.value = enabled;
  localStorage.setItem('ENABLE_SUMMARY', enabled.toString());

  const summaryElement = document.querySelector('.summary') as HTMLElement;
  if (summaryElement) {
    if (!enabled) {
      summaryElement.style.display = 'none';
      // 如果正在生成摘要，取消 API 调用
      if (summaryResponsing) {
        summaryResponsing.abort();
        summaryResponsing = null;
        summary.value = '已取消生成';
      }
    } else {
      summaryElement.style.display = 'block';
      if (!isSummaryGenerated.value && content.value) {
        // 重新生成摘要
        await generateSummary(content.value.textContent || '');
      }
    }
  }
}

// 修改 generateSummary 函数
async function generateSummary(text?: string) {
  if (!enableSummary.value || !OLLAMA_MODEL.value) {
    return '';
  }

  if (!text) {
    text = content.value?.textContent || '';
  }

  if (!text) {
    return '';
  }

  isLoading.value = true;
  summary.value = '总结中...';
  isSummaryGenerated.value = false;

  if (summaryResponsing) {
    summaryResponsing.abort();
    summaryResponsing = null;
  }

  try {
    const response = await ollama.chat({
      model: OLLAMA_MODEL.value,
      messages: [
        {
          role: 'system',
          content: `你是一个专业的文章摘要生成器，请为以下内容生成一个简短中文概要。必须中文返回，长度不要超过300字，必须用markdown格式返回，前后不要添加任何其他内容:`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      stream: true,
    });

    summaryResponsing = response;

    let partialSummary = '';

    for await (const part of response) {
      if (isLoading.value) {
        isLoading.value = false;
      }

      partialSummary += removeThinkTags(part.message.content);
      summary.value = partialSummary;
    }

    // 去掉可能存在的markdown标记
    const cleanSummary = partialSummary.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    summary.value = await marked(cleanSummary);

    isSummaryGenerated.value = true;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      summary.value = '重新生成中...';
    } else {
      summary.value = '无法生成概要: ' + (error as Error).message;
    }
    return summary.value;
  } finally {
    isLoading.value = false;
    summaryResponsing = null;
  }
}

async function generateImageSummary() {
  if (!enableSummary.value || !OLLAMA_MODEL.value) {
    return '';
  }

  isLoading.value = true;
  summary.value = '图片分析中...';
  isSummaryGenerated.value = false;

  const images = document.getElementsByTagName('img');

  // 处理base64图片,去掉前缀只保留编码数据
  const base64Prefix = 'data:image/';
  const processedImages = Array.from(images).map(img => {
    if (img.src.startsWith(base64Prefix)) {
      // 找到第一个逗号后的所有内容
      const commaIndex = img.src.indexOf(',');
      if (commaIndex !== -1) {
        return img.src.substring(commaIndex + 1);
      }
    }
    return img.src;
  });


  if (summaryResponsing) {
    summaryResponsing.abort();
    summaryResponsing = null;
  }

  try {
    const response = await ollama.chat({
      model: OLLAMA_VISION_MODEL.value,
      messages: [
        {
          role: 'user',
          content: '请总结图片内容',
          images: processedImages,
        },
      ],
      stream: true,
    });

    summaryResponsing = response;

    let partialSummary = '';

    for await (const part of response) {
      if (isLoading.value) {
        isLoading.value = false;
      }

      partialSummary += removeThinkTags(part.message.content);
      summary.value = partialSummary;
    }

    // 去掉可能存在的markdown标记
    const cleanSummary = partialSummary.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    summary.value = await marked(cleanSummary);

    isSummaryGenerated.value = true;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      summary.value = '重新生成中...';
    } else {
      summary.value = '无法生成概要: ' + (error as Error).message;
    }
    return summary.value;
  } finally {
    isLoading.value = false;
    summaryResponsing = null;
  }

}

// 添加检测中文字符的函数
function containsChineseCharacters(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

// 添加翻译开关配置
const enableTranslation = ref(localStorage.getItem('ENABLE_TRANSLATION') !== 'false');

// 添加控制翻译的函数
function toggleTranslation(enabled: boolean) {
  enableTranslation.value = enabled;
  localStorage.setItem('ENABLE_TRANSLATION', enabled.toString());

  // 控制所有已翻译内容的显示/隐藏
  const translatedElements = document.querySelectorAll('.translated, .translating');
  translatedElements.forEach((element) => {
    const el = element as HTMLElement;
    el.style.display = enabled ? '' : 'none';
  });

  // 如果开启翻译且有未完成的翻译任务，继续翻译
  if (enabled && editingParagraph.value === null) {
    // 继续标题和摘要的翻译
    if (!isTranslatedTitle.value) {
      handleTitleTranslation();
    }
    if (!isTranslatedExcerpt.value) {
      handleExcerptTranslation();
    }

    // 继续内容的翻译
    const contentElement = document.querySelector('.article-content');
    if (contentElement) {
      translateContent(contentElement as HTMLElement);
    }
  }
}

// 修改翻译相关函数，添加翻译开关检查
async function translate(text: string, detectAgain: boolean = false): Promise<string> {
  if (!enableTranslation.value || !OLLAMA_MODEL.value) {
    return '';
  }

  if (detectAgain && !shouldTranslateText(text)) {
    return '';
  }

  try {
    // 收集所有占位符
    const placeholders: string[] = [];
    const placeholderRegex = /\${\d+}/g;
    const matches = text.match(placeholderRegex);
    if (matches) {
      placeholders.push(...matches);
    }

    // 在翻译前，直接使用占位符，不添加方括号
    let textToTranslate = text;
    let prompt = '';

    if (textToTranslate.includes('${')) {
      prompt = `/no_think 你是一个专业的翻译器，将以下内容翻译成中文。注意：不要翻译\${}格式的占位符，将它们原样保留。请严格按照原文翻译，不要添加任何其他内容。`;
    } else {
      prompt = `/no_think 你是一个专业的翻译器，将以下内容翻译成中文。请严格按照原文翻译，不要添加任何其他内容。`;
    }

    const response = await ollama.chat({
      model: OLLAMA_MODEL.value,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: textToTranslate,
        },
      ],
      stream: false,
    });

    let translatedText = removeThinkTags(response.message.content);

    // 检查是否所有占位符都被正确保留
    const missingPlaceholders = placeholders.filter(p => !translatedText.includes(p));
    if (missingPlaceholders.length > 0) {
      // console.warn('翻译后丢失的占位符:', missingPlaceholders);
      // console.warn('原始文本:', text);
      // console.warn('翻译后文本:', translatedText);

      // 如果有丢失的占位符，将它们添加到翻译文本的末尾
      missingPlaceholders.forEach(p => {
        translatedText += p;
      });
    }

    // if (text === translatedText) return '';
    return translatedText;
  } catch (error) {
    // console.warn('翻译时出错:', error);
    return '';
  }
}

// 修改 handleTitleTranslation 函数
async function handleTitleTranslation() {
  if (!enableTranslation.value || lang.value === 'zh-CN' || isTranslatedTitle.value) {
    return;
  }
  translationCounter.value++;
  const currentCount = translationCounter.value;
  translatedTitle.value = `翻译[${currentCount}]...`;
  translatedTitle.value = await translate(title.value, true);
  isTranslatedTitle.value = true;
}

// 修改 handleExcerptTranslation 函数
async function handleExcerptTranslation() {
  if (!enableTranslation.value || lang.value === 'zh-CN' || isTranslatedExcerpt.value) {
    return;
  }
  translationCounter.value++;
  const currentCount = translationCounter.value;
  translatedExcerpt.value = `翻译[${currentCount}]...`;
  translatedExcerpt.value = await translate(excerpt.value, true);
  isTranslatedExcerpt.value = true;
}

// 新增处理HTML中所有URL的函数
function processHtmlUrls(html: string, baseUrl: string): string {
  try {
    // 处理所有 src 和 href 属性
    let processedHtml = html.replace(
      /(src|href|action|data-src)=["']((?!data:|http:|https:|mailto:|tel:|#|javascript:)[^"']+)[""]/gi,
      (_match, attr, url) => {
        const resolvedUrl = resolveUrl(url, baseUrl);
        return `${attr}="${resolvedUrl}"`;
      }
    );

    // 处理 srcset 属性
    processedHtml = processedHtml.replace(
      /srcset=["']([^"']+)[""]/gi,
      (_match, srcset) => {
        const processedSrcset = srcset
          .split(',')
          .map((src: string) => {
            const [url, size] = src.trim().split(/\s+/);
            // 仅处理以特定字符开头的相对路径
            if (/^[./]/.test(url) && !/^(data:|http:|https:)/.test(url)) {
              return `${resolveUrl(url, baseUrl)}${size ? ' ' + size : ''}`;
            }
            return src.trim();
          })
          .join(', ');
        return `origin-srcset="${srcset}" srcset="${processedSrcset}"`;
      }
    );

    // 处理 style 标签和 style 属性中的 url()
    processedHtml = processedHtml.replace(
      /url\(['"]?((?!data:|http:|https:|#)[^'")]+)['"]?\)/gi,
      (match, url) => {
        // 仅处理以特定字符开头的相对路径
        if (/^[./]/.test(url)) {
          return `url("${resolveUrl(url, baseUrl)}")`;
        }
        return match;
      }
    );

    // 处理 meta 标签中的 URL
    processedHtml = processedHtml.replace(
      /<meta[^>]+(content)=["']([^"']+)["'][^>]*>/gi,
      (match, _attr, content) => {
        if (content.match(/^(http:|https:|data:|mailto:|tel:|#|javascript:)/)) {
          return match;
        }
        // 仅处理以特定字符开头的相对路径
        if (/^[./]/.test(content)) {
          return match.replace(content, resolveUrl(content, baseUrl));
        }
        return match;
      }
    );

    return processedHtml;
  } catch (error) {
    console.error('处理 HTML URL 时出错:', error);
    return html;
  }
}

// 修改 resolveUrl 函数,使其更通用
function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    // 如果已是绝对 URL 或者是特殊协议,则直接返回
    if (relativeUrl.match(/^(http:|https:|data:|mailto:|tel:)/)) {
      return relativeUrl;
    }
    const url = new URL(relativeUrl, baseUrl).href;
    return url;
  } catch (e) {
    console.error('无法解析 URL:', relativeUrl, baseUrl);
    return relativeUrl;
  }
}

// 判断节点是否为混合内容节点,包括检查子节点
function isMixedContent(node: Element): boolean {
  let hasText = false;
  let hasElement = false;

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      hasText = true;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      hasElement = true;
      // 递归检查子元素是否也是混合内容
      if (isMixedContent(child as Element)) {
        return true;
      }
    }
    if (hasText && hasElement) return true;
  }

  return false;
}

// 分解混合内容节点，返回需要翻译的最小单元
function decomposeMixedNode(node: Element): Node[] {
  const results: Node[] = [];

  // 如果节点不是混合内容，直接返回该节点
  if (!isMixedContent(node)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      results.push(node);
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      node.childNodes.length > 0
    ) {
      results.push(node);
    }
    return results;
  }

  // 遍历所有子节点
  for (const child of Array.from(node.childNodes)) {
    // 处理文本节点
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent?.trim()) {
        results.push(child);
      }
      continue;
    }

    // 处理元素节点
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as Element;
      // 如果是块级元素或列表项，作为独立单元
      if (element.tagName === 'LI' || isBlockElement(element)) {
        results.push(element);
      }
      // 如果是混合内容，递归分解
      else if (isMixedContent(element)) {
        results.push(...decomposeMixedNode(element));
      }
      //  如果是普通元素，直接添加
      else {
        results.push(element);
      }
    }
  }

  return results;
}

// 获取节点的完整HTML内容
function getNodeHtml(node: Element): string {
  return node.innerHTML;
}

// 判断节点是否应该跳过翻译
function shouldSkipNode(node: Node): boolean {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;

    // 直接跳过 img 标签
    if (element.tagName.toLowerCase() === 'img') {
      return true;
    }

    // 检查是否已经有翻译内容
    if (element.querySelector('.translated')) {
      return true;
    }

    // 检查是是翻译容器本身
    if (element.classList.contains('translated')) {
      return true;
    }

    // 检查节点本身或其祖先节点是否匹配跳过选择器
    return !!element.closest(SKIP_SELECTORS);
  }

  if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
    // 检查文本节点的父元素是否是或包含 img
    if (
      node.parentElement.tagName.toLowerCase() === 'img' ||
      node.parentElement.querySelector('img')
    ) {
      return true;
    }

    // 检查文本节点的父元素是否已有翻译
    if (node.parentElement.querySelector('.translated')) {
      return true;
    }

    // 检查文本节点父元素是否匹配跳过选择器
    return !!node.parentElement.closest(SKIP_SELECTORS);
  }

  return false;
}

// 添加 Set 来跟踪已翻译的节点
const translatedNodes = new Set<Node>();

// 添加翻译队列管理
const translationQueue = ref<{
  node: Node;
  text: string;
  container: HTMLElement;
  count: number; // 添加序号字段
}[]>([]);
const isTranslatingQueue = ref(false);

// 添加判本是否需要翻译的函数
function shouldTranslateText(text: string): boolean {
  if (text.length <= 3) {
    return false;
  }

  if (!isNaN(Number(text))) {
    return false;
  }

  // 如果包含中文字符,不需要翻译
  if (containsChineseCharacters(text)) {
    return false;
  }
  // 检测语言
  const detectedLang = franc(text);
  const isChineseText = ['cmn', 'chi'].includes(detectedLang);

  // 如果是中文,不需要翻译
  if (isChineseText) {
    return false;
  }

  return true;
}

// 修改 translateNode 函数,使用队列管理
async function translateNode(node: Node): Promise<boolean> {
  if (translatedNodes.has(node)) {
    return false;
  }

  if (shouldSkipNode(node)) {
    return false;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    if (node.parentElement && isMixedContent(node.parentElement)) {
      return false;
    }

    const text = node.textContent?.trim();
    if (!text || !shouldTranslateText(text)) {
      return false;
    }

    translationCounter.value++; // 在放入队列前递增序号
    const currentCount = translationCounter.value; // 保存当前序号

    const span = document.createElement('span');
    span.className = 'translating';
    span.textContent = `翻译[${currentCount}]...`; // 使用保存的序号

    const parent = node.parentNode as HTMLElement;
    parent.insertBefore(span, node.nextSibling);
    parent.classList.add('translation');

    // 添加到翻译队列，传入序号
    translationQueue.value.push({
      node,
      text,
      container: span,
      count: currentCount // 添加序号到队列项
    });

    // 启动队列处理
    if (!isTranslatingQueue.value) {
      processTranslationQueue();
    }

    return true;
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;

    if (isMixedContent(element)) {
      const subNodes = decomposeMixedNode(element);
      for (const subNode of subNodes) {
        await translateNode(subNode);
      }
      return true;
    } else {
      const html = getNodeHtml(element);
      if (!shouldTranslateText(html)) {
        return false;
      }

      translationCounter.value++; // 在放入队列前递增序号
      const currentCount = translationCounter.value; // 保存当前序号

      const container = document.createElement('span');
      container.className = 'translating';
      container.textContent = `翻译[${currentCount}]...`; // 使用保存的序号

      element.appendChild(container);

      // 添加到翻译队列，传入序号
      translationQueue.value.push({
        node: element,
        text: html,
        container,
        count: currentCount // 添加序号到队列项
      });

      // 启动队列处理
      if (!isTranslatingQueue.value) {
        processTranslationQueue();
      }

      return true;
    }
  }
  return false;
}

// 添加处理翻译队列的函数
async function processTranslationQueue() {
  if (isTranslatingQueue.value || translationQueue.value.length === 0) {
    return;
  }

  isTranslatingQueue.value = true;

  try {
    while (translationQueue.value.length > 0) {
      // 每次处理5个翻译任务
      const batch = translationQueue.value.splice(0, 5);
      await Promise.all(
        batch.map(async ({ node, text, container }) => {
          try {
            const translation = await translate(text);
            if (translation && translation !== text) {
              container.textContent = `${translation}`; // 使用队列项中保存的序号
              container.classList.remove('translating');
              container.classList.add('translated');
              translatedNodes.add(node);
              translatedNodes.add(container);
            } else {
              container.remove();
            }
          } catch (error) {
            console.error('翻译失败:', error);
            container.remove();
          }
        })
      );

      // 添加小延迟避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } finally {
    isTranslatingQueue.value = false;
  }
}

// 修改后 collectNodesToTranslate 函数
function collectNodesToTranslate(rootElement: HTMLElement) {
  const textNodes: Node[] = [];
  const blockNodes: Set<Element> = new Set();

  // 定义块级元素选择器
  const blockSelectors = [
    'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'article', 'section', 'main', 'header', 'footer',
    'aside', 'nav', 'blockquote', 'li', 'td', 'th',
    'dd', 'dt', 'figcaption', 'label', 'output'
  ].join(',');

  // 定义需要跳过的元素选择器
  const skipSelectors = [
    'pre', 'code', 'script', 'style', 'iframe',
    'img', 'video', 'audio', 'canvas', 'svg',
    'math', 'noscript', 'template', '.add-trigger'
  ].join(',');

  // 获取所有 .paragraph 元素
  const paragraphs = rootElement.querySelectorAll('.paragraph');

  paragraphs.forEach(paragraph => {
    // 使用 TreeWalker 遍历每个段落内的文本节点
    const walker = document.createTreeWalker(
      paragraph,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 跳过空白文本
          const text = node.textContent?.trim();
          if (!text || !shouldTranslateText(text)) {
            return NodeFilter.FILTER_REJECT;
          }

          // 检查父元素是否在需要跳过的元素中
          let parent = node.parentElement;
          while (parent && parent !== paragraph) {
            if (parent.matches(skipSelectors)) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    // 收集文本节点和它们的块级父元素
    let node: Node | null;
    while (node = walker.nextNode()) {
      let parent = node.parentElement;
      let blockParent = null;

      // 查找最近的块级父元素
      while (parent && parent !== paragraph) {
        if (parent.matches(blockSelectors)) {
          blockParent = parent;
          break;
        }
        parent = parent.parentElement;
      }

      // 如果找到块级父元素，将其添加到集合中
      if (blockParent) {
        blockNodes.add(blockParent);
      } else {
        // 如果没有找到块级父元素，将文本节点直接添加到文本节点组中
        textNodes.push(node);
      }
    }

    // 查找段落内的所有块级元素
    paragraph.querySelectorAll(blockSelectors).forEach(element => {
      // 跳过已经收集的和需要忽略的元素
      if (blockNodes.has(element as Element) || element.matches(skipSelectors)) {
        return;
      }

      // 检查是否包含需要翻译的文本
      const hasText = Array.from(element.childNodes).some(child => {
        return child.nodeType === Node.TEXT_NODE &&
          child.textContent?.trim() &&
          shouldTranslateText(child.textContent.trim());
      });

      if (hasText) {
        blockNodes.add(element as Element);
      }
    });
  });

  // 合并结果并按文档顺序排序
  return [...blockNodes, ...textNodes].sort((a, b) => {
    const position = a.compareDocumentPosition(b);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
}

// 修改后的 translateContent 函数
async function translateContent(rootElement: HTMLElement) {
  if (!enableTranslation.value || lang.value === 'zh-CN') {
    return;
  }
  if (!rootElement) return;

  // 收集所有需要翻译的节点
  const nodes = collectNodesToTranslate(rootElement);
  const textNodes = nodes.filter(node => node.nodeType === Node.TEXT_NODE);
  const blockNodes = nodes.filter(node => node.nodeType === Node.ELEMENT_NODE) as Element[];

  try {
    // 先处理块级节点
    for (let i = 0; i < blockNodes.length; i += 5) {
      const batch = blockNodes.slice(i, i + 5);
      await Promise.all(
        batch.map(async (node: Element) => {
          try {
            if (!enableTranslation.value) {
              return;
            }

            // 检查节点及其子孙节点是否包含.translated类
            if (node.querySelector('.translated') || node.classList.contains('translated')) {
              return;
            }

            // 克隆节点并处理内容
            const { textToTranslate, preservedElements, hasTranslatableContent } = cloneAndPreserveElements(node);

            // 如果节点不包含可翻译内容，直接跳过
            if (!hasTranslatableContent) {
              return;
            }

            // 删除已有的翻译节点
            const existingTranslations = node.querySelectorAll('.translating, .translated');
            existingTranslations.forEach(el => el.remove());

            if (!textToTranslate || !shouldTranslateText(textToTranslate)) {
              return;
            }

            translationCounter.value++;
            const currentCount = translationCounter.value;

            // 将TEXT_NODE用span包装起来
            const textNodes = Array.from(node.childNodes).filter(child => child.nodeType === Node.TEXT_NODE);
            textNodes.forEach(textNode => {
              if (textNode.textContent?.trim() === '') {
                return;
              }
              const span = document.createElement('span');
              span.className = 'origin-text';
              textNode.parentNode?.insertBefore(span, textNode);
              span.appendChild(textNode);
            });

            const container = document.createElement('span');
            container.className = 'translating';
            container.innerHTML = `<br />翻译[${currentCount}]...`;
            node.appendChild(container);
            node.classList.add('translation');

            // 解析替换符和实际文本
            let prefix = '';
            let textForTranslation = textToTranslate;

            // 匹配开头的${数字}模式和空格
            const prefixMatch = textToTranslate.match(/^(\${[0-9]+}|\s)+/);
            if (prefixMatch) {
              prefix = prefixMatch[0];
              textForTranslation = textToTranslate.slice(prefix.length);
            }


            let translation = await translate(textForTranslation);
            if (translation) {
              translation = prefix + translation;

              // 还原保留的元素
              const restoredHtml = restorePreservedElements(translation, preservedElements);
              container.classList.remove('translating');
              container.classList.add('translated');
              container.innerHTML = `<br />${restoredHtml}`;
              translatedNodes.add(node);
            } else {
              container.remove();
            }
          } catch (error) {
            console.error('翻译段落失败:', error);
          }
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 再处理独立文本节点
    for (let i = 0; i < textNodes.length; i += 5) {
      try {
        const batch = textNodes.slice(i, i + 5);
        await Promise.all(
          batch.map(async (node) => {
            try {
              await translateNode(node);
            } catch (error) {
              console.error('翻译失败:', error);
            }
          })
        );

        await new Promise((resolve) => setTimeout(resolve, 100));

      } catch (error) {
        console.error('翻译批次处理失败:', error);
      }
    }

  } catch (error) {
    console.error('翻译过程出错:', error);
  }
}

// 添加类型定义
interface PreservedContent {
  type: 'tag' | 'entity' | 'math' | 'element' | 'emoji';
  content: string;
}

// 重构克隆和保留元素的函数
function cloneAndPreserveElements(node: Element): {
  textToTranslate: string;
  preservedElements: Map<string, PreservedContent>;
  hasTranslatableContent: boolean;
} {
  const preservedElements = new Map<string, PreservedContent>();
  let counter = 0;
  let hasTranslatableContent = false;

  try {
    // 克隆节点
    const clonedNode = node.cloneNode(true) as Element;

    // 需要保留的元素选择器
    const preserveSelectors = [
      'a', 'img', 'figure', 'picture', 'pre', 'code',
      'script', 'style', 'svg', 'canvas', 'video',
      'audio', 'iframe', 'button', 'input',
      'textarea', 'select', 'form',
      '.math', '[data-latex]', '[data-math]',
      'sup', 'sub', 'var', 'kbd', 'samp',
      '.paragraph-hover-bar', '.translating', '.translated', '.edit-time'
    ].join(',');

    // 临时容器用于处理HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = clonedNode.innerHTML;

    // 首先处理需要完全保留的元素（如链接等）
    const elementsToPreserve = Array.from(tempDiv.querySelectorAll(preserveSelectors));
    elementsToPreserve.forEach(element => {
      const placeholder = `\${${counter++}}`;
      preservedElements.set(placeholder, {
        type: 'element',
        content: element.outerHTML
      });
      // 使用 replaceWith 替换元素
      element.replaceWith(document.createTextNode(placeholder));
    });

    let html = tempDiv.innerHTML;

    // 处理HTML标签
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z0-9-]+(?:=(?:"[^"]*"|'[^']*'|[^'">\s]+))?)*)\s*\/?>/g;
    html = html.replace(tagRegex, (match, tagName, attributes) => {
      const placeholder = `\${${counter++}}`;
      preservedElements.set(placeholder, {
        type: 'tag',
        content: match
      });
      return placeholder;
    });

    // 处理HTML实体
    const entityRegex = /&[a-zA-Z0-9#]+;/g;
    html = html.replace(entityRegex, (match) => {
      const placeholder = `\${${counter++}}`;
      preservedElements.set(placeholder, {
        type: 'entity',
        content: match
      });
      return placeholder;
    });

    // 处理emoji表情符号
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2B00}-\u{2BFF}]|[\u{2900}-\u{297F}]|[\u{2190}-\u{21FF}]|[\u{2300}-\u{23FF}]|[\u{2460}-\u{24FF}]|[\u{25A0}-\u{25FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{2900}-\u{297F}]|[\u{2B00}-\u{2BFF}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu;
    html = html.replace(emojiRegex, (match) => {
      const placeholder = `\${${counter++}}`;
      preservedElements.set(placeholder, {
        type: 'emoji',
        content: match
      });
      return placeholder;
    });


    // 检查是否有可翻译的内容
    const textContent = html.replace(/\${\d+}/g, ' ').trim();
    hasTranslatableContent = Boolean(textContent.length > 0 && shouldTranslateText(textContent));

    // clonedNode.innerHTML = html;

    return { textToTranslate: html, preservedElements, hasTranslatableContent };
  } catch (error) {
    console.error('处理HTML内容时出错:', error);
    throw error;
  }
}

function restorePreservedElements(translatedHtml: string, preservedElements: Map<string, PreservedContent>): string {
  try {
    if (!translatedHtml) {
      console.warn('翻译内容为空');
      return '';
    }

    let restoredHtml = translatedHtml;

    // 获取所有占位符并按索引排序
    const placeholders = Array.from(preservedElements.keys())
      .sort((a, b) => {
        const numA = parseInt(a.match(/\$\{(\d+)\}/)?.[1] || '0');
        const numB = parseInt(b.match(/\$\{(\d+)\}/)?.[1] || '0');
        return numA - numB;
      });

    if (placeholders.length === 0) {
      return translatedHtml;
    }

    // 处理HTML实体转义
    restoredHtml = restoredHtml.replace(/&lt;\$\{(\d+)\}&gt;/g, '${$1}');

    // 按顺序还原所有占位符
    for (const placeholder of placeholders) {
      const preserved = preservedElements.get(placeholder);
      if (preserved) {
        const { content } = preserved;
        // 使用正则表达式匹配完整的占位符，包括可能的HTML实体形式
        const regex = new RegExp(`${escapeRegExp(placeholder)}|&lt;\\$\\{${placeholder.slice(2, -1)}\\}&gt;`, 'g');
        restoredHtml = restoredHtml.replace(regex, content);
      }
    }

    return restoredHtml;
  } catch (error) {
    console.error('还原HTML内容时出错:', error);
    console.error('原始HTML:', translatedHtml);
    console.error('保留的元素:', Array.from(preservedElements.entries()));
    return translatedHtml;
  }
}

// 添加 HTML 转义函数
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 创建复制按钮
function createCopyButton(
  code: HTMLElement | null,
  language: string | undefined
) {
  const languageNames: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    csharp: 'C#',
    php: 'PHP',
    ruby: 'Ruby',
    go: 'Go',
    rust: 'Rust',
    swift: 'Swift',
    kotlin: 'Kotlin',
    scala: 'Scala',
    html: 'HTML',
    css: 'CSS',
    xml: 'XML',
    json: 'JSON',
    yaml: 'YAML',
    markdown: 'Markdown',
    bash: 'Bash',
    shell: 'Shell',
    sql: 'SQL',
    dockerfile: 'Dockerfile',
    nginx: 'Nginx',
  };

  const displayLanguage = language
    ? languageNames[language] || language
    : '文本';
  const copyButton = document.createElement('button');
  copyButton.className = 'copy-button';
  copyButton.textContent = `复制 ${displayLanguage}`;

  copyButton.addEventListener('click', () =>
    handleCopyClick(copyButton, code, displayLanguage)
  );

  return copyButton;
}

// 修改复制处理函数
async function handleCopyClick(
  button: HTMLButtonElement,
  code: HTMLElement | null,
  displayLanguage: string
) {
  const text = code?.textContent || '';

  try {
    await navigator.clipboard.writeText(text);
    updateCopyButtonState(button, displayLanguage);
  } catch (err) {
    // 如果 Clipboard API 失败，显示错误状态
    console.error('复制失败:', err);
    button.textContent = '复制失败';
    button.classList.add('copy-failed');
    setTimeout(() => {
      button.textContent = `复制 ${displayLanguage}`;
      button.classList.remove('copy-failed');
    }, 2000);
  }
}

// 更新复制按钮状态
function updateCopyButtonState(
  button: HTMLButtonElement,
  displayLanguage: string
) {
  button.textContent = '已复制';
  button.classList.add('copied');
  setTimeout(() => {
    button.textContent = `复制 ${displayLanguage}`;
    button.classList.remove('copied');
  }, 2000);
}

// 修改 applyCodeHighlighting 函数
function applyCodeHighlighting(container: Element) {
  // 处理  pre 元素
  container.querySelectorAll('pre').forEach((pre) => {
    let code = pre.querySelector('code');

    // 如果 pre 下没有 code 标签，创建一个
    if (!code) {
      code = document.createElement('code');

      // 处理 pre 中的内容，保留换行
      const content = getFormattedContent(pre);
      code.textContent = content;
      pre.innerHTML = '';
      pre.appendChild(code);
    }

    // 检测语言并应用高亮
    let detectedLang = 'plaintext';
    const languageClass = Array.from(code.classList).find(className => className.startsWith('language-'));
    if (languageClass) {
      detectedLang = languageClass.replace('language-', '');
    } else {
      detectedLang = detectCodeLanguage(code.textContent || '') || 'plaintext';
      code.classList.add(`language-${detectedLang}`);
    }

    try {
      // 应用代码高亮
      delete code.dataset.highlighted;
      hljs.highlightElement(code);

      // 添加复制按钮
      const copyButton = createCopyButton(code, detectedLang);

      // 检查是否已经有复制按钮
      const existingButton = pre.querySelector('.copy-button');
      if (!existingButton) {
        pre.appendChild(copyButton);
      }
    } catch (e) {
      console.warn('代码高亮失败:', e);
    }
  });
}

// 重构 getFormattedContent 函数
function getFormattedContent(element: Element): string {
  // 将 HTML 内容转换为字符串，保留 <br> 标签
  let html = element.innerHTML;

  // 1. 先将所有 <br> 和 <br/> 替换为特殊标记
  html = html.replace(/<br\s*\/?>/gi, '§BR§');

  // 2. 移除所有其他 HTML 标签，但保留它们的内容
  html = html.replace(/<[^>]+>/g, '');

  // 3. 将特殊标记转换回换行符
  html = html.replace(/§BR§/g, '\n');

  // 4. 处理连续的换行符和空白
  return html
    .replace(/\n{3,}/g, '\n\n') // 将3个或更多换行符替换为2个
    .replace(/^\s+|\s+$/g, ''); // 只移除首尾空白
}

// 添加辅助函数来判断是否为块级元素
function isBlockElement(element: Element): boolean {
  const display = window.getComputedStyle(element).display;
  return (
    display.includes('block') ||
    display.includes('flex') ||
    display.includes('grid') ||
    element.tagName.toLowerCase() === 'div' || // 常见块级元素
    element.tagName.toLowerCase() === 'p' ||
    element.tagName.toLowerCase() === 'pre' ||
    /^h[1-6]$/.test(element.tagName.toLowerCase())
  );
}

// 修改 detectCodeLanguage 函数
function detectCodeLanguage(code: string): string {
  // 检查是否包含 markdown 代码块标记
  const markdownMatch = code.match(/^```(\w+)/);
  if (markdownMatch && markdownMatch[1]) {
    return markdownMatch[1].toLowerCase();
  }

  // 定义更精确的语言特征模式
  const languagePatterns = {
    typescript: {
      pattern:
        /(?:^|\n)(?:import\s+(?:type\s+)?{\s*[\w\s,]+}\s+from|export\s+(?:default\s+)?(?:interface|type|class)|interface\s+\w+(?:\s+extends|\s+implements)?|type\s+\w+\s*=|const\s+\w+:\s*(?:string|number|boolean|any)|class\s+\w+<[^>]+>)/m,
      name: 'typescript',
    },
    javascript: {
      pattern:
        /(?:^|\n)(?:import\s+(?:{\s*[\w\s,]+}\s+from|.*\s+from)\s+['"]|export\s+(?:default\s+)?(?:function|class|const)|const\s+\w+\s*=\s*(?:require\(|async\s+|function|{)|module\.exports\s*=|async\s+function|Promise\s*\()/m,
      name: 'javascript',
    },
    python: {
      pattern:
        /(?:^|\n)(?:import\s+(?:[\w\s,]+|\{[\w\s,]+\}\s+from)|from\s+[\w.]+\s+import|def\s+\w+\s*\(|class\s+\w+(?:\(.*\))?:|@\w+|if\s+__name__\s*==\s*['"]__main__['"]:)/,
      name: 'python',
    },
    java: {
      pattern:
        /(?:^|\n)(?:package\s+[\w.]+;|import\s+[\w.]+(?:\s*\*)?;|public\s+(?:class|interface|enum)\s+\w+(?:\s+extends|\s+implements)?|@Override|private\s+(?:static\s+)?(?:final\s+)?(?:void|String|int|boolean))/m,
      name: 'java',
    },
    cpp: {
      pattern:
        /(?:^|\n)(?:#include\s*[<"][\w.]+[>"']|namespace\s+\w+|template\s*<[\w\s,]+>|class\s+\w+\s*(?::\s*(?:public|private|protected)\s+\w+)?|std::\w+|void\s+\w+\s*\(|int\s+main\s*\()/m,
      name: 'cpp',
    },
    csharp: {
      pattern:
        /(?:^|\n)(?:using\s+[\w.]+;|namespace\s+[\w.]+|public\s+(?:class|interface|enum|struct)\s+\w+(?:\s*:\s*\w+)?|private\s+(?:readonly\s+)?(?:string|int|bool|void)|protected\s+override|async\s+Task)/m,
      name: 'csharp',
    },
    php: {
      pattern:
        /(?:^|\n)(?:<\?php|namespace\s+[\w\\]+;|use\s+[\w\\]+(?:\s+as\s+\w+)?;|\$\w+\s*=|public\s+function|private\s+\$\w+|protected\s+static|class\s+\w+\s+extends)/m,
      name: 'php',
    },
    ruby: {
      pattern:
        /(?:^|\n)(?:require\s+['"][\w\/]+['"]|class\s+\w+\s*(?:<\s*\w+)?|def\s+\w+|attr_(?:accessor|reader|writer)|module\s+\w+|gem\s+['"][\w-]+['"]|\w+\s*=\s*Class\.new)/m,
      name: 'ruby',
    },
    go: {
      pattern:
        /(?:^|\n)(?:package\s+\w+|import\s+(?:\([\s\S]*?\)|["'][\w./]+["'])|func\s+\w+\s*\(|type\s+\w+\s+(?:struct|interface)|var\s+\w+\s+[\w*]+|const\s+\w+\s*=)/m,
      name: 'go',
    },
    rust: {
      pattern:
        /(?:^|\n)(?:use\s+(?:std|[\w:]+);|fn\s+\w+\s*(?:<[^>]+>)?\s*\(|pub\s+(?:struct|enum|trait|fn)|impl\s+(?:<[^>]+>\s+)?\w+|let\s+mut\s+\w+:|match\s+\w+\s*{)/m,
      name: 'rust',
    },
    sql: {
      pattern:
        /(?:^|\n)(?:SELECT\s+(?:\*|\w+(?:\s*,\s*\w+)*)\s+FROM|INSERT\s+INTO\s+\w+|UPDATE\s+\w+\s+SET|DELETE\s+FROM\s+\w+|CREATE\s+(?:TABLE|DATABASE|INDEX)|ALTER\s+TABLE|DROP\s+(?:TABLE|DATABASE))/i,
      name: 'sql',
    },
    html: {
      pattern:
        /(?:^|\n)(?:<!DOCTYPE\s+html|<html[\s>]|<head>|<body[\s>]|<script[\s>]|<style[\s>]|<link\s+rel=["']stylesheet["']|<meta\s+charset=|<div\s+class=|<\/(?:div|span|p|html|body|head)>)/i,
      name: 'html',
    },
    xml: {
      pattern:
        /(?:^|\n)(?:<\?xml\s+version=|<!DOCTYPE\s+\w+|<\w+:\w+|xmlns(?::\w+)?=["'][\w:\/.-]+["']|<\/?\w+(?:\s+\w+=['"][^'"]*["'])*\s*\/?>)/,
      name: 'xml',
    },
    yaml: {
      pattern:
        /(?:^|\n)(?:[\w-]+:\s*(?:\w+|~|\[]|\{[^\}]*\})|^\s*-\s+[\w-]+:|\s+\w+:\s*[|>]|\w+:\s*&\w+|.*\s*\*\w+|apiVersion:|kind:|metadata:)/m,
      name: 'yaml',
    },
    json: {
      pattern:
        /(?:^|\n)\s*(?:{\s*"[\w-]+"\s*:|[\[{]\s*(?:"[\w-]+"\s*:|[\d"{[])|^\s*"[\w-]+"\s*:\s*(?:"[^"]*"|[\d\[{])|^\s*\[\s*(?:{|"|\d|\[))/m,
      name: 'json',
    },
    dockerfile: {
      pattern:
        /(?:^|\n)(?:FROM\s+\w+(?::\w+)?|MAINTAINER\s+\w+|RUN\s+(?:apt-get|yum|apk)|CMD\s+\[?[\w\s"]+\]?|ENTRYPOINT\s+\[?[\w\s"]+\]?|WORKDIR\s+\/\w+|ENV\s+\w+=|EXPOSE\s+\d+|VOLUME\s+\[?"\/\w+"?\]?|COPY\s+\w+|ADD\s+\w+)/m,
      name: 'dockerfile',
    },
    nginx: {
      pattern:
        /(?:^|\n)(?:events\s*{|http\s*{|server\s*{|location\s+(?:\/|\~|\^)\s*{|proxy_pass\s+http:\/\/|upstream\s+\w+\s*{|listen\s+\d+;|root\s+\/\w+;|index\s+\w+.html;)/m,
      name: 'nginx',
    },
    markdown: {
      pattern:
        /(?:^|\n)(?:#{1,6}\s+\w+|\*\s+[\w\s]+|\[.+\]\(.+\)|>\s+[\w\s]+|(?:-|\*|\+|\d+\.)\s+[\w\s]+|(?:_|\*){1,2}[\w\s]+(?:_|\*){1,2}|`{1,3}[\w\s]+`{1,3})/m,
      name: 'markdown',
    },
    css: {
      pattern:
        /(?:^|\n)(?:@(?:media|keyframes|import|charset|font-face|supports)|[.#][\w-]+\s*{|(?:margin|padding|border|background|color|font|text|display|position|width|height|top|left|right|bottom|flex|grid):\s*[\w-]+|@\w+\s+[\w-]+|}\s*(?:\.[#\w-]+\s*{)?)/m,
      name: 'css',
    },
    bash: {
      pattern: /(?:^#!\/bin\/bash|^\s*\w+=|\$\{?\w+\}?|echo\s+|if\s+\[\[)/m,
      name: 'bash',
    },
  } as const;

  // 计每种语言匹配分数
  const scores = Object.entries(languagePatterns).map(
    ([_, { pattern, name }]) => {
      const matches = (code.match(pattern) || []).length;
      return { name, score: matches };
    }
  );

  // 按分数排序并选择最高分的语言
  const bestMatch = scores.sort((a, b) => b.score - a.score)[0];

  // 如果最高分大于0，返回对应的语言
  if (bestMatch.score > 0) {
    return bestMatch.name;
  }

  // 如果没有匹配到任何语言特征，尝试使用 hljs 的自动检测
  try {
    const result = hljs.highlightAuto(code, Object.keys(languagePatterns));
    if (result.language) {
      return result.language;
    }
  } catch (e) {
    console.warn('自动语检测失败:', e);
  }

  return 'plaintext';
}

// 原来在 onMounted 中的逻辑提取为独立函数
async function processArticle() {
  try {
    isLoading.value = true;
    translationCounter.value = 0;
    clearPopover();

    ollama.abort();

    isTranslatedTitle.value = false;
    translatedTitle.value = '';
    isTranslatedExcerpt.value = false;
    translatedExcerpt.value = '';

    let processedHtml = props.html;

    // 处理所有相对路径
    processedHtml = processHtmlUrls(processedHtml, props.url);

    const parser = new DOMParser();
    const doc = parser.parseFromString(processedHtml, 'text/html');

    // 除悬钮
    const floatingButton = doc.querySelector('#side-door-floating-button');
    if (floatingButton) {
      floatingButton.remove();
    }
    const popupContainer = doc.querySelector('#side-door-popup-container');
    if (popupContainer) {
      popupContainer.remove();
    }

    if (processExportedHtml(doc)) {
      return;
    }

    if (processReadability(doc)) {
      return;
    }

    if (processFile(doc)) {
      return;
    }

  } catch (error) {
    console.error('处理文章时出错:', error);
  } finally {
    isLoading.value = false;
    // 添加获取焦点的逻辑
    nextTick(() => {
      const readerContainer = document.querySelector('.reader-container') as HTMLElement;
      if (readerContainer) {
        readerContainer.focus();
        // 滚动到顶部
        // readerContainer.scrollTop = 0;
      }
    });
  }
}

function processExportedHtml(doc: Document): Boolean {
  if (!doc.querySelector('meta[name="side-door"]')) {
    return false;
  }

  title.value = doc.querySelector('.article-title-value')?.textContent || '--';
  excerpt.value = doc.querySelector('.article-excerpt-value')?.textContent || '--';
  publishedTime.value = doc.querySelector('.article-publishedtime-value')?.textContent || '--';
  length.value = doc.querySelector('.article-length-value')?.textContent || '--';
  byline.value = doc.querySelector('.article-byline-value')?.textContent || '--';
  dir.value = doc.querySelector('.article-dir-value')?.textContent || '--';
  siteName.value = doc.querySelector('.article-sitename-value')?.textContent || '--';
  lang.value = doc.querySelector('.article-lang-value')?.textContent || '--';

  isTranslatedTitle.value = doc.querySelector('.article-title:has(.translated)') ? true : false;
  isTranslatedExcerpt.value = doc.querySelector('.article-excerpt:has(.translated)') ? true : false;

  translatedTitle.value = doc.querySelector('.article-title-translation')?.textContent || '';
  translatedExcerpt.value = doc.querySelector('.article-excerpt-translation')?.textContent || '';

  summary.value = doc.querySelector('.summary-content')?.innerHTML || '';

  content.value = doc.querySelector('.article-content') as HTMLElement;

  isSummaryGenerated.value = summary.value !== '';
  processSummaryAndTranslation(content.value.textContent || '');
  renderContentElement(content.value);

  return true;
}

function processReadability(doc: Document): Boolean {
  // 使用 Readability 解析文档
  const reader = new Readability(doc, {
    keepClasses: true,
    serializer: (element) => element,
  });
  const article = reader.parse();

  if (!article) {
    return false;
  }


  // 检查是否需要自动关闭弹窗
  if ((article.length || 0) < 50) {
    // 使用 postMessage 发送消息到父窗口
    window.parent.postMessage(
      {
        type: 'closeReader',
        message: '文章内容太短,不显示阅读器',
      },
      '*'
    );
  }

  // 1. 设置基本信息和元数据
  title.value = article.title || '--';
  excerpt.value = article.excerpt || '--';

  // 新数
  if (article.publishedTime) {
    publishedTime.value = formatDate(article.publishedTime);
  } else {
    // 如果没有 publishedTime，尝试从 contentText 中提取
    const datesFromContent = extractDates(article.textContent || '', 1);
    if (datesFromContent.length > 0) {
      publishedTime.value = formatDate(datesFromContent[0]);
    } else {
      // 如果 contentText 没有日期从 HTML 中提取并选择最近的日期
      const datesFromHtml = extractDates(props.html, 3);
      if (datesFromHtml.length > 0) {
        // 将所有日期转换为时间戳并选择最近的日期
        const mostRecentDate = datesFromHtml
          .map((date) => new Date(date).getTime())
          .reduce((latest, current) => Math.max(latest, current));
        publishedTime.value = formatDate(
          new Date(mostRecentDate).toISOString()
        );
      } else {
        publishedTime.value = '--';
      }
    }
  }

  length.value = article.length?.toString() || '--';
  byline.value = article.byline || '--';
  dir.value = article.dir || '--';
  siteName.value =
    article.siteName || getSiteNameFromUrl(props.url) || '--';
  lang.value = article.lang || '--';
  if (lang.value !== 'zh-CN') {
    const l = franc(article.textContent || '');
    if (['cmn', 'chi'].includes(l)) {
      lang.value = 'zh-CN';
    }
  }

  processSummaryAndTranslation(article.textContent || '');

  content.value = article.content as HTMLElement;
  renderContentElement(content.value);

  return true;
}

function processSummaryAndTranslation(content: string) {
  // 2. 并发处理摘要生成和标题、摘要翻译
  if (enableSummary.value) {
    Promise.all([
      isSummaryGenerated.value ? Promise.resolve() : generateSummary(content),
      handleTitleTranslation(),
      handleExcerptTranslation(),
    ]).catch((error) => {
      console.error('处理摘要或翻译时出错:', error);
    });
  } else {
    const summaryElement = document.querySelector('.summary') as HTMLElement;
    if (summaryElement) {
      summaryElement.style.display = 'none';
    }
    Promise.all([
      handleTitleTranslation(),
      handleExcerptTranslation(),
    ]).catch((error) => {
      console.error('处理翻译时出错:', error);
    });
  }
}

function renderContentElement(contentElement?: HTMLElement) {
  if (!contentElement) { return }
  const contentContainer = document.querySelector('.article-content');
  if (!contentContainer) { return }

  processParagraphs(document.querySelector('.article-info') as HTMLElement);
  // 处理开始标签
  handleEditedParagraph(document.querySelector('.summary-content')?.closest('.paragraph') as HTMLElement);
  processParagraphs(contentElement);
  updateEditedParagraphs();

  // 4. 应用代码高亮
  applyCodeHighlighting(contentElement);

  // 5. 异步处理内容翻译
  translateContent(contentElement).catch((error) => {
    console.error('翻译内容时出错:', error);
  });

  // 6. 处理图片
  ensureAllImagesBase64(contentElement).catch((error) => {
    console.error('处理图片时出错:', error);
  });

  // 调用函数处理canvas元素
  processOriginCanvasElements(contentElement).catch((error) => {
    console.error('处理canvas元素时出错:', error);
  });

  contentContainer.innerHTML = '';
  contentContainer.appendChild(contentElement);
}

function processFile(doc: Document): Boolean {
  // 如果article为空，寻找doc里面的第一个image或者embed对象
  const firstImage = doc.querySelector('img');
  const firstEmbed = doc.querySelector('embed');

  if (!firstImage && !firstEmbed) {
    return false;
  }

  title.value = decodeURIComponent(props.url.split('/').pop() || '--');

  const contentContainer = document.querySelector('.article-content') as HTMLElement;
  if (!contentContainer) { return true }

  if (firstImage) {
    contentContainer.innerHTML = '';
    contentContainer.appendChild(firstImage.cloneNode(true));

    // summary.value = decodeURIComponent(
    //   firstImage.getAttribute('src')?.split('/').pop() || '未知图片'
    // );

    ensureAllImagesBase64(contentContainer).then(() => {
      generateImageSummary();
    });

  } else if (firstEmbed) {
    const embedSrc = firstEmbed.getAttribute('src');

    // 检查是否为PDF文档
    if (
      embedSrc === 'about:blank' ||
      embedSrc?.toLowerCase().endsWith('.pdf')
    ) {
      // 创建PDF容器
      const pdfContainer = document.createElement('div');
      pdfContainer.className = 'pdf-container';
      contentContainer.innerHTML = '';
      contentContainer.appendChild(pdfContainer);

      // 渲染PDF
      const pdfUrl = embedSrc === 'about:blank' ? props.url : embedSrc;
      renderPDF(pdfUrl, pdfContainer).then(() => {
        // 为PDF容器中的canvas元素设置顺序递增的id
        const canvasElements =
          pdfContainer.getElementsByTagName('canvas');
        Array.from(canvasElements).forEach((canvas, index) => {
          canvas.id = `side_pdf_${index + 1}`;
        });

        // 从URL中提取PDF文件名
        const fileName = decodeURIComponent(
          pdfUrl.split('/').pop() || 'unknown.pdf'
        );
        summary.value = `${fileName}`;
      }).catch((error) => {
        console.error('PDF渲染失败:', error);
        contentContainer.innerHTML = '无法加载PDF文档';
        summary.value = '无法加载PDF文档';
      });

    } else {
      contentContainer.innerHTML = '';
      contentContainer.appendChild(firstEmbed.cloneNode(true));
      summary.value = decodeURIComponent(
        firstEmbed.getAttribute('src')?.split('/').pop() || '未知嵌入对象'
      );
    }
  } else {
    contentContainer.innerHTML = '未找到有效内容';

    summary.value = '--';
  }

  return true;
}

// 修改 watch 监听 refreshKey，只在显式刷新时更新内容
watch(
  () => props.refreshKey,
  (newKey, oldKey) => {
    // 只有当 refreshKey 真正变化时才刷新（排除初始化时的 undefined）
    if (newKey !== undefined && newKey !== oldKey && props.html) {
      processArticle();
    }
  }
);

function clearPopover() {
  // 清理所有可能存在的popover弹窗
  closePopover(); // 关闭链接预览popover

  // 关闭所有段落popover
  const activeHoverBars = document.querySelectorAll('.paragraph-hover-bar.active');
  activeHoverBars.forEach(bar => {
    closeParagraphPopover(bar as HTMLElement);
  });

  // 关闭设置popover
  closeSettingsPopover();
}

// 添加一个获取格式化时间的辅助函数
function getFormattedDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
}

// 添加新的响应式变量
const isExportingPDF = ref(false);
const isSavingToReadLater = ref(false);

// 稍后阅读列表相关状态
const showReadLaterList = ref(false);
const selectedArticleId = ref<string | null>(null);

// 添加一个辅助函数来检查是否为 base64 图片
function isBase64Image(src: string): boolean {
  return src.startsWith('data:image');
}

async function processImage(src: string, img: HTMLImageElement): Promise<string | null> {
  try {
    // 获取当前网站域名
    const currentDomain = new URL(src).hostname;

    // 检查域名是否在过滤列表中
    const filteredDomains = JSON.parse(
      localStorage.getItem('filteredDomains') || '[]'
    ) as string[];
    const useProxy = filteredDomains.includes(currentDomain);

    // 如果图片已完全加载，直接尝试转换
    if (img.complete && img.naturalWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          return canvas.toDataURL();
        } catch (e) {
          // console.warn('直接转换图失败:', e);
        }
      }
    }

    // 使用代理服务或跨域方式加载
    return new Promise<string | null>(async (resolve) => {
      const loadImage = async (url: string) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const newImg = new Image();
          newImg.crossOrigin = 'anonymous';
          newImg.onload = () => resolve(newImg);
          newImg.onerror = reject;
          newImg.src = url;
        });
      };

      try {
        let imageUrl = src;
        if (useProxy) {
          // 使用代理服务下载图片
          const proxyUrl = `http://localhost:3001/proxy?url=${encodeURIComponent(
            src
          )}`;
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error('代理服务下载图片失败');
          const blob = await response.blob();
          imageUrl = URL.createObjectURL(blob);
        }

        const loadedImg = await loadImage(imageUrl);
        const canvas = document.createElement('canvas');
        canvas.width = loadedImg.naturalWidth;
        canvas.height = loadedImg.naturalHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(loadedImg, 0, 0);
          resolve(canvas.toDataURL());
        } else {
          resolve(null);
        }
      } catch (e) {
        // console.warn('加载图片失败:', e);
        if (useProxy) {
          // 如果代理服务失败，尝试直接跨域访问
          try {
            const loadedImg = await loadImage(src);
            const canvas = document.createElement('canvas');
            canvas.width = loadedImg.naturalWidth;
            canvas.height = loadedImg.naturalHeight;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              ctx.drawImage(loadedImg, 0, 0);
              resolve(canvas.toDataURL());
            } else {
              resolve(null);
            }
          } catch (directError) {
            // console.warn('直接跨域访问也失败:', directError);
            resolve(null);
          }
        } else {
          // 如果不是使用代理服务，则将当前域名添加到过滤列表
          filteredDomains.push(currentDomain);
          localStorage.setItem(
            'filteredDomains',
            JSON.stringify(filteredDomains)
          );
          resolve(null);
        }
      }
    });
  } catch (error) {
    console.warn('处理图片失败:', src, error);
    return null;
  }
}

// 简化 ensureAllImagesBase64 函数
async function ensureAllImagesBase64(container: HTMLElement): Promise<void> {
  const images = Array.from(container.getElementsByTagName('img')).filter(
    (img) => !isBase64Image(img.src)
  );

  if (images.length === 0) return;

  // 获取父窗口的滚动位置
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const [scrollResult] = await browser.scripting.executeScript({
    target: { tabId: tab.id! },
    func: () => {
      return {
        x: window.scrollX,
        y: window.scrollY,
      };
    },
  });
  const scrollPosition = scrollResult.result;

  const loadingTip = document.createElement('div');
  loadingTip.className = 'loading-tip';
  loadingTip.textContent = `正在处理图片 (0/${images.length})...`;
  loadingTip.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    z-index: 10000;
  `;
  document.body.appendChild(loadingTip);

  try {
    let processed = 0;
    const updateLoadingTip = () => {
      processed++;
      loadingTip.textContent = `正在处理图片 (${processed}/${images.length})...`;
    };

    await Promise.allSettled(
      images.map(async (img) => {
        try {
          const base64 = await processImage(img.src, img);
          if (base64 && base64 !== img.src) {
            img.src = base64;
          }
        } catch (error) {
          // console.warn('处理图片失败:', img.src, error);
        } finally {
          updateLoadingTip();
        }
      })
    );
  } finally {
    loadingTip.remove();
    // 恢复父窗口滚动位置
    await browser.scripting.executeScript({
      target: { tabId: tab.id! },
      func: (pos: { x: number; y: number }) => {
        window.scrollTo({
          left: pos.x,
          top: pos.y,
          behavior: 'auto',
        });
      },
      args: [scrollPosition],
    });
  }
}

// 处理canvas元素的函数
async function processOriginCanvasElements(container: HTMLElement) {
  const canvasElements = container.getElementsByTagName('canvas');
  if (canvasElements.length === 0) return;

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) {
    throw new Error('无法获取当前标签页');
  }

  await Promise.all(
    Array.from(canvasElements).map(async (canvas) => {
      const img = document.createElement('img');
      if (canvas.id) {
        // 从原始页面获取canvas数据
        const [result] = await browser.scripting.executeScript({
          target: { tabId: tab.id! },
          func: (canvasId: string) => {
            const originCanvas = document.getElementById(
              canvasId
            ) as HTMLCanvasElement;
            return originCanvas ? originCanvas.toDataURL('image/png') : null;
          },
          args: [canvas.id],
        });

        if (result.result && typeof result.result === 'string') {
          img.src = result.result;
          canvas.parentNode?.replaceChild(img, canvas);
        }
      } else {
        // 没有id的canvas直接转换
        img.src = (canvas as HTMLCanvasElement).toDataURL('image/png');
        canvas.parentNode?.replaceChild(img, canvas);
      }
    })
  );
}

// 修改处理 canvas 元素的函数
async function processCanvasElements(container: HTMLElement) {
  const canvases = container.getElementsByTagName('canvas');
  await Promise.all(
    Array.from(canvases).map(async (canvas) => {
      const img = document.createElement('img');
      img.src = (canvas as HTMLCanvasElement).toDataURL('image/png');
      canvas.parentNode?.replaceChild(img, canvas);
    })
  );
}

// 修改 exportToPDF 函数
async function exportToPDF() {
  if (isExportingPDF.value) return;

  try {
    isExportingPDF.value = true;
    const readerContainer = document.querySelector(
      '.reader-container'
    ) as HTMLElement;
    if (!readerContainer) {
      throw new Error('找不到要导出的内容');
    }

    // 确保所有图片都转换为 base64
    await ensureAllImagesBase64(readerContainer);

    // 克隆容器以避免修改原始DOM
    const clonedContainer = readerContainer.cloneNode(true) as HTMLElement;
    // 将克隆容器的背景色设置为透明

    // 处理 canvas 元素
    await processCanvasElements(clonedContainer);

    // 生成文件
    const timestamp = getFormattedDateTime();
    const articleTitle = title.value || '未命名';
    const safeTitle = articleTitle.replace(/[\s\\/:*?"<>|]/g, '_');
    const fileName = `[旁门简读]_${safeTitle}_${timestamp}.pdf`;

    // 获取当前主题的背景和文本颜色
    const isDarkTheme = currentTheme.value === 'dark';
    const backgroundColor = isDarkTheme ? '#1a1a1a' : '#ffffff';
    const textColor = isDarkTheme ? '#ffffff' : '#000000';

    // 优化的配置
    const opt = {
      padding: 10,
      filename: fileName,
      image: {
        type: 'jpeg',
        quality: 1,
      },
      html2canvas: {
        scale: 1.5,
        useCORS: true,
        logging: true,
        allowTaint: true,
        backgroundColor: backgroundColor,
        removeContainer: false,
        letterRendering: true,
        imageTimeout: 0,
        async onclone(clonedDoc: Document) {
          const container = clonedDoc.querySelector('.reader-container');
          if (container instanceof HTMLElement) {
            // 基本样式设置
            container.style.width = '100%';
            container.style.height = 'auto';
            container.style.position = 'relative';
            container.style.padding = '20px';
            container.style.margin = '0';
            container.style.backgroundColor = backgroundColor;
            container.style.color = textColor;

            // 文本渲染优化
            container.style.setProperty(
              '-webkit-font-smoothing',
              'antialiased'
            );
            container.style.setProperty('-moz-osx-font-smoothing', 'grayscale');
            container.style.fontFamily =
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
            container.style.fontSize = '14px';
            container.style.lineHeight = '1.6';

            // 优化图片大小和质量
            const images = container.getElementsByTagName('img');
            Array.from(images).forEach((img) => {
              // 限制图片最大尺寸
              const maxWidth = 1200;
              if (img.naturalWidth > maxWidth) {
                const ratio = maxWidth / img.naturalWidth;
                img.width = maxWidth;
                img.height = img.naturalHeight * ratio;
              }

              img.style.maxWidth = '100%';
              img.style.height = 'auto';
              img.style.margin = '10px auto';
              img.style.display = 'block';

              // 移除可能的高分辨率源
              img.removeAttribute('srcset');
              img.removeAttribute('sizes');
            });

            // 优化代码显示
            const codeBlocks = container.querySelectorAll('pre code');
            codeBlocks.forEach((block) => {
              if (block instanceof HTMLElement) {
                block.style.fontFamily = 'Consolas, monospace';
                block.style.fontSize = '12px';
                block.style.padding = '8px';
                block.style.backgroundColor = isDarkTheme ? '#2d2d2d' : '#f5f5f5';
                block.style.color = isDarkTheme ? '#e6e6e6' : '#333333';
                block.style.border = isDarkTheme ? '1px solid #404040' : '1px solid #ddd';
                block.style.borderRadius = '4px';
                // 移除不必要语法高亮样式
                block.className = block.className.replace(/hljs-\w+/g, '');
              }
            });

            // 调整链接颜色
            const links = container.getElementsByTagName('a');
            Array.from(links).forEach((link) => {
              link.style.color = isDarkTheme ? '#66b1ff' : '#0366d6';
            });

            // 调整引用块样式
            const blockquotes = container.getElementsByTagName('blockquote');
            Array.from(blockquotes).forEach((blockquote) => {
              blockquote.style.borderLeft = isDarkTheme ? '4px solid #404040' : '4px solid #ddd';
              blockquote.style.padding = '0 1em';
              blockquote.style.color = isDarkTheme ? '#b3b3b3' : '#6a737d';
            });

            // 调整表格样式
            const tables = container.getElementsByTagName('table');
            Array.from(tables).forEach((table) => {
              table.style.borderCollapse = 'collapse';
              table.style.width = '100%';
              table.style.margin = '1em 0';

              const cells = table.querySelectorAll('th, td');
              cells.forEach((cell) => {
                if (cell instanceof HTMLElement) {
                  cell.style.border = isDarkTheme ? '1px solid #404040' : '1px solid #ddd';
                  cell.style.padding = '6px 13px';
                }
              });

              const headers = table.getElementsByTagName('th');
              Array.from(headers).forEach((header) => {
                header.style.backgroundColor = isDarkTheme ? '#2d2d2d' : '#f6f8fa';
              });
            });

            // 调整标题颜色
            const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach((heading) => {
              if (heading instanceof HTMLElement) {
                heading.style.color = textColor;
              }
            });

            // 调整翻译文本背景色
            const translatedTexts = container.querySelectorAll('.translated');
            translatedTexts.forEach((text) => {
              if (text instanceof HTMLElement) {
                text.style.backgroundColor = isDarkTheme ? 'rgba(255, 235, 59, 0.1)' : 'rgba(255, 235, 59, 0.3)';
              }
            });
          }
        },
      },
      jsPDF: {
        unit: 'pt',
        format: 'a4',
        orientation: 'portrait',
        compress: true,
        compressPdf: true,
        putOnlyUsedFonts: true,
        floatPrecision: 16,
        background: isDarkTheme ? '#1a1a1a' : '#ffffff', // 添加背景色设置
        optimization: {
          compress: true,
          maxResolution: 300,
        },
      },
      pagebreak: {
        mode: 'avoid-all',
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: ['img', 'pre', 'table', 'h1', 'h2', 'h3'],
      },
    };

    // 在 exportToPDF 函数中添加文件大小检查
    const checkFileSize = async (dataUrl: string): Promise<boolean> => {
      const base64 = dataUrl.split(',')[1];
      const bytes = atob(base64).length;
      const megabytes = bytes / (1024 * 1024);

      if (megabytes > 50) {
        // 如果文件大于 50MB
        const proceed = await new Promise<boolean>((resolve) => {
          const confirmation = confirm(
            `生成的 PDF 文件较大 (${megabytes.toFixed(1)}MB)，是否继续？\n` +
            '您可以尝试：\n' +
            '1. 减少文章中的图片数量\n' +
            '2. 导出为 HTML 格式代替'
          );
          resolve(confirmation);
        });
        return proceed;
      }
      return true;
    };

    // 创建临时容器
    const tempContainer = document.createElement('div');
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.appendChild(clonedContainer);
    document.body.appendChild(tempContainer);

    try {
      // 使用 Promise 包装 html2pdf 调用
      await new Promise((resolve, reject) => {
        html2pdf()
          .set(opt)
          .from(clonedContainer)
          .outputPdf('datauristring')
          .then(async (dataUrl: string) => {
            const shouldContinue = await checkFileSize(dataUrl);
            if (shouldContinue) {
              return html2pdf().set(opt).from(clonedContainer).save();
            } else {
              reject(new Error('用户取消了大文件导出'));
            }
          })
          .then(() => resolve(true))
          .catch(reject);
      });
    } finally {
      // 清理临时容器
      document.body.removeChild(tempContainer);
    }
  } catch (error) {
    console.error('PDF导出失败:', error);
  } finally {
    isExportingPDF.value = false;
  }
}

// 添加新响应式变量
const isExportingHTML = ref(false);

// 添加导出HTML的函数
import readerCss from './Reader.css?inline'

async function exportToHTML() {
  if (isExportingHTML.value) return;

  try {
    isExportingHTML.value = true;
    const readerContainer = document.querySelector(
      '.reader-container'
    ) as HTMLElement;
    if (!readerContainer) {
      throw new Error('找不到要导出的内容');
    }

    // 确保所有图片都转换为 base64
    await ensureAllImagesBase64(readerContainer);

    // 克隆容器并移除导出按钮
    const container = readerContainer.cloneNode(true) as HTMLElement;

    // 处理 canvas 元素
    await processCanvasElements(container);

    container.querySelector('.export-buttons')?.remove();
    // 删除所有未编辑的hover bar
    container.querySelectorAll('.paragraph-hover-bar:not(.edited)')?.forEach(el => el.remove());
    container.querySelectorAll('.paragraph-hover-bar .action-area')?.forEach(el => el.remove());
    container.querySelectorAll('.paragraph-hover-bar .arrow-container')?.forEach(el => el.remove());

    // 删除所有 .translating 节点
    container.querySelectorAll('.translating')?.forEach(el => el.remove());
    // 删除设置按钮
    container.querySelector('.settings-button')?.remove();

    // 处理修订段落，添加id和锚点链接
    const editedHoverBars = container.querySelectorAll('.paragraph-hover-bar.edited');
    editedHoverBars.forEach((bar, index) => {
      const nextIndex = (index + 1) % editedHoverBars.length;
      const currentId = `sidedoor_edit_${index}`;
      const nextId = `sidedoor_edit_${nextIndex}`;

      // 设置当前段落的id
      (bar as HTMLElement).id = currentId;

      // 创建包裹整个hoverBar的链接
      const wrapper = document.createElement('a');
      wrapper.href = `#${nextId}`;
      wrapper.title = '点击跳转至下一个修订段落';

      // 将hoverBar的内容移动到wrapper中
      const barClone = bar.cloneNode(true);
      wrapper.appendChild(barClone);

      // 替换原来的hoverBar
      bar.parentNode?.replaceChild(wrapper, bar);
    });

    // 生成完整的HTML文档
    const timestamp = getFormattedDateTime();
    const articleTitle = title.value || '未命名';
    const safeTitle = articleTitle.replace(/[\s\\/:*?"<>|]/g, '_');

    // 安全地生成 HTML 文档
    const html = `
<!DOCTYPE html>
<html data-theme="${currentTheme.value}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="side-door" content="true">
    <title>${escapeHtml(articleTitle)}</title>
    <style>
      ${readerCss}

      :root {
        --translated-bg-color: ${translatedBgColor.value};
        --origin-text-visible: ${showOriginalText.value ? 'initial' : 'none'};
        --font-scale: ${fontScale.value};
      }

      body {
        margin: 0;
        background: var(--background-color);
      }

      .paragraph:hover .paragraph-hover-bar {
        opacity: 0;
      }

      /* 额外的优化样式 */
      @media print {
        .export-btn { display: none; }
        .reader-container { height: auto !important; }
        img { max-width: 100% !important; page-break-inside: avoid; }
        pre, code { white-space: pre-wrap !important; }
        @page { margin: 2cm; }
      </style>
</head>
<body>
    ${container.outerHTML}
</body>
</html>`;

    // 创建下载链接并触发下载
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `[旁门简读]_${safeTitle}_${timestamp}.html`;

    // 修改这里:使click() 方法而不是添加到 DOM
    a.click();
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('HTML导出失败:', error);
  } finally {
    isExportingHTML.value = false;
  }
}

// 保存到稍后阅读
async function saveToReadLater() {
  if (isSavingToReadLater.value) return;

  try {
    isSavingToReadLater.value = true;

    // 1. 收集文章信息（包括 AI 摘要）
    const article: Article = {
      title: title.value || '无标题',
      url: props.url,
      author: byline.value !== '--' ? byline.value : undefined,
      published_date: publishedTime.value !== '--' ? publishedTime.value : undefined,
      length: length.value !== '--' ? parseInt(length.value) : undefined,
      language: dir.value !== '--' ? dir.value : undefined,
      summary: excerpt.value || undefined, // Readability 摘要
      ai_summary: summary.value || undefined, // AI 生成的摘要
      content: content.value?.innerHTML || '',
      content_text: content.value?.textContent || '',
    };

    // 2. 生成 HTML 文件
    let htmlBlob: Blob | undefined;
    try {
      const readerContainer = document.querySelector('.reader-container') as HTMLElement;
      if (readerContainer) {
        await ensureAllImagesBase64(readerContainer);
        const clonedContainer = readerContainer.cloneNode(true) as HTMLElement;
        await processCanvasElements(clonedContainer);

        // 移除不需要的元素
        const elementsToRemove = clonedContainer.querySelectorAll(
          '.settings-button, .read-later-button, .settings-popover, .paragraph-hover-bar, button'
        );
        elementsToRemove.forEach((el) => el.remove());

        const safeTitle = (title.value || '未命名文章').replace(/[<>:"/\\|?*]/g, '');
        const timestamp = new Date().toISOString().slice(0, 10);

        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <style>
      ${readerCss}

      :root {
        --translated-bg-color: ${translatedBgColor.value};
        --origin-text-visible: ${showOriginalText.value ? 'initial' : 'none'};
        --font-scale: ${fontScale.value};
      }

      body {
        margin: 0;
        background: var(--background-color);
      }

      .paragraph:hover .paragraph-hover-bar {
        opacity: 0;
      }

      @media print {
        .export-btn { display: none; }
        .reader-container { height: auto !important; }
        img { max-width: 100% !important; page-break-inside: avoid; }
        pre, code { white-space: pre-wrap !important; }
        @page { margin: 2cm; }
      }
    </style>
</head>
<body>
    ${clonedContainer.outerHTML}
</body>
</html>`;

        htmlBlob = new Blob([html], { type: 'text/html' });
      }
    } catch (error) {
      console.error('生成 HTML 失败:', error);
    }

    // 3. 生成 PDF 文件
    let pdfBlob: Blob | undefined;
    try {
      const readerContainer = document.querySelector('.reader-container') as HTMLElement;
      if (readerContainer && htmlBlob) {
        // 使用已生成的 HTML 来创建 PDF
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = 'position: absolute; left: -9999px; top: 0;';
        document.body.appendChild(tempContainer);

        const clonedContainer = readerContainer.cloneNode(true) as HTMLElement;
        await processCanvasElements(clonedContainer);

        // 移除不需要的元素
        const elementsToRemove = clonedContainer.querySelectorAll(
          '.settings-button, .read-later-button, .settings-popover, .paragraph-hover-bar, button'
        );
        elementsToRemove.forEach((el) => el.remove());

        tempContainer.appendChild(clonedContainer);

        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        const options = {
          margin: 10,
          filename: 'temp.pdf',
          image: { type: 'jpeg', quality: 0.85 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true,
            backgroundColor: isDarkTheme ? '#1a1a1a' : '#ffffff',
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true,
            compressPdf: true,
            putOnlyUsedFonts: true,
            floatPrecision: 16,
            background: isDarkTheme ? '#1a1a1a' : '#ffffff',
            optimization: { compress: true, maxResolution: 300 },
          },
          pagebreak: {
            mode: 'avoid-all',
            avoid: ['img', 'pre', 'table', 'h1', 'h2', 'h3'],
          },
        };

        const pdfDataUrl = await html2pdf().set(options).from(clonedContainer).outputPdf('dataurlstring');
        const base64 = pdfDataUrl.split(',')[1];
        const bytes = atob(base64);
        const arrayBuffer = new ArrayBuffer(bytes.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < bytes.length; i++) {
          uint8Array[i] = bytes.charCodeAt(i);
        }
        pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });

        document.body.removeChild(tempContainer);
      }
    } catch (error) {
      console.error('生成 PDF 失败:', error);
    }

    // 4. 保存到 Supabase（包含 HTML 和 PDF）
    const result = await ReadLaterService.saveArticle(article, htmlBlob, pdfBlob);

    if (result.success) {
      toast.success('已保存到稍后阅读！');
    } else {
      toast.error('保存失败: ' + (result.error || '未知错误'));
    }
  } catch (error) {
    console.error('保存到稍后阅读失败:', error);
    toast.error('保存失败: ' + (error as Error).message);
  } finally {
    isSavingToReadLater.value = false;
  }
}

// 切换稍后阅读列表显示
function toggleReadLaterList() {
  showReadLaterList.value = !showReadLaterList.value;
  selectedArticleId.value = null;
}

// 打开保存的文章
function openSavedArticle(article: Article) {
  selectedArticleId.value = article.id || null;
}

// 添加图片查看器相关的响应式变量
const showImageViewer = ref(false);
const currentPreviewIndex = ref<number | null>(null);

// 处理键盘事件
let lastEscTime = 0;
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showImageViewer.value) {
      showImageViewer.value = false;
    }

    clearPopover();

    const currentTime = new Date().getTime();
    if (currentTime - lastEscTime < 500) { // 800ms 内的双击
      window.parent.postMessage({ type: 'togglePopup' }, '*');
    }
    lastEscTime = currentTime;

  }

  if (!showImageViewer.value || quillEditor.value) return;

  e.preventDefault();
  e.stopPropagation();
}

// 修改处理函数
const handleImageClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (target.tagName === 'IMG') {
    const articleContent = document.querySelector('.article-content');
    if (!articleContent) return;

    const images = Array.from(articleContent.querySelectorAll('img'));
    const currentIndex = images.findIndex(
      (img) => (img as HTMLImageElement).src === (target as HTMLImageElement).src
    );

    if (currentIndex === -1) return;

    showImages({
      urls: images.map((img) => (img as HTMLImageElement).src),
      index: currentIndex,
      onSwitch: (index: number) => {
        currentPreviewIndex.value = index;
      },
      onClose: () => {
        currentPreviewIndex.value = null;
      },
      onShow: (isShow: boolean) => {
        showImageViewer.value = isShow;
      },
    });
  }
};

// 添加 watch 来监听索引变化
watch(currentPreviewIndex, (newIndex: number | null) => {
  if (newIndex === null) {
    // 清除所有高亮
    const images = document.querySelectorAll('.article-content img');
    images.forEach((img) => img.classList.remove('current-preview'));
    return;
  }

  const images = document.querySelectorAll('.article-content img');
  const targetImage = images[newIndex];
  if (targetImage) {
    // 清除其他高亮
    images.forEach((img) => img.classList.remove('current-preview'));
    // 添加当前高亮
    targetImage.classList.add('current-preview');
    // 滚动到目标图片
    targetImage.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
});

// 添加新的响应式变量
const currentPopover = ref<HTMLElement | null>(null);
const currentPopperInstance = ref<any>(null);

// 修改处理链接点击的函数
async function handleLinkClick(event: MouseEvent) {
  event.preventDefault();
  const target = event.target as HTMLElement;
  const link = target.closest('a');

  if (!link) return;
  const url = link.href;

  if (currentPopover.value) {
    closePopover();
  }

  // 创建 popover 元素
  const popover = document.createElement('div');
  popover.className = 'link-popover';
  popover.innerHTML = `
    <div class="popover-content">
      <a href="${url}" class="preview-link" target="_blank" rel="noopener noreferrer" title="访问链接：${url}">
        ${url}
      </a>
      <div class="preview-loading">加载中...</div>
      <div class="preview-container" style="display: none">
        <div class="preview-image" title="预览图片"></div>
        <div class="preview-title" title="访问链接：${url}"></div>
        <div class="preview-excerpt"></div>
      </div>
    </div>
    <div class="popover-arrow" data-popper-arrow></div>
  `;

  document.body.appendChild(popover);
  currentPopover.value = popover;

  // 创建 Popper 实例
  currentPopperInstance.value = createPopper(link, popover, {
    placement: 'top',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, 8],
        },
      },
      {
        name: 'arrow',
        options: {
          element: popover.querySelector('[data-popper-arrow]'),
          padding: 5,
        },
      },
      {
        name: 'preventOverflow',
        options: {
          boundary: document.body,
          padding: 8,
        },
      },
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['bottom', 'right', 'left'],
          padding: 8,
        },
      },
    ],
  });

  // 获取并解析内容
  try {
    const preview = await fetchAndParseArticle(url);
    preview.url = url;
    updatePopoverContent(popover, preview);
  } catch (error) {
    console.error('Failed to fetch article preview:', error);
    updatePopoverContent(popover, {
      title: link.textContent || url,
      excerpt: '无法加载预览内容',
      imageUrl: null,
      isLoading: false,
      url,
    });
  }
}

// 添加获取和解析文章的函数
async function fetchAndParseArticle(url: string): Promise<ArticlePreview> {
  try {
    // 使用代理服务来避免 CORS 问题
    const response = await fetch(url);
    const html = await response.text();

    // 创建一个临时的 DOM 来解析内容
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article) {
      throw new Error('Failed to parse article');
    }

    // 获取图片
    let imageUrl = null;

    // 尝试获取 meta og:image
    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage) {
      imageUrl = ogImage.getAttribute('content');
    }

    // 如果没有 og:image，尝试从文章内容中获取第一张图片
    if (!imageUrl && article.content) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = article.content;
      const firstImage = tempDiv.querySelector('img');
      if (firstImage) {
        imageUrl = firstImage.src;
      }
    }

    // 生成摘要
    const excerpt =
      article.excerpt ||
      (article.content
        ? article.content.replace(/<[^>]+>/g, ' ').slice(0, 200).trim() + '...'
        : '');

    return {
      title: article.title || '',
      excerpt,
      imageUrl,
      isLoading: false,
    };
  } catch (error) {
    throw error;
  }
}

// 相应地修改 updatePopoverContent 函数,避免重复创建链接
function updatePopoverContent(popover: HTMLElement, preview: ArticlePreview) {
  const loadingEl = popover.querySelector('.preview-loading') as HTMLElement | null;
  const containerEl = popover.querySelector(
    '.preview-container'
  ) as HTMLElement | null;
  const imageEl = popover.querySelector('.preview-image');
  const titleEl = popover.querySelector('.preview-title');
  const excerptEl = popover.querySelector('.preview-excerpt');

  if (loadingEl) loadingEl.style.display = 'none';
  if (containerEl) containerEl.style.display = 'block';

  // 处理图片
  if (imageEl && preview.imageUrl) {
    const img = document.createElement('img');
    img.src = preview.imageUrl;
    img.alt = preview.title;
    imageEl.innerHTML = '';
    imageEl.appendChild(img);

    // 为图片添加点击事件
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      if (preview.imageUrl) {
        showImages({
          urls: [preview.imageUrl],
          index: 0,
          onShow: (isShow: boolean) => {
            showImageViewer.value = isShow;
          },
        });
      }
    });
  }

  if (titleEl) {
    titleEl.textContent = preview.title;
    // 为标题添加点击事件
    titleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (preview.url) {
        window.open(preview.url, '_blank');
      }
    });
  }

  if (excerptEl) excerptEl.textContent = preview.excerpt;

  // 更新 popper 位置
  currentPopperInstance.value?.update();
}

// 添加关闭 popover 的函数
function closePopover(): void {
  if (currentPopover.value) {
    currentPopover.value.remove();
    currentPopover.value = null;
  }
  if (currentPopperInstance.value) {
    currentPopperInstance.value.destroy();
    currentPopperInstance.value = null;
  }
}

// 修改 handleClickOutside 函数
function handleClickOutside(event: MouseEvent) {
  const target = event.target as Element;

  // 处理链接预览 popover
  if (
    currentPopover.value &&
    !currentPopover.value.contains(target) &&
    !target.closest('a')
  ) {
    closePopover();
  }

  // 处理段落 popover
  if (
    currentParagraphPopover.value &&
    !currentParagraphPopover.value.contains(target) &&
    !target.closest('.paragraph-hover-bar')
  ) {
    // 找到当前激活的 hoverBar
    const activeHoverBar = document.querySelector('.paragraph-hover-bar.active');
    if (activeHoverBar) {
      closeParagraphPopover(activeHoverBar as HTMLElement);
    } else {
      closeParagraphPopover();
    }
  }

  // 处理设置 popover
  if (
    showSettingsPopover.value &&
    !target.closest('.settings-popover') &&
    !target.closest('.settings-button')
  ) {
    closeSettingsPopover();
  }
}

// 在 onMounted 中添加事件监听
onMounted(async () => {
  // 获取模型列表
  fetchOllamaModels();

  if (props.html) {
    processArticle();
  }

  // 初始化翻译状态
  if (!enableTranslation.value) {
    toggleTranslation(false);
  }

  // 添加全局事件监听
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('wheel', handleWheel, { passive: false });
  document.addEventListener('click', handleClickOutside);

  // 添加文章内容事件监听
  const articleContent = document.querySelector('.article-content');
  if (articleContent) {
    articleContent.addEventListener('click', (e: Event) => handleContentClick(e));
  }

  // 初始化显示原文状态
  if (!showOriginalText.value) {
    toggleOriginalText(false);
  }

  // 初始化主题
  document.documentElement.setAttribute('data-theme', currentTheme.value);
  // 向父窗口发送初始主题
  window.parent.postMessage({ type: 'themeChange', theme: currentTheme.value }, '*');
});

// 在 onUnmounted 中移除事件监听
onUnmounted(() => {
  // 移除全局事件监听
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('wheel', handleWheel);
  document.removeEventListener('click', handleClickOutside);

  // 移除文章内容事件监听
  const articleContent = document.querySelector('.article-content');
  if (articleContent) {
    articleContent.removeEventListener('click', handleImageClick as EventListener);
  }

  // 清理所有 popover
  closePopover();
  closeParagraphPopover();
  closeSettingsPopover();

  ollama.abort();
});

// 添加事件处理函数
function handleWheel(evt: WheelEvent): void {
  if (showImageViewer.value) {
    evt.preventDefault();
    evt.stopPropagation();
  }
}

function handleContentClick(e: Event) {
  const target = e.target as Element;

  // 处理图片点击
  if (target.tagName === 'IMG') {
    handleImageClick(e as MouseEvent);
  }

  // 处理链接点击
  if (target.closest('a')) {
    handleLinkClick(e as MouseEvent);
  }
}

// 修改从 URL 获取站点名称的辅助函数
function getSiteNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // 只移除 www. 前缀
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    console.warn('解析URL失败:', error);
    return '--';
  }
}

// 添加渲染PDF的函数
async function renderPDF(url: string, container: HTMLElement) {
  try {
    // 加载PDF文档
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;

    // 创建页面容器
    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'pdf-pages';
    container.appendChild(pagesContainer);

    // 渲染所有页面
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      // 创建canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // 创建页面容器
      const pageContainer = document.createElement('div');
      pageContainer.className = 'pdf-page';
      pageContainer.appendChild(canvas);
      pagesContainer.appendChild(pageContainer);

      // 渲染页面
      if (context) {
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
      }

      // 添加页码
      const pageNumber = document.createElement('div');
      pageNumber.className = 'pdf-page-number';
      pageNumber.textContent = `${pageNum} / ${pdf.numPages}`;
      pageContainer.appendChild(pageNumber);
    }
  } catch (error) {
    throw error;
  }
}

// 在 script 部分添加新的响应式变量
const currentParagraphPopover = ref<HTMLElement | null>(null);
const currentParagraphPopperInstance = ref<any>(null);
const editedParagraphs = ref<HTMLElement[]>([]);

function updateEditedParagraphs() {
  setTimeout(() => {
    const allEditedParagraphs = document.querySelectorAll('.paragraph.edited');
    editedParagraphs.value = Array.from(allEditedParagraphs) as HTMLElement[];
  }, 100);
}

// 添加段落处理逻辑
function processParagraphs(contentElement: HTMLElement) {
  if (!contentElement) return;

  const paragraphs = contentElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, figure, .summary-content');

  // 处理每个段落
  paragraphs.forEach((paragraph: Element) => {
    processParagraph(paragraph);
  });

  const allParagraphs = contentElement.querySelectorAll('.paragraph');
  allParagraphs.forEach((paragraph: Element) => {
    optimizeParagraph(paragraph as HTMLElement);
  });
}

function optimizeParagraph(paragraph: HTMLElement) {
  // 获取所有子节点
  const children = Array.from(paragraph.children);

  // 过滤掉hover-bar节点
  const childrenWithoutHoverBar = children.filter(child => !child.classList.contains('paragraph-hover-bar'));

  if (childrenWithoutHoverBar.length >= 3) { // 至少要有3个节点(首尾空p和中间内容)
    const firstChild = childrenWithoutHoverBar[0];
    const lastChild = childrenWithoutHoverBar[childrenWithoutHoverBar.length - 1];

    // 检查首尾是否为空p节点
    if (firstChild.tagName.toLowerCase() === 'p' &&
      lastChild.tagName.toLowerCase() === 'p' &&
      !firstChild.textContent?.trim() &&
      !lastChild.textContent?.trim()) {

      // 获取中间的节点(排除首尾空p)
      const middleNodes = childrenWithoutHoverBar.slice(1, -1);

      // 将中间节点添加到第一个p中
      middleNodes.forEach(node => {
        firstChild.appendChild(node);
      });

      // 删除已移动的中间节点和最后的空p
      lastChild.remove();
    }
  }
}

function processParagraph(paragraph: Element): { container: HTMLElement; hoverBar: HTMLElement } {
  let container: HTMLElement | null = null;
  let hoverBar: HTMLElement | null = null;

  // 检查是否已经被处理过
  let parent: Element | null = paragraph;
  while (parent) {
    if (parent.classList.contains('paragraph')) {
      container = parent as HTMLElement;
      hoverBar = parent.querySelector('.paragraph-hover-bar') as HTMLElement;
      if (hoverBar) {
        const hoverBarParent = hoverBar.parentElement;
        if (hoverBarParent?.tagName.toLowerCase() === 'a') {
          hoverBarParent.replaceWith(hoverBar);
        } else {
          return { container, hoverBar };
        }
      }
      break;
    }
    parent = parent.parentElement;
  }

  // 创建段落容器
  if (!container) {
    container = document.createElement('div');
    container.className = 'paragraph';

    paragraph.parentElement?.insertBefore(container, paragraph);
    container.appendChild(paragraph);
  }

  // 创建悬浮条
  if (!hoverBar) {
    hoverBar = document.createElement('div');
    hoverBar.className = 'paragraph-hover-bar';
    hoverBar.title = '点击编辑';
    container.appendChild(hoverBar);
  }

  // 创建添加按钮触发器
  const addTrigger = document.createElement('div');
  addTrigger.className = 'add-trigger';
  addTrigger.title = '插入内容';
  addTrigger.innerHTML = '+';

  // 创建按钮容器
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'hover-buttons';

  // 创建添加文本按钮
  const addTextBtn = document.createElement('button');
  addTextBtn.className = 'hover-btn add-text-btn';
  addTextBtn.innerHTML = '添加文本';
  addTextBtn.title = '在此处插入文本段落';

  // 创建添加代码按钮
  const addCodeBtn = document.createElement('button');
  addCodeBtn.className = 'hover-btn add-code-btn';
  addCodeBtn.innerHTML = '添加代码';
  addCodeBtn.title = '在处插入代码段';

  // 创建删除段落按钮
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'hover-btn delete-hover-btn';
  deleteBtn.innerHTML = '删除段落';
  deleteBtn.title = '删除当前段落';

  // 添加按钮到容器
  buttonsContainer.appendChild(addTextBtn);
  buttonsContainer.appendChild(addCodeBtn);
  buttonsContainer.appendChild(deleteBtn);

  // 触和按钮容器添加到操作区域
  const actionArea = document.createElement('div');
  actionArea.className = 'action-area';
  actionArea.appendChild(addTrigger);
  actionArea.appendChild(buttonsContainer);
  hoverBar.appendChild(actionArea);

  // 添加按钮点击事件
  addTextBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    const newParagraph = document.createElement('p');
    newParagraph.textContent = new Date().toLocaleString('zh-CN');

    container.parentNode?.insertBefore(newParagraph, container.nextSibling);
    const { container: newContainer, hoverBar } = processParagraph(newParagraph);
    handleEditedParagraph(newContainer, hoverBar);
    hoverBar.click();
  });

  addCodeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const newParagraph = document.createElement('pre');
    const newCode = document.createElement('code');
    newParagraph.appendChild(newCode);

    container.parentNode?.insertBefore(newParagraph, container.nextSibling);
    const { container: newContainer, hoverBar } = processParagraph(newParagraph);
    handleEditedParagraph(newContainer, hoverBar);
    hoverBar.click();
  });

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (container) {
      container.remove();
      updateEditedParagraphs();
    }
  });

  if (container.classList.contains('edited')) {
    handleEditedParagraph(container, hoverBar, true);
  }

  // 添加点击事件
  hoverBar.addEventListener('click', (e) => {
    // 如果点击的是导航箭头或按钮，不显示编辑框
    if ((e.target as HTMLElement).classList.contains('nav-arrow') ||
      (e.target as HTMLElement).classList.contains('hover-btn') ||
      (e.target as HTMLElement).classList.contains('add-trigger')) {
      return;
    }
    handleParagraphClick(e, container);
  });

  return {
    container,
    hoverBar,
  };
}

// 添加处理段落点击的函数
function handleParagraphClick(event: MouseEvent, paragraphContainer: HTMLElement) {
  event.preventDefault();

  // 如果已经有打开的 popover，先关闭它
  if (currentParagraphPopover.value) {
    const activeHoverBar = document.querySelector('.paragraph-hover-bar.active');
    if (activeHoverBar) {
      closeParagraphPopover(activeHoverBar as HTMLElement);
    }
  }

  const paragraph = paragraphContainer.children[0] as HTMLElement;
  const hoverBar = event.currentTarget as HTMLElement;
  editingParagraph.value = paragraphContainer;

  // 获取保存的编辑状态
  const paragraphId = paragraphContainer.id || 'default';
  isHtmlEditing.value = localStorage.getItem(`html_editing_${paragraphId}`) === 'true';

  // 添加激活状态类
  hoverBar.classList.add('active');

  // 创建 popover 元素
  const popover = document.createElement('div');
  popover.className = 'paragraph-popover';

  // 判断是否为代码段落
  const isCodeBlock = paragraph.tagName.toLowerCase() === 'pre' &&
    paragraph.firstElementChild?.tagName.toLowerCase() === 'code';

  // 根据是否为代码段落使用不同的编辑器
  if (isCodeBlock) {
    popover.innerHTML = `
      <div class="popover-content">
        <div class="popover-menu">
          <button class="menu-btn close-btn" title="关闭">
            ×
          </button>
          <button class="menu-btn maximize-btn" title="最大化">
            ⤢
          </button>
          <button class="menu-btn html-btn" title="${isHtmlEditing.value ? '切换到代码编辑' : '切换到HTML编辑'}">
            ${isHtmlEditing.value ? '代码编辑' : 'HTML编辑'}
          </button>
        </div>
        <div id="monaco-editor" style="min-height: 300px; width: 100%;"></div>
        <div class="popover-actions">
          <button class="save-btn">保存</button>
          <button class="delete-btn">删除</button>
          <button class="copy-btn">复制</button>
        </div>
      </div>
      <div class="popover-arrow" data-popper-arrow></div>
    `;
  } else {
    popover.innerHTML = `
      <div class="popover-content">
        <div class="popover-menu">
          <button class="menu-btn close-btn" title="关闭">
            ×
          </button>
          <button class="menu-btn maximize-btn" title="最大化">
            ⤢
          </button>
          <button class="menu-btn html-btn" title="${isHtmlEditing.value ? '切换到内容编辑' : '切换到HTML编辑'}">
            ${isHtmlEditing.value ? '内容编辑' : 'HTML编辑'}
          </button>
        </div>
        <div id="quill-editor" style="min-height: 150px; ${isHtmlEditing.value ? 'display: none;' : ''}"></div>
        <div id="monaco-editor" style="min-height: 300px; width: 100%; ${!isHtmlEditing.value ? 'display: none;' : ''}"></div>
        <div class="popover-actions">
          <button class="save-btn">保存</button>
          <button class="chat-btn">对话</button>
          <button class="delete-btn">删除</button>
          <button class="copy-btn">复制</button>
        </div>
        <div class="chat-response"></div>
      </div>
      <div class="popover-arrow" data-popper-arrow></div>
    `;
  }

  document.body.appendChild(popover);
  currentParagraphPopover.value = popover;

  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'paragraph-overlay';
  document.body.appendChild(overlay);
  paragraphOverlay.value = overlay;

  // 添加遮罩层点击事件
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeParagraphPopover(hoverBar);
    }
  });

  // 添加菜单按钮事件监听
  const closeBtn = popover.querySelector('.close-btn');
  const maximizeBtn = popover.querySelector('.maximize-btn');
  const htmlBtn = popover.querySelector('.html-btn');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeParagraphPopover(hoverBar);
    });
  }

  if (maximizeBtn) {
    maximizeBtn.addEventListener('click', () => {
      isPopoverMaximized.value = !isPopoverMaximized.value;
      popover.classList.toggle('maximized', isPopoverMaximized.value);

      // 切换遮罩层
      if (paragraphOverlay.value) {
        paragraphOverlay.value.classList.toggle('active', isPopoverMaximized.value);
      }

      // 更新编辑器大小
      if (monacoEditor.value) {
        monacoEditor.value.layout();
      }
    });
  }

  // 添加 HTML 按钮事件
  if (htmlBtn) {
    if (isHtmlEditing.value) {
      htmlBtn.classList.add('active');
    }
    htmlBtn.addEventListener('click', () => {
      const quillEditorContainer = popover.querySelector('#quill-editor') as HTMLElement;
      const quillToolbar = popover.querySelector('.ql-toolbar') as HTMLElement;
      const monacoContainer = popover.querySelector('#monaco-editor') as HTMLElement;
      const htmlButton = htmlBtn as HTMLElement;

      // 切换编辑模式
      isHtmlEditing.value = !isHtmlEditing.value;
      const paragraphId = editingParagraph.value?.id || 'default';
      localStorage.setItem(`html_editing_${paragraphId}`, isHtmlEditing.value.toString());

      const isCodeBlock = paragraph.tagName.toLowerCase() === 'pre' &&
        paragraph.firstElementChild?.tagName.toLowerCase() === 'code';

      if (isHtmlEditing.value) {
        // 切换到 HTML 编辑模式
        if (quillEditorContainer) {
          quillEditorContainer.style.display = 'none';
          // 清理 Quill 编辑器
          if (quillEditor.value) {
            quillEditor.value = null;
          }
          // 移除所有已存在的 toolbar
          const toolbars = popover.querySelectorAll('.ql-toolbar');
          toolbars.forEach(toolbar => toolbar.remove());
        }
        if (quillToolbar) {
          quillToolbar.style.display = 'none';
        }
        if (monacoContainer) {
          monacoContainer.style.display = 'block';
          // 确保在初始化新编辑器之前销毁旧的编辑器
          if (monacoEditor.value) {
            monacoEditor.value.dispose();
            monacoEditor.value = null;
          }
          // 初始化 Monaco 编辑器
          initializeHtmlEditor(popover, paragraph, hoverBar, editingParagraph.value as HTMLElement);
        }
        htmlButton.classList.add('active');
        if (isCodeBlock) {
          htmlButton.title = '切换到代码编辑';
          htmlButton.textContent = '代码编辑';
        } else {
          htmlButton.title = '切换到内容编辑';
          htmlButton.textContent = '内容编辑';
        }
      } else {
        // 切换到普通编辑模式
        if (monacoEditor.value) {
          monacoEditor.value.dispose();
          monacoEditor.value = null;
        }
        if (monacoContainer) {
          monacoContainer.style.display = 'none';
        }
        if (quillEditorContainer) {
          quillEditorContainer.style.display = 'block';
          // 移除所有已存在的 toolbar
          const toolbars = popover.querySelectorAll('.ql-toolbar');
          toolbars.forEach(toolbar => toolbar.remove());
          // 清空编辑器容器内容
          quillEditorContainer.innerHTML = '';
        }
        if (quillToolbar) {
          quillToolbar.style.display = 'block';
        }
        htmlButton.classList.remove('active');
        htmlButton.title = '切换到HTML编辑';
        htmlButton.textContent = 'HTML编辑';

        // 重新初始化 Quill 编辑器
        nextTick(() => {
          if (isCodeBlock) {
            initializeCodeEditor(popover, paragraph);
          } else {
            initializeQuillEditor(popover, paragraph);
          }
        });
      }
    });
  }

  // 创建 Popper 实例
  currentParagraphPopperInstance.value = createPopper(hoverBar, popover, {
    placement: 'auto',
    modifiers: [
      {
        name: 'arrow',
        options: {
          element: popover.querySelector('[data-popper-arrow]'),
        },
      },
    ],
  });

  // 确保 DOM 已更新后初始化编辑器
  nextTick(() => {
    if (isCodeBlock) {
      // 如果是代码块且处于 HTML 编辑模式
      if (isHtmlEditing.value) {
        initializeHtmlEditor(popover, paragraph, hoverBar, paragraphContainer);
      } else {
        initializeCodeEditor(popover, paragraph);
      }
    } else {
      // 如果是普通段落且处于 HTML 编辑模式
      if (isHtmlEditing.value) {
        initializeHtmlEditor(popover, paragraph, hoverBar, paragraphContainer);
      } else {
        initializeQuillEditor(popover, paragraph);
      }
    }

    // 更新 Popper 位置
    currentParagraphPopperInstance.value?.update();

    // 更新编辑器显示状态
    const quillEditorContainer = popover.querySelector('#quill-editor') as HTMLElement;
    const monacoContainer = popover.querySelector('#monaco-editor') as HTMLElement;
    const htmlButton = popover.querySelector('.html-btn') as HTMLElement;

    if (isHtmlEditing.value) {
      if (quillEditorContainer) quillEditorContainer.style.display = 'none';
      if (monacoContainer) monacoContainer.style.display = 'block';
      if (htmlButton) {
        htmlButton.classList.add('active');
        if (isCodeBlock) {
          htmlButton.title = '切换到代码编辑';
          htmlButton.textContent = '代码编辑';
        } else {
          htmlButton.title = '切换到内容编辑';
          htmlButton.textContent = '内容编辑';
        }
      }
    } else {
      if (htmlButton) {
        htmlButton.classList.remove('active');
        htmlButton.title = '切换到HTML编辑';
        htmlButton.textContent = 'HTML编辑';
      }
    }
  });
}

// 添加初始化 HTML 编辑器的函数
function initializeHtmlEditor(popover: HTMLElement, paragraph: HTMLElement, hoverBar: HTMLElement, paragraphContainer: HTMLElement) {
  const monacoContainer = popover.querySelector('#monaco-editor') as HTMLElement;
  if (!monacoContainer) {
    console.error('找不到编辑器容器');
    return;
  }

  // 如果已经存在编辑器实例，先销毁它
  if (monacoEditor.value) {
    monacoEditor.value.dispose();
    monacoEditor.value = null;
  }

  monacoContainer.style.display = 'block';

  try {
    // 获取HTML内容并格式化
    const html = paragraph.outerHTML;
    const formattedHtml = htmlBeautify(html, {
      indent_size: 2,
      wrap_line_length: 80,
      preserve_newlines: true,
      max_preserve_newlines: 2,
      unformatted: ['code', 'pre'],
      content_unformatted: ['pre', 'code'],
      extra_liners: ['head', 'body', '/html'],
      indent_inner_html: true,
      indent_handlebars: false,
      indent_scripts: 'keep',
      end_with_newline: true
    });

    // 创建新的编辑器实例
    monacoEditor.value = monaco.editor.create(monacoContainer, {
      value: formattedHtml,
      language: 'html',
      theme: 'vs-dark',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible'
      },
      wordWrap: 'on',
      tabSize: 2,
      fixedOverflowWidgets: true
    });

    // 添加按钮事件处理函数
    function handleSave() {
      if (editingParagraph.value && monacoEditor.value) {
        const newHtml = monacoEditor.value.getValue();

        const div = document.createElement('p');
        div.innerHTML = newHtml;

        // 删除空的p元素
        const emptyParagraphs = div.querySelectorAll('p');
        emptyParagraphs.forEach(p => {
          if (!p.textContent?.trim()) {
            p.remove();
          }
        });

        if (div.children.length === 1) {
          paragraphContainer.replaceChild(div.children[0], paragraph);
        } else {
          paragraphContainer.replaceChild(div, paragraph);
        }

        // applyCodeHighlighting(paragraphContainer);
        handleEditedParagraph(paragraphContainer, hoverBar);
        updateEditedParagraphs();
        closeParagraphPopover(hoverBar);
      }
    }

    // 重建按钮，避免重复绑定事件
    const popoverActions = popover.querySelector('.popover-actions');
    if (popoverActions) {
      popoverActions.innerHTML = popoverActions.innerHTML;
    }

    // 获取按钮元素
    const saveBtn = popover.querySelector('.save-btn');
    const copyBtn = popover.querySelector('.copy-btn');
    const deleteBtn = popover.querySelector('.delete-btn');

    // 先移除旧的事件监听器
    if (saveBtn) {
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode?.replaceChild(newSaveBtn, saveBtn);
      newSaveBtn.addEventListener('click', handleSave);
    }

    if (copyBtn) {
      const newCopyBtn = copyBtn.cloneNode(true);
      copyBtn.parentNode?.replaceChild(newCopyBtn, copyBtn);
      newCopyBtn.addEventListener('click', () => {
        const text = monacoEditor.value?.getValue() || '';
        handleCopyButtonClick(text, newCopyBtn as HTMLElement);
      });
    }

    if (deleteBtn) {
      const newDeleteBtn = deleteBtn.cloneNode(true);
      deleteBtn.parentNode?.replaceChild(newDeleteBtn, deleteBtn);
      const hoverBar = editingParagraph.value?.querySelector('.paragraph-hover-bar') as HTMLElement;
      newDeleteBtn.addEventListener('click', () => handleDeleteButtonClick(hoverBar));
    }

  } catch (error) {
    console.error('初始化HTML编辑器失败:', error);
  }
}

// 修改 closeParagraphPopover 函数
function closeParagraphPopover(hoverBar?: HTMLElement): void {
  if (quillEditor.value) {
    quillEditor.value = null;
  }
  if (monacoEditor.value) {
    monacoEditor.value.dispose();
    monacoEditor.value = null;
  }
  if (currentParagraphPopover.value) {
    currentParagraphPopover.value.remove();
    currentParagraphPopover.value = null;
  }
  if (currentParagraphPopperInstance.value) {
    currentParagraphPopperInstance.value.destroy();
    currentParagraphPopperInstance.value = null;
  }
  if (paragraphOverlay.value) {
    paragraphOverlay.value.remove();
    paragraphOverlay.value = null;
  }
  if (hoverBar) {
    hoverBar.classList.remove('active');
  }
  editingParagraph.value = null;
  isPopoverMaximized.value = false;
}

// 修改Quill编器相关的响应式变量，添加类型明
const quillEditor = shallowRef<QuillType | null>(null);
const editingParagraph = ref<HTMLElement | null>(null);

// 添加获取计算样式的辅助函数
function getComputedStyleProperties(element: HTMLElement): Record<string, string> {
  const computedStyle = window.getComputedStyle(element);
  const defaultStyle = window.getComputedStyle(document.createElement(element.tagName));

  const styles: Record<string, string> = {};

  // 检查背景色
  if (computedStyle.backgroundColor !== defaultStyle.backgroundColor &&
    computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
    styles.backgroundColor = computedStyle.backgroundColor;
  }

  return styles;
}


// 添加monaco编辑器的响应式变量
const monacoEditor = shallowRef<any>(null);

// 添加处理修订段落的辅助函数
function handleEditedParagraph(container: HTMLElement, hoverBar?: HTMLElement, keepEditTime?: boolean): void {
  if (!container) return;

  hoverBar = hoverBar || container.querySelector('.paragraph-hover-bar') as HTMLElement;
  if (!hoverBar) return;

  // 更新或添加修订时间
  let editTime = hoverBar.querySelector('.edit-time') as HTMLElement;
  if (!editTime) {
    editTime = document.createElement('span');
    editTime.className = 'edit-time';
    hoverBar.appendChild(editTime);
  }

  if (!keepEditTime || !editTime.textContent) {
    const shortTime = new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    const shortTime2 = new Date().toLocaleString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const longTime = new Date().toLocaleString('zh-CN');

    if (hoverBar.clientHeight >= 120) {
      editTime.textContent = longTime;
    } else if (hoverBar.clientHeight < 80) {
      editTime.textContent = shortTime2;
    } else {
      editTime.textContent = shortTime;
    }

    hoverBar.title = longTime;
  }

  if (!hoverBar.querySelector('.arrow-container')) {
    const arrowContainer = document.createElement('div');
    arrowContainer.className = 'arrow-container';

    // 上箭头
    const upArrow = document.createElement('div');
    upArrow.className = 'nav-arrow up-arrow';
    upArrow.title = '上一个修订段落';
    upArrow.innerHTML = '↑';

    // 下箭头
    const downArrow = document.createElement('div');
    downArrow.className = 'nav-arrow down-arrow';
    downArrow.title = '下一个修订段落';
    downArrow.innerHTML = '↓';

    // 添加箭头点击事件
    upArrow.addEventListener('click', (e) => {
      e.stopPropagation();

      const editedParagraphsArray = editedParagraphs.value;

      if (editedParagraphsArray.length <= 1) {
        return;
      }

      let index = 0;
      const currentIndex = editedParagraphsArray.indexOf(container);
      if (currentIndex > 0) {
        index = currentIndex - 1;
      } else {
        index = editedParagraphsArray.length - 1;
      }
      const prevEditedParagraph = editedParagraphsArray[index] as HTMLElement;
      prevEditedParagraph?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    downArrow.addEventListener('click', (e) => {
      e.stopPropagation();

      const editedParagraphsArray = editedParagraphs.value;

      if (editedParagraphsArray.length <= 1) {
        return;
      }

      let index = 0;
      const currentIndex = editedParagraphsArray.indexOf(container);
      if (currentIndex < editedParagraphsArray.length - 1) {
        index = currentIndex + 1;
      } else {
        index = 0;
      }
      const nextEditedParagraph = editedParagraphsArray[index] as HTMLElement;
      nextEditedParagraph?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    arrowContainer.appendChild(upArrow);
    arrowContainer.appendChild(downArrow);
    hoverBar.appendChild(arrowContainer);
  }

  if (!container.classList.contains('edited')) {
    container.classList.add('edited');
  }
  if (!hoverBar.classList.contains('edited')) {
    hoverBar.classList.add('edited');
  }
}

// 添加新的响应式变量
const showSettingsPopover = ref(false);
const settingsPopoverInstance = ref<any>(null);

// 添加打开设置弹窗的函数
function openSettingsPopover(event: MouseEvent) {
  const settingsButton = event.currentTarget as HTMLElement;

  if (showSettingsPopover.value) {
    closeSettingsPopover();
    return;
  }

  // 创建设置弹窗
  const popover = document.createElement('div');
  popover.className = 'settings-popover';
  popover.innerHTML = `
    <div class="settings-content">
      <div class="settings-header">
        <h3>设置</h3>
        <button class="close-settings-btn">×</button>
      </div>
      <div class="settings-body">
        <div class="settings-section">
          <h4>主题设置</h4>
          <div class="settings-theme">
            <label>
              <input type="radio" name="theme" value="light" ${currentTheme.value === 'light' ? 'checked' : ''}>
              浅色
            </label>
            <label>
              <input type="radio" name="theme" value="dark" ${currentTheme.value === 'dark' ? 'checked' : ''}>
              暗黑
            </label>
          </div>
        </div>
        <div class="settings-section">
          <h4>功能设置</h4>
          <div class="settings-checkbox">
            <label>
              <input type="checkbox" class="translation-toggle" ${enableTranslation.value ? 'checked' : ''}>
              启用翻译
            </label>
          </div>
          <div class="settings-checkbox">
            <label>
              <input type="checkbox" class="original-text-toggle" ${showOriginalText.value ? 'checked' : ''}>
              显示原文
            </label>
          </div>
          <div class="settings-checkbox">
            <label>
              <input type="checkbox" class="summary-toggle" ${enableSummary.value ? 'checked' : ''}>
              启用总结 ${isSummaryGenerated.value ? '✓' : ''}
            </label>
          </div>
          <div class="settings-color-picker">
            <label>翻译文本背景颜色</label>
            <div class="color-picker-wrapper">
              <div class="color-picker"></div>
            </div>
          </div>
        </div>
        <div class="settings-section">
          <h4 class="font-scale-title" style="cursor: pointer;" title="点击重置为默认大小">字体缩放（<span class="font-size-value">${fontScale.value}</span>倍）</h4>
          <div class="settings-slider">
            <input type="range" class="font-size-slider" min="0.5" max="4" step="0.01" value="${fontScale.value}">
          </div>
        </div>
        <div class="settings-section">
          <h4>导出</h4>
          <div class="settings-buttons">
            <button class="settings-btn export-html-btn">
              <span class="settings-btn-text">导出 HTML</span>
              <span class="loading-dots" style="display: none;"></span>
            </button>
            <button class="settings-btn export-pdf-btn">
              <span class="settings-btn-text">导出 PDF</span>
              <span class="loading-dots" style="display: none;"></span>
            </button>
            <button class="settings-btn save-read-later-btn">
              <span class="settings-btn-text">稍后阅读</span>
              <span class="loading-dots" style="display: none;"></span>
            </button>
            <button class="settings-btn read-later-list-btn">
              <span class="settings-btn-text">阅读列表</span>
            </button>
          </div>
        </div>
        <div class="settings-section">
          <h4>OLLAMA 文本模型</h4>
          <div class="settings-select">
            <select class="text-model-select model-select">
              ${OLLAMA_MODELS.value.map(model => `
                <option value="${model.value}" ${model.value === OLLAMA_MODEL.value ? 'selected' : ''}>
                  ${model.label}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
        <div class="settings-section">
          <h4>OLLAMA 视觉模型</h4>
          <div class="settings-select">
            <select class="vision-model-select model-select">
              ${OLLAMA_VISION_MODELS.value.map(model => `
                <option value="${model.value}" ${model.value === OLLAMA_VISION_MODEL.value ? 'selected' : ''}>
                  ${model.label}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>
    </div>
    <div class="popover-arrow" data-popper-arrow></div>
  `;

  document.body.appendChild(popover);

  // 添加主题切换事件监听
  const themeInputs = popover.querySelectorAll('input[name="theme"]');
  themeInputs.forEach((input) => {
    if (input instanceof HTMLInputElement) {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        toggleTheme(target.value);
      });
    }
  });

  // 添加翻译开关事件监听
  const translationToggle = popover.querySelector('.translation-toggle');
  if (translationToggle) {
    translationToggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      toggleTranslation(target.checked);
    });
  }

  // 添加模型选择事件监听
  const textModelSelect = popover.querySelector('.text-model-select');
  if (textModelSelect) {
    textModelSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      saveModelSelection(target.value, false);
    });
  }

  // 添加视觉模型选择事件监听
  const visionModelSelect = popover.querySelector('.vision-model-select');
  if (visionModelSelect) {
    visionModelSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      saveModelSelection(target.value, true);
    });
  }

  // 添加总结开关事件监听
  const summaryToggle = popover.querySelector('.summary-toggle');
  if (summaryToggle) {
    summaryToggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      toggleSummary(target.checked);
    });
  }

  // 添加显示原文切换事件监听
  const originalTextToggle = popover.querySelector('.original-text-toggle');
  if (originalTextToggle) {
    originalTextToggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      toggleOriginalText(target.checked);
    });
  }

  // 创建 Popper 实例
  settingsPopoverInstance.value = createPopper(settingsButton, popover, {
    placement: 'top-end',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, 8],
        },
      },
      {
        name: 'arrow',
        options: {
          element: popover.querySelector('[data-popper-arrow]'),
        },
      },
    ],
  });

  showSettingsPopover.value = true;

  // 添加关闭按钮事件
  const closeBtn = popover.querySelector('.close-settings-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSettingsPopover);
  }

  // 添加导出按钮事件
  const exportPdfBtn = popover.querySelector('.export-pdf-btn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', exportToPDF);
  }

  const exportHtmlBtn = popover.querySelector('.export-html-btn');
  if (exportHtmlBtn) {
    exportHtmlBtn.addEventListener('click', exportToHTML);
  }

  const saveReadLaterBtn = popover.querySelector('.save-read-later-btn');
  if (saveReadLaterBtn) {
    saveReadLaterBtn.addEventListener('click', saveToReadLater);
  }

  const readLaterListBtn = popover.querySelector('.read-later-list-btn');
  if (readLaterListBtn) {
    readLaterListBtn.addEventListener('click', () => {
      closeSettingsPopover();
      toggleReadLaterList();
    });
  }

  // 更新导出按钮状态
  function updateExportButtons() {
    const pdfBtn = popover.querySelector('.export-pdf-btn') as HTMLButtonElement;
    const htmlBtn = popover.querySelector('.export-html-btn') as HTMLButtonElement;
    const readLaterBtn = popover.querySelector('.save-read-later-btn') as HTMLButtonElement;

    if (pdfBtn) {
      pdfBtn.disabled = isExportingPDF.value || isExportingHTML.value;
      const pdfBtnText = pdfBtn.querySelector('.settings-btn-text') as HTMLElement;
      const pdfLoadingDots = pdfBtn.querySelector('.loading-dots') as HTMLElement;
      if (pdfBtnText && pdfLoadingDots) {
        pdfBtnText.textContent = isExportingPDF.value ? '导出PDF中' : '导出 PDF';
        pdfLoadingDots.style.display = isExportingPDF.value ? 'inline-block' : 'none';
      }
    }

    if (htmlBtn) {
      htmlBtn.disabled = isExportingHTML.value || isExportingPDF.value;
      const htmlBtnText = htmlBtn.querySelector('.settings-btn-text') as HTMLElement;
      const htmlLoadingDots = htmlBtn.querySelector('.loading-dots') as HTMLElement;
      if (htmlBtnText && htmlLoadingDots) {
        htmlBtnText.textContent = isExportingHTML.value ? '导出HTML中' : '导出 HTML';
        htmlLoadingDots.style.display = isExportingHTML.value ? 'inline-block' : 'none';
      }
    }

    if (readLaterBtn) {
      readLaterBtn.disabled = isSavingToReadLater.value;
      const readLaterBtnText = readLaterBtn.querySelector('.settings-btn-text') as HTMLElement;
      const readLaterLoadingDots = readLaterBtn.querySelector('.loading-dots') as HTMLElement;
      if (readLaterBtnText && readLaterLoadingDots) {
        readLaterBtnText.textContent = isSavingToReadLater.value ? '保存中' : '稍后阅读';
        readLaterLoadingDots.style.display = isSavingToReadLater.value ? 'inline-block' : 'none';
      }
    }
  }

  // 监听导出状态变化
  watch([isExportingPDF, isExportingHTML, isSavingToReadLater], () => {
    updateExportButtons();
  });

  // 初始化颜色选择器
  const colorPickerEl = popover.querySelector('.color-picker') as HTMLElement;
  if (colorPickerEl) {
    // 设置初始颜色
    colorPickerEl.style.backgroundColor = translatedBgColor.value;

    // 阻止颜色选择器的点击事件冒泡
    colorPickerEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    const pickr = Pickr.create({
      el: colorPickerEl,
      theme: 'classic',
      default: translatedBgColor.value,
      swatches: [
        '#ffeb3b',
        '#fff176',
        '#fff59d',
        '#fff9c4',
        '#fffde7',
        '#fdd835',
        '#fbc02d',
        '#f9a825',
        '#f57f17',
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
          save: false // 移除保存按钮
        }
      }
    });

    // 实现更新颜色
    pickr.on('change', (color: any) => {
      if (color) {
        const rgba = color.toRGBA();
        const rgbaString = `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3]})`;
        saveTranslatedBgColor(rgbaString);
        pickr.applyColor(true);
      } else {
        const rgbaString = 'transparent';
        saveTranslatedBgColor(rgbaString);
        pickr.applyColor(true);
      }
    });
    pickr.on('clear', () => {
      saveTranslatedBgColor('transparent');
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
  }

  // 添加字体大小滑块事件监听
  const fontSizeSlider = popover.querySelector('.font-size-slider') as HTMLInputElement;
  const fontSizeValue = popover.querySelector('.font-size-value') as HTMLElement;
  const fontScaleTitle = popover.querySelector('.font-scale-title') as HTMLElement;

  if (fontSizeSlider && fontSizeValue && fontScaleTitle) {
    // 滑块值变化事件
    fontSizeSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const size = target.value;
      fontSizeValue.textContent = size;
      saveFontSize(size);
    });

    // 标题点击重置事件
    fontScaleTitle.addEventListener('click', () => {
      const size = '1';
      fontSizeSlider.value = size;
      fontSizeValue.textContent = size;
      saveFontSize(size);
    });
  }
}

// 添加关闭设置窗的数
function closeSettingsPopover(): void {
  if (settingsPopoverInstance.value) {
    settingsPopoverInstance.value.destroy();
    settingsPopoverInstance.value = null;
  }

  const popover = document.querySelector('.settings-popover');
  if (popover) {
    popover.remove();
  }

  showSettingsPopover.value = false;
}

// 添加新的响应式变量
const translatedBgColor = ref(localStorage.getItem('TRANSLATED_BG_COLOR') || '#1de8dd');
document.documentElement.style.setProperty('--translated-bg-color', translatedBgColor.value);


// 添加保存背景颜色的函数
function saveTranslatedBgColor(color: string): void {
  translatedBgColor.value = color;
  localStorage.setItem('TRANSLATED_BG_COLOR', color);
  document.documentElement.style.setProperty('--translated-bg-color', color);
}

// 添加 escapeRegExp 辅助函数
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 添加新的响应式变量
const isPopoverMaximized = ref(false);

// 添加新的响应式变量
const paragraphOverlay = ref<HTMLElement | null>(null);

// 添加示原文的响应式变
const showOriginalText = ref(localStorage.getItem('SHOW_ORIGINAL_TEXT') !== 'false');

// 修改切换显示原文的函
function toggleOriginalText(enabled: boolean) {
  showOriginalText.value = enabled;
  localStorage.setItem('SHOW_ORIGINAL_TEXT', enabled.toString());

  document.documentElement.style.setProperty('--origin-text-visible', enabled ? 'initial' : 'none');
}

// 添加新的响应式变量
const isHtmlEditing = ref(false);

// 添加初始化代码编辑器的函数
function initializeCodeEditor(popover: HTMLElement, paragraph: HTMLElement) {
  const monacoContainer = popover.querySelector('#monaco-editor') as HTMLElement;
  if (!monacoContainer) {
    console.error('找不到编辑器容器');
    return;
  }

  monacoContainer.style.display = 'block';

  try {
    // 获取代码内容和语言
    const codeElement = paragraph.querySelector('code');
    let language = 'plaintext';
    let codeContent = '';

    if (codeElement) {
      // 从 class 中提取语言
      const langClass = Array.from(codeElement.classList).find(cls => cls.startsWith('language-'));
      if (langClass) {
        language = langClass.replace('language-', '');
      }
      codeContent = codeElement.textContent || '';
    } else if (paragraph.tagName.toLowerCase() === 'pre') {
      // 如果是 pre 标签但没有 code 子元素
      codeContent = paragraph.textContent || '';
      language = detectCodeLanguage(codeContent);
    }

    // 如果已经存在编辑器实例，先销毁它
    if (monacoEditor.value) {
      monacoEditor.value.dispose();
      monacoEditor.value = null;
    }


    // 创建新的编辑器实例
    monacoEditor.value = monaco.editor.create(monacoContainer, {
      value: codeContent,
      language: language,
      theme: 'vs-dark',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible'
      },
      wordWrap: 'on',
      tabSize: 2,
      fixedOverflowWidgets: true
    });

    // 格式化文档
    setTimeout(() => {
      monacoEditor.value?.getAction('editor.action.formatDocument')?.run();
    }, 100);

    // 重建按钮，避免重复绑定事件
    const popoverActions = popover.querySelector('.popover-actions');
    if (popoverActions) {
      popoverActions.innerHTML = popoverActions.innerHTML;
    }

    // 添加按钮事件
    const saveBtn = popover.querySelector('.save-btn');
    const copyBtn = popover.querySelector('.copy-btn');
    const deleteBtn = popover.querySelector('.delete-btn');
    const hoverBar = editingParagraph.value?.querySelector('.paragraph-hover-bar') as HTMLElement;

    // 添加保存按钮事件
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (editingParagraph.value && monacoEditor.value) {
          const container = editingParagraph.value;
          const codeContent = monacoEditor.value.getValue();

          // 创建新的 pre 和 code 元素
          const newPre = document.createElement('pre');
          const newCode = document.createElement('code');

          // 检测或保持原有语言
          const detectedLang = language === 'plaintext' ? detectCodeLanguage(codeContent) : language;
          newCode.className = `language-${detectedLang}`;
          newCode.textContent = codeContent;
          newPre.appendChild(newCode);

          // 替换原有元素
          container.replaceChild(newPre, paragraph);

          // 应用代码高亮
          applyCodeHighlighting(container);
          handleEditedParagraph(container, hoverBar);
          updateEditedParagraphs();

          // 关闭弹窗
          closeParagraphPopover(hoverBar);
        }
      });
    }

    // 添加复制和删除按钮事件
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = monacoEditor.value?.getValue() || '';
        handleCopyButtonClick(text, copyBtn as HTMLElement);
      });
    }

    if (deleteBtn && hoverBar) {
      deleteBtn.addEventListener('click', () => handleDeleteButtonClick(hoverBar));
    }

    // 更新 Popper 位置
    currentParagraphPopperInstance.value?.update();
  } catch (error) {
    console.error('初始化代码编辑器失败:', error);
  }
}

// 修改 initializeQuillEditor 函数中的按钮事件绑定
function initializeQuillEditor(popover: HTMLElement, paragraph: HTMLElement) {
  const editorContainer = popover.querySelector('#quill-editor');
  if (!editorContainer) {
    console.error('找不到编辑器容器');
    return;
  }

  try {
    // 初始化 Quill 编辑器
    quillEditor.value = new Quill(editorContainer as HTMLElement, {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          [{ 'script': 'sub' }, { 'script': 'super' }],
          [{ 'size': ['small', false, 'large', 'huge'] }],
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'align': [] }],
          ['link', 'image', 'video'],
          ['clean']
        ]
      },
      placeholder: '编辑内容...',
      bounds: editorContainer as HTMLElement
    });

    // 设置编辑器内容
    const clonedParagraph = paragraph.cloneNode(true) as HTMLElement;
    const computedStyles = getComputedStyleProperties(paragraph);
    Object.assign(clonedParagraph.style, computedStyles);

    // 递归处理子元素样式
    const processChildStyles = (original: HTMLElement, clone: HTMLElement) => {
      const originalChildren = Array.from(original.children) as HTMLElement[];
      const cloneChildren = Array.from(clone.children) as HTMLElement[];

      originalChildren.forEach((child, index) => {
        const cloneChild = cloneChildren[index];
        if (cloneChild && child.tagName.toLowerCase() !== 'br') {
          const childStyles = getComputedStyleProperties(child);
          Object.assign(cloneChild.style, childStyles);
          processChildStyles(child, cloneChild);
        }
      });
    };

    processChildStyles(paragraph, clonedParagraph);

    // 将 HTML 中的 <br> 替换为 \n
    function setEditorContent(html: string) {
      if (quillEditor.value) {
        // 检查html是否包含<ul>标签
        if (html.includes('<ul>')) {
          quillEditor.value.clipboard.dangerouslyPasteHTML(0, html, 'api');
        } else {
          const html2 = html.replace(/<br\s*\/?>/g, '\n');
          quillEditor.value.root.innerHTML = html2;
        }
      }
    }

    // 设置编辑器内容
    const tagName = clonedParagraph.tagName.toLowerCase();
    if (tagName === 'li') {
      if (clonedParagraph.children.length > 1) {
        setEditorContent(`<p>${clonedParagraph.innerHTML}</p>`);
      } else {
        setEditorContent(clonedParagraph.innerHTML);
      }
    } else if (tagName === 'figure') {
      // 查找figure中的img节点
      const imgNode = clonedParagraph.querySelector('img');
      if (imgNode) {
        // 如果找到img节点,使用它的outerHTML作为编辑内容
        setEditorContent(imgNode.outerHTML);
      } else {
        // 如果没找到img节点,使用原始内容
        setEditorContent(clonedParagraph.innerHTML);
      }
    } else {
      setEditorContent(clonedParagraph.outerHTML);
    }

    // 如果内容是时间格式,说明是新插入的文本,需要全选
    setTimeout(() => {
      const content = quillEditor.value?.getText() || '';
      const isTimeString = /^\d{4}\/\d{1,2}\/\d{1,2}\s\d{1,2}:\d{1,2}:\d{1,2}/.test(content);
      if (isTimeString) {
        quillEditor.value?.setSelection(0, content.length);
      } else {
        quillEditor.value?.setSelection(100000, 0, 'api');
      }
    }, 100);

    // 更新 Popper 位置
    currentParagraphPopperInstance.value?.update();

    // 重建按钮，避免重复绑定事件
    const popoverActions = popover.querySelector('.popover-actions');
    if (popoverActions) {
      popoverActions.innerHTML = popoverActions.innerHTML;
    }

    // 添加按钮事件
    const saveBtn = popover.querySelector('.save-btn');
    const copyBtn = popover.querySelector('.copy-btn');
    const deleteBtn = popover.querySelector('.delete-btn');
    const chatBtn = popover.querySelector('.chat-btn');
    const hoverBar = editingParagraph.value?.querySelector('.paragraph-hover-bar') as HTMLElement;

    // 添加保存按钮事件
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (editingParagraph.value && quillEditor.value) {
          const container = editingParagraph.value;
          const paragraph = container.children[0] as HTMLElement;
          const hoverBar = container.querySelector('.paragraph-hover-bar') as HTMLElement;

          handleEditedParagraph(container, hoverBar);
          updateEditedParagraphs();

          const html = quillEditor.value.getSemanticHTML()
            .replace(/^\n+|\n+$/g, '')
            .replace(/\n/g, '<br>')
            .replace(/^<p[^>]*><br><\/p>|<p[^>]*><br><\/p>$/g, '')
            .replace(/<p[^>]*><\/p>/g, '')
            .replace(/(<p[^>]*><br><\/p>){2,}/g, '<p><br></p>');

          if (paragraph.tagName.toLowerCase() === 'li') {
            paragraph.innerHTML = html;
          } else {
            const p = document.createElement('p');
            p.innerHTML = html;

            const children = p.children;
            if (children.length === 0) {
              container.remove();
            } else if (children.length === 1) {
              container.replaceChild(children[0], paragraph);
            } else if (children.length > 1) {
              container.replaceChild(p, paragraph);
            }
          }

          applyCodeHighlighting(container);
          closeParagraphPopover(hoverBar);
        }
      });
    }

    // 添加复制和删除按钮事件
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = quillEditor.value?.getText() || '';
        handleCopyButtonClick(text, copyBtn as HTMLElement);
      });
    }

    if (deleteBtn && hoverBar) {
      deleteBtn.addEventListener('click', () => handleDeleteButtonClick(hoverBar));
    }

    // 添加对话按钮事件
    if (chatBtn) {
      const chatResponse = popover.querySelector('.chat-response') as HTMLElement;
      if (chatResponse) {
        chatBtn.addEventListener('click', async () => {
          const editor = quillEditor.value;
          if (editingParagraph.value && editor) {
            // 获取编辑器中的所有图片src
            const images = editor.root.getElementsByTagName('img');

            // 处理base64图片,去掉前缀只保留编码数据
            const base64Prefix = 'data:image/';
            const processedImages = Array.from(images).map(img => {
              if (img.src.startsWith(base64Prefix)) {
                // 找到第一个逗号后的所有内容
                const commaIndex = img.src.indexOf(',');
                if (commaIndex !== -1) {
                  return img.src.substring(commaIndex + 1);
                }
              }
              return img.src;
            });

            // 获取段落文本
            let prompt = (editor.getText() || '').trim();
            if (prompt === '') {
              if (processedImages.length > 0) {
                prompt = '请描述图片内容';
              } else {
                chatResponse.textContent = '请输入具体问题';
                return;
              }
            }

            let model = OLLAMA_MODEL.value;
            let loading = '思考中...';
            const message: any = {
              role: 'user',
              content: `${prompt}`
            };

            if (processedImages.length > 0) {
              model = OLLAMA_VISION_MODEL.value;
              if (!model) {
                chatResponse.textContent = '视觉模型未选择';
                return;
              }

              message.images = processedImages;
              loading = '分析图片...';
            } else {
              if (!model) {
                chatResponse.textContent = '文本模型未选择';
                return;
              }
            }

            // 显示响应区域并清空之前的内容
            chatResponse.style.display = 'block';
            chatResponse.textContent = loading;

            try {
              // 调用 ollama chat API 进行对话
              const response = await ollama.chat({
                model: model,
                messages: [message],
                stream: true
              });

              // 清空响应区域
              chatResponse.textContent = '';

              // 处理流式响应
              for await (const part of response) {
                chatResponse.textContent += removeThinkTags(part.message.content);
                // 自动滚动到底部
                chatResponse.scrollTop = chatResponse.scrollHeight;
              }

              const html = await marked(chatResponse.textContent);
              chatResponse.innerHTML = html;

              // 在编辑器末尾添加AI回复
              const now = new Date();
              const formattedTime = now.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              }).replace(/\//g, '-');
              const aiPrefix = `[AI] ${formattedTime}: \n`;
              const range = editor.getLength();

              // 插入换行
              editor.insertText(range, aiPrefix, {
                'color': 'green'
              });

              const html2 = `<div style="color: green;">${html}</div>`;
              editor.clipboard.dangerouslyPasteHTML(range + aiPrefix.length, html2, 'api');
            } catch (error) {
              chatResponse.textContent = '对话失败: ' + (error as Error).message;
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('初始化 Quill 编辑器失败:', error);
  }
}

// 添加通用的按钮处理函数
async function handleCopyButtonClick(text: string, copyBtn: HTMLElement) {
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = '✓ 已复制';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = '复制';
      copyBtn.classList.remove('copied');
    }, 2000);
  } catch (err) {
    copyBtn.textContent = '× 复制失败';
    copyBtn.classList.add('copy-failed');
    setTimeout(() => {
      copyBtn.textContent = '复制';
      copyBtn.classList.remove('copy-failed');
    }, 2000);
    console.error('复制失败:', err);
  }
}

function handleDeleteButtonClick(hoverBar: HTMLElement) {
  if (editingParagraph.value) {
    const container = editingParagraph.value;
    container.remove();
    closeParagraphPopover(hoverBar);
  }
}

// 添加字体大小的响应式变量
const fontScale = ref(localStorage.getItem('FONT_SCALE') || '1');
document.documentElement.style.setProperty('--font-scale', fontScale.value);

// 添加保存字体大小的函数
function saveFontSize(size: string): void {
  fontScale.value = size;
  localStorage.setItem('FONT_SCALE', size);
  document.documentElement.style.setProperty('--font-scale', size);
}

// 添加主题相关的响应式变量
const currentTheme = ref(localStorage.getItem('READER_THEME') || 'light');
const isThemeChanging = ref(false); // 添加标志位，防止循环切换

// 添加切换主题的函数
function toggleTheme(theme: string, fromParent: boolean = false) {
  if (isThemeChanging.value) return;
  isThemeChanging.value = true;

  try {
    // 保存新主题
    currentTheme.value = theme;

    // 更新文档主题
    updateDocumentTheme(theme);

    // 只有当不是来自父窗口的切换时，才发送消息
    if (!fromParent) {
      // 向父窗口发送主题变更消息
      window.parent.postMessage({ type: 'themeChange', theme }, '*');
    }
  } finally {
    // 使用setTimeout确保在下一个事件循环中重置标志位
    setTimeout(() => {
      isThemeChanging.value = false;
    }, 100);
  }
}

// 修改更新文档主题的函数
function updateDocumentTheme(theme: string) {
  // 更新本地存储
  localStorage.setItem('READER_THEME', theme);

  // 更新主题属性
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);

  // 更新所有带有data-theme属性的元素
  const themeableElements = document.querySelectorAll('[data-theme]');
  themeableElements.forEach(element => {
    element.setAttribute('data-theme', theme);
  });
}

// 监听主题变化
watch(currentTheme, (newTheme) => {
  updateDocumentTheme(newTheme);
});

</script>

<template>
  <div class="reader-sidedoor">
    <!-- 稍后阅读列表弹窗 -->
    <div v-if="showReadLaterList" class="read-later-modal">
      <ReadLaterList v-if="!selectedArticleId" @close="showReadLaterList = false" @openArticle="openSavedArticle" />
      <ReadLaterDetail v-else :articleId="selectedArticleId" @close="showReadLaterList = false"
        @back="selectedArticleId = null" />
    </div>

    <div class="reader-container" tabindex="0">
      <button class="settings-button" @click="openSettingsPopover" title="设置">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z">
          </path>
        </svg>
      </button>
      <div class="article-info">
        <p class="article-url">
          <a :href="props.url" target="_blank" rel="noopener noreferrer">
            {{ props.url }}
          </a>
        </p>
        <h1 class="article-title translation" tabindex="0">
          <span class="origin-text article-title-value">{{ title }}</span>
          <span v-if="translatedTitle" :class="isTranslatedTitle ? 'translated' : 'translating'">
            <br />
            <span class="article-title-translation">{{ translatedTitle }}</span>
          </span>
        </h1>
        <p class="article-details">
          <span class="detail-item">
            <span class="detail-label">日期:</span>
            <span class="detail-value article-publishedtime-value">{{ publishedTime }}</span>
          </span>
          <span class="detail-item">
            <span class="detail-label">长度:</span>
            <span class="detail-value article-length-value">{{ length }} 字符</span>
          </span>
          <span class="detail-item">
            <span class="detail-label">语言:</span>
            <span class="detail-value article-lang-value">{{ lang }}</span>
          </span>
          <span class="detail-item">
            <span class="detail-label">署名:</span>
            <span class="detail-value article-byline-value">{{ byline }}</span>
          </span>
          <span class="detail-item">
            <span class="detail-label">网站:</span>
            <span class="detail-value article-sitename-value">{{ siteName }}</span>
          </span>
        </p>
        <p class="article-excerpt">
          <span class="detail-label">摘要:</span>
          <span class="detail-value translation">
            <span class="origin-text article-excerpt-value">{{ excerpt }}</span>
            <span v-if="translatedExcerpt" :class="isTranslatedExcerpt ? 'translated' : 'translating'">
              <br />
              <span class="article-excerpt-translation">{{ translatedExcerpt }}</span>
            </span>
          </span>
        </p>
        <div class="summary">
          <h2 class="summary-title" title="重新生成文章摘要" @click="generateSummary()">文章摘要</h2>
          <div class="summary-content" v-html="summary"></div>
        </div>
      </div>
      <div class="article-content">
        <div ref="contentContainer"></div>
      </div>
    </div>
  </div>
</template>
<style>
@import './Reader.css';
</style>