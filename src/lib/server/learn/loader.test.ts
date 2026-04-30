import { describe, it, expect } from 'vitest';
import { loadIndex, loadAllChapters, loadChapter } from './loader';

describe('learn loader', () => {
  it('loadIndex returns validated index with groups sorted by order', async () => {
    const idx = await loadIndex();
    expect(idx.groups.length).toBeGreaterThan(0);
    const orders = idx.groups.map((g) => g.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('loadAllChapters returns chapters listed in _index.json', async () => {
    const idx = await loadIndex();
    const refs = idx.groups.flatMap((g) => g.chapters);
    const chapters = await loadAllChapters();
    expect(chapters.map((c) => c.path).sort()).toEqual([...refs].sort());
  });

  it('loadChapter returns null for unknown slug', async () => {
    expect(await loadChapter('does/not/exist')).toBeNull();
  });

  it('every chapter file is referenced exactly once in _index.json (no orphans)', async () => {
    const idx = await loadIndex();
    const referenced = idx.groups.flatMap((g) => g.chapters);
    const chapters = await loadAllChapters();
    expect(chapters.length).toBe(referenced.length);
  });
});
