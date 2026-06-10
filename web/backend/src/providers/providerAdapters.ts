/**
 * AI 供应商 Adapter
 *
 * 每个 Adapter 负责：
 *  1. 把通用 chat 请求（messages + temperature + max_tokens + stream）翻译成供应商的 HTTP 请求
 *  2. 解析供应商的非流式响应
 *  3. 把供应商的流式响应转换成统一的 OpenAI-SSE 格式
 *     (data: {choices:[{delta:{content:"text"}}]}\n\n)，这样前端 SSE 解析器无需改动
 *
 * 安全：所有错误处理路径中必须 redact apiKey（绝不打印到日志或错误消息）。
 */

export interface UpstreamRequest {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  bodyString: string;
}

export interface AdapterContext {
  apiKey: string;
  model: string;
  body: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  };
}

export interface AdapterResponse {
  content: string;
  /** 一些供应商会返回 usage；目前不强制 */
  usage?: unknown;
}

export interface ProviderAdapter {
  /** 构造上游 HTTP 请求 */
  buildRequest(ctx: AdapterContext): UpstreamRequest;
  /** 解析非流式 JSON 响应 */
  parseResponse(json: unknown): AdapterResponse;
  /**
   * 把上游 SSE 字节流转换成 OpenAI-SSE 字节流（只对流式有意义）。
   * 返回 null 表示无需转换（上游本身就是 OpenAI-SSE）。
   */
  transformStreamBody?(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array>;
}

type OpenAITokenLimitParam = 'max_tokens' | 'max_completion_tokens';

// ---------------------------------------------------------------------------
// OpenAI 兼容家族（DeepSeek / OpenAI / Kimi / MiniMax 占位）
// ---------------------------------------------------------------------------

export class OpenAICompatibleAdapter implements ProviderAdapter {
  constructor(
    private readonly baseUrl: string,
    private readonly opts: { tokenLimitParam?: OpenAITokenLimitParam } = {},
  ) {}

  buildRequest(ctx: AdapterContext): UpstreamRequest {
    const tokenLimitParam = this.opts.tokenLimitParam ?? 'max_tokens';

    return {
      url: this.baseUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.apiKey}`,
      },
      bodyString: JSON.stringify({
        model: ctx.model,
        messages: ctx.body.messages,
        temperature: ctx.body.temperature ?? 0.7,
        [tokenLimitParam]: ctx.body.max_tokens ?? 4096,
        stream: !!ctx.body.stream,
      }),
    };
  }

  parseResponse(json: unknown): AdapterResponse {
    const data = json as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    return { content };
  }

  // 上游本身是 OpenAI-SSE 格式，直接透传
  transformStreamBody?(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    return body;
  };
}

// ---------------------------------------------------------------------------
// Anthropic Claude Adapter
// ---------------------------------------------------------------------------
//
// Claude 关键差异：
//   - 端点 POST /v1/messages
//   - Auth: x-api-key 头 + anthropic-version: 2023-06-01
//   - max_tokens 必填
//   - system 消息是顶层字段，不在 messages[] 中
//   - 非流式响应：{ content: [{type:'text', text:'...'}], ... }
//   - 流式事件：message_start → content_block_start → content_block_delta → content_block_stop → message_delta → message_stop
//     其中 content_block_delta 的 delta.text 是增量文本
//
// 我们把流式响应翻译成 OpenAI-SSE，让前端 aiClient 的解析器（data: {choices:[{delta:{content}}]}）无需改动。

export class AnthropicAdapter implements ProviderAdapter {
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(opts: { baseUrl?: string; apiVersion?: string } = {}) {
    this.baseUrl = opts.baseUrl ?? 'https://api.anthropic.com/v1/messages';
    this.apiVersion = opts.apiVersion ?? '2023-06-01';
  }

  buildRequest(ctx: AdapterContext): UpstreamRequest {
    const messages = ctx.body.messages.filter((m) => m.role !== 'system');
    const systemMsg = ctx.body.messages.find((m) => m.role === 'system');

    return {
      url: this.baseUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ctx.apiKey,
        'anthropic-version': this.apiVersion,
      },
      bodyString: JSON.stringify({
        model: ctx.model,
        system: systemMsg?.content,
        messages,
        max_tokens: ctx.body.max_tokens ?? 4096,
        temperature: ctx.body.temperature ?? 0.7,
        stream: !!ctx.body.stream,
      }),
    };
  }

  parseResponse(json: unknown): AdapterResponse {
    const data = json as {
      content?: Array<{ type: string; text?: string }>;
    };
    const textBlock = data.content?.find((b) => b.type === 'text' && typeof b.text === 'string');
    return { content: textBlock?.text ?? '' };
  }

  /**
   * 将 Anthropic SSE 事件流翻译为 OpenAI-SSE。
   * 每个 Anthropic 事件格式：
   *   event: content_block_delta
   *   data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}
   *
   * 我们将 text_delta 转写为：
   *   data: {"choices":[{"index":0,"delta":{"content":"Hi"}}]}
   * （外加 \n\n 行尾）
   *
   * 实现：先在内存中读完整个上游流（SSE 数据量小），处理后一次性输出。
   * 这样避免了流式分块时跨 chunk 拼接事件的复杂性，且对性能影响可忽略。
   */
  transformStreamBody(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const reader = body.getReader();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // 1) 读完整个上游流
          let raw = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            raw += decoder.decode(value, { stream: true });
          }
          raw += decoder.decode(); // flush

          // 2) 按空行切分事件
          const out: string[] = [];
          const events = raw.split(/\n\n/);

          for (const ev of events) {
            if (!ev.trim()) continue;
            const dataLine = ev
              .split('\n')
              .find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            const dataPayload = dataLine.slice(5).trim();
            if (!dataPayload) continue;
            if (dataPayload === '[DONE]') {
              out.push('data: [DONE]\n\n');
              continue;
            }

            let parsed: unknown;
            try {
              parsed = JSON.parse(dataPayload);
            } catch {
              continue;
            }
            const evt = parsed as { type?: string; delta?: { type?: string; text?: string } };

            if (
              evt.type === 'content_block_delta' &&
              evt.delta?.type === 'text_delta' &&
              typeof evt.delta.text === 'string'
            ) {
              const openaiChunk = {
                choices: [
                  {
                    index: 0,
                    delta: { content: evt.delta.text },
                  },
                ],
              };
              out.push(`data: ${JSON.stringify(openaiChunk)}\n\n`);
            }
            // 其他事件（message_start、ping 等）忽略
          }

          // 3) 始终以 [DONE] 结束（即便上游没有）
          if (!out.some((s) => s.includes('[DONE]'))) {
            out.push('data: [DONE]\n\n');
          }

          controller.enqueue(encoder.encode(out.join('')));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        reader.cancel();
      },
    });
  }
}
