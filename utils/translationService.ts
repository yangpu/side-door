import { getModelService } from './modelService.js';
import { settings } from './settings.js';

interface PreservedContent {
  type: 'tag' | 'entity' | 'math' | 'element' | 'emoji';
  content: string;
}

interface TranslationTask {
  node: HTMLElement;
  container: HTMLElement;
  count: number;
}

export class TranslationService {
  private enabled = false;
  private translating = false;
  private queue: TranslationTask[] = [];
  private counter = 0;

  private modelService = getModelService();

  constructor() {
    watch(
      settings.enableTranslation,
      (value) => {
        this.enable(value);
      },
      { immediate: true }
    );
  }

  public enable(value: boolean) {
    this.enabled = value;
    if (value) {
      this.processQueue();
    }
  }

  public async translate(content: string): Promise<string> {
    const model = settings.textModel.value;
    if (!this.enabled || !model) {
      return '';
    }

    try {
      const response = await this.modelService.chat({
        model,
        messages: [
          {
            role: 'system',
            content: `你是一个专业的翻译器，将以下内容翻译成中文。注意：不要翻译\${}格式的占位符，将它们原样保留。请严格按照原文翻译，不要添加任何其他内容。`,
          },
          {
            role: 'user',
            content: content,
          },
        ],
      });

      return response.content;
    } catch (error) {
      console.error('翻译失败:', error);
      return '';
    }
  }

  public async translateNode(node: HTMLElement, container: HTMLElement) {
    if (!this.enabled) {
      return;
    }

    const text = container.textContent;
    if (!text || !this.shouldTranslateText(text)) {
      return;
    }

    this.counter++;
    const task: TranslationTask = {
      node,
      container,
      count: this.counter,
    };

    this.queue.push(task);
    container.textContent = `翻译[${this.counter}]...`;
    container.className = 'translating';

    this.processQueue();
  }

  private async processQueue() {
    console.log('processQueue', this.queue.length);

    if (this.translating || this.queue.length === 0 || !this.enabled) {
      return;
    }

    this.translating = true;

    try {
      while (this.queue.length > 0 && this.enabled) {
        // 每次处理5个翻译任务
        const batch = this.queue.splice(0, 5);
        await Promise.all(
          batch.map(async ({ node, container }) => {
            try {
              const text = container.textContent || '';
              const translation = await this.translate(text);
              if (translation) {
                container.textContent = translation;
                container.classList.remove('translating');
                container.classList.add('translated');
                node.classList.add('original-text');
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
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } finally {
      this.translating = false;
    }
  }

  public shouldTranslateText(text: string): boolean {
    if (text.length <= 3) {
      return false;
    }

    if (!isNaN(Number(text))) {
      return false;
    }

    // 如果包含中文字符,不需要翻译
    if (this.containsChineseCharacters(text)) {
      return false;
    }

    return true;
  }

  private containsChineseCharacters(text: string): boolean {
    return /[\u4e00-\u9fa5]/.test(text);
  }

  public preserveElements(html: string): {
    processedHtml: string;
    preservedElements: Map<string, PreservedContent>;
  } {
    const preservedElements = new Map<string, PreservedContent>();
    let counter = 0;

    // 处理HTML标签
    let processedHtml = html.replace(/<[^>]+>/g, (match) => {
      const placeholder = `\${${counter++}}`;
      preservedElements.set(placeholder, {
        type: 'tag',
        content: match,
      });
      return placeholder;
    });

    // 处理HTML实体
    processedHtml = processedHtml.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
      const placeholder = `\${${counter++}}`;
      preservedElements.set(placeholder, {
        type: 'entity',
        content: match,
      });
      return placeholder;
    });

    return {
      processedHtml,
      preservedElements,
    };
  }

  public restoreElements(
    translatedHtml: string,
    preservedElements: Map<string, PreservedContent>
  ): string {
    if (!translatedHtml) {
      return '';
    }

    let restoredHtml = translatedHtml;

    // 获取所有占位符并按索引排序
    const placeholders = Array.from(preservedElements.keys()).sort((a, b) => {
      const numA = parseInt(a.match(/\$\{(\d+)\}/)?.[1] || '0');
      const numB = parseInt(b.match(/\$\{(\d+)\}/)?.[1] || '0');
      return numA - numB;
    });

    // 按顺序还原所有占位符
    for (const placeholder of placeholders) {
      const preserved = preservedElements.get(placeholder);
      if (preserved) {
        const { content } = preserved;
        const regex = new RegExp(this.escapeRegExp(placeholder), 'g');
        restoredHtml = restoredHtml.replace(regex, content);
      }
    }

    return restoredHtml;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  public reset() {
    this.queue = [];
    this.counter = 0;
    this.translating = false;
  }
}

export const translationService = new TranslationService();
