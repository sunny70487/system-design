import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateTextMock = vi.fn();

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');
  return {
    ...actual,
    generateText: (...args: unknown[]) => generateTextMock(...args),
  };
});

vi.mock('./provider', () => ({
  getProvider: () => ({
    baseURL: 'https://x',
    model: 'm',
    client: {},
  }),
}));

import { llmFixMermaid } from './mermaid-retry';

const credentials = { baseURL: 'https://x', apiKey: 'k', model: 'm' };

describe('llmFixMermaid', () => {
  beforeEach(() => {
    generateTextMock.mockReset();
  });

  it('returns LLM-corrected mermaid stripped of fences', async () => {
    generateTextMock.mockResolvedValueOnce({
      text: '```mermaid\nflowchart LR\n A --> B\n```',
    });
    const result = await llmFixMermaid('broken', 'parse error', credentials);
    expect(result).toContain('flowchart LR');
    expect(result).not.toContain('```');
  });
});
