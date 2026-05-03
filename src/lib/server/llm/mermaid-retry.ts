import { generateText } from 'ai';
import { getProvider, type LLMCredentials } from './provider';
import { mermaidRetryPrompt } from './prompts';

export async function llmFixMermaid(
  broken: string,
  error: string,
  credentials: LLMCredentials,
): Promise<string> {
  const p = getProvider(credentials);
  const { text } = await generateText({
    model: p.client,
    prompt: mermaidRetryPrompt(broken, error),
    maxRetries: 1,
  });
  return text.replace(/^```mermaid\n?|```$/g, '').trim();
}
