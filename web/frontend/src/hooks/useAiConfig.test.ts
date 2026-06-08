import { describe, it, expect, beforeEach } from 'vitest';
import { useAiConfig, isAiConfigured, selectActiveConfig } from './useAiConfig';

const STORAGE_KEY = 'multipublish_ai_config_v1';

describe('useAiConfig store', () => {
  beforeEach(() => {
    // 每个 case 之前清空 store + localStorage
    useAiConfig.getState().clear();
    localStorage.removeItem(STORAGE_KEY);
  });

  it('starts with no provider configured and rememberKey default true', () => {
    const s = useAiConfig.getState();
    expect(s.providerId).toBeNull();
    expect(s.model).toBeNull();
    expect(s.apiKey).toBeNull();
    expect(s.rememberKey).toBe(true);
  });

  it('isAiConfigured returns false until provider/model/apiKey all set', () => {
    expect(isAiConfigured()).toBe(false);
    useAiConfig.getState().setProvider('deepseek');
    expect(isAiConfigured()).toBe(false); // apiKey still null
    useAiConfig.getState().setApiKey('sk-test-12345678901234567890');
    expect(isAiConfigured()).toBe(true);
  });

  it('selectActiveConfig returns null if any field missing', () => {
    expect(selectActiveConfig()).toBeNull();
    useAiConfig.getState().setProvider('openai');
    useAiConfig.getState().setApiKey('sk-test-12345678901234567890');
    const cfg = selectActiveConfig();
    expect(cfg?.provider.id).toBe('openai');
    expect(cfg?.apiKey).toBe('sk-test-12345678901234567890');
  });

  it('setProvider refuses unknown / unsupported providers', () => {
    // @ts-expect-error — intentionally invalid to test guard
    useAiConfig.getState().setProvider('not-a-real-provider');
    expect(useAiConfig.getState().providerId).toBeNull();
  });

  it('setProvider accepts enabled minimax (Anthropic-compatible)', () => {
    useAiConfig.getState().setProvider('minimax');
    expect(useAiConfig.getState().providerId).toBe('minimax');
    expect(useAiConfig.getState().model).toBe('MiniMax-M3');
  });

  it('setProvider resets model to provider default', () => {
    useAiConfig.getState().setProvider('claude');
    expect(useAiConfig.getState().model).toBe('claude-sonnet-4-6');
  });

  it('setModel updates model', () => {
    useAiConfig.getState().setProvider('openai');
    useAiConfig.getState().setModel('gpt-4o');
    expect(useAiConfig.getState().model).toBe('gpt-4o');
  });

  it('setApiKey trims whitespace and stores trimmed value', () => {
    useAiConfig.getState().setApiKey('  sk-test  ');
    expect(useAiConfig.getState().apiKey).toBe('sk-test');
  });

  it('persists to localStorage when rememberKey=true', async () => {
    useAiConfig.getState().setProvider('deepseek');
    useAiConfig.getState().setApiKey('sk-persisted-1234567890');
    // wait for persist middleware to write
    await new Promise((r) => setTimeout(r, 50));
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.providerId).toBe('deepseek');
    expect(parsed.state.apiKey).toBe('sk-persisted-1234567890');
  });

  it('does NOT persist apiKey when rememberKey=false', async () => {
    useAiConfig.getState().setProvider('deepseek');
    useAiConfig.getState().setRememberKey(false);
    useAiConfig.getState().setApiKey('sk-session-1234567890');
    await new Promise((r) => setTimeout(r, 50));
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      expect(parsed.state.apiKey).toBeNull();
    } else {
      // no storage entry at all is also acceptable
      expect(raw).toBeNull();
    }
  });

  it('clear() resets all state', () => {
    useAiConfig.getState().setProvider('claude');
    useAiConfig.getState().setApiKey('sk-test-1234567890');
    useAiConfig.getState().clear();
    const s = useAiConfig.getState();
    expect(s.providerId).toBeNull();
    expect(s.model).toBeNull();
    expect(s.apiKey).toBeNull();
  });

  it('setStatus updates runtime fields', () => {
    useAiConfig.getState().setStatus('testing');
    expect(useAiConfig.getState().status).toBe('testing');
    useAiConfig.getState().setStatus('ok', null, 250);
    expect(useAiConfig.getState().status).toBe('ok');
    expect(useAiConfig.getState().lastLatencyMs).toBe(250);
  });
});
