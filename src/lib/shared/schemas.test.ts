import { describe, it, expect } from 'vitest';
import {
  QuestionSchema,
  DraftSchema,
  LearnChapterSchema,
  LearnIndexSchema,
} from './schemas';

const sampleQuestion = {
  title: 'Design Kafka',
  problem_statement: 'Design a distributed message queue.',
  requirements: { functional: ['publish'], non_functional: ['low latency'] },
  expected_answer: {
    business_requirements: ['durable async messaging'],
    capacity_estimation: {
      assumptions: ['1M msg/s peak'],
      calculations: ['1M * 1KB = 1GB/s ingress'],
    },
    high_level_design: 'Use partitioned log...',
    architecture_diagram: 'flowchart LR\n  P --> B',
    workflow_diagram: 'flowchart LR\n  Ready --> Running --> Complete',
    key_components: [{ name: 'Broker', responsibility: 'storage' }],
    admission_control: ['quota by topic'],
    workflow_stages: [
      {
        name: 'Append',
        purpose: 'persist to log',
        compute_profile: 'CPU + SSD',
        can_interrupt: false,
        retry_strategy: 'idempotent producer retry',
      },
    ],
    failure_and_degradation: ['leader failover', 'isr shrink'],
    optimizations: ['batch + compression'],
    tradeoffs: ['durability vs latency'],
    scaling_considerations: ['shard by topic'],
  },
  difficulty: 'L5' as const,
};

describe('QuestionSchema', () => {
  it('parses a valid question', () => {
    const r = QuestionSchema.safeParse(sampleQuestion);
    expect(r.success).toBe(true);
  });
  it('rejects when difficulty is invalid', () => {
    const r = QuestionSchema.safeParse({ ...sampleQuestion, difficulty: 'L9' });
    expect(r.success).toBe(false);
  });
  it('rejects when required deep sections are missing', () => {
    const broken = {
      ...sampleQuestion,
      expected_answer: {
        ...sampleQuestion.expected_answer,
        admission_control: [],
      },
    };
    expect(QuestionSchema.safeParse(broken).success).toBe(false);
  });
  it('defaults related_chapters to []', () => {
    const parsed = QuestionSchema.parse(sampleQuestion);
    expect(parsed.related_chapters).toEqual([]);
  });
  it('accepts related_chapters array', () => {
    const parsed = QuestionSchema.parse({
      ...sampleQuestion,
      related_chapters: ['scalability', 'caching'],
    });
    expect(parsed.related_chapters).toEqual(['scalability', 'caching']);
  });
});

describe('DraftSchema', () => {
  it('parses a valid draft', () => {
    const r = DraftSchema.safeParse({
      questionId: 'kafka',
      content: 'my answer',
      updatedAt: Date.now(),
    });
    expect(r.success).toBe(true);
  });
});

const validChapter = {
  slug: 'scalability',
  title: '擴展性',
  group: 'foundations' as const,
  order: 1,
  summary: '從垂直擴展到水平擴展，以及無狀態服務的核心觀念。',
  sources: [
    {
      name: 'primer-zh-tw',
      url: 'https://github.com/kevingo/system-design-primer-zh-tw',
      license: 'CC-BY-SA-4.0',
    },
  ],
  related_questions: [],
  related_chapters: [],
  updated: '2026-04-30',
};

describe('LearnChapterSchema', () => {
  it('parses a valid chapter front-matter', () => {
    expect(LearnChapterSchema.safeParse(validChapter).success).toBe(true);
  });

  it('rejects invalid slug', () => {
    expect(
      LearnChapterSchema.safeParse({ ...validChapter, slug: 'Bad Slug' }).success,
    ).toBe(false);
  });

  it('rejects unknown group', () => {
    expect(
      LearnChapterSchema.safeParse({ ...validChapter, group: 'random' }).success,
    ).toBe(false);
  });

  it('rejects empty sources', () => {
    expect(
      LearnChapterSchema.safeParse({ ...validChapter, sources: [] }).success,
    ).toBe(false);
  });

  it('rejects bad date format', () => {
    expect(
      LearnChapterSchema.safeParse({ ...validChapter, updated: '2026-4-30' })
        .success,
    ).toBe(false);
  });

  it('defaults related_questions and related_chapters to []', () => {
    const { related_questions, related_chapters, ...rest } = validChapter;
    void related_questions;
    void related_chapters;
    const parsed = LearnChapterSchema.parse(rest);
    expect(parsed.related_questions).toEqual([]);
    expect(parsed.related_chapters).toEqual([]);
  });
});

describe('LearnIndexSchema', () => {
  it('parses valid index', () => {
    expect(
      LearnIndexSchema.safeParse({
        groups: [
          {
            id: 'foundations',
            title: '基礎概念',
            order: 0,
            chapters: ['chapters/scalability'],
          },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects negative order', () => {
    expect(
      LearnIndexSchema.safeParse({
        groups: [{ id: 'a', title: 'A', order: -1, chapters: [] }],
      }).success,
    ).toBe(false);
  });
});
