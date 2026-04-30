import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-12 px-8 py-24">
      <div className="text-center">
        <h1 className="mb-3 text-4xl font-bold tracking-tight">
          系統設計面試準備
        </h1>
        <p className="text-lg text-muted-foreground">
          為 Google L5/L6 系統設計面試打造的開源練習平台
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <Link
          href="/learn"
          className="rounded-lg border p-6 transition-colors hover:bg-accent"
        >
          <h2 className="mb-2 text-xl font-semibold">📚 知識庫</h2>
          <p className="text-sm text-muted-foreground">
            擴展性、CAP 定理、快取、資料庫等核心觀念，加上解題框架與容量估算。
          </p>
        </Link>

        <div className="rounded-lg border p-6 opacity-50">
          <h2 className="mb-2 text-xl font-semibold">🎯 練習題</h2>
          <p className="text-sm text-muted-foreground">
            系統設計模擬面試：先自行作答，再對照參考答案。（即將推出）
          </p>
        </div>
      </div>
    </main>
  );
}
