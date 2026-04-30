import mermaid from 'mermaid';

export type MermaidValidation =
  | { ok: true }
  | { ok: false; error: string };

mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });

export async function validateMermaid(source: string): Promise<MermaidValidation> {
  try {
    await mermaid.parse(source, { suppressErrors: false });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
