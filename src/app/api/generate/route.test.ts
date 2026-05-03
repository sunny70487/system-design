import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLM_HEADERS } from '@/lib/server/llm/provider';

const generateQuestionMock = vi.fn();
const llmFixMermaidMock = vi.fn();

vi.mock('@/lib/server/llm/generate', () => {
  class LowQualityError extends Error {
    readonly missing: string[];
    constructor(missing: string[]) {
      super('low quality');
      this.name = 'LowQualityError';
      this.missing = missing;
    }
  }
  return {
    generateQuestion: (...args: unknown[]) => generateQuestionMock(...args),
    LowQualityError,
  };
});

vi.mock('@/lib/server/llm/mermaid-retry', () => ({
  llmFixMermaid: (...args: unknown[]) => llmFixMermaidMock(...args),
}));

import { POST } from './route';
import { LowQualityError } from '@/lib/server/llm/generate';

function makeReq(
  body: unknown,
  headers: Record<string, string> = {
    [LLM_HEADERS.baseURL]: 'https://api.openai.com/v1',
    [LLM_HEADERS.apiKey]: 'sk-test',
    [LLM_HEADERS.model]: 'gpt-4o-mini',
  },
): Request {
  return new Request('http://localhost/api/generate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });
}

const validQuestion = {
  title: 'Design Warp',
  problem_statement: 'Design a GPU-accelerated terminal.',
  requirements: {
    functional: ['render text'],
    non_functional: ['low latency'],
  },
  expected_answer: {
    business_requirements: ['responsive UX'],
    capacity_estimation: {
      assumptions: ['1M DAU'],
      calculations: ['60 fps target'],
    },
    high_level_design: 'h',
    architecture_diagram: 'flowchart LR\n A --> B',
    workflow_diagram: 'flowchart LR\n Ready --> Running --> Complete',
    key_components: [{ name: 'X', responsibility: 'Y' }],
    admission_control: ['frame budget'],
    workflow_stages: [
      {
        name: 'Render',
        purpose: 'draw frame',
        compute_profile: 'GPU',
        can_interrupt: true,
        retry_strategy: 'drop frame',
      },
    ],
    failure_and_degradation: ['fallback to CPU'],
    optimizations: ['glyph atlas'],
    tradeoffs: ['t'],
    scaling_considerations: ['s'],
  },
  difficulty: 'L5' as const,
  related_chapters: [],
};

describe('POST /api/generate', () => {
  beforeEach(() => {
    generateQuestionMock.mockReset();
    llmFixMermaidMock.mockReset();
  });

  it('returns 400 for empty topic', async () => {
    const res = await POST(makeReq({ topic: '' }));
    expect(res.status).toBe(400);
  });

  it('returns generated question with both diagrams ok', async () => {
    generateQuestionMock.mockResolvedValueOnce(validQuestion);
    const res = await POST(makeReq({ topic: 'Warp' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.question.title).toBe('Design Warp');
    expect(body.mermaid_status).toBe('ok');
    expect(body.diagrams.architecture.status).toBe('ok');
    expect(body.diagrams.workflow.status).toBe('ok');
  });

  it('marks mermaid_status fallback when workflow diagram is broken', async () => {
    generateQuestionMock.mockResolvedValueOnce({
      ...validQuestion,
      expected_answer: {
        ...validQuestion.expected_answer,
        workflow_diagram: 'not a real diagram !!!',
      },
    });
    llmFixMermaidMock.mockResolvedValueOnce('still not valid');
    const res = await POST(makeReq({ topic: 'Warp' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mermaid_status).toBe('fallback');
    expect(body.diagrams.architecture.status).toBe('ok');
    expect(body.diagrams.workflow.status).toBe('fallback');
  });

  it('returns 502 when LLM throws', async () => {
    generateQuestionMock.mockRejectedValueOnce(new Error('rate limited'));
    const res = await POST(makeReq({ topic: 'Warp' }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('llm_error');
  });

  it('returns 502 with low_quality error and missing list', async () => {
    generateQuestionMock.mockRejectedValueOnce(
      new LowQualityError(['business_requirements', 'capacity_estimation.calculations']),
    );
    const res = await POST(makeReq({ topic: 'Warp' }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('low_quality');
    expect(body.missing).toEqual(['business_requirements', 'capacity_estimation.calculations']);
  });
});
