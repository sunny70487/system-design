import { describe, it, expect, vi } from 'vitest';
import { runMermaidPipeline } from './pipeline';

describe('runMermaidPipeline', () => {
  it('passes valid source straight through', async () => {
    const result = await runMermaidPipeline('flowchart LR\n  A --> B', vi.fn());
    expect(result.status).toBe('ok');
  });

  it('falls back when LLM retry also fails', async () => {
    const llm = vi.fn().mockResolvedValue('still broken !!!');
    const result = await runMermaidPipeline('still broken !!!', llm);
    expect(result.status).toBe('fallback');
  });
});
