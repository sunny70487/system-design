import Link from 'next/link';
import type { LearnChapter } from '@/lib/shared/schemas';

export function ChapterFooter({ fm }: { fm: LearnChapter }) {
  return (
    <footer className="mt-12 border-t pt-6 text-sm">
      {fm.related_chapters.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 font-semibold">相關章節</h4>
          <ul className="flex flex-wrap gap-2">
            {fm.related_chapters.map((s) => (
              <li key={s}>
                <Link href={`/learn/chapters/${s}`} className="underline">
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {fm.related_questions.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 font-semibold">建議練習題</h4>
          <ul className="flex flex-wrap gap-2">
            {fm.related_questions.map((s) => (
              <li key={s}>
                <Link href={`/practice/${s}`} className="underline">
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="text-muted-foreground">
        <p>授權：CC-BY-SA-4.0 · 改寫自：</p>
        <ul className="list-disc pl-5">
          {fm.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
