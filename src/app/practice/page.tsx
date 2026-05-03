import Link from 'next/link';
import { Target } from 'lucide-react';
import { loadAllSeedQuestions } from '@/lib/server/seed/loader';
import { LLMSettingsPanel } from '@/components/practice/LLMSettingsPanel';
import { TopicInput } from '@/components/practice/TopicInput';
import { GeneratedHistoryList } from '@/components/practice/GeneratedHistoryList';
import { listGenerated } from '@/lib/server/generated/repository';

export const dynamic = 'force-dynamic';

const DIFFICULTY_LABEL: Record<'L4' | 'L5' | 'L6', string> = {
  L4: 'L4',
  L5: 'L5',
  L6: 'L6',
};

export default async function PracticeIndexPage() {
  const questions = await loadAllSeedQuestions();
  const generated = listGenerated();

  return (
    <main className="mx-auto max-w-4xl px-8 py-10">
      <header className="mb-10">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">練習題</h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          系統設計模擬面試題庫，改寫自開源 system-design-primer
          系列（CC-BY-SA-4.0）。先試著自行作答，再對照參考解法。
        </p>
      </header>

      <section className="mb-10 space-y-4">
        <LLMSettingsPanel />
        <TopicInput />
      </section>

      <GeneratedHistoryList initialItems={generated} />

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">題庫</h2>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {questions.map((q) => (
            <li key={q.slug}>
              <Link
                href={`/practice/${q.slug}`}
                className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent cursor-pointer"
              >
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <h3 className="font-medium text-foreground group-hover:text-primary">
                    {q.title}
                  </h3>
                  <span className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {DIFFICULTY_LABEL[q.difficulty]}
                  </span>
                </div>
                {q.related_chapters.length > 0 && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    相關主題：{q.related_chapters.join('、')}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
