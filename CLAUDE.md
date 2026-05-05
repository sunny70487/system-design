# Repository Agent Guide

> This is NOT the Next.js you know. Next.js 16 + React 19 are installed.
> APIs, conventions, and file layout differ from older training data.
> When in doubt, read `node_modules/next/dist/docs/` before writing code.

## 1. Verification Commands

Run these from the repo root. Every command is copy-paste executable.

| Step | Command | Failure looks like |
|------|---------|--------------------|
| Backend lint | `npm run lint` | ESLint exit code 1, lines like `error  '<name>' is defined but never used  @typescript-eslint/no-unused-vars` or `react-hooks/exhaustive-deps`, summary `✖ N problems (N errors, M warnings)`. |
| Backend test | `npm run test` | Vitest output containing `FAIL  src/...` lines, `Test Files  X failed`, or `AssertionError: expected ... to ...`. Exit code 1. |
| Frontend lint | `npm run lint` | Same as backend lint (single ESLint config covers `src/components/**`, `src/app/**`). Watch for `react-hooks/...`, `@next/next/...`, `jsx-a11y/...` rule IDs. |
| Frontend build | `npm run build` | `Failed to compile.` banner from Next.js, `Type error: ... TS####` from `tsc`, or `Error: ... at ... (src/app/...)` during static analysis. Exit code 1. |
| Typecheck | `npm run typecheck` | `error TS####:` lines from `tsc --noEmit`. Exit code 1. |
| Full check | `bash .dev/scripts/verify.sh` | Final line is `VERIFY: FAIL` and one or more steps printed `: FAIL`. Success prints `VERIFY: OK` (grep this). |

`verify.sh` accepts `--backend-only` (lint + typecheck + test) and
`--frontend-only` (lint + typecheck + build) for scoped runs.

## 2. Hard Constraints

1. **NEVER import server-only modules from client code.** Anything under `src/lib/server/**` (sqlite, fs, LLM SDK, gray-matter) must not be imported by files under `src/components/**` or `src/lib/client/**`. Server modules are reachable only from `src/app/**` (Server Components, Route Handlers) and other `src/lib/server/**` modules.
2. **ALWAYS persist via the repository, never via raw SQL.** Route handlers and pages must call `insertGenerated` / `getGenerated` / `listGenerated` / `deleteGenerated` from `src/lib/server/generated/repository.ts`. Do not import `getDb` outside `src/lib/server/**`.
3. **ALWAYS validate cross-boundary payloads with the Zod schemas in `src/lib/shared/schemas.ts`.** API request bodies use a local `z.object({...}).safeParse`; LLM output goes through `QuestionSchema`; chapter frontmatter goes through `LearnChapterSchema`. Never cast unknown JSON straight to a typed value.
4. **NEVER hardcode credentials, base URLs, or model IDs.** All LLM credentials flow through `x-llm-base-url`, `x-llm-api-key`, `x-llm-model` request headers and are read by `readCredentialsFromHeaders` (`src/lib/server/llm/provider.ts`). The only env var the code reads is `SD_DB_PATH`. Do not commit `.env*` (only `.env.example`).
5. **ALWAYS run a generated Mermaid diagram through `runMermaidPipeline`.** Never insert raw LLM-produced diagrams into the response or DB without the validate → autofix → llm-retry → fallback flow in `src/lib/server/mermaid/pipeline.ts`.
6. **ALWAYS mark Node-runtime API routes explicitly.** Routes that touch sqlite, fs, or `@ai-sdk/*` must export `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'` (see `src/app/api/generate/route.ts`). The Edge runtime cannot load `better-sqlite3`.
7. **ALWAYS keep `AGENTS.md` and `CLAUDE.md` byte-identical.** After editing AGENTS.md, run `cp AGENTS.md CLAUDE.md`. `bash .dev/scripts/diff-summary.sh` will fail if they drift.
8. **NEVER weaken the LLM quality gate without updating its tests.** The sentinel/`MIN_*` machinery in `src/lib/server/llm/generate.ts` is the only thing preventing placeholder content from reaching the DB. Removing a check requires removing or rewriting the matching case in `generate.test.ts`.

## 3. Project Overview

TypeScript Next.js 16 (App Router) + React 19 study app for system-design
interview prep. Server-rendered pages read Markdown content and a SQLite
store; a single API endpoint generates new questions via an
OpenAI-compatible LLM (Vercel AI SDK) with a deterministic quality gate
and a Mermaid validate/autofix/retry pipeline.

## 4. Module Map

| Path | Responsibility |
|------|----------------|
| `src/app/page.tsx` | Marketing landing page + search box. |
| `src/app/layout.tsx` | Root HTML, fonts, theme provider, site header. |
| `src/app/learn/page.tsx` | Knowledge-base index grouped by topic. |
| `src/app/learn/layout.tsx` | Sidebar shell for chapter pages. |
| `src/app/learn/[...slug]/page.tsx` | Renders one chapter from Markdown. |
| `src/app/practice/page.tsx` | Seed-question list + LLM topic input + history. |
| `src/app/practice/[slug]/page.tsx` | Renders one seed (Markdown) question. |
| `src/app/practice/gen/[id]/page.tsx` | Renders one LLM-generated question. |
| `src/app/api/generate/route.ts` | `POST` — generate, quality-gate, autofix Mermaid, persist. |
| `src/app/api/generated/route.ts` | `GET` — list generated questions. |
| `src/app/api/generated/[id]/route.ts` | `GET` / `DELETE` — fetch / remove one. |
| `src/app/api/models/route.ts` | `GET` — proxy to upstream `/models` endpoint. |
| `src/lib/shared/schemas.ts` | Zod schemas + inferred types shared by client + server. |
| `src/lib/server/db.ts` | SQLite singleton + migration. |
| `src/lib/server/generated/repository.ts` | CRUD over `generated_questions`. |
| `src/lib/server/learn/loader.ts` | Reads chapter index + Markdown frontmatter. |
| `src/lib/server/seed/loader.ts` | Reads seed-question Markdown + attribution. |
| `src/lib/server/llm/provider.ts` | Builds OpenAI-compatible client from headers. |
| `src/lib/server/llm/prompts.ts` | System prompts (interviewer, enrich, mermaid retry). |
| `src/lib/server/llm/generate.ts` | Question generation, sentinel coercion, quality gate. |
| `src/lib/server/llm/mermaid-retry.ts` | LLM-driven repair of broken Mermaid. |
| `src/lib/server/mermaid/validator.ts` | Wraps `@probelabs/maid` validate. |
| `src/lib/server/mermaid/autofix.ts` | Wraps `@probelabs/maid` `fixText`. |
| `src/lib/server/mermaid/pipeline.ts` | validate → autofix → llm-retry → fallback. |
| `src/lib/client/llm-settings.ts` | Browser localStorage store + headers helper. |
| `src/lib/utils.ts` | `cn()` Tailwind class merger. |
| `src/components/ui/*` | shadcn primitives (button, card, input, dialog, …). |
| `src/components/learn/Mermaid.tsx` | Client-side Mermaid renderer + zoom viewer. |
| `src/components/learn/Sidebar.tsx` | Chapter navigation. |
| `src/components/learn/TableOfContents.tsx` | In-page TOC. |
| `src/components/practice/TopicInput.tsx` | Form posting to `/api/generate`. |
| `src/components/practice/LLMSettingsPanel.tsx` | Edit + persist `x-llm-*` credentials. |
| `src/components/practice/GeneratedHistoryList.tsx` | Lists / deletes generated rows. |
| `src/components/practice/GeneratedQuestionView.tsx` | Renders one generated question. |
| `src/test/setup.ts` | Vitest setup (jsdom, fake-indexeddb, in-memory sqlite). |
| `content/learn/` | Chapter Markdown + `_index.json` + `_attribution.json`. |
| `content/seed-questions/` | Seed-question Markdown + `_attribution.json`. |
| `data/generated.db` | Runtime SQLite (gitignored). |
| `.dev/` | Deeper agent docs (architecture, api, style, indices, scripts). |

## 5. Naming Conventions

| Kind | Convention | Example |
|------|------------|---------|
| Server module file | lowercase / kebab-case | `generate.ts`, `mermaid-retry.ts`, `repository.ts` |
| React component file | PascalCase `.tsx` | `GeneratedQuestionView.tsx`, `Mermaid.tsx` |
| shadcn UI primitive file | lowercase | `button.tsx`, `card.tsx`, `dialog.tsx` |
| Test file | co-located, `.test.ts(x)` | `route.test.ts`, `generate.test.ts` |
| Function | camelCase | `generateQuestion`, `runMermaidPipeline`, `insertGenerated` |
| React component | PascalCase | `LLMSettingsPanel`, `Sidebar`, `Mermaid` |
| Class | PascalCase, `Error` suffix for errors | `LowQualityError`, `MissingCredentialsError` |
| Module-level constant | SCREAMING_SNAKE_CASE | `MIN_BUSINESS_ITEMS`, `STORAGE_KEY`, `LLM_HEADERS` |
| Local variable | camelCase | `archPipeline`, `cachedSnapshot`, `baseURL` |
| Type / interface | PascalCase | `LLMCredentials`, `GeneratedRecord`, `LoadedChapter` |
| Zod schema | PascalCase, `Schema` suffix | `QuestionSchema`, `LearnChapterSchema` |
| LLM/JSON payload field | snake_case | `problem_statement`, `architecture_diagram`, `can_interrupt` |
| SQLite column | snake_case | `question_json`, `created_at`, `diagrams_json` |
| HTTP request header | `x-llm-*` lowercase | `x-llm-base-url`, `x-llm-api-key`, `x-llm-model` |

## 6. Compact Quick-Reference

**Error handling.** Three idioms in use, pick the one that matches the
layer. (a) Custom `Error` subclass thrown from deep code, mapped to
status codes in the route handler — see `MissingCredentialsError` and
`LowQualityError` handling at `src/app/api/generate/route.ts:36-56`.
(b) Result-type discriminated unions for recoverable failures —
`{ ok: true, ... } | { ok: false, error }` (`src/lib/server/mermaid/validator.ts`)
or `{ status: 'ok'|'fallback', ... }` (`src/lib/server/mermaid/pipeline.ts`).
(c) Empty-catch coercion for parse-or-default reads — e.g.
`try { body = await req.json(); } catch { body = {}; }`. Always narrow
unknown errors via `e instanceof Error ? e.message : String(e)`.

**Logging.** None. There is no logger and no `console.*` calls in
`src/`. Surface failures by throwing typed errors, by returning
`{ status:'fallback', error }`, or by responding with a JSON
`{ error, message }`. Do not introduce `console.log` without discussion.

**Configuration.** Two channels:
1. Per-request LLM credentials via `x-llm-base-url`, `x-llm-api-key`,
   `x-llm-model` headers (see `src/lib/server/llm/provider.ts` and the
   browser store in `src/lib/client/llm-settings.ts`).
2. `process.env.SD_DB_PATH` overrides the SQLite location
   (`src/lib/server/db.ts`); tests set it to `:memory:` in
   `src/test/setup.ts`. **`.env.example` lists provider env vars but
   the code does not read them.** Do not "fix" the code by reading them
   without an explicit task — the header-driven design is intentional.

## 7. Common Tasks

### Add a new API endpoint

1. Create `src/app/api/<name>/route.ts` exporting `GET` / `POST` / etc.
2. At the top of the file add:
   ```ts
   export const runtime = 'nodejs';
   export const dynamic = 'force-dynamic';
   ```
3. Validate the request body with Zod (`z.object(...).safeParse`).
   Return `NextResponse.json({ error: 'invalid_<x>' }, { status: 400 })`
   on failure.
4. If the route uses LLM credentials, call
   `readCredentialsFromHeaders(req.headers)` from
   `src/lib/server/llm/provider.ts` and pass the result down.
5. Persist via `src/lib/server/generated/repository.ts`. Do not import
   `getDb` directly.
6. Add a co-located test `route.test.ts` mocking the LLM and DB layers
   with `vi.mock(...)`. Mirror `src/app/api/generate/route.test.ts`.

### Add a new server module

1. Create the file under `src/lib/server/<area>/<name>.ts`.
2. Use named exports only. Keep functions pure; thread DB / provider
   handles in via parameters or via the existing singletons.
3. Re-export Zod-derived types from `src/lib/shared/schemas.ts` rather
   than redeclaring shapes.
4. Co-locate `<name>.test.ts`. Use `vi.mock` for sibling modules.

### Add a new chapter to the knowledge base

1. Create `content/learn/<group>/<slug>.md` with valid frontmatter
   matching `LearnChapterSchema` (`src/lib/shared/schemas.ts`).
2. Add the relative path to `content/learn/_index.json` under the
   correct group.
3. `npm run test` runs `loader.test.ts`, `cross-links.test.ts`,
   `attribution.test.ts`, and `diagrams.test.ts` — all must pass.

### Add a new seed question

1. Create `content/seed-questions/<slug>.md` with `slug`, `title`,
   `difficulty`, and optional `related_chapters` frontmatter.
2. Add an entry under `content/seed-questions/_attribution.json` for
   the same slug. The loader returns `null` if attribution is missing.

### Add a new field to `Question`

1. Update `QuestionSchema` in `src/lib/shared/schemas.ts`.
2. Update `LenientQuestionSchema` and `coerceToQuestion` in
   `src/lib/server/llm/generate.ts` so malformed LLM output still
   coerces (use a sentinel string for missing values).
3. Add a corresponding `MIN_*` constant and a check in
   `findMissingSections` so the quality gate notices when it's empty.
4. Update the rendering in `src/components/practice/GeneratedQuestionView.tsx`.
5. Update tests: `schemas.test.ts`, `generate.test.ts`,
   `route.test.ts`.

## 8. Data Flow

```
Browser (TopicInput / LLMSettingsPanel)
  │  fetch POST /api/generate
  │    headers: x-llm-base-url, x-llm-api-key, x-llm-model
  │    body:    { topic }
  ▼
src/app/api/generate/route.ts
  │  1. readCredentialsFromHeaders()        provider.ts
  │  2. BodySchema.safeParse(topic)         zod
  │  3. generateQuestion(topic, creds)      generate.ts
  │       └─► getProvider() ─► createOpenAI()  @ai-sdk/openai
  │       └─► generateObject({QuestionSchema}) ai
  │       └─► coerceToQuestion + findMissingSections (sentinels, MIN_*)
  │       └─► enrichMissing() ── repeat once if thin
  │       └─► throw LowQualityError if still thin
  │  4. runMermaidPipeline(arch)            pipeline.ts
  │       validate ─► autofix ─► llmFixMermaid ─► fallback
  │  5. runMermaidPipeline(workflow)        (same pipeline, sequential)
  │  6. insertGenerated({topic,question,diagrams})  repository.ts
  │       └─► getDb().prepare('INSERT ...').run(...)  better-sqlite3
  ▼
NextResponse.json({ id, createdAt, question, diagrams,
                   mermaid_status, mermaid_auto_fixed,
                   mermaid_llm_retried, mermaid_error })
  │
  ▼
Browser navigates to /practice/gen/<id>
  │
  ▼
src/app/practice/gen/[id]/page.tsx
  │  getGenerated(id) ─► SELECT FROM generated_questions
  ▼
GeneratedQuestionView renders prose + DiagramBlock(Mermaid|fallback)
```

## 9. Code Quality

**Compilability.** Match existing patterns in the same directory
before inventing new ones. Imports must use the `@/` alias for
`src/`-rooted paths (e.g. `@/lib/server/llm/provider`). Add explicit
return types only where they appear in surrounding code; rely on
inference otherwise. `tsconfig.json` is `strict: true`.

**Test policy.** Co-locate `*.test.ts(x)` with the unit under test.
Mock external boundaries (`ai`, `@ai-sdk/openai`, `getProvider`, fetch)
with `vi.mock`. Tests that touch SQLite rely on `SD_DB_PATH=:memory:`
set by `src/test/setup.ts`. Add a new test whenever you (a) add a
route, (b) add a quality-gate rule, (c) change error mapping, or
(d) add a field to `Question`.

**Lint policy.** `npm run lint` runs ESLint 9 flat config composed of
`eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
(`eslint.config.mjs`). It covers everything outside `.next/`, `out/`,
`build/`, `next-env.d.ts`. There is no separate Prettier config.

**CI pipeline.** No CI workflow is committed. The contract is the local
`bash .dev/scripts/verify.sh` script: lint → typecheck → test → build.
Run it before reporting completion.

## 10. Git Commit Style

Format: `<type>: <imperative summary>`.
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`.
Keep summaries under 72 characters. Body (optional, blank line after
summary) explains the *why*. One logical change per commit.

Examples:
- `feat: add /api/generated/[id] DELETE handler`
- `fix: coerce sentinel workflow_stages so quality gate detects them`
- `test: cover llm low_quality response shape`

## 11. Agent Behavior Rules

Working with This Repo
- After modifying code, run the relevant verification command BEFORE
  reporting completion.
- If backend files changed (`src/lib/server/**`, `src/app/api/**`,
  `src/lib/shared/**`): run `bash .dev/scripts/verify.sh --backend-only`.
- If frontend files changed (`src/app/**` pages, `src/components/**`,
  `src/lib/client/**`): run `bash .dev/scripts/verify.sh --frontend-only`.
- If API interfaces changed (route file, request body shape, or
  `Question`/`LearnChapter`/`LearnIndex` schemas): verify BOTH backend
  and frontend with `bash .dev/scripts/verify.sh`.
- If unsure about a pattern, check existing files in the same directory
  before inventing a new approach (e.g. `src/app/api/generate/route.ts`
  is the canonical route shape; `src/lib/server/mermaid/pipeline.ts` is
  the canonical Result-style pipeline).
- When a task spans multiple steps, update `PROGRESS.md` after each step.
- After editing `AGENTS.md`, run `cp AGENTS.md CLAUDE.md` and verify
  with `bash .dev/scripts/diff-summary.sh`.

## 12. Deep References

| File | When to read |
|------|--------------|
| `.dev/architecture.md` | Before changing the request pipeline, the LLM quality gate, the Mermaid stage, the DB schema, or shared state. |
| `.dev/api-reference.md` | Before adding or modifying any route under `src/app/api/**`, or when a client component changes the request/response shape. |
| `.dev/coding-style.md` | Before opening a PR; for naming, error handling, logging, test, and file-template details with real examples. |
| `.dev/function-index.md` | When you need to find the function for an intent ("I need to validate a Mermaid diagram", "I need to read chapter frontmatter") rather than browse files. |
| `.dev/config-reference.md` | When adding env vars, headers, or settings keys; or when explaining configuration to a user. |
| `.dev/UPDATE_GUIDE.md` | When AGENTS.md or any `.dev/` file goes stale; describes the self-maintenance workflow. |
| `.dev/scripts/verify.sh` | The one-line entry to the Full check. Supports `--backend-only`, `--frontend-only`. Prints `VERIFY: OK` on success. |
| `.dev/scripts/diff-summary.sh` | Pre-completion check: prints diff stats and verifies AGENTS.md == CLAUDE.md byte-for-byte. |
