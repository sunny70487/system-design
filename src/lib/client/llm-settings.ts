'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sd-llm-settings/v1';

export interface LLMSettings {
  baseURL: string;
  apiKey: string;
  model: string;
}

export const DEFAULT_SETTINGS: LLMSettings = {
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  model: '',
};

export const LLM_HEADER_NAMES = {
  baseURL: 'x-llm-base-url',
  apiKey: 'x-llm-api-key',
  model: 'x-llm-model',
} as const;

const listeners = new Set<() => void>();
let cachedSnapshot: { raw: string | null; value: LLMSettings } | null = null;

function read(): LLMSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (cachedSnapshot && cachedSnapshot.raw === raw) return cachedSnapshot.value;
  let value: LLMSettings = DEFAULT_SETTINGS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<LLMSettings>;
      value = {
        baseURL: parsed.baseURL ?? DEFAULT_SETTINGS.baseURL,
        apiKey: parsed.apiKey ?? '',
        model: parsed.model ?? '',
      };
    } catch {
      value = DEFAULT_SETTINGS;
    }
  }
  cachedSnapshot = { raw, value };
  return value;
}

function write(s: LLMSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  cachedSnapshot = null;
  for (const fn of listeners) fn();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedSnapshot = null;
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useLLMSettings() {
  const settings = useSyncExternalStore(
    subscribe,
    read,
    () => DEFAULT_SETTINGS,
  );
  const update = useCallback((patch: Partial<LLMSettings>) => {
    write({ ...read(), ...patch });
  }, []);
  return { settings, update, hydrated: true };
}

export function llmHeaders(s: LLMSettings): Record<string, string> {
  return {
    [LLM_HEADER_NAMES.baseURL]: s.baseURL,
    [LLM_HEADER_NAMES.apiKey]: s.apiKey,
    [LLM_HEADER_NAMES.model]: s.model,
  };
}

export function isComplete(s: LLMSettings): boolean {
  return Boolean(s.baseURL.trim() && s.apiKey.trim() && s.model.trim());
}
