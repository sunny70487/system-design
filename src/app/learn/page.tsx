import Link from 'next/link';
import { loadIndex, loadAllChapters } from '@/lib/server/learn/loader';
import { Compass, Calculator, Layers, Database, Network } from 'lucide-react';

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  framework: Compass,
  estimation: Calculator,
  foundations: Layers,
  data: Database,
  distributed: Network,
};

export default async function LearnIndexPage() {
  const idx = await loadIndex();
  const chapters = await loadAllChapters();
  const byPath = new Map(chapters.map((c) => [c.path, c]));

  return (
    <main className="mx-auto max-w-4xl px-8 py-10">
      <header className="mb-10">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          系統設計知識庫
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          改寫自 system-design-primer-zh-tw（CC-BY-SA-4.0）。為 Google L5/L6
          系統設計面試準備的核心觀念。
        </p>
      </header>

      <div className="space-y-10">
        {idx.groups.map((group) => {
          const Icon = GROUP_ICONS[group.id];
          return (
            <section key={group.id}>
              <div className="mb-4 flex items-center gap-2">
                {Icon && (
                  <Icon className="h-5 w-5 text-muted-foreground" />
                )}
                <h2 className="text-xl font-semibold">{group.title}</h2>
              </div>
              <ul className="grid gap-4 md:grid-cols-2">
                {group.chapters.map((p) => {
                  const c = byPath.get(p);
                  if (!c) return null;
                  return (
                    <li key={p}>
                      <Link
                        href={`/learn/${p}`}
                        className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent cursor-pointer"
                      >
                        <h3 className="font-medium text-foreground group-hover:text-primary">
                          {c.frontmatter.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {c.frontmatter.summary}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
