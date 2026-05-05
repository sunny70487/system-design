# Configuration Reference

## Environment variables

| Variable | Type | Default | Read by | Purpose |
|----------|------|---------|---------|---------|
| `SD_DB_PATH` | string (file path) | `data/generated.db` | `src/lib/server/db.ts` | Override SQLite database location. Tests set `:memory:`. |

No other env vars are read by application code. The `.env.example` file
documents provider env vars (e.g. `OPENAI_API_KEY`) for user reference,
but the code routes credentials through HTTP headers instead.

## HTTP headers (per-request LLM credentials)

| Header | Required | Example | Read by |
|--------|----------|---------|---------|
| `x-llm-base-url` | yes (for LLM routes) | `https://api.openai.com/v1` | `readCredentialsFromHeaders` |
| `x-llm-api-key` | yes (for LLM routes) | `sk-...` | same |
| `x-llm-model` | yes (for `/api/generate`) | `gpt-4o` | same |

Set by the browser via `buildLLMHeaders()` from
`src/lib/client/llm-settings.ts`.

## Browser localStorage

| Key | Shape | Module |
|-----|-------|--------|
| `sd-llm-settings/v1` | `{ baseURL: string, apiKey: string, model: string }` | `src/lib/client/llm-settings.ts` |

Read/written via `readSettings()` / `writeSettings()`. Changes trigger
`useSyncExternalStore` subscribers and the cross-tab `storage` event.

## Quality gate constants (`src/lib/server/llm/generate.ts`)

| Constant | Value | Checks |
|----------|-------|--------|
| `MIN_BUSINESS_ITEMS` | 3 | `expected_answer.business_requirements.length` |
| `MIN_FUNCTIONAL_ITEMS` | 3 | `requirements.functional.length` |
| `MIN_NON_FUNCTIONAL_ITEMS` | 3 | `requirements.non_functional.length` |
| `MIN_CAPACITY_ASSUMPTIONS` | 2 | `capacity_estimation.assumptions.length` |
| `MIN_CAPACITY_CALCULATIONS` | 2 | `capacity_estimation.calculations.length` |
| `MIN_KEY_COMPONENTS` | 3 | `expected_answer.key_components.length` |
| `MIN_ADMISSION_LAYERS` | 2 | `expected_answer.admission_control.length` |
| `MIN_WORKFLOW_STAGES` | 3 | `expected_answer.workflow_stages.length` |
| `MIN_DEGRADATION_TIERS` | 3 | `expected_answer.failure_and_degradation.length` |
| `MIN_OPTIMIZATIONS` | 3 | `expected_answer.optimizations.length` |
| `MIN_HLD_LENGTH` | 80 | `expected_answer.high_level_design.length` (chars) |
| `MIN_DIAGRAM_LENGTH` | 30 | `architecture_diagram` / `workflow_diagram` length |

Sentinel prefix: `__MISSING__` — any field starting with this string
is treated as absent by `findMissingSections`.

## Build & tooling configuration

| File | Purpose | Key settings |
|------|---------|--------------|
| `tsconfig.json` | TypeScript | `strict: true`, paths `@/* → src/*` |
| `eslint.config.mjs` | Linting | flat config, `core-web-vitals` + `typescript` |
| `vitest.config.ts` | Testing | `environment: 'jsdom'`, setup `src/test/setup.ts` |
| `next.config.ts` | Next.js | `serverExternalPackages: ['better-sqlite3']` |
| `tailwind.config.ts` | Styling | content paths, theme extensions |
| `postcss.config.mjs` | PostCSS | tailwindcss + autoprefixer |
| `components.json` | shadcn/ui | aliases, style `new-york`, `cssVariables: true` |

## SQLite schema

```sql
CREATE TABLE IF NOT EXISTS generated_questions (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  question_json TEXT NOT NULL,
  diagrams_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_generated_questions_created_at
  ON generated_questions(created_at DESC);
```

Row ID format: `<slugified-topic>-<base36-timestamp><4-random-base36>`.
