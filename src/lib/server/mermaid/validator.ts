import { validate } from '@probelabs/maid';

export type MermaidValidation =
  | { ok: true }
  | { ok: false; error: string };

export function validateMermaid(source: string): MermaidValidation {
  const { errors } = validate(source);
  if (errors.length === 0) return { ok: true };
  const msg = errors.map((e) => e.message).join('; ');
  return { ok: false, error: msg };
}
