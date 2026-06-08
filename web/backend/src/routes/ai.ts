import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getAdapter, getProviderConfig, PROVIDERS } from '../providers/registry.js';
import type { AdapterContext } from '../providers/providerAdapters.js';

export const aiRouter = Router();

// 校验 schema：与前端 aiClient payload 一致
const chatSchema = z.object({
  provider: z.enum(['deepseek', 'openai', 'claude', 'kimi', 'minimax']),
  model: z.string().min(1).max(100),
  apiKey: z.string().min(1).max(400).optional(),
  useServerKey: z.boolean().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().max(200_000),
      }),
    )
    .min(1)
    .max(50),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(32_000).optional(),
  stream: z.boolean().optional(),
});

const pingSchema = z.object({
  provider: z.enum(['deepseek', 'openai', 'claude', 'kimi', 'minimax']),
  model: z.string().min(1).max(100),
  apiKey: z.string().min(1).max(400),
});

/**
 * 决定本请求要用的 API key：
 * 1) body.apiKey 优先（用户在前端配置）
 * 2) 否则若 useServerKey=true 且 provider=deepseek 且 DEEPSEEK_API_KEY 存在 → 用 env（向后兼容）
 * 3) 都没有则报错
 */
function resolveApiKey(args: {
  provider: string;
  apiKey?: string;
  useServerKey?: boolean;
}): { apiKey: string; usedServerKey: boolean } {
  const { provider, apiKey, useServerKey } = args;

  if (apiKey && apiKey.trim().length > 0) {
    return { apiKey, usedServerKey: false };
  }

  if (useServerKey && provider === 'deepseek') {
    const envKey = process.env.DEEPSEEK_API_KEY;
    if (envKey && envKey.trim().length > 0) {
      return { apiKey: envKey, usedServerKey: true };
    }
  }

  throw new Error('未配置 API Key，请在前端设置页填写，或在服务端设置 DEEPSEEK_API_KEY 环境变量并传 useServerKey=true');
}

/**
 * POST /api/ai/chat
 * Body: { provider, model, apiKey?, useServerKey?, messages, temperature?, max_tokens?, stream? }
 *
 * 注意：永远不要 console.log(apiKey)。错误消息也要 redact 任何含 apiKey 子串的字段。
 */
aiRouter.post('/chat', async (req: Request, res: Response) => {
  const parse = chatSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid request', issues: parse.error.issues });
    return;
  }
  const data = parse.data;

  const provider = getProviderConfig(data.provider);
  if (!provider || !provider.enabled) {
    res.status(400).json({ error: `Provider not available: ${data.provider}` });
    return;
  }

  let apiKey: string;
  try {
    const resolved = resolveApiKey({
      provider: data.provider,
      apiKey: data.apiKey,
      useServerKey: data.useServerKey,
    });
    apiKey = resolved.apiKey;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'API key missing';
    res.status(401).json({ error: message });
    return;
  }

  const adapter = getAdapter(data.provider);
  const ctx: AdapterContext = {
    apiKey,
    model: data.model,
    body: {
      messages: data.messages,
      temperature: data.temperature,
      max_tokens: data.max_tokens,
      stream: data.stream,
    },
  };

  const upstream = adapter.buildRequest(ctx);

  try {
    const response = await fetch(upstream.url, {
      method: upstream.method,
      headers: upstream.headers,
      body: upstream.bodyString,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      // 上游错误可能回显请求体（含 apiKey）；做最保守的 redact
      const safeText = errText.replace(/sk-[A-Za-z0-9_\-]{16,}/g, '[REDACTED]');
      res.status(response.status).json({
        error: `Upstream returned ${response.status}`,
        detail: safeText.slice(0, 1000),
      });
      return;
    }

    if (data.stream && adapter.transformStreamBody) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      if (!response.body) {
        res.status(500).json({ error: 'Upstream has no body' });
        return;
      }

      const transformed = adapter.transformStreamBody(response.body);
      // 用 Node Web Stream -> Node Readable 桥接到 Express Response
      const { Readable } = await import('node:stream');
      const nodeStream = Readable.fromWeb(transformed as unknown as import('node:stream/web').ReadableStream);
      nodeStream.pipe(res);

      nodeStream.on('error', (err: Error) => {
        // 静默关闭（已经写过 headers，不能再 res.status）
        if (!res.headersSent) {
          res.status(500).json({ error: err.message });
        } else {
          res.end();
        }
      });
      return;
    }

    if (data.stream && !adapter.transformStreamBody) {
      // OpenAI 兼容家族无需转换，直接透传 OpenAI-SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      if (!response.body) {
        res.status(500).json({ error: 'Upstream has no body' });
        return;
      }
      const { Readable } = await import('node:stream');
      const nodeStream = Readable.fromWeb(response.body as unknown as import('node:stream/web').ReadableStream);
      nodeStream.pipe(res);
      return;
    }

    // 非流式
    const json = (await response.json()) as unknown;
    const parsed = adapter.parseResponse(json);
    res.json({ content: parsed.content, provider: data.provider, model: data.model });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI proxy request failed';
    const safeMessage = message.replace(/sk-[A-Za-z0-9_\-]{16,}/g, '[REDACTED]');
    res.status(500).json({ error: safeMessage });
  }
});

/**
 * POST /api/ai/ping
 * Body: { provider, model, apiKey }
 * 返回 { ok, provider, model, latencyMs, error?, detail? }
 *
 * 用途：前端 modal 点 "测试连接" 时调用，验证 key 是否有效。
 * apiKey 不会被持久化（这条路由不写任何 storage，只读 body 走一遍上游）。
 */
aiRouter.post('/ping', async (req: Request, res: Response) => {
  const parse = pingSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ ok: false, error: 'Invalid request', issues: parse.error.issues });
    return;
  }
  const data = parse.data;

  const provider = getProviderConfig(data.provider);
  if (!provider || !provider.enabled) {
    res.status(400).json({ ok: false, error: `Provider not available: ${data.provider}` });
    return;
  }

  const adapter = getAdapter(data.provider);
  const ctx: AdapterContext = {
    apiKey: data.apiKey,
    model: data.model,
    body: {
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      temperature: 0,
      stream: false,
    },
  };
  const upstream = adapter.buildRequest(ctx);

  const start = Date.now();
  try {
    const r = await fetch(upstream.url, {
      method: upstream.method,
      headers: upstream.headers,
      body: upstream.bodyString,
    });
    const latencyMs = Date.now() - start;

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      const safeText = errText.replace(/sk-[A-Za-z0-9_\-]{16,}/g, '[REDACTED]');
      res.status(r.status).json({
        ok: false,
        error: `Upstream returned ${r.status}`,
        detail: safeText.slice(0, 500),
        latencyMs,
      });
      return;
    }

    res.json({ ok: true, provider: data.provider, model: data.model, latencyMs });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : 'Network error';
    const safeMessage = message.replace(/sk-[A-Za-z0-9_\-]{16,}/g, '[REDACTED]');
    res.status(500).json({ ok: false, error: safeMessage, latencyMs });
  }
});

/**
 * GET /api/ai/platforms
 * 返回所有供应商（前端 modal 列表用）
 */
aiRouter.get('/platforms', (_req: Request, res: Response) => {
  res.json(
    PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      defaultModel: p.defaultModel,
      models: p.models,
      enabled: p.enabled,
    })),
  );
});
