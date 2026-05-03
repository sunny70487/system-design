'use client';

import { useCallback, useState } from 'react';
import { Settings2, RefreshCw, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  llmHeaders,
  useLLMSettings,
  isComplete,
  type LLMSettings,
} from '@/lib/client/llm-settings';

interface ModelsResponse {
  models?: string[];
  error?: string;
  message?: string;
}

export function LLMSettingsPanel() {
  const { settings, update } = useLLMSettings();
  const [open, setOpen] = useState(() => !isComplete(settings));
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[] | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discoverModels = useCallback(
    async (s: LLMSettings) => {
      if (!s.baseURL.trim() || !s.apiKey.trim()) {
        setError('請先填入 Base URL 與 API Key');
        return;
      }
      setDiscovering(true);
      setError(null);
      try {
        const res = await fetch('/api/models', {
          method: 'GET',
          headers: llmHeaders(s),
        });
        const body = (await res.json().catch(() => ({}))) as ModelsResponse;
        if (!res.ok) {
          throw new Error(body.message || body.error || `HTTP ${res.status}`);
        }
        const list = body.models ?? [];
        setModels(list);
        if (list.length > 0 && !s.model) {
          update({ model: list[0] });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '探查模型失敗');
        setModels(null);
      } finally {
        setDiscovering(false);
      }
    },
    [update],
  );

  const ready = isComplete(settings);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">LLM 設定</span>
          {ready ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {settings.model}
            </span>
          ) : (
            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              尚未完成設定
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {open ? '收合' : '展開'}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            使用 OpenAI 相容 API。API Key 僅儲存在你的瀏覽器（localStorage），
            每次請求由瀏覽器透過本站伺服器代理轉發到你指定的端點。
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="llm-base-url">
              Base URL
            </label>
            <Input
              id="llm-base-url"
              value={settings.baseURL}
              placeholder="https://api.openai.com/v1"
              onChange={(e) => update({ baseURL: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="llm-api-key">
              API Key
            </label>
            <div className="flex gap-2">
              <Input
                id="llm-api-key"
                type={showKey ? 'text' : 'password'}
                value={settings.apiKey}
                placeholder="sk-..."
                autoComplete="off"
                onChange={(e) => update({ apiKey: e.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? '隱藏 API Key' : '顯示 API Key'}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" htmlFor="llm-model">
                Model
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => discoverModels(settings)}
                disabled={
                  discovering || !settings.baseURL.trim() || !settings.apiKey.trim()
                }
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${discovering ? 'animate-spin' : ''}`}
                />
                {discovering ? '探查中…' : '自動探查'}
              </Button>
            </div>
            {models && models.length > 0 ? (
              <select
                id="llm-model"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={settings.model}
                onChange={(e) => update({ model: e.target.value })}
              >
                <option value="">請選擇模型…</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="llm-model"
                value={settings.model}
                placeholder="gpt-4o-mini"
                onChange={(e) => update({ model: e.target.value })}
              />
            )}
            {models && models.length === 0 && (
              <p className="text-xs text-muted-foreground">
                端點未回傳任何模型，請手動輸入模型 ID。
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
