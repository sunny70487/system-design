# Architecture

## System diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│  ────────                                                            │
│  - localStorage  sd-llm-settings/v1  (baseURL, apiKey, model)        │
│  - useSyncExternalStore via src/lib/client/llm-settings.ts           │
│  - components/practice/{LLMSettingsPanel, TopicInput, History}       │
└──────────────────────┬───────────────────────────────────────────────┘
                       │  HTTP (fetch)  + headers  x-llm-base-url,
                       │                            x-llm-api-key,
                       │                            x-llm-model
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Next.js 16 App Router (Node runtime)                                │
│  ───────────────────────────────────                                 │
│  src/app/api/generate/route.ts        POST   generate question      │
│  src/app/api/generated/route.ts       GET    list                   │
│  src/app/api/generated/[id]/route.ts  GET / DELETE                  │
│  src/app/api/models/route.ts          GET    upstream proxy         │
│  src/app/{learn,practice,...}/...     Server Components             │
└──────────┬──────────────────────┬────────────────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────────┐  ┌──────────────────────────────────────────┐
│  src/lib/server/llm  │  │  src/lib/server/mermaid                  │
│  provider.ts         │  │  validator.ts  (@probelabs/maid validate)│
│  generate.ts         │  │  autofix.ts    (@probelabs/maid fixText) │
│  prompts.ts          │  │  pipeline.ts   (validate→fix→llm→fall)   │
│  mermaid-retry.ts    │  └──────────────────────────────────────────┘
│   ↓ uses Vercel AI SDK│            ▲
│   ↓ + @ai-sdk/openai  │            │
└──────────┬───────────┘            │ llmFixMermaid()
           │ tokens                 │ (calls back into provider)
           ▼                        │
┌──────────────────────┐  ┌─────────┴────────────────────────────────┐
│  Upstream LLM (OpenAI│  │  src/lib/server/generated/repository.ts  │
│  compatible / any    │  │  insertGenerated / getGenerated /        │
│  baseURL the user    │  │  listGenerated / deleteGenerated         │
│  configured)         │  │     │                                    │
└──────────────────────┘  │     ▼                                    │
                          │  src/lib/server/db.ts (singleton)        │
                          │     │                                    │
                          │     ▼                                    │
                          │  better-sqlite3 → data/generated.db      │
                          └──────────────────────────────────────────┘

Static content sources (read at request time):
  src/lib/server/learn/loader.ts ─► content/learn/_index.json + *.md
  src/lib/server/seed/loader.ts  ─► content/seed-questions/*.md +
                                    _attribution.json
```

## Concurrency model

- Single-threaded Node event loop. No worker threads, no streaming.
- LLM calls are awaited sequentially in
  `src/app/api/generate/route.ts`: question generation, then
  architecture pipeline, then workflow pipeline. There is no
  `Promise.all` parallelism today.
- `better-sqlite3` is synchronous; `db.prepare(...).run(...)` blocks
  the event loop. Acceptable at the project's expected QPS.
- Inside one Node process the SQLite singleton is stable; HMR in dev
  may re-evaluate the module — see "Common Pitfalls" below.

## Key data structures

### `Question` (`src/lib/shared/schemas.ts`)
Strict Zod schema. The single contract between LLM output, persistence,
the API response, and the UI. Composed of:

- `title`, `problem_statement`, `difficulty` (`'L4' | 'L5' | 'L6'`).
- `requirements: { functional[], non_functional[] }`.
- `expected_answer.{business_requirements[], capacity_estimation:
  {assumptions[], calculations[]}, high_level_design,
  architecture_diagram, workflow_diagram, key_components[],
  admission_control[], workflow_stages[], failure_and_degradation[],
  optimizations[], tradeoffs[], scaling_considerations[]}`.

### `LenientQuestionSchema` + sentinel coercion (`src/lib/server/llm/generate.ts`)
A partial mirror of `QuestionSchema` plus `coerceToQuestion`, which
fills missing required fields with the sentinel string
`__MISSING__:<label>`. Sentinels pass `QuestionSchema.parse` (which
only requires non-empty strings) but are detected by
`findMissingSections` via the `MIN_*` thresholds — that is the
project's quality gate.

### `PipelineResult` (`src/lib/server/mermaid/pipeline.ts`)
Discriminated union:
`{ status:'ok', source, autoFixed, llmRetried } | { status:'fallback', source, error }`.
The route handler branches on `status` to choose between rendering the
Mermaid SVG and showing a textual fallback in `GeneratedQuestionView`.

### `GeneratedRecord` (`src/lib/server/generated/repository.ts`)
Row shape returned by the repository:
`{ id, topic, question: Question, diagrams: GeneratedDiagrams|null, createdAt }`.
Columns `title` and `difficulty` are denormalized for cheap listing;
the full `Question` lives in `question_json`.

### `LearnChapter` / `LearnIndex` (`src/lib/shared/schemas.ts`)
Frontmatter + index contract for `content/learn/`. Loaded on demand by
`loadIndex` / `loadChapter` / `loadAllChapters`.

## Request flow (`POST /api/generate`)

1. Parse headers via `readCredentialsFromHeaders`
   (`src/lib/server/llm/provider.ts`).
2. `BodySchema.safeParse(await req.json())` — `topic` length 1..200.
3. `generateQuestion(topic, credentials)`
   (`src/lib/server/llm/generate.ts`):
   - `getProvider(credentials)` — throws `MissingCredentialsError` if
     any field is empty; otherwise builds an OpenAI-compatible client
     via `createOpenAI({apiKey, baseURL})(model)`.
   - `generateOnce` calls `generateObject({ schema: QuestionSchema, ... })`
     from the Vercel AI SDK with two retries.
   - On `NoObjectGeneratedError` with raw `text`, fall through
     `tryParseJson` → `coerceToQuestion` (fills sentinels).
   - `findMissingSections(question)` checks 14 minima (`MIN_*`).
   - If anything is missing and `maxEnrichments > 0` (default 1), call
     `enrichMissing` with `STAGE_B_ENRICH_PROMPT`.
   - Still missing? Throw `LowQualityError(missing[])`.
4. Two `runMermaidPipeline` calls (architecture, workflow). Each runs
   `validate → autofix → llmFixMermaid → fallback`.
5. `insertGenerated({ topic, question, diagrams })` — writes a row.
6. Respond with the question, both diagram outcomes, and four
   composite flags: `mermaid_status`, `mermaid_auto_fixed`,
   `mermaid_llm_retried`, `mermaid_error`.

Error mapping in the route handler:

| Cause | HTTP status | Body |
|-------|-------------|------|
| Invalid topic | 400 | `{ error: 'invalid_topic' }` |
| Missing LLM credentials | 400 | `{ error: 'missing_credentials', message }` |
| Low-quality LLM output | 502 | `{ error: 'low_quality', missing: [...] }` |
| LLM threw (rate limit, etc.) | 502 | `{ error: 'llm_error', message }` |
| DB write failed | 500 | `{ error: 'persist_failed', message }` |

## Common pitfalls

1. **DB singleton survives HMR in dev.** `let db` lives at module scope
   in `src/lib/server/db.ts`. After Hot Module Reload the variable can
   be re-initialized; old handles are not closed. Restart the dev
   server if SQLite errors look stale.
2. **JSON-blob storage skips validation on read.** `getGenerated`
   does `JSON.parse(row.question_json) as Question` without
   re-running `QuestionSchema.parse`. Breaking changes to the schema
   silently corrupt older rows. Migrate explicitly.
3. **Sentinel strings pass strict Zod.** `__MISSING__:foo` satisfies
   `z.string().min(1)`. The only thing catching them is
   `findMissingSections`. Adding a new required field to
   `QuestionSchema` requires adding both a sentinel default in
   `coerceToQuestion` and a `MIN_*` check.
4. **`.env.example` documents env vars the code does not read.**
   Credentials flow through `x-llm-*` headers. Do not "fix" the code
   to read `OPENAI_API_KEY` etc. without an explicit task.
5. **Diagrams run sequentially.** Two `await runMermaidPipeline(...)`
   calls in a row; an LLM repair on each doubles latency. Convert to
   `Promise.all` only with care — the LLM may rate-limit on parallel
   calls.
6. **`coerceToQuestion` discards non-string array entries.** If the
   LLM returns `[{text:"..."}]`, the array becomes empty and the
   sentinel kicks in. Symptom: `low_quality` despite seemingly OK
   model output.
7. **Mermaid renderer uses `securityLevel: 'loose'`.**
   `src/components/learn/Mermaid.tsx` enables click handlers in
   diagrams. Acceptable for a personal tool; risky if multi-user.
8. **`generated_questions.id` is timestamp+4 base36 chars.** Two
   identical-topic submits in the same millisecond can collide; the
   resulting `UNIQUE` violation surfaces as `persist_failed`.

## Key globals (module-level mutable state)

| Module | State | Notes |
|--------|-------|-------|
| `src/lib/server/db.ts` | `let db` (Database\|null) | Lazy singleton; survives HMR. Migrations run once on first `getDb()`. |
| `src/lib/client/llm-settings.ts` | `listeners: Set<() => void>`, `cachedSnapshot` | Powers `useSyncExternalStore`. Invalidated on `write` and on the cross-tab `storage` event. |
| `src/components/learn/Mermaid.tsx` | `let loadPromise` | Deduplicates the mermaid CDN script tag across renders. |
| Server tests | `process.env.SD_DB_PATH` | Set to `:memory:` in `src/test/setup.ts` so the singleton points at an in-process DB. |
