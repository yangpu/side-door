import { Ollama, ChatResponse } from 'ollama/browser';
import { extensionFetch } from './extensionFetch';

export interface ModelResponse {
  content: string;
}

export interface ModelMessage {
  role: string;
  content: string;
  images?: string[];
}

export interface AbortableAsyncGenerator<T> {
  generator: AsyncGenerator<T>;
  abort(): void;
}

export interface ModelInfo {
  name: string;
  size?: number;
  modified_at?: string;
  digest?: string;
}

export interface ModelService {
  chat(params: {
    model: string;
    messages: ModelMessage[];
  }): Promise<ModelResponse>;

  chating(params: {
    model: string;
    messages: ModelMessage[];
  }): Promise<AbortableAsyncGenerator<ModelResponse>>;

  listModels(): Promise<ModelInfo[]>;

  abort(): void;
}

class OllamaService implements ModelService {
  private ollama: Ollama;
  private modelListCache: ModelInfo[] | null = null;
  private modelListPromise: Promise<ModelInfo[]> | null = null;

  constructor() {
    // 显式配置 Ollama host，确保在浏览器扩展环境中正确工作
    // 使用自定义 fetch 通过 background script 代理请求
    this.ollama = new Ollama({
      host: 'http://localhost:11434',
      fetch: extensionFetch as any, // 使用扩展专用的 fetch
    });
  }

  async chat(params: {
    model: string;
    messages: ModelMessage[];
  }): Promise<ModelResponse> {
    const response = await this.ollama.chat(params);
    return {
      content: response.message.content,
    };
  }

  async chating(params: {
    model: string;
    messages: ModelMessage[];
  }): Promise<AbortableAsyncGenerator<ModelResponse>> {
    const response = await this.ollama.chat({ ...params, stream: true });

    async function* transform(): AsyncGenerator<ModelResponse> {
      for await (const part of response) {
        yield {
          content: part.message.content,
        };
      }
    }

    return {
      generator: transform(),
      abort: () => response.abort(),
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    if (this.modelListCache) {
      return this.modelListCache;
    }

    if (this.modelListPromise) {
      return this.modelListPromise;
    }

    this.modelListPromise = (async () => {
      try {
        const response = await this.ollama.list();
        const models = (response.models || []).map((model) => ({
          ...model,
          modified_at: model.modified_at?.toString(),
        }));
        this.modelListCache = models;
        return models;
      } catch (error) {
        console.error('获取模型列表失败:', error);
        return [];
      } finally {
        this.modelListPromise = null;
      }
    })();

    return this.modelListPromise;
  }

  clearModelListCache() {
    this.modelListCache = null;
  }

  abort() {
    this.ollama.abort();
  }
}

// 默认使用 Ollama 服务
let modelService: ModelService = new OllamaService();

// 设置当前使用的模型服务
export function setModelService(service: ModelService) {
  modelService = service;
}

// 获取当前使用的模型服务
export function getModelService(): ModelService {
  return modelService;
}
