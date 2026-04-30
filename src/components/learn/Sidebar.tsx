'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LearnIndex } from '@/lib/shared/schemas';

export function Sidebar({
  groups,
  titlesByPath,
}: {
  groups: LearnIndex['groups'];
  titlesByPath: Record<string, string>;
}) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 h-screen w-64 shrink-0 overflow-auto border-r p-4">
      <Link href="/learn" className="mb-4 block font-semibold">
        知識庫
      </Link>
      {groups.map((g) => (
        <div key={g.id} className="mb-4">
          <h4 className="mb-1 text-xs uppercase text-muted-foreground">
            {g.title}
          </h4>
          <ul className="space-y-1">
            {g.chapters.map((p) => {
              const href = `/learn/${p}`;
              const active = pathname === href;
              return (
                <li key={p}>
                  <Link
                    href={href}
                    className={`block py-1 text-sm ${active ? 'font-semibold' : ''}`}
                  >
                    {titlesByPath[p] ?? p}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
