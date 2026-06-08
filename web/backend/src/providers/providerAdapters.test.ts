import { describe, it, expect } from 'vitest';
import { OpenAICompatibleAdapter, AnthropicAdapter } from './providerAdapters.js';

describe('OpenAICompatibleAdapter', () => {
  const adapter = new OpenAICompatibleAdapter('https://api.deepseek.com/chat/completions');

  it('builds a bearer-auth POST request with body fields', () => {
    const req = adapter.buildRequest({
      apiKey: 'sk-abcdef',
      model: 'deepseek-chat',
      body: {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'hi' },
        ],
        temperature: 0.5,
        max_tokens: 1024,
        stream: false,
      },
    });

    expect(req.method).toBe('POST');
    expect(req.url).toBe('https://api.deepseek.com/chat/completions');
    expect(req.headers.Authorization).toBe('Bearer sk-abcdef');
    expect(req.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(req.bodyString);
    expect(body.model).toBe('deepseek-chat');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(1024);
    expect(body.stream).toBe(false);
  });

  it('applies sensible defaults for missing temperature/max_tokens', () => {
    const req = adapter.buildRequest({
      apiKey: 'sk-test',
      model: 'kimi',
      body: { messages: [{ role: 'user', content: 'hi' }] },
    });
    const body = JSON.parse(req.bodyString);
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(4096);
  });

  it('parseResponse extracts content from OpenAI choices[0].message.content', () => {
    const json = {
      choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
    };
    expect(adapter.parseResponse(json)).toEqual({ content: 'Hello!' });
  });

  it('parseResponse returns empty string when choices is missing', () => {
    expect(adapter.parseResponse({})).toEqual({ content: '' });
  });
});

describe('AnthropicAdapter', () => {
  const adapter = new AnthropicAdapter();

  it('can be configured with a custom baseUrl (e.g., for MiniMax Anthropic-compatible endpoint)', () => {
    const customAdapter = new AnthropicAdapter({
      baseUrl: 'https://api.minimax.io/anthropic/v1/messages',
    });
    const req = customAdapter.buildRequest({
      apiKey: 'minimax-key',
      model: 'MiniMax-M3',
      body: { messages: [{ role: 'user', content: 'hi' }], max_tokens: 100 },
    });
    expect(req.url).toBe('https://api.minimax.io/anthropic/v1/messages');
    expect(req.headers['x-api-key']).toBe('minimax-key');
    expect(req.headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(req.bodyString);
    expect(body.model).toBe('MiniMax-M3');
  });

  it('builds request with x-api-key and anthropic-version headers', () => {
    const req = adapter.buildRequest({
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6',
      body: {
        messages: [
          { role: 'system', content: 'You are concise.' },
          { role: 'user', content: 'hi' },
        ],
        max_tokens: 2048,
        temperature: 0.3,
        stream: false,
      },
    });

    expect(req.headers['x-api-key']).toBe('sk-ant-test');
    expect(req.headers['anthropic-version']).toBe('2023-06-01');
    expect(req.url).toBe('https://api.anthropic.com/v1/messages');

    const body = JSON.parse(req.bodyString);
    expect(body.model).toBe('claude-sonnet-4-6');
    expect(body.system).toBe('You are concise.');
    // system 消息不应出现在 messages[]
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(body.max_tokens).toBe(2048);
    expect(body.temperature).toBe(0.3);
  });

  it('handles absence of system message', () => {
    const req = adapter.buildRequest({
      apiKey: 'sk-ant',
      model: 'claude-3-5-haiku-latest',
      body: { messages: [{ role: 'user', content: 'ping' }] },
    });
    const body = JSON.parse(req.bodyString);
    expect(body.system).toBeUndefined();
    expect(body.messages).toHaveLength(1);
  });

  it('parseResponse extracts text from Anthropic content[] block', () => {
    const json = {
      id: 'msg_123',
      content: [
        { type: 'text', text: 'Hello from Claude.' },
      ],
    };
    expect(adapter.parseResponse(json)).toEqual({ content: 'Hello from Claude.' });
  });

  it('parseResponse returns empty string if no text block', () => {
    const json = { content: [{ type: 'tool_use', id: 'x' }] };
    expect(adapter.parseResponse(json)).toEqual({ content: '' });
  });

  it('transformStreamBody converts content_block_delta text into OpenAI-SSE chunks', async () => {
    const anthropicStream = new ReadableStream<Uint8Array>({
      start(controller) {
        const events = [
          'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_1"}}\n\n',
          'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}\n\n',
          'event: message_stop\ndata: {"type":"message_stop"}\n\n',
        ];
        for (const e of events) {
          controller.enqueue(new TextEncoder().encode(e));
        }
        controller.close();
      },
    });

    const transformed = adapter.transformStreamBody!(anthropicStream);
    const reader = transformed.getReader();
    const decoder = new TextDecoder();
    let raw = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });
    }

    // 应包含两条 data: ... choices.delta.content 块 + [DONE]
    expect(raw).toContain('data: {"choices":[{"index":0,"delta":{"content":"Hello"}}]}');
    expect(raw).toContain('data: {"choices":[{"index":0,"delta":{"content":" world"}}]}');
    expect(raw).toContain('data: [DONE]');
    // 不应把 message_start 之类的事件透传
    expect(raw).not.toContain('message_start');
  });
});

describe('apiKey redaction safety', () => {
  it('does not include apiKey anywhere in built request body for OpenAI', () => {
    const adapter = new OpenAICompatibleAdapter('https://api.example.com/v1/chat/completions');
    const req = adapter.buildRequest({
      apiKey: 'sk-SECRET-1234567890ABCDEF',
      model: 'm',
      body: { messages: [{ role: 'user', content: 'x' }] },
    });
    expect(req.bodyString).not.toContain('sk-SECRET-1234567890ABCDEF');
    expect(req.headers.Authorization).toBe('Bearer sk-SECRET-1234567890ABCDEF'); // 头部包含，但 body 不含
  });

  it('does not include apiKey anywhere in built request body for Anthropic', () => {
    const adapter = new AnthropicAdapter();
    const req = adapter.buildRequest({
      apiKey: 'sk-ant-SECRET-1234567890ABCDEF',
      model: 'm',
      body: { messages: [{ role: 'user', content: 'x' }] },
    });
    expect(req.bodyString).not.toContain('sk-ant-SECRET-1234567890ABCDEF');
  });
});
