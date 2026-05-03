'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

export function HomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const target = q.trim() ? `/learn?q=${encodeURIComponent(q.trim())}` : '/learn';
    router.push(target);
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20"
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜尋章節：CAP、快取、一致性、訊息佇列…"
        aria-label="搜尋知識庫"
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        className="inline-flex shrink-0 items-center rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
      >
        搜尋
      </button>
    </form>
  );
}
