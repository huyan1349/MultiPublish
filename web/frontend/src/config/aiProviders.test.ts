import { describe, it, expect } from 'vitest';
import {
  PROVIDERS,
  getProvider,
  getDefaultModelFor,
  getEnabledProviders,
} from './aiProviders';

describe('aiProviders', () => {
  it('includes all 5 expected providers', () => {
    const ids = PROVIDERS.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['deepseek', 'openai', 'claude', 'kimi', 'minimax']));
  });

  it('marks minimax as enabled (Anthropic-compatible public API)', () => {
    const mm = getProvider('minimax');
    expect(mm).toBeDefined();
    expect(mm?.enabled).toBe(true);
    expect(mm?.models.length).toBeGreaterThan(0);
    expect(mm?.authStyle).toBe('x-api-key');
    expect(mm?.baseUrl).toMatch(/minimax\.io/);
  });

  it('all enabled providers have a non-empty default model', () => {
    for (const p of getEnabledProviders()) {
      expect(p.defaultModel).toBeTruthy();
      expect(p.baseUrl).toMatch(/^https:\/\//);
      expect(p.models.length).toBeGreaterThan(0);
    }
  });

  it('deepseek defaults to deepseek-v4-flash and is bearer auth', () => {
    const ds = getProvider('deepseek');
    expect(ds?.defaultModel).toBe('deepseek-v4-flash');
    expect(ds?.authStyle).toBe('bearer');
    expect(ds?.baseUrl).toBe('https://api.deepseek.com/chat/completions');
  });

  it('claude uses x-api-key auth and has anthropic-version header', () => {
    const cl = getProvider('claude');
    expect(cl?.authStyle).toBe('x-api-key');
    expect(cl?.extraHeaders?.['anthropic-version']).toBe('2023-06-01');
  });

  it('getProvider returns undefined for unknown id', () => {
    expect(getProvider('not-a-provider')).toBeUndefined();
    expect(getProvider(null)).toBeUndefined();
    expect(getProvider(undefined)).toBeUndefined();
  });

  it('getDefaultModelFor returns empty string for unknown provider', () => {
    expect(getDefaultModelFor('not-a-provider')).toBe('');
  });

  it('model ids are unique within each provider', () => {
    for (const p of PROVIDERS) {
      const ids = p.models.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
