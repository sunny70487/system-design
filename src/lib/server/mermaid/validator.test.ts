import { describe, it, expect } from 'vitest';
import { validateMermaid } from './validator';

describe('validateMermaid', () => {
  it('returns ok for a valid flowchart', () => {
    const src = 'flowchart LR\n  A --> B';
    const result = validateMermaid(src);
    expect(result.ok).toBe(true);
  });

  it('returns error for malformed source', () => {
    const src = 'flowchart LR\n  A -->';
    const result = validateMermaid(src);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeTruthy();
  });
});
