import { autoFixMermaid } from './autofix';
import { validateMermaid } from './validator';

export type PipelineResult =
  | { status: 'ok'; source: string; autoFixed: boolean; llmRetried: boolean }
  | { status: 'fallback'; source: string; error: string };

export type LLMRetryFn = (source: string, error: string) => Promise<string>;

export async function runMermaidPipeline(
  source: string,
  llmRetry: LLMRetryFn,
): Promise<PipelineResult> {
  const fix = await autoFixMermaid(source);
  if (fix.ok) {
    return { status: 'ok', source: fix.source, autoFixed: fix.fixed, llmRetried: false };
  }

  const retried = await llmRetry(source, fix.error);
  const after = await validateMermaid(retried);
  if (after.ok) {
    return { status: 'ok', source: retried, autoFixed: false, llmRetried: true };
  }

  return { status: 'fallback', source, error: fix.error };
}
