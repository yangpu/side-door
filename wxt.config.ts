import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'Side Door',
    description: '一个用于阅读和总结网页内容的扩展',
    action: {
      default_title: '旁门-帮你简读文章', // 修改这里的默认tooltip
    },
    host_permissions: [
      '<all_urls>',
      'http://localhost:11434/*', // 明确允许访问本地 Ollama 服务
      'http://127.0.0.1:11434/*', // 同时支持 127.0.0.1
    ],
    permissions: [
      'activeTab',
      'scripting',
      'tabs',
      'storage',
      'clipboardWrite',
      'clipboardRead',
    ],
    web_accessible_resources: [
      {
        resources: ['popup.html'],
        matches: ['<all_urls>'],
      },
    ],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
  },
  webExt: {
    startUrls: ['http://localhost:8080'],
  },
});
