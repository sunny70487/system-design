import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import {
  loadAllSeedQuestions,
  loadSeedQuestion,
} from '@/lib/server/seed/loader';
import { loadAllChapters } from '@/lib/server/learn/loader';
import { Mermaid } from '@/components/learn/Mermaid';
import { TableOfContents } from '@/components/learn/TableOfContents';

export async function generateStaticParams() {
  const list = await loadAllSeedQuestions();
  return list.map((q) => ({ slug: q.slug }));
}

function stripLeadingH1(md: string): string {
  return md.replace(/^\s*#\s+[^\n]*\n+/, '');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function extractToc(md: string): { id: string; text: string; level: 2 | 3 }[] {
  const out: { id: string; text: string; level: 2 | 3 }[] = [];
  const lines = md.split('\n');
  let inCode = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length === 2 ? 2 : 3;
    const text = m[2].replace(/[#*`]/g, '').trim();
    out.push({ id: slugify(text), text, level });
  }
  return out;
}

export default async function PracticeQuestionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const question = await loadSeedQuestion(slug);
  if (!question) notFound();

  const chapters = await loadAllChapters();
  const chapterPathBySlug = new Map<
    string,
    { path: string; title: string }
  >();
  for (const c of chapters) {
    const chapterSlug = c.path.split('/').pop() ?? c.path;
    chapterPathBySlug.set(chapterSlug, {
      path: c.path,
      title: c.frontmatter.title,
    });
  }

  const body = stripLeadingH1(question.markdown);
  const toc = extractToc(body);

  return (
    <div className="mx-auto flex max-w-7xl gap-10 px-8 py-10">
      <article className="min-w-0 flex-1 max-w-3xl">
      <nav className="mb-6">
        <Link
          href="/practice"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回練習題列表
        </Link>
      </nav>

      <header className="mb-8 border-b border-border pb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {question.difficulty}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{question.title}</h1>
      </header>

      <div className="prose max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings]}
          components={{
            code({ className, children }) {
              const m = /language-(\w+)/.exec(className ?? '');
              if (m?.[1] === 'mermaid')
                return <Mermaid chart={String(children).trim()} />;
              return <code className={className}>{children}</code>;
            },
          }}
        >
          {body}
        </ReactMarkdown>
      </div>

      <footer className="mt-12 space-y-6 border-t border-border pt-8">
        {question.related_chapters.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              相關章節
            </h4>
            <ul className="flex flex-wrap gap-2">
              {question.related_chapters.map((s) => {
                const chapter = chapterPathBySlug.get(s);
                if (!chapter) return null;
                return (
                  <li key={s}>
                    <Link
                      href={`/learn/${chapter.path}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent hover:text-primary cursor-pointer"
                    >
                      {chapter.title}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p className="mb-1">
            授權：{question.attribution.license} · 改寫自：
          </p>
          <ul className="space-y-0.5">
            <li>
              <a
                href={question.attribution.source}
                className="inline-flex items-center gap-1 underline decoration-muted-foreground/40 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary cursor-pointer"
                target="_blank"
                rel="noopener noreferrer"
              >
                {question.attribution.source}
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
          {question.attribution.modifications && (
            <p className="mt-1">說明：{question.attribution.modifications}</p>
          )}
        </div>
      </footer>
      </article>
      <TableOfContents items={toc} />
    </div>
  );
}
