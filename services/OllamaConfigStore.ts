import { ModelConfig } from './OllamaService.js';

export class OllamaConfigStore {
  private static readonly CONFIG_KEY = 'ollama_model_configs';

  // 获取所有模型配置
  static getAllConfigs(): Record<string, ModelConfig> {
    const configsJson = localStorage.getItem(this.CONFIG_KEY);
    return configsJson ? JSON.parse(configsJson) : {};
  }

  // 获取特定模型的配置
  static getConfig(modelName: string): ModelConfig | null {
    const configs = this.getAllConfigs();
    return configs[modelName] || null;
  }

  // 保存模型配置
  static saveConfig(modelName: string, config: ModelConfig): void {
    const configs = this.getAllConfigs();
    configs[modelName] = config;
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(configs));
  }

  // 删除模型配置
  static deleteConfig(modelName: string): void {
    const configs = this.getAllConfigs();
    delete configs[modelName];
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(configs));
  }

  // 获取默认配置
  static getDefaultConfig(): ModelConfig {
    return {
      temperature: 0.7,
      contextLength: 2048,
      systemPrompt: '',
    };
  }

  // 重置所有配置
  static resetAllConfigs(): void {
    localStorage.removeItem(this.CONFIG_KEY);
  }
}
