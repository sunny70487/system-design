import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateQuestion, LowQualityError } from '@/lib/server/llm/generate';
import { llmFixMermaid } from '@/lib/server/llm/mermaid-retry';
import { runMermaidPipeline } from '@/lib/server/mermaid/pipeline';
import {
  readCredentialsFromHeaders,
  MissingCredentialsError,
} from '@/lib/server/llm/provider';
import { insertGenerated } from '@/lib/server/generated/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({ topic: z.string().min(1).max(200) });

type DiagramOutcome =
  | { status: 'ok'; autoFixed: boolean; llmRetried: boolean }
  | { status: 'fallback'; error: string };

export async function POST(req: Request) {
  const credentials = readCredentialsFromHeaders(req.headers);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_topic' }, { status: 400 });
  }

  let question;
  try {
    question = await generateQuestion(parsed.data.topic, credentials);
  } catch (e) {
    if (e instanceof MissingCredentialsError) {
      return NextResponse.json(
        { error: 'missing_credentials', message: e.message },
        { status: 400 },
      );
    }
    if (e instanceof LowQualityError) {
      return NextResponse.json(
        { error: 'low_quality', missing: e.missing },
        { status: 502 },
      );
    }
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json(
      { error: 'llm_error', message: msg },
      { status: 502 },
    );
  }

  const archPipeline = await runMermaidPipeline(
    question.expected_answer.architecture_diagram,
    (src, err) => llmFixMermaid(src, err, credentials),
  );
  const workflowPipeline = await runMermaidPipeline(
    question.expected_answer.workflow_diagram,
    (src, err) => llmFixMermaid(src, err, credentials),
  );

  let architectureOutcome: DiagramOutcome;
  if (archPipeline.status === 'ok') {
    question.expected_answer.architecture_diagram = archPipeline.source;
    architectureOutcome = {
      status: 'ok',
      autoFixed: archPipeline.autoFixed,
      llmRetried: archPipeline.llmRetried,
    };
  } else {
    architectureOutcome = { status: 'fallback', error: archPipeline.error };
  }

  let workflowOutcome: DiagramOutcome;
  if (workflowPipeline.status === 'ok') {
    question.expected_answer.workflow_diagram = workflowPipeline.source;
    workflowOutcome = {
      status: 'ok',
      autoFixed: workflowPipeline.autoFixed,
      llmRetried: workflowPipeline.llmRetried,
    };
  } else {
    workflowOutcome = { status: 'fallback', error: workflowPipeline.error };
  }

  const allOk =
    architectureOutcome.status === 'ok' && workflowOutcome.status === 'ok';

  const diagrams = {
    architecture: architectureOutcome,
    workflow: workflowOutcome,
  };

  let saved;
  try {
    saved = insertGenerated({
      topic: parsed.data.topic,
      question,
      diagrams,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json(
      { error: 'persist_failed', message: msg },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: saved.id,
    createdAt: saved.createdAt,
    question,
    diagrams,
    mermaid_status: allOk ? 'ok' : 'fallback',
    mermaid_auto_fixed:
      (architectureOutcome.status === 'ok' && architectureOutcome.autoFixed) ||
      (workflowOutcome.status === 'ok' && workflowOutcome.autoFixed),
    mermaid_llm_retried:
      (architectureOutcome.status === 'ok' && architectureOutcome.llmRetried) ||
      (workflowOutcome.status === 'ok' && workflowOutcome.llmRetried),
    mermaid_error:
      architectureOutcome.status === 'fallback'
        ? architectureOutcome.error
        : workflowOutcome.status === 'fallback'
        ? workflowOutcome.error
        : undefined,
  });
}
