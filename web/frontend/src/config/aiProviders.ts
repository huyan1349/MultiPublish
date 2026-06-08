/**
 * AI 供应商配置（前端 UI 与后端 registry 的真理来源）
 *
 * 新增供应商时：
 *   1. 在 PROVIDERS 数组中追加一项
 *   2. 后端 web/backend/src/providers/registry.ts 同步添加
 *   3. 如使用新的认证方式（非 OpenAI 兼容或 x-api-key），新增 Adapter
 */

export type ProviderId = 'deepseek' | 'openai' | 'claude' | 'kimi' | 'minimax';

export type AuthStyle = 'bearer' | 'x-api-key';

export interface ModelOption {
  id: string;
  label: string;
  contextWindow?: number;
}

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  baseUrl: string;
  authStyle: AuthStyle;
  defaultModel: string;
  models: ModelOption[];
  extraHeaders?: Record<string, string>;
  docsUrl: string;
  enabled: boolean;
  placeholder?: string;
  hint?: string;
}

export const PROVIDERS: readonly ProviderConfig[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    authStyle: 'bearer',
    defaultModel: 'deepseek-v4-flash',
    models: [
      { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', contextWindow: 1000000 },
      { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', contextWindow: 1000000 },
      { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner (legacy)', contextWindow: 128000 },
    ],
    docsUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
    enabled: true,
    hint: 'V4 Flash 性价比最高（支持 thinking / non-thinking 双模），V4 Pro 适合更高质量场景。',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    authStyle: 'bearer',
    defaultModel: 'gpt-5.4-mini',
    models: [
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', contextWindow: 400000 },
      { id: 'gpt-5.4', label: 'GPT-5.4', contextWindow: 1000000 },
      { id: 'gpt-5.5', label: 'GPT-5.5', contextWindow: 1000000 },
    ],
    docsUrl: 'https://developers.openai.com/api/docs/models',
    enabled: true,
    hint: 'GPT-5.4 mini 性价比优选；GPT-5.5 用于最复杂任务。',
  },
  {
    id: 'claude',
    label: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    authStyle: 'x-api-key',
    defaultModel: 'claude-sonnet-4-6',
    extraHeaders: { 'anthropic-version': '2023-06-01' },
    models: [
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', contextWindow: 1000000 },
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', contextWindow: 1000000 },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', contextWindow: 200000 },
    ],
    docsUrl: 'https://platform.claude.com/docs/en/docs/about-claude/models/overview',
    enabled: true,
    hint: 'Sonnet 4.6 速度/质量均衡；Opus 4.8 最强；Haiku 4.5 最快最省。',
  },
  {
    id: 'kimi',
    label: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    authStyle: 'bearer',
    defaultModel: 'kimi-k2.6',
    models: [
      { id: 'kimi-k2.6', label: 'Kimi K2.6', contextWindow: 256000 },
      { id: 'kimi-k2.5', label: 'Kimi K2.5', contextWindow: 256000 },
      { id: 'moonshot-v1-128k', label: 'Moonshot v1 128K (legacy)', contextWindow: 128000 },
    ],
    docsUrl: 'https://platform.kimi.com/docs/intro',
    enabled: true,
    hint: 'K2.6 多模态 + 长上下文；中文写作与长代码任务强。',
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    baseUrl: 'https://api.minimax.io/anthropic/v1/messages',
    authStyle: 'x-api-key',
    defaultModel: 'MiniMax-M3',
    extraHeaders: { 'anthropic-version': '2023-06-01' },
    models: [
      { id: 'MiniMax-M3', label: 'MiniMax M3', contextWindow: 1000000 },
      { id: 'MiniMax-M2.7', label: 'MiniMax M2.7', contextWindow: 1000000 },
      { id: 'MiniMax-M2.7-highspeed', label: 'MiniMax M2.7 Highspeed', contextWindow: 1000000 },
    ],
    docsUrl: 'https://platform.minimax.io/docs/api-reference/text-anthropic-api',
    enabled: true,
    hint: 'Anthropic 协议兼容。旗舰 M3，速度/质量按需在 2.7 与 M2.5 之间取舍。',
  },
] as const;

export function getProvider(id: ProviderId | string | null | undefined): ProviderConfig | undefined {
  if (!id) return undefined;
  return PROVIDERS.find((p) => p.id === id);
}

export function getEnabledProviders(): ProviderConfig[] {
  return PROVIDERS.filter((p) => p.enabled);
}

export function getDefaultModelFor(id: ProviderId | string | null | undefined): string {
  const p = getProvider(id);
  return p?.defaultModel ?? '';
}
