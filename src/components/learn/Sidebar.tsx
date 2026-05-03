'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookOpen, PanelLeft, X } from 'lucide-react';
import type { LearnIndex } from '@/lib/shared/schemas';
import { cn } from '@/lib/utils';

interface SidebarProps {
  groups: LearnIndex['groups'];
  titlesByPath: Record<string, string>;
}

export function Sidebar({ groups, titlesByPath }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="開啟章節目錄"
        className="sticky top-14 z-30 mx-4 mt-3 inline-flex items-center gap-2 self-start rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent cursor-pointer md:hidden"
      >
        <PanelLeft className="h-4 w-4" />
        章節目錄
      </button>

      <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-card/40 px-4 py-6 md:block">
        <SidebarContent
          groups={groups}
          titlesByPath={titlesByPath}
          pathname={pathname}
        />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto border-r border-border bg-card px-4 py-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">章節目錄</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="關閉目錄"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent
              groups={groups}
              titlesByPath={titlesByPath}
              pathname={pathname}
            />
          </div>
        </div>
      )}
    </>
  );
}

function SidebarContent({
  groups,
  titlesByPath,
  pathname,
}: SidebarProps & { pathname: string }) {
  return (
    <nav>
      <Link
        href="/learn"
        className="mb-6 flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold tracking-tight transition-colors hover:text-primary cursor-pointer"
      >
        <BookOpen className="h-4 w-4" />
        知識庫
      </Link>

      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.id}>
            <h4 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {g.title}
            </h4>
            <ul className="space-y-0.5">
              {g.chapters.map((p) => {
                const href = `/learn/${p}`;
                const active = pathname === href;
                return (
                  <li key={p}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'block rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer',
                        active
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {titlesByPath[p] ?? p}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
