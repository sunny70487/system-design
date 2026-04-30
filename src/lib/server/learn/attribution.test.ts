import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadAllChapters } from './loader';

describe('learn attribution', () => {
  it('_attribution.json has CC-BY-SA-4.0 license and at least one source', async () => {
    const raw = await fs.readFile(
      path.join(process.cwd(), 'content', 'learn', '_attribution.json'),
      'utf8',
    );
    const a = JSON.parse(raw);
    expect(a.license).toBe('CC-BY-SA-4.0');
    expect(Array.isArray(a.sources)).toBe(true);
    expect(a.sources.length).toBeGreaterThan(0);
  });

  it('every chapter has non-empty sources[]', async () => {
    const chapters = await loadAllChapters();
    for (const c of chapters) {
      expect(
        c.frontmatter.sources.length,
        `chapter ${c.path} has no sources`,
      ).toBeGreaterThan(0);
    }
  });
});
