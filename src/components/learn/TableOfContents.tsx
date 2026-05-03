'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const ids = new Set(items.map((i) => i.id));
    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!ids.has(e.target.id)) continue;
          if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
          else visible.delete(e.target.id);
        }
        if (visible.size > 0) {
          let bestId: string | null = null;
          let best = -1;
          for (const [id, ratio] of visible) {
            if (ratio > best) {
              best = ratio;
              bestId = id;
            }
          }
          if (bestId) setActiveId(bestId);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] },
    );

    for (const i of items) {
      const el = document.getElementById(i.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <aside className="hidden xl:block w-56 shrink-0">
      <nav
        aria-label="本頁目錄"
        className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pr-2"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          本頁目錄
        </p>
        <ul className="space-y-1 border-l border-border">
          {items.map((i) => {
            const active = i.id === activeId;
            return (
              <li key={i.id}>
                <a
                  href={`#${i.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(i.id);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      history.replaceState(null, '', `#${i.id}`);
                      setActiveId(i.id);
                    }
                  }}
                  className={cn(
                    '-ml-px block border-l-2 py-1 text-sm transition-colors',
                    i.level === 3 ? 'pl-6' : 'pl-3',
                    active
                      ? 'border-primary font-medium text-primary'
                      : 'border-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                  )}
                >
                  {i.text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
