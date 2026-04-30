import { describe, it, expect } from 'vitest';
import { loadAllChapters } from './loader';
import { validateMermaid } from '../mermaid/validator';
import { autoFixMermaid } from '../mermaid/autofix';

function extractMermaidBlocks(md: string): string[] {
  const blocks: string[] = [];
  const re = /```mermaid\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) blocks.push(m[1].trim());
  return blocks;
}

describe('learn chapter mermaid diagrams', () => {
  it('every mermaid block in every chapter passes validation (with autofix)', async () => {
    const chapters = await loadAllChapters();
    for (const c of chapters) {
      const blocks = extractMermaidBlocks(c.body);
      for (const [i, block] of blocks.entries()) {
        let res = await validateMermaid(block);
        if (!res.ok) {
          const fixed = await autoFixMermaid(block);
          if (fixed.ok) {
            res = await validateMermaid(fixed.source);
          }
        }
        expect(
          res.ok,
          `chapter ${c.path} mermaid block ${i} invalid: ${'error' in res ? res.error : ''}`,
        ).toBe(true);
      }
    }
  });
});
