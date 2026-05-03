import { loadIndex, loadAllChapters } from '@/lib/server/learn/loader';
import { Sidebar } from '@/components/learn/Sidebar';

export default async function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const idx = await loadIndex();
  const chapters = await loadAllChapters();
  const titlesByPath = Object.fromEntries(
    chapters.map((c) => [c.path, c.frontmatter.title]),
  );

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)]">
      <Sidebar groups={idx.groups} titlesByPath={titlesByPath} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
