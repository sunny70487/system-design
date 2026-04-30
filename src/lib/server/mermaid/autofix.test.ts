import { describe, it, expect } from 'vitest';
import { autoFixMermaid } from './autofix';

describe('autoFixMermaid', () => {
  it('returns original when already valid', async () => {
    const src = 'flowchart LR\n  A --> B';
    const result = await autoFixMermaid(src);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.fixed).toBe(false);
  });

  it('reports unfixable when input is irrecoverable', async () => {
    const src = 'this is not mermaid at all !!!';
    const result = await autoFixMermaid(src);
    expect(result.ok).toBe(false);
  });
});
