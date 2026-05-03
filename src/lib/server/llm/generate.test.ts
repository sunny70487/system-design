import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoObjectGeneratedError } from 'ai';
import type { Question } from '@/lib/shared/schemas';

const generateObjectMock = vi.fn();

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');
  return {
    ...actual,
    generateObject: (...args: unknown[]) => generateObjectMock(...args),
  };
});

vi.mock('./provider', () => ({
  getProvider: () => ({
    baseURL: 'https://x',
    model: 'gpt-4o-mini',
    client: {},
  }),
}));

import { generateQuestion, findMissingSections, LowQualityError } from './generate';

const credentials = {
  baseURL: 'https://x',
  apiKey: 'k',
  model: 'gpt-4o-mini',
};

const fullQuestion = {
  title: 'Design Warp',
  problem_statement: 'Design a GPU-accelerated terminal emulator that renders text at 60fps with minimal CPU overhead and supports modern Unicode.',
  requirements: {
    functional: ['render text at 60fps', 'support Unicode clusters', 'plugin extensibility'],
    non_functional: ['<5ms frame latency', '99.9% availability', '<200MB RAM'],
  },
  expected_answer: {
    business_requirements: ['responsive UX under load', 'low CPU usage for battery life', 'cross-platform consistency'],
    capacity_estimation: {
      assumptions: ['1M DAU', '60 fps render target'],
      calculations: ['60 fps * avg 2000 glyphs = 120K glyph lookups/s per client', 'Peak memory: 150MB for glyph atlas + scrollback'],
    },
    high_level_design: 'The terminal uses a GPU-backed rendering pipeline: input events flow through a PTY layer, parsed into a virtual terminal state machine, then rasterized via a glyph atlas on the GPU. A compositor handles layers (selection, cursor, text) and produces frames at vsync rate.',
    architecture_diagram: 'flowchart LR\n PTY-->Parser-->StateBuffer-->GlyphAtlas-->GPURenderer-->Display',
    workflow_diagram: 'flowchart LR\n Input-->Parse-->Layout-->Rasterize-->Composite-->Present',
    key_components: [
      { name: 'Renderer', responsibility: 'GPU-accelerated glyph rasterization' },
      { name: 'Parser', responsibility: 'ANSI/VT escape sequence interpretation' },
      { name: 'StateBuffer', responsibility: 'Virtual terminal grid state management' },
    ],
    admission_control: ['frame budget guard drops frames on overrun', 'input coalescing under high throughput'],
    workflow_stages: [
      { name: 'Parse', purpose: 'decode input bytes', compute_profile: 'CPU', can_interrupt: true, retry_strategy: 'buffer and retry next frame' },
      { name: 'Layout', purpose: 'compute glyph positions', compute_profile: 'CPU', can_interrupt: true, retry_strategy: 'reuse previous layout' },
      { name: 'Render', purpose: 'GPU draw call submission', compute_profile: 'GPU', can_interrupt: false, retry_strategy: 'skip frame on GPU timeout' },
    ],
    failure_and_degradation: [
      'GPU lost -> fallback to CPU software renderer',
      'frame budget exceeded -> reduce scrollback buffer and disable ligatures',
      'system memory pressure -> evict glyph atlas LRU entries',
    ],
    optimizations: ['glyph atlas cache eliminates repeated rasterization', 'SIMD text shaping for complex scripts', 'dirty-rect tracking to minimize GPU draw calls'],
    tradeoffs: ['GPU rendering vs CPU portability', 'large glyph atlas vs memory usage'],
    scaling_considerations: ['plugin sandbox isolation', 'multi-window shared atlas'],
  },
  difficulty: 'L5' as const,
  related_chapters: [],
};

describe('generateQuestion', () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
  });

  it('returns a Question matching the schema', async () => {
    generateObjectMock.mockResolvedValueOnce({ object: fullQuestion });

    const q = await generateQuestion('Warp', credentials);
    expect(q.title).toBe('Design Warp');
    expect(q.difficulty).toBe('L5');
    expect(q.expected_answer.workflow_diagram).toContain('flowchart');
    expect(q.expected_answer.business_requirements.length).toBeGreaterThan(0);
  });

  it('throws LowQualityError for malformed LLM output when enrichment is disabled', async () => {
    const malformedText =
      '```json\n' +
      JSON.stringify({
        title: 'Design text-to-video',
        problem_statement: 'Design a text-to-video pipeline.',
        requirements: { functional: ['encode'], non_functional: [] },
        expected_answer: {
          high_level_design: 'pipeline...',
          architecture_diagram: 'flowchart LR\n A --> B',
          key_components: [{ name: 'GPU', responsibility: 'inference' }],
          tradeoffs: [],
          scaling_considerations: null,
        },
        difficulty: 'Senior (L5/L6)',
      }) +
      '\n```';

    generateObjectMock.mockRejectedValueOnce(
      new NoObjectGeneratedError({
        message: 'response did not match schema',
        text: malformedText,
        response: { id: 'r', timestamp: new Date(), modelId: 'm' },
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          inputTokenDetails: {
            noCacheTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          },
          outputTokenDetails: { textTokens: 0, reasoningTokens: 0 },
        },
        finishReason: 'stop',
      }),
    );

    await expect(
      generateQuestion('text-to-video', credentials, { maxEnrichments: 0 }),
    ).rejects.toThrow(LowQualityError);
  });

  it('rethrows non-recoverable errors', async () => {
    generateObjectMock.mockRejectedValueOnce(new Error('rate limited'));
    await expect(generateQuestion('x', credentials)).rejects.toThrow(
      'rate limited',
    );
  });
});

describe('findMissingSections', () => {
  it('returns empty array for a fully populated question', () => {
    const good = {
      ...fullQuestion,
      problem_statement: 'A'.repeat(50),
      expected_answer: {
        ...fullQuestion.expected_answer,
        business_requirements: ['a', 'b', 'c'],
        capacity_estimation: {
          assumptions: ['x', 'y'],
          calculations: ['z', 'w'],
        },
        high_level_design: 'A'.repeat(81),
        architecture_diagram: 'flowchart LR\n A-->B-->C-->D-->E-->F',
        workflow_diagram: 'flowchart LR\n A-->B-->C-->D-->E-->F',
        key_components: [
          { name: 'A', responsibility: 'a' },
          { name: 'B', responsibility: 'b' },
          { name: 'C', responsibility: 'c' },
        ],
        admission_control: ['layer1', 'layer2'],
        workflow_stages: [
          { name: 'S1', purpose: 'p', compute_profile: 'CPU', can_interrupt: true, retry_strategy: 'r' },
          { name: 'S2', purpose: 'p', compute_profile: 'GPU', can_interrupt: false, retry_strategy: 'r' },
          { name: 'S3', purpose: 'p', compute_profile: 'CPU', can_interrupt: true, retry_strategy: 'r' },
        ],
        failure_and_degradation: ['t1', 't2', 't3'],
        optimizations: ['o1', 'o2', 'o3'],
        tradeoffs: ['t'],
        scaling_considerations: ['s'],
      },
      requirements: {
        functional: ['f1', 'f2', 'f3'],
        non_functional: ['n1', 'n2', 'n3'],
      },
    };
    expect(findMissingSections(good as unknown as Question)).toEqual([]);
  });

  it('detects missing sections', () => {
    const thin = {
      ...fullQuestion,
      problem_statement: 'A'.repeat(50),
      expected_answer: {
        ...fullQuestion.expected_answer,
        business_requirements: ['one'],
        optimizations: [],
        high_level_design: 'A'.repeat(81),
        architecture_diagram: 'flowchart LR\n A-->B-->C-->D-->E-->F',
        workflow_diagram: 'flowchart LR\n A-->B-->C-->D-->E-->F',
        key_components: [
          { name: 'A', responsibility: 'a' },
          { name: 'B', responsibility: 'b' },
          { name: 'C', responsibility: 'c' },
        ],
        admission_control: ['layer1', 'layer2'],
        workflow_stages: [
          { name: 'S1', purpose: 'p', compute_profile: 'CPU', can_interrupt: true, retry_strategy: 'r' },
          { name: 'S2', purpose: 'p', compute_profile: 'GPU', can_interrupt: false, retry_strategy: 'r' },
          { name: 'S3', purpose: 'p', compute_profile: 'CPU', can_interrupt: true, retry_strategy: 'r' },
        ],
        failure_and_degradation: ['t1', 't2', 't3'],
        capacity_estimation: {
          assumptions: ['x', 'y'],
          calculations: ['z', 'w'],
        },
      },
      requirements: {
        functional: ['f1', 'f2', 'f3'],
        non_functional: ['n1', 'n2', 'n3'],
      },
    };
    const missing = findMissingSections(thin as unknown as Question);
    expect(missing).toContain('business_requirements');
    expect(missing).toContain('optimizations');
  });

  it('detects sentinel strings', () => {
    const withSentinel = {
      ...fullQuestion,
      problem_statement: 'A'.repeat(50),
      expected_answer: {
        ...fullQuestion.expected_answer,
        business_requirements: ['__MISSING__:business_requirements', 'b', 'c'],
        high_level_design: 'A'.repeat(81),
        architecture_diagram: 'flowchart LR\n A-->B-->C-->D-->E-->F',
        workflow_diagram: 'flowchart LR\n A-->B-->C-->D-->E-->F',
        key_components: [
          { name: 'A', responsibility: 'a' },
          { name: 'B', responsibility: 'b' },
          { name: 'C', responsibility: 'c' },
        ],
        admission_control: ['layer1', 'layer2'],
        workflow_stages: [
          { name: 'S1', purpose: 'p', compute_profile: 'CPU', can_interrupt: true, retry_strategy: 'r' },
          { name: 'S2', purpose: 'p', compute_profile: 'GPU', can_interrupt: false, retry_strategy: 'r' },
          { name: 'S3', purpose: 'p', compute_profile: 'CPU', can_interrupt: true, retry_strategy: 'r' },
        ],
        failure_and_degradation: ['t1', 't2', 't3'],
        optimizations: ['o1', 'o2', 'o3'],
        capacity_estimation: {
          assumptions: ['x', 'y'],
          calculations: ['z', 'w'],
        },
      },
      requirements: {
        functional: ['f1', 'f2', 'f3'],
        non_functional: ['n1', 'n2', 'n3'],
      },
    };
    const missing = findMissingSections(withSentinel as unknown as Question);
    expect(missing).toContain('business_requirements');
  });
});
