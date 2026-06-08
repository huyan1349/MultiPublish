/**
 * 供应商 registry
 *
 * 与前端 web/frontend/src/config/aiProviders.ts 保持一致：
 *   - PROVIDERS 列表（baseUrl、authStyle、defaultModel、models、enabled）
 *   - getAdapter(id) 返回 ProviderAdapter 实例
 *
 * 新增供应商时：追加 PROVIDERS 项 + 在 getAdapter 中注册 Adapter。
 */

import {
  OpenAICompatibleAdapter,
  AnthropicAdapter,
  type ProviderAdapter,
} from './providerAdapters.js';

export type ProviderId = 'deepseek' | 'openai' | 'claude' | 'kimi' | 'minimax';

export interface ModelOption {
  id: string;
  label: string;
  contextWindow?: number;
}

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  baseUrl: string;
  defaultModel: string;
  models: ModelOption[];
  enabled: boolean;
}

export const PROVIDERS: readonly ProviderConfig[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-v4-flash',
    models: [
      { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', contextWindow: 1000000 },
      { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', contextWindow: 1000000 },
      { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner (legacy)', contextWindow: 128000 },
    ],
    enabled: true,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-5.4-mini',
    models: [
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', contextWindow: 400000 },
      { id: 'gpt-5.4', label: 'GPT-5.4', contextWindow: 1000000 },
      { id: 'gpt-5.5', label: 'GPT-5.5', contextWindow: 1000000 },
    ],
    enabled: true,
  },
  {
    id: 'claude',
    label: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-6',
    models: [
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', contextWindow: 1000000 },
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', contextWindow: 1000000 },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', contextWindow: 200000 },
    ],
    enabled: true,
  },
  {
    id: 'kimi',
    label: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    defaultModel: 'kimi-k2.6',
    models: [
      { id: 'kimi-k2.6', label: 'Kimi K2.6', contextWindow: 256000 },
      { id: 'kimi-k2.5', label: 'Kimi K2.5', contextWindow: 256000 },
      { id: 'moonshot-v1-128k', label: 'Moonshot v1 128K (legacy)', contextWindow: 128000 },
    ],
    enabled: true,
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    baseUrl: 'https://api.minimax.io/anthropic/v1/messages',
    defaultModel: 'MiniMax-M3',
    models: [
      { id: 'MiniMax-M3', label: 'MiniMax M3', contextWindow: 1000000 },
      { id: 'MiniMax-M2.7', label: 'MiniMax M2.7', contextWindow: 1000000 },
      { id: 'MiniMax-M2.7-highspeed', label: 'MiniMax M2.7 Highspeed', contextWindow: 1000000 },
    ],
    enabled: true,
  },
] as const;

export function getProviderConfig(id: string | null | undefined): ProviderConfig | undefined {
  if (!id) return undefined;
  return PROVIDERS.find((p) => p.id === id);
}

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  deepseek: new OpenAICompatibleAdapter('https://api.deepseek.com/chat/completions'),
  openai: new OpenAICompatibleAdapter('https://api.openai.com/v1/chat/completions'),
  kimi: new OpenAICompatibleAdapter('https://api.moonshot.cn/v1/chat/completions'),
  // MiniMax 提供 Anthropic-SDK 兼容端点
  minimax: new AnthropicAdapter({ baseUrl: 'https://api.minimax.io/anthropic/v1/messages' }),
  claude: new AnthropicAdapter(),
};

export function getAdapter(id: string): ProviderAdapter {
  const adapter = ADAPTERS[id as ProviderId];
  if (!adapter) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return adapter;
}

/** 用于 /api/ai/platforms 列出所有供应商（前端与后端保持一致） */
export function listPlatforms() {
  return PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    baseUrl: p.baseUrl,
    defaultModel: p.defaultModel,
    models: p.models,
    enabled: p.enabled,
  }));
}
