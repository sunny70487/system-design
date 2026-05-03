import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import type { LearnChapter } from '@/lib/shared/schemas';

export function ChapterFooter({
  fm,
  chapterTitles,
}: {
  fm: LearnChapter;
  chapterTitles?: Record<string, string>;
}) {
  return (
    <footer className="mt-12 space-y-6 border-t border-border pt-8">
      {fm.related_chapters.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            相關章節
          </h4>
          <ul className="flex flex-wrap gap-2">
            {fm.related_chapters.map((s) => (
              <li key={s}>
                <Link
                  href={`/learn/chapters/${s}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent hover:text-primary cursor-pointer"
                >
                  {chapterTitles?.[s] ?? s}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fm.related_questions.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            建議練習題
          </h4>
          <ul className="flex flex-wrap gap-2">
            {fm.related_questions.map((s) => (
              <li key={s}>
                <Link
                  href={`/practice/${s}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent hover:text-primary cursor-pointer"
                >
                  {s}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p className="mb-1">授權：CC-BY-SA-4.0 · 改寫自：</p>
        <ul className="space-y-0.5">
          {fm.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                className="inline-flex items-center gap-1 underline decoration-muted-foreground/40 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary cursor-pointer"
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.name}
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
