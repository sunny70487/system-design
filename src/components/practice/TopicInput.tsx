'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  isComplete,
  llmHeaders,
  useLLMSettings,
} from '@/lib/client/llm-settings';

interface GenerateResponse {
  id?: string;
  error?: string;
  missing?: string[];
  message?: string;
}

export function TopicInput() {
  const router = useRouter();
  const { settings } = useLLMSettings();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = isComplete(settings);

  async function submit() {
    if (!ready || !topic.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...llmHeaders(settings),
        },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as GenerateResponse;
      if (!res.ok || !body.id) {
        if (body.error === 'low_quality' && body.missing) {
          throw new Error(
            `生成品質不足，以下章節內容不夠深入：${body.missing.join('、')}。請換個主題或重試。`,
          );
        }
        throw new Error(body.message || body.error || `HTTP ${res.status}`);
      }
      router.push(`/practice/gen/${body.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失敗');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">出一道新的練習題</h2>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        輸入你想被考的系統或主題，例如「Spotify 推薦系統」、「Dropbox 檔案同步」、
        「線上拍賣即時競價」。LLM 會以 Google L5/L6 面試官的角度產生一道題目與參考解法。
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={topic}
          maxLength={200}
          placeholder="輸入想練習的主題或系統描述…"
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          disabled={loading || !ready}
        />
        <Button
          type="button"
          onClick={submit}
          disabled={!topic.trim() || loading || !ready}
        >
          {loading ? '生成中…' : '生成題目'}
        </Button>
      </div>
      {!ready && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          請先在上方「LLM 設定」中填入 Base URL、API Key 並選擇模型。
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
