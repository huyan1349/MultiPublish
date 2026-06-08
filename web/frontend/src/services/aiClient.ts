import { useAiConfig, selectActiveConfig } from '../hooks/useAiConfig';
import type { ProviderId } from '../config/aiProviders';

const API_URL = 'http://localhost:4395/api/ai/chat';
const PING_URL = 'http://localhost:4395/api/ai/ping';
const TIMEOUT_MS = 30000;
const STREAM_TIMEOUT_MS = 90000;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** 不在 payload 中传递 apiKey（用于回退到服务端 DEEPSEEK_API_KEY，仅 DeepSeek 有效） */
  useServerKey?: boolean;
}

export interface StreamCallback {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export interface PingResult {
  ok: boolean;
  provider?: ProviderId;
  model?: string;
  latencyMs?: number;
  error?: string;
  detail?: string;
}

class AiNotConfiguredError extends Error {
  constructor() {
    super('未配置 AI 供应商，请先在设置页配置');
    this.name = 'AiNotConfiguredError';
  }
}

function ensureConfigured(): { providerId: ProviderId; model: string; apiKey: string } {
  const cfg = selectActiveConfig();
  if (!cfg) throw new AiNotConfiguredError();
  if (!cfg.apiKey) {
    throw new Error('未填写 API Key，请在设置页填写或勾选"记住 API Key"');
  }
  return { providerId: cfg.provider.id, model: cfg.model, apiKey: cfg.apiKey };
}

/** 同步更新运行时的 connection status（用于非测试场景，例如 chat 失败时标记 error） */
function markRuntimeError(err: unknown) {
  if (err instanceof AiNotConfiguredError) return;
  const message = err instanceof Error ? err.message : 'AI 请求失败';
  try {
    useAiConfig.getState().setStatus('error', message);
  } catch {
    // ignore
  }
}

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const cfg = ensureConfigured();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: cfg.providerId,
        model: cfg.model,
        apiKey: options.useServerKey ? undefined : cfg.apiKey,
        useServerKey: options.useServerKey || undefined,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const message =
        (errBody as { error?: string }).error ||
        (errBody as { message?: string }).message ||
        `AI 请求失败 (${res.status})`;
      throw new Error(message);
    }

    const data = (await res.json()) as { content?: string; choices?: Array<{ message: { content: string } }> };
    const content = data.content ?? data.choices?.[0]?.message.content;
    if (!content) throw new Error('AI 返回为空');
    return content;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('AI 请求超时（30s），请稍后重试');
    }
    markRuntimeError(err);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function streamChat(
  messages: ChatMessage[],
  callbacks: StreamCallback,
  options: ChatOptions = {},
): Promise<void> {
  const cfg = ensureConfigured();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: cfg.providerId,
        model: cfg.model,
        apiKey: options.useServerKey ? undefined : cfg.apiKey,
        useServerKey: options.useServerKey || undefined,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const message =
        (errBody as { error?: string }).error ||
        (errBody as { message?: string }).message ||
        `AI 请求失败 (${res.status})`;
      throw new Error(message);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('不支持流式读取');

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            callbacks.onToken(delta);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    callbacks.onComplete(fullText);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      callbacks.onError(new Error('AI 请求超时，请稍后重试'));
    } else {
      const e = err instanceof Error ? err : new Error('流式请求失败');
      markRuntimeError(e);
      callbacks.onError(e);
    }
  } finally {
    clearTimeout(timer);
  }
}

/** 测连通：调用后端 /api/ai/ping */
export async function ping(args: {
  provider: ProviderId;
  model: string;
  apiKey: string;
}): Promise<PingResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(PING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: args.provider,
        model: args.model,
        apiKey: args.apiKey,
      }),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as PingResult;
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || `测连通失败 (${res.status})`,
        detail: data.detail,
        latencyMs: data.latencyMs,
      };
    }
    return { ok: true, provider: data.provider, model: data.model, latencyMs: data.latencyMs };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, error: '测连通超时（25s）' };
    }
    return { ok: false, error: err instanceof Error ? err.message : '测连通失败' };
  } finally {
    clearTimeout(timer);
  }
}
