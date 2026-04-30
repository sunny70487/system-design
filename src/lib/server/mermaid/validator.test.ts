import { describe, it, expect } from 'vitest';
import { validateMermaid } from './validator';

describe('validateMermaid', () => {
  it('returns ok for a valid flowchart', async () => {
    const src = 'flowchart LR\n  A --> B';
    const result = await validateMermaid(src);
    expect(result.ok).toBe(true);
  });

  it('returns error for malformed source', async () => {
    const src = 'flowchart LR\n  A -->';
    const result = await validateMermaid(src);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeTruthy();
  });
});
