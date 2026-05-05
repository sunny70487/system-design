# Function Index

Organized by developer intent: "I need to …"

## Generate a question from a topic

| Function | File | Notes |
|----------|------|-------|
| `generateQuestion(topic, creds)` | `src/lib/server/llm/generate.ts` | Entry point. Orchestrates generate → coerce → quality-gate → enrich. |
| `generateOnce(topic, provider)` | same | Single `generateObject` call with retries. |
| `coerceToQuestion(raw)` | same | Fills missing fields with `__MISSING__:label` sentinels. |
| `findMissingSections(q)` | same | Returns string[] of section names below `MIN_*` thresholds. |
| `enrichMissing(q, missing, provider)` | same | Calls LLM with `STAGE_B_ENRICH_PROMPT` to fill gaps. |

## Build an LLM provider from credentials

| Function | File | Notes |
|----------|------|-------|
| `readCredentialsFromHeaders(headers)` | `src/lib/server/llm/provider.ts` | Extracts `x-llm-*` headers → `LLMCredentials`. |
| `getProvider(creds)` | same | Validates + returns `createOpenAI({apiKey, baseURL})(model)`. Throws `MissingCredentialsError`. |

## Validate / fix a Mermaid diagram

| Function | File | Notes |
|----------|------|-------|
| `runMermaidPipeline(source, creds?)` | `src/lib/server/mermaid/pipeline.ts` | Full pipeline: validate → autofix → llm-retry → fallback. |
| `validateMermaid(source)` | `src/lib/server/mermaid/validator.ts` | Wraps `@probelabs/maid` `validate`. Returns `{ok}` union. |
| `autofixMermaid(source)` | `src/lib/server/mermaid/autofix.ts` | Wraps `@probelabs/maid` `fixText({level:'safe'})`. |
| `llmFixMermaid(source, error, creds)` | `src/lib/server/llm/mermaid-retry.ts` | Asks LLM to repair diagram given the error message. |

## Persist / retrieve generated questions

| Function | File | Notes |
|----------|------|-------|
| `insertGenerated(record)` | `src/lib/server/generated/repository.ts` | INSERT row. |
| `getGenerated(id)` | same | SELECT one → `GeneratedRecord \| null`. |
| `listGenerated(limit?)` | same | SELECT recent N summaries. |
| `deleteGenerated(id)` | same | DELETE one → boolean (existed?). |
| `getDb()` | `src/lib/server/db.ts` | Lazy singleton; runs migrations on first call. |

## Load learn chapters

| Function | File | Notes |
|----------|------|-------|
| `loadIndex()` | `src/lib/server/learn/loader.ts` | Reads `content/learn/_index.json` → `LearnIndex`. |
| `loadChapter(slug)` | same | Parses one Markdown file → `LoadedChapter`. |
| `loadAllChapters()` | same | All chapters with frontmatter. |

## Load seed questions

| Function | File | Notes |
|----------|------|-------|
| `loadSeedQuestions()` | `src/lib/server/seed/loader.ts` | All seed Markdown → array with attribution. |
| `loadSeedQuestion(slug)` | same | One seed question by slug. |

## Manage LLM settings (browser)

| Function | File | Notes |
|----------|------|-------|
| `readSettings()` | `src/lib/client/llm-settings.ts` | Read localStorage → `LLMCredentials`. |
| `writeSettings(creds)` | same | Write + notify subscribers. |
| `getSettingsSnapshot()` | same | For `useSyncExternalStore`. |
| `subscribeSettings(cb)` | same | Subscribe to changes (incl. cross-tab). |
| `buildLLMHeaders(creds)` | same | Returns `Record<string, string>` with `x-llm-*`. |

## Render Mermaid diagrams (browser)

| Function / Component | File | Notes |
|---------------------|------|-------|
| `<Mermaid code={...} />` | `src/components/learn/Mermaid.tsx` | Client component; lazy-loads mermaid CDN, renders SVG. |

## Decision guide

- **"Should I call the LLM directly?"** — No. Always go through
  `generateQuestion` or `llmFixMermaid`. They handle retries, coercion,
  and quality gates.
- **"Should I write SQL?"** — No. Use repository functions. They handle
  JSON serialization and ID generation.
- **"Should I validate Mermaid myself?"** — No. Call `runMermaidPipeline`.
  It handles the full validate → fix → retry → fallback chain.
- **"Should I read `x-llm-*` headers manually?"** — No. Use
  `readCredentialsFromHeaders`.
