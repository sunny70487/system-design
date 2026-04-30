import Link from 'next/link';
import { loadIndex, loadAllChapters } from '@/lib/server/learn/loader';

export default async function LearnIndexPage() {
  const idx = await loadIndex();
  const chapters = await loadAllChapters();
  const byPath = new Map(chapters.map((c) => [c.path, c]));

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-2 text-3xl font-bold">系統設計知識庫</h1>
      <p className="mb-8 text-muted-foreground">
        改寫自 system-design-primer-zh-tw（CC-BY-SA-4.0）。為 Google L5/L6
        系統設計面試準備的核心觀念。
      </p>
      {idx.groups.map((group) => (
        <section key={group.id} className="mb-8">
          <h2 className="mb-3 text-2xl font-semibold">{group.title}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {group.chapters.map((p) => {
              const c = byPath.get(p);
              if (!c) return null;
              return (
                <li key={p}>
                  <Link
                    href={`/learn/${p}`}
                    className="block rounded border p-4 hover:bg-accent"
                  >
                    <h3 className="font-medium">{c.frontmatter.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.frontmatter.summary}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
