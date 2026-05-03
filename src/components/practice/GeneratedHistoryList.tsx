'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Trash2 } from 'lucide-react';

export interface GeneratedHistoryItem {
  id: string;
  topic: string;
  title: string;
  difficulty: string;
  createdAt: number;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function GeneratedHistoryList({
  initialItems,
}: {
  initialItems: GeneratedHistoryItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (items.length === 0) return null;

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除這道生成的題目嗎？')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/generated/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.filter((it) => it.id !== id));
      startTransition(() => router.refresh());
    } catch (e) {
      alert(e instanceof Error ? e.message : '刪除失敗');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">我生成的題目</h2>
        <span className="text-xs text-muted-foreground">（{items.length}）</span>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((it) => (
          <li
            key={it.id}
            className="group relative rounded-lg border border-border bg-card transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <Link
              href={`/practice/gen/${it.id}`}
              className="block p-4 pr-12 cursor-pointer"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {it.difficulty}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(it.createdAt)}
                </span>
              </div>
              <h3 className="font-medium text-foreground group-hover:text-primary">
                {it.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                主題：{it.topic}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(it.id)}
              disabled={pending || deletingId === it.id}
              aria-label="刪除這道題目"
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
