import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { loadAllChapters, loadIndex } from './loader';
import { loadAllSeedQuestions } from '../seed/loader';

describe('learn cross-links', () => {
  it('every related_questions slug in chapters exists in seed-questions', async () => {
    const chapters = await loadAllChapters();
    const seeds = await loadAllSeedQuestions();
    const seedSlugs = new Set(seeds.map((s) => s.slug));
    for (const c of chapters) {
      for (const q of c.frontmatter.related_questions) {
        expect(
          seedSlugs.has(q),
          `chapter ${c.path} references missing question "${q}"`,
        ).toBe(true);
      }
    }
  });

  it('every related_chapters slug in chapters exists in _index.json', async () => {
    const chapters = await loadAllChapters();
    const knownSlugs = new Set(chapters.map((c) => c.frontmatter.slug));
    for (const c of chapters) {
      for (const r of c.frontmatter.related_chapters) {
        expect(
          knownSlugs.has(r),
          `chapter ${c.path} references missing chapter slug "${r}"`,
        ).toBe(true);
      }
    }
  });

  it('every related_chapters in seed questions exists in learn chapters', async () => {
    const seeds = await loadAllSeedQuestions();
    const chapters = await loadAllChapters();
    const knownSlugs = new Set(chapters.map((c) => c.frontmatter.slug));
    for (const s of seeds) {
      const file = path.join(
        process.cwd(),
        'content',
        'seed-questions',
        `${s.slug}.md`,
      );
      const raw = await fs.readFile(file, 'utf8');
      const { data } = matter(raw);
      const refs: string[] = data.related_chapters ?? [];
      for (const r of refs) {
        expect(
          knownSlugs.has(r),
          `seed ${s.slug} references missing chapter "${r}"`,
        ).toBe(true);
      }
    }
  });
});
