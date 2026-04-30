import { describe, it, expect } from 'vitest';
import { QuestionSchema, DraftSchema } from './schemas';

const sampleQuestion = {
  title: 'Design Kafka',
  problem_statement: 'Design a distributed message queue.',
  requirements: { functional: ['publish'], non_functional: ['low latency'] },
  expected_answer: {
    high_level_design: 'Use partitioned log...',
    architecture_diagram: 'flowchart LR\n  P --> B',
    key_components: [{ name: 'Broker', responsibility: 'storage' }],
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
