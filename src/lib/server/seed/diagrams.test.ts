import { describe, it, expect } from 'vitest';
import { loadAllSeedQuestions, loadSeedQuestion } from './loader';
import { validateMermaid } from '../mermaid/validator';

describe('seed question diagrams', () => {
  it('all seed diagrams are valid mermaid', async () => {
    const all = await loadAllSeedQuestions();
    for (const s of all) {
      const q = await loadSeedQuestion(s.slug);
      expect(q).not.toBeNull();
      const match = q!.markdown.match(/```mermaid\n([\s\S]*?)```/);
      expect(match, `no mermaid block in ${s.slug}`).toBeTruthy();
      const v = await validateMermaid(match![1]);
      expect(v.ok, `${s.slug}: ${v.ok ? '' : v.error}`).toBe(true);
    }
  });
});
