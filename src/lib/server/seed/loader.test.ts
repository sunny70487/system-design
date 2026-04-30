import { describe, it, expect } from 'vitest';
import { loadAllSeedQuestions, loadSeedQuestion } from './loader';

describe('seed loader', () => {
  it('lists all seed questions with metadata', async () => {
    const list = await loadAllSeedQuestions();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('slug');
    expect(list[0]).toHaveProperty('title');
    expect(list[0]).toHaveProperty('difficulty');
  });

  it('loads a single question fully', async () => {
    const q = await loadSeedQuestion('url-shortener');
    expect(q).not.toBeNull();
    expect(q!.slug).toBe('url-shortener');
    expect(q!.markdown).toContain('Design a URL Shortener');
    expect(q!.attribution.license).toBe('CC-BY-SA-4.0');
  });

  it('returns null for unknown slug', async () => {
    const q = await loadSeedQuestion('does-not-exist');
    expect(q).toBeNull();
  });
});
