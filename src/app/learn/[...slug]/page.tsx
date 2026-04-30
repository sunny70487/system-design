import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { loadIndex, loadChapter } from '@/lib/server/learn/loader';
import { Mermaid } from '@/components/learn/Mermaid';
import { ChapterFooter } from '@/components/learn/ChapterFooter';

export async function generateStaticParams() {
  const idx = await loadIndex();
  return idx.groups.flatMap((g) =>
    g.chapters.map((p) => ({ slug: p.split('/') })),
  );
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const relPath = slug.join('/');
  const idx = await loadIndex();
  const allowed = new Set(idx.groups.flatMap((g) => g.chapters));
  if (!allowed.has(relPath)) notFound();
  const chapter = await loadChapter(relPath);
  if (!chapter) notFound();

  return (
    <article className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl p-8">
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
        {chapter.body}
      </ReactMarkdown>
      <ChapterFooter fm={chapter.frontmatter} />
    </article>
  );
}
