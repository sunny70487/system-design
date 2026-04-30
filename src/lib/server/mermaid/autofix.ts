import { validateMermaid } from './validator';

export type AutoFixResult =
  | { ok: true; source: string; fixed: boolean }
  | { ok: false; error: string };

export async function autoFixMermaid(source: string): Promise<AutoFixResult> {
  const initial = await validateMermaid(source);
  if (initial.ok) return { ok: true, source, fixed: false };

  let fixedText = source;
  try {
    const maid = await import('@probelabs/maid');
    const result = maid.fixText(source, { level: 'safe' });
    fixedText = result.fixed;
  } catch {
    return { ok: false, error: initial.error };
  }

  if (fixedText === source) {
    return { ok: false, error: initial.error };
  }

  const recheck = await validateMermaid(fixedText);
  if (recheck.ok) return { ok: true, source: fixedText, fixed: true };
  return { ok: false, error: recheck.error };
}
