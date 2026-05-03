import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GeneratedQuestionView } from '@/components/practice/GeneratedQuestionView';
import { getGenerated } from '@/lib/server/generated/repository';

export const dynamic = 'force-dynamic';

export default async function GeneratedQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = getGenerated(id);
  if (!record) {
    return (
      <main className="mx-auto max-w-3xl px-8 py-10">
        <Link
          href="/practice"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回練習題列表
        </Link>
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="mb-2 text-xl font-semibold">找不到生成的題目</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            這道題目可能已被刪除，或網址不正確。請回到列表頁重新選擇或產生新題目。
          </p>
        </div>
      </main>
    );
  }
  return (
    <GeneratedQuestionView
      id={record.id}
      topic={record.topic}
      question={record.question}
      diagrams={record.diagrams ?? undefined}
    />
  );
}
