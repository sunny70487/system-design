import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export interface LLMCredentials {
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface ProviderConfig {
  baseURL: string;
  model: string;
  client: LanguageModel;
}

export class MissingCredentialsError extends Error {
  constructor(field: 'baseURL' | 'apiKey' | 'model') {
    super(`Missing LLM credential: ${field}`);
    this.name = 'MissingCredentialsError';
  }
}

function normalizeBaseURL(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed;
}

export function getProvider(credentials: LLMCredentials): ProviderConfig {
  if (!credentials.baseURL?.trim())
    throw new MissingCredentialsError('baseURL');
  if (!credentials.apiKey?.trim()) throw new MissingCredentialsError('apiKey');
  if (!credentials.model?.trim()) throw new MissingCredentialsError('model');

  const baseURL = normalizeBaseURL(credentials.baseURL);
  const client = createOpenAI({
    apiKey: credentials.apiKey,
    baseURL,
  })(credentials.model);

  return { baseURL, model: credentials.model, client };
}

const HEADER_BASE_URL = 'x-llm-base-url';
const HEADER_API_KEY = 'x-llm-api-key';
const HEADER_MODEL = 'x-llm-model';

export function readCredentialsFromHeaders(headers: Headers): LLMCredentials {
  return {
    baseURL: headers.get(HEADER_BASE_URL) ?? '',
    apiKey: headers.get(HEADER_API_KEY) ?? '',
    model: headers.get(HEADER_MODEL) ?? '',
  };
}

export const LLM_HEADERS = {
  baseURL: HEADER_BASE_URL,
  apiKey: HEADER_API_KEY,
  model: HEADER_MODEL,
} as const;
