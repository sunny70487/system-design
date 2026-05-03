import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Compass,
  Target,
} from 'lucide-react';
import { HomeSearch } from '@/components/home-search';

const FEATURES = [
  {
    icon: Compass,
    title: '解題框架',
    desc: '需求釐清、容量估算、API、資料模型、架構、權衡——一步步引導你完成設計。',
  },
  {
    icon: Calculator,
    title: '容量估算',
    desc: 'QPS、儲存、頻寬、快取大小估算實戰，避免面試時臨場卡關。',
  },
  {
    icon: BookOpen,
    title: '核心觀念',
    desc: '擴展性、CAP、一致性、快取、訊息佇列、資料庫等系統設計必備知識。',
  },
];

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24 sm:pb-16 lg:px-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          開源 · CC-BY-SA-4.0
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          系統設計面試準備
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          為 Google L5/L6 系統設計面試打造的開源練習平台。
          覆蓋核心觀念、解題框架、容量估算與實戰題庫。
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <HomeSearch />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
          >
            <BookOpen className="h-4 w-4" />
            開始閱讀知識庫
          </Link>
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent cursor-pointer"
          >
            <Target className="h-4 w-4" />
            前往練習題
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/20"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/learn"
            className="group flex items-start gap-4 rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40 hover:bg-accent cursor-pointer"
          >
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-semibold">知識庫</h2>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                擴展性、CAP 定理、快取、資料庫等核心觀念，加上解題框架與容量估算。
              </p>
            </div>
          </Link>

          <Link
            href="/practice"
            className="group flex items-start gap-4 rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40 hover:bg-accent cursor-pointer"
          >
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-semibold">練習題</h2>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                系統設計模擬面試題庫：先試著自行作答，再對照參考解法。
              </p>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
