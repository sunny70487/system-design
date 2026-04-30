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
});
export type Question = z.infer<typeof QuestionSchema>;

export const DraftSchema = z.object({
  questionId: z.string(),
  content: z.string(),
  mermaidSource: z.string().optional(),
  updatedAt: z.number(),
});
export type Draft = z.infer<typeof DraftSchema>;
