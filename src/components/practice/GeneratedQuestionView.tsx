'use client';

import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Sparkles } from 'lucide-react';
import { Mermaid } from '@/components/learn/Mermaid';
import { TableOfContents } from '@/components/learn/TableOfContents';
import type { Question } from '@/lib/shared/schemas';

type DiagramOutcome =
  | { status: 'ok'; autoFixed: boolean; llmRetried: boolean }
  | { status: 'fallback'; error: string };

interface GeneratedDiagrams {
  architecture: DiagramOutcome;
  workflow: DiagramOutcome;
}

interface GeneratedQuestionViewProps {
  id: string;
  topic: string;
  question: Question;
  diagrams?: GeneratedDiagrams;
}

function DiagramBlock({
  source,
  outcome,
  fallbackLabel,
}: {
  source: string;
  outcome: DiagramOutcome | undefined;
  fallbackLabel: string;
}) {
  const ok = !outcome || outcome.status === 'ok';
  if (ok) return <Mermaid chart={source} />;
  return (
    <div className="my-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4" />
        {fallbackLabel}無法解析，以下顯示原始 Mermaid 來源
      </div>
      {outcome.status === 'fallback' && outcome.error && (
        <p className="mb-2 text-xs text-amber-700 dark:text-amber-300/80">
          錯誤：{outcome.error}
        </p>
      )}
      <pre className="overflow-x-auto rounded bg-background p-3 text-xs">
        {source}
      </pre>
    </div>
  );
}

export function GeneratedQuestionView({
  topic,
  question,
  diagrams,
}: GeneratedQuestionViewProps) {
  const ea = question.expected_answer;
  const archOutcome = diagrams?.architecture;
  const workflowOutcome = diagrams?.workflow;

  const tocItems: { id: string; text: string; level: 2 | 3 }[] = [
    { id: 'problem', text: '題目敘述', level: 2 },
    { id: 'business', text: '業務需求', level: 2 },
    { id: 'requirements', text: '需求', level: 2 },
    { id: 'req-functional', text: '功能性需求', level: 3 },
    { id: 'req-non-functional', text: '非功能性需求', level: 3 },
    { id: 'capacity', text: '容量估算', level: 2 },
    { id: 'cap-assumptions', text: '假設', level: 3 },
    { id: 'cap-calculations', text: '推導', level: 3 },
    { id: 'solution', text: '參考解法', level: 2 },
    { id: 'high-level', text: '整體設計', level: 3 },
    { id: 'architecture', text: '架構圖', level: 3 },
    { id: 'key-components', text: '關鍵元件', level: 3 },
    { id: 'admission', text: '準入控制', level: 3 },
    { id: 'workflow-diagram', text: 'Workflow DAG 與狀態機', level: 3 },
    { id: 'workflow-stages', text: '各階段細節', level: 3 },
    { id: 'failure', text: '故障處理與降級', level: 3 },
    { id: 'optimizations', text: '優化', level: 3 },
    ...(ea.tradeoffs.length > 0
      ? [{ id: 'tradeoffs', text: '權衡', level: 3 as const }]
      : []),
    ...(ea.scaling_considerations.length > 0
      ? [{ id: 'scaling', text: '擴展性考量', level: 3 as const }]
      : []),
  ];

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
          <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            LLM 生成
          </span>
          <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {question.difficulty}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{question.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">主題：{topic}</p>
      </header>

      <div className="prose max-w-none">
        <h2 id="problem">題目敘述</h2>
        <p>{question.problem_statement}</p>

        <h2 id="business">業務需求 (Business Requirements)</h2>
        <ul>
          {ea.business_requirements.map((r, i) => (
            <li key={`br-${i}`}>{r}</li>
          ))}
        </ul>

        <h2 id="requirements">需求 (Requirements)</h2>
        <h3 id="req-functional">功能性需求</h3>
        <ul>
          {question.requirements.functional.map((r, i) => (
            <li key={`fn-${i}`}>{r}</li>
          ))}
        </ul>
        <h3 id="req-non-functional">非功能性需求</h3>
        <ul>
          {question.requirements.non_functional.map((r, i) => (
            <li key={`nf-${i}`}>{r}</li>
          ))}
        </ul>

        <h2 id="capacity">容量估算 (Capacity Estimation)</h2>
        <h3 id="cap-assumptions">假設</h3>
        <ul>
          {ea.capacity_estimation.assumptions.map((s, i) => (
            <li key={`ca-${i}`}>{s}</li>
          ))}
        </ul>
        <h3 id="cap-calculations">推導</h3>
        <ul>
          {ea.capacity_estimation.calculations.map((s, i) => (
            <li key={`cc-${i}`}>{s}</li>
          ))}
        </ul>

        <h2 id="solution">參考解法</h2>
        <h3 id="high-level">整體設計 (High-Level Design)</h3>
        <p>{ea.high_level_design}</p>

        <h3 id="architecture">架構圖 (Architecture)</h3>
      </div>
      <DiagramBlock
        source={ea.architecture_diagram}
        outcome={archOutcome}
        fallbackLabel="架構圖"
      />

      <div className="prose max-w-none">
        <h3 id="key-components">關鍵元件 (Key Components)</h3>
        <ul>
          {ea.key_components.map((c, i) => (
            <li key={`kc-${i}`}>
              <strong>{c.name}</strong>：{c.responsibility}
            </li>
          ))}
        </ul>

        <h3 id="admission">準入控制 (Admission Control)</h3>
        <ul>
          {ea.admission_control.map((s, i) => (
            <li key={`ac-${i}`}>{s}</li>
          ))}
        </ul>

        <h3 id="workflow-diagram">Workflow DAG 與狀態機</h3>
      </div>
      <DiagramBlock
        source={ea.workflow_diagram}
        outcome={workflowOutcome}
        fallbackLabel="Workflow 圖"
      />

      <div className="prose max-w-none">
        <h3 id="workflow-stages">各階段細節 (Workflow Stages)</h3>
        <ul>
          {ea.workflow_stages.map((s, i) => (
            <li key={`ws-${i}`}>
              <strong>{s.name}</strong>（{s.compute_profile}，
              {s.can_interrupt ? '可中斷' : '不可中斷'}）：{s.purpose}
              <br />
              <span className="text-sm text-muted-foreground">
                重試策略：{s.retry_strategy}
              </span>
            </li>
          ))}
        </ul>

        <h3 id="failure">故障處理與服務降級 (Failure & Degradation)</h3>
        <ol>
          {ea.failure_and_degradation.map((s, i) => (
            <li key={`fd-${i}`}>{s}</li>
          ))}
        </ol>

        <h3 id="optimizations">優化 (Optimizations)</h3>
        <ul>
          {ea.optimizations.map((s, i) => (
            <li key={`op-${i}`}>{s}</li>
          ))}
        </ul>

        {ea.tradeoffs.length > 0 && (
          <>
            <h3 id="tradeoffs">權衡 (Tradeoffs)</h3>
            <ul>
              {ea.tradeoffs.map((t, i) => (
                <li key={`to-${i}`}>{t}</li>
              ))}
            </ul>
          </>
        )}

        {ea.scaling_considerations.length > 0 && (
          <>
            <h3 id="scaling">擴展性考量 (Scaling Considerations)</h3>
            <ul>
              {ea.scaling_considerations.map((s, i) => (
                <li key={`sc-${i}`}>{s}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        本題由 LLM 動態生成，僅供練習參考；正確性與品質取決於你選用的模型與提示工程。
      </footer>
      </article>
      <TableOfContents items={tocItems} />
    </div>
  );
}
