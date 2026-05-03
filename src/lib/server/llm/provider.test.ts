import { describe, it, expect } from 'vitest';
import {
  getProvider,
  readCredentialsFromHeaders,
  MissingCredentialsError,
  LLM_HEADERS,
} from './provider';

describe('getProvider', () => {
  it('throws when baseURL missing', () => {
    expect(() =>
      getProvider({ baseURL: '', apiKey: 'k', model: 'm' }),
    ).toThrow(MissingCredentialsError);
  });

  it('throws when apiKey missing', () => {
    expect(() =>
      getProvider({ baseURL: 'https://x', apiKey: '', model: 'm' }),
    ).toThrow(MissingCredentialsError);
  });

  it('throws when model missing', () => {
    expect(() =>
      getProvider({ baseURL: 'https://x', apiKey: 'k', model: '' }),
    ).toThrow(MissingCredentialsError);
  });

  it('builds a provider config with normalized baseURL', () => {
    const p = getProvider({
      baseURL: 'https://api.openai.com/v1/',
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
    });
    expect(p.baseURL).toBe('https://api.openai.com/v1');
    expect(p.model).toBe('gpt-4o-mini');
    expect(p.client).toBeDefined();
  });
});

describe('readCredentialsFromHeaders', () => {
  it('extracts credentials from headers', () => {
    const h = new Headers({
      [LLM_HEADERS.baseURL]: 'https://api.openai.com/v1',
      [LLM_HEADERS.apiKey]: 'sk-test',
      [LLM_HEADERS.model]: 'gpt-4o-mini',
    });
    const c = readCredentialsFromHeaders(h);
    expect(c.baseURL).toBe('https://api.openai.com/v1');
    expect(c.apiKey).toBe('sk-test');
    expect(c.model).toBe('gpt-4o-mini');
  });

  it('returns empty strings when headers missing', () => {
    const c = readCredentialsFromHeaders(new Headers());
    expect(c).toEqual({ baseURL: '', apiKey: '', model: '' });
  });
});
