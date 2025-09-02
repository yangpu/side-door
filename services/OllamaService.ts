export interface ModelConfig {
  temperature: number;
  contextLength: number;
  systemPrompt: string;
}

export interface GenerateParams {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: string;
  options?: {
    temperature?: number;
    num_ctx?: number;
    [key: string]: any;
  };
}

export class OllamaService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  // 获取可用模型列表
  async getModels() {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    return response.json();
  }

  // 生成文本
  async generateText(params: GenerateParams) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to generate text');
    }

    return response.json();
  }

  // 流式生成文本
  async *generateStream(params: GenerateParams) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...params, stream: true }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate stream');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            yield JSON.parse(line);
          } catch (e) {
            console.error('Failed to parse JSON:', e);
          }
        }
      }
    }

    if (buffer) {
      try {
        yield JSON.parse(buffer);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
      }
    }
  }

  // 构建生成参数
  buildGenerateParams(
    model: string,
    prompt: string,
    config: Partial<ModelConfig> = {}
  ): GenerateParams {
    return {
      model,
      prompt,
      system: config.systemPrompt,
      options: {
        temperature: config.temperature,
        num_ctx: config.contextLength,
      },
    };
  }
}
