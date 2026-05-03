import { generateObject, NoObjectGeneratedError } from 'ai';
import { z } from 'zod';
import { QuestionSchema, type Question } from '@/lib/shared/schemas';
import {
  GOOGLE_INTERVIEWER_PROMPT,
  STAGE_B_ENRICH_PROMPT,
  enrichMissingPrompt,
} from './prompts';
import { getProvider, type LLMCredentials } from './provider';

const SENTINEL = '__MISSING__';
const sentinel = (label: string) => `${SENTINEL}:${label}`;
const isSentinel = (v: unknown): boolean =>
  typeof v === 'string' && v.startsWith(SENTINEL);

const MIN_BUSINESS_ITEMS = 3;
const MIN_FUNCTIONAL_ITEMS = 3;
const MIN_NON_FUNCTIONAL_ITEMS = 3;
const MIN_CAPACITY_ASSUMPTIONS = 2;
const MIN_CAPACITY_CALCULATIONS = 2;
const MIN_KEY_COMPONENTS = 3;
const MIN_ADMISSION_LAYERS = 2;
const MIN_WORKFLOW_STAGES = 3;
const MIN_DEGRADATION_TIERS = 3;
const MIN_OPTIMIZATIONS = 3;
const MIN_HLD_LENGTH = 80;
const MIN_DIAGRAM_LENGTH = 30;

export class LowQualityError extends Error {
  readonly missing: string[];
  constructor(missing: string[]) {
    super(`Generated answer is too thin. Missing or weak: ${missing.join(', ')}`);
    this.name = 'LowQualityError';
    this.missing = missing;
  }
}

const optStr = z.string().nullish();
const optStrArray = z.array(z.string()).nullish();
const optBool = z.boolean().nullish();

const LenientWorkflowStageSchema = z
  .object({
    name: optStr,
    purpose: optStr,
    compute_profile: optStr,
    can_interrupt: optBool,
    retry_strategy: optStr,
  })
  .partial();

const LenientCapacityEstimationSchema = z
  .object({
    assumptions: optStrArray,
    calculations: optStrArray,
  })
  .partial();

const LenientQuestionSchema = z
  .object({
    title: optStr,
    problem_statement: optStr,
    requirements: z
      .object({
        functional: optStrArray,
        non_functional: optStrArray,
      })
      .partial()
      .nullish(),
    expected_answer: z
      .object({
        business_requirements: optStrArray,
        capacity_estimation: LenientCapacityEstimationSchema.nullish(),
        high_level_design: optStr,
        architecture_diagram: optStr,
        workflow_diagram: optStr,
        key_components: z
          .array(
            z
              .object({
                name: optStr,
                responsibility: optStr,
              })
              .partial(),
          )
          .nullish(),
        admission_control: optStrArray,
        workflow_stages: z.array(LenientWorkflowStageSchema).nullish(),
        failure_and_degradation: optStrArray,
        optimizations: optStrArray,
        tradeoffs: optStrArray,
        scaling_considerations: optStrArray,
      })
      .partial()
      .nullish(),
    difficulty: optStr,
    related_chapters: optStrArray,
  })
  .partial();

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const m = fence.exec(trimmed);
  return (m ? m[1] : trimmed).trim();
}

function repairText({ text }: { text: string }): string {
  return stripCodeFences(text);
}

function normalizeDifficulty(raw: unknown): 'L4' | 'L5' | 'L6' {
  if (typeof raw !== 'string') return 'L5';
  const upper = raw.toUpperCase().trim();
  if (upper === 'L4' || upper === 'L5' || upper === 'L6') return upper;
  if (upper.includes('L5')) return 'L5';
  if (upper.includes('L6')) return 'L6';
  if (upper.includes('L4')) return 'L4';
  return 'L5';
}

function cleanStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function arrayOrSentinel(arr: unknown, label: string): string[] {
  const cleaned = cleanStringArray(arr);
  return cleaned.length > 0 ? cleaned : [sentinel(label)];
}

function coerceToQuestion(raw: unknown, topic: string): Question {
  const parsed = LenientQuestionSchema.safeParse(raw);
  const data = parsed.success ? parsed.data : {};

  const title = data.title?.trim?.() || `Design: ${topic}`;
  const problem_statement =
    data.problem_statement?.trim?.() || sentinel('problem_statement');

  const functional = arrayOrSentinel(
    data.requirements?.functional,
    'requirements.functional',
  );
  const non_functional = arrayOrSentinel(
    data.requirements?.non_functional,
    'requirements.non_functional',
  );

  const ea = data.expected_answer ?? {};

  const business_requirements = arrayOrSentinel(
    ea.business_requirements,
    'business_requirements',
  );

  const cap = ea.capacity_estimation ?? {};
  const capacity_estimation = {
    assumptions: arrayOrSentinel(cap.assumptions, 'capacity_estimation.assumptions'),
    calculations: arrayOrSentinel(
      cap.calculations,
      'capacity_estimation.calculations',
    ),
  };

  const high_level_design =
    ea.high_level_design?.trim?.() || sentinel('high_level_design');
  const architecture_diagram =
    ea.architecture_diagram?.trim?.() || sentinel('architecture_diagram');
  const workflow_diagram =
    ea.workflow_diagram?.trim?.() || sentinel('workflow_diagram');

  const componentsRaw = ea.key_components;
  const components: { name: string; responsibility: string }[] = Array.isArray(
    componentsRaw,
  )
    ? componentsRaw
        .map((c) => ({
          name: (c?.name ?? '').trim(),
          responsibility: (c?.responsibility ?? '').trim(),
        }))
        .filter((c) => c.name.length > 0 || c.responsibility.length > 0)
    : [];
  if (components.length === 0) {
    components.push({
      name: sentinel('key_components.name'),
      responsibility: sentinel('key_components.responsibility'),
    });
  }

  const admission_control = arrayOrSentinel(
    ea.admission_control,
    'admission_control',
  );

  const stagesRaw = ea.workflow_stages;
  const workflow_stages = Array.isArray(stagesRaw)
    ? stagesRaw
        .map((s) => ({
          name: (s?.name ?? '').trim(),
          purpose: (s?.purpose ?? '').trim(),
          compute_profile: (s?.compute_profile ?? '').trim(),
          can_interrupt:
            typeof s?.can_interrupt === 'boolean' ? s.can_interrupt : true,
          retry_strategy: (s?.retry_strategy ?? '').trim(),
        }))
        .filter(
          (s) =>
            s.name.length > 0 ||
            s.purpose.length > 0 ||
            s.compute_profile.length > 0,
        )
        .map((s) => ({
          name: s.name || sentinel('workflow_stages.name'),
          purpose: s.purpose || sentinel('workflow_stages.purpose'),
          compute_profile:
            s.compute_profile || sentinel('workflow_stages.compute_profile'),
          can_interrupt: s.can_interrupt,
          retry_strategy:
            s.retry_strategy || sentinel('workflow_stages.retry_strategy'),
        }))
    : [];
  if (workflow_stages.length === 0) {
    workflow_stages.push({
      name: sentinel('workflow_stages.name'),
      purpose: sentinel('workflow_stages.purpose'),
      compute_profile: sentinel('workflow_stages.compute_profile'),
      can_interrupt: true,
      retry_strategy: sentinel('workflow_stages.retry_strategy'),
    });
  }

  const failure_and_degradation = arrayOrSentinel(
    ea.failure_and_degradation,
    'failure_and_degradation',
  );
  const optimizations = arrayOrSentinel(ea.optimizations, 'optimizations');

  const tradeoffs = cleanStringArray(ea.tradeoffs);
  const scaling_considerations = cleanStringArray(ea.scaling_considerations);
  const related_chapters = cleanStringArray(data.related_chapters);

  const candidate = {
    title,
    problem_statement,
    requirements: { functional, non_functional },
    expected_answer: {
      business_requirements,
      capacity_estimation,
      high_level_design,
      architecture_diagram,
      workflow_diagram,
      key_components: components,
      admission_control,
      workflow_stages,
      failure_and_degradation,
      optimizations,
      tradeoffs,
      scaling_considerations,
    },
    difficulty: normalizeDifficulty(data.difficulty),
    related_chapters,
  };

  return QuestionSchema.parse(candidate);
}

function realItems(arr: string[]): string[] {
  return arr.filter((s) => !isSentinel(s));
}

export function findMissingSections(q: Question): string[] {
  const missing: string[] = [];
  const ea = q.expected_answer;

  if (isSentinel(q.problem_statement) || q.problem_statement.length < 40) {
    missing.push('problem_statement');
  }
  if (realItems(q.requirements.functional).length < MIN_FUNCTIONAL_ITEMS) {
    missing.push('requirements.functional');
  }
  if (realItems(q.requirements.non_functional).length < MIN_NON_FUNCTIONAL_ITEMS) {
    missing.push('requirements.non_functional (with quantified targets)');
  }
  if (realItems(ea.business_requirements).length < MIN_BUSINESS_ITEMS) {
    missing.push('business_requirements');
  }
  if (
    realItems(ea.capacity_estimation.assumptions).length < MIN_CAPACITY_ASSUMPTIONS
  ) {
    missing.push('capacity_estimation.assumptions');
  }
  if (
    realItems(ea.capacity_estimation.calculations).length <
    MIN_CAPACITY_CALCULATIONS
  ) {
    missing.push('capacity_estimation.calculations (numeric derivations)');
  }
  if (isSentinel(ea.high_level_design) || ea.high_level_design.length < MIN_HLD_LENGTH) {
    missing.push('high_level_design');
  }
  if (
    isSentinel(ea.architecture_diagram) ||
    ea.architecture_diagram.length < MIN_DIAGRAM_LENGTH
  ) {
    missing.push('architecture_diagram (Mermaid flowchart)');
  }
  if (
    isSentinel(ea.workflow_diagram) ||
    ea.workflow_diagram.length < MIN_DIAGRAM_LENGTH
  ) {
    missing.push('workflow_diagram (Mermaid DAG + state machine)');
  }
  const realComponents = ea.key_components.filter(
    (c) => !isSentinel(c.name) && !isSentinel(c.responsibility),
  );
  if (realComponents.length < MIN_KEY_COMPONENTS) {
    missing.push('key_components');
  }
  if (realItems(ea.admission_control).length < MIN_ADMISSION_LAYERS) {
    missing.push('admission_control (multi-layer)');
  }
  const realStages = ea.workflow_stages.filter(
    (s) =>
      !isSentinel(s.name) &&
      !isSentinel(s.purpose) &&
      !isSentinel(s.compute_profile) &&
      !isSentinel(s.retry_strategy),
  );
  if (realStages.length < MIN_WORKFLOW_STAGES) {
    missing.push('workflow_stages (preprocess / inference / postprocess / deliver)');
  }
  if (realItems(ea.failure_and_degradation).length < MIN_DEGRADATION_TIERS) {
    missing.push('failure_and_degradation (tiered ladder)');
  }
  if (realItems(ea.optimizations).length < MIN_OPTIMIZATIONS) {
    missing.push('optimizations');
  }

  return missing;
}

function tryParseJson(text: string): unknown {
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

interface ProviderHandle {
  client: ReturnType<typeof getProvider>['client'];
}

async function generateOnce(
  provider: ProviderHandle,
  topic: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<Question> {
  try {
    const { object } = await generateObject({
      model: provider.client,
      schema: QuestionSchema,
      schemaName: 'SystemDesignInterviewQuestion',
      schemaDescription:
        'A single Google L5/L6 system design interview question covering all nine required sections with the same depth as the reference example in the system prompt.',
      system: systemPrompt,
      prompt: userPrompt,
      maxRetries: 2,
      experimental_repairText: async (opts) => repairText(opts),
    });
    return object;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e) && e.text) {
      const raw = tryParseJson(e.text);
      if (raw) return coerceToQuestion(raw, topic);
    }
    throw e;
  }
}

async function enrichMissing(
  provider: ProviderHandle,
  topic: string,
  current: Question,
  missing: string[],
): Promise<Question> {
  const userPrompt = enrichMissingPrompt(topic, current, missing);
  return generateOnce(provider, topic, STAGE_B_ENRICH_PROMPT, userPrompt);
}

export interface GenerateOptions {
  maxEnrichments?: number;
}

export async function generateQuestion(
  topic: string,
  credentials: LLMCredentials,
  options: GenerateOptions = {},
): Promise<Question> {
  const provider = getProvider(credentials);
  const maxEnrichments = options.maxEnrichments ?? 1;

  const userPrompt = `Generate a Google L5/L6 system design interview question for the topic: "${topic}".
Match the reference example's depth across ALL nine sections. Before you return, walk the self-check list at the end of the system prompt and refuse to emit any section as a placeholder or as "TBD".`;

  let question = await generateOnce(
    provider,
    topic,
    GOOGLE_INTERVIEWER_PROMPT,
    userPrompt,
  );

  for (let attempt = 0; attempt < maxEnrichments; attempt++) {
    const missing = findMissingSections(question);
    if (missing.length === 0) return question;
    question = await enrichMissing(provider, topic, question, missing);
  }

  const finalMissing = findMissingSections(question);
  if (finalMissing.length > 0) {
    throw new LowQualityError(finalMissing);
  }
  return question;
}
