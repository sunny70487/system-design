import { z } from 'zod';

export const QuestionSchema = z.object({
  title: z.string().min(1),
  problem_statement: z.string().min(1),
  requirements: z.object({
    functional: z.array(z.string()).min(1),
    non_functional: z.array(z.string()).min(1),
  }),
  expected_answer: z.object({
    high_level_design: z.string().min(1),
    architecture_diagram: z.string().min(1),
    key_components: z
      .array(
        z.object({
          name: z.string(),
          responsibility: z.string(),
        }),
      )
      .min(1),
    tradeoffs: z.array(z.string()),
    scaling_considerations: z.array(z.string()),
  }),
  difficulty: z.enum(['L4', 'L5', 'L6']),
  related_chapters: z.array(z.string()).default([]),
});
export type Question = z.infer<typeof QuestionSchema>;

export const DraftSchema = z.object({
  questionId: z.string(),
  content: z.string(),
  mermaidSource: z.string().optional(),
  updatedAt: z.number(),
});
export type Draft = z.infer<typeof DraftSchema>;

export const LearnChapterSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  group: z.enum([
    'framework',
    'estimation',
    'foundations',
    'data',
    'network',
    'distributed',
    'case-studies',
  ]),
  order: z.number().int().nonnegative(),
  summary: z.string().min(10),
  sources: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
        license: z.string(),
        sections: z.array(z.string()).optional(),
      }),
    )
    .min(1),
  related_questions: z.array(z.string()).default([]),
  related_chapters: z.array(z.string()).default([]),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type LearnChapter = z.infer<typeof LearnChapterSchema>;

export const LearnIndexSchema = z.object({
  groups: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      order: z.number().int().nonnegative(),
      chapters: z.array(z.string()),
    }),
  ),
});
export type LearnIndex = z.infer<typeof LearnIndexSchema>;
