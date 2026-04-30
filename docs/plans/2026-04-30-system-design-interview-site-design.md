# System Design Interview Practice Site — Design Document

**Date:** 2026-04-30
**Status:** Approved (brainstorming complete)
**Next:** Implementation plan via `writing-plans` skill

---

## 1. Product Summary

A **local-first, open-source web application** that helps senior software engineers practice **Google L5/L6 system design interviews**. Users either pick a curated question from a seed library or type any topic (e.g., "Warp", "Kafka", "YouTube") and the system produces a Google-senior-interviewer-style question, an expected answer with a Mermaid architecture diagram, and lets the user practice in a "draft first, reveal answer later" two-step flow.

### Positioning
- **Local-first**: `git clone && npm run dev`. No accounts, no cloud, no telemetry.
- **BYOK** (Bring Your Own Key): user provides their own LLM API key (OpenAI / Anthropic / Ollama / etc.).
- **English only** content and UI (mirrors actual Google interview conditions).
- **Open Source**: code MIT, content CC-BY-SA 4.0 (inherits from upstream sources).

---

## 2. Confirmed Requirements

| Aspect | Decision |
|---|---|
| MVP scope | Single-turn (question + expected answer + Mermaid). No follow-ups in v1. |
| Content sources | OSS-derived seed bank (e.g. `donnemartin/system-design-primer`, `karanpratapsingh/system-design`) + dynamic LLM generation for arbitrary topics |
| LLM strategy | BYOK via Vercel AI SDK; multi-provider |
| Deployment | Pure local OSS tool (no hosted demo in v1) |
| Language | English only |
| Interaction | Two-step: user drafts answer → reveals reference |
| Tech stack | Next.js 15 (App Router) + Tailwind + shadcn/ui |
| License | Code MIT, Data CC-BY-SA 4.0 |
| UI/UX system | Driven by `ui-ux-pro-max` skill at implementation time |

---

## 3. Architecture (Approach A: Server-side LLM proxy)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser (localhost:3000)                    │
│                                                                  │
│  Pages:                                                          │
│   /            ─ Question library + topic input                  │
│   /q/[id]      ─ Practice page (two-step mode)                   │
│   /settings    ─ LLM provider config (BYOK)                      │
│                                                                  │
│  Storage:                                                        │
│   • IndexedDB    ─ User practice history, draft answers          │
│   • localStorage ─ UI prefs only (no API keys)                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │ fetch('/api/...')
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Server (Node.js)                    │
│                                                                  │
│  Route Handlers:                                                 │
│   POST /api/generate                                             │
│   GET  /api/seed-questions                                       │
│   GET  /api/seed-questions/[slug]                                │
│                                                                  │
│  Services:                                                       │
│   • LLMService       ─ Vercel AI SDK wrapper                     │
│   • MermaidValidator ─ mermaid.parse() + maid auto-fix + retry   │
│   • SchemaEnforcer   ─ Zod structured output                     │
│                                                                  │
│  Config: .env.local (API keys, never committed)                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  LLM Provider (user choice)  │
              │  OpenAI / Anthropic / Ollama │
              └──────────────────────────────┘
```

### Why Approach A (vs Pure-client / Hybrid-cache)
1. **No CORS landmines** — Anthropic and most enterprise LLM APIs reject browser origins; server-side avoids this.
2. **Vercel AI SDK is first-class on the server** — streaming, structured output (Zod), retry are mature.
3. **API key isolation** — `.env.local` never reaches the browser, matching security norms.
4. **Progressive upgrade path** — adding cache (Hybrid C) later is purely additive.
5. **Matches BYOK + local OSS positioning** — `cp .env.example .env.local`, fill key, `npm run dev`.

---

## 4. Component Decomposition

### Frontend
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Library + topic input
│   ├── q/[id]/page.tsx             # Practice (two-step)
│   └── settings/page.tsx           # BYOK config
│
├── components/
│   ├── QuestionLibrary.tsx
│   ├── TopicInput.tsx
│   ├── PracticeView.tsx            # Two-step orchestrator
│   │   ├── DraftEditor.tsx
│   │   └── ReferenceAnswer.tsx
│   ├── MermaidRenderer.tsx
│   ├── StreamingMarkdown.tsx
│   └── SettingsForm.tsx
│
└── lib/
    ├── storage/{indexeddb.ts, schemas.ts}
    └── client/api.ts
```

### Backend
```
src/
├── app/api/
│   ├── generate/route.ts
│   ├── seed-questions/route.ts
│   └── seed-questions/[slug]/route.ts
│
├── lib/server/
│   ├── llm/{provider.ts, prompts.ts, schemas.ts}
│   ├── mermaid/{validator.ts, autofix.ts}
│   └── seed/{loader.ts, attribution.ts}
│
└── content/seed-questions/
    ├── url-shortener.md
    ├── kafka.md
    ├── youtube.md
    ├── ...
    └── _attribution.json
```

### Core Schemas (Zod)
```typescript
const QuestionSchema = z.object({
  title: z.string(),
  problem_statement: z.string(),
  requirements: z.object({
    functional: z.array(z.string()),
    non_functional: z.array(z.string()),
  }),
  expected_answer: z.object({
    high_level_design: z.string(),
    architecture_diagram: z.string(),  // Mermaid
    key_components: z.array(z.object({
      name: z.string(),
      responsibility: z.string(),
    })),
    tradeoffs: z.array(z.string()),
    scaling_considerations: z.array(z.string()),
  }),
  difficulty: z.enum(['L4', 'L5', 'L6']),
});

const DraftSchema = z.object({
  questionId: z.string(),
  content: z.string(),
  mermaidSource: z.string().optional(),
  updatedAt: z.number(),
});
```

### Third-Party Dependencies
- `next@15`, `react@19`
- `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`
- `zod`
- `mermaid`, `probelabs/maid`
- `streamdown`
- `dexie`
- `tailwindcss`, `shadcn/ui` (UI details produced by `ui-ux-pro-max` skill at impl time)

---

## 5. Data Flow

### Flow 1 — Practice from seed library (most common)
```
User opens "/"
  └─ QuestionLibrary fetches /api/seed-questions
User clicks "Design Kafka" → /q/kafka
  ├─ fetch /api/seed-questions/kafka
  ├─ IndexedDB: load draft if exists
  └─ Render DraftEditor (Step 1)
       User types → autosave to IndexedDB every 500ms
       User clicks "Reveal Reference Answer"
         └─ ReferenceAnswer (Step 2): Mermaid + markdown + draft side-by-side
```

### Flow 2 — Dynamic generation
```
User types "Warp" → POST /api/generate { topic: "Warp" }
Server:
  ├─ LLMService.streamObject({ schema: QuestionSchema, system: GOOGLE_L5_INTERVIEWER, prompt })
  ├─ Stream partial JSON to client
  └─ On completion:
       ├─ MermaidValidator.validate(architecture_diagram)
       │    pass → emit { status: 'ok', question }
       │    fail → autofix retry (max 2x) → emit
       │           still fail → strip diagram, emit with mermaid_error
       └─ Generate slug, save to IndexedDB as user-generated
Client: render streamed content; navigate to /q/<slug>
```

### Flow 3 — BYOK setup
```
User → /settings
  └─ SettingsForm: provider, model, API key, optional endpoint
On submit:
  ├─ POST /api/settings
  ├─ Server writes .env.local (or shows manual instructions)
  ├─ Server runs 1 cheap test call to validate
  └─ On success: redirect "/" with toast "LLM connected ✓"
```

### Storage Boundaries
| Data | Location | Reason |
|---|---|---|
| Seed questions | Static `.md` in repo | Build-time inline, immutable |
| API keys | `.env.local` (server) | Never in browser, never committed |
| User drafts | IndexedDB | Personal, no cross-device sync in MVP |
| Practice history | IndexedDB | Same |
| UI prefs (theme) | localStorage | Trivial |
| LLM-generated questions | IndexedDB | User-specific, exportable later |

---

## 6. Error Handling

### LLM Errors
| Error | Detection | UX | Recovery |
|---|---|---|---|
| Invalid API key | 401/403 | Toast: "Invalid API key. [Go to Settings]" | Redirect /settings |
| Network timeout | 30s fetch timeout | "Network error. Retry?" | Single-click retry (input preserved) |
| Rate limit | HTTP 429 | "Rate limited. Try again in N s." | Show backoff |
| Provider down | 5xx | "Provider unavailable. Try a different model." | Link to /settings |
| Schema mismatch | Zod parse error | Internal retry 1×; on fail show raw text + "⚠ Unstructured" | Still readable |

### Mermaid Render Errors (most critical failure mode)
```
LLM produces mermaid source
  └─ mermaid.parse(source)
       pass → render
       fail → maid.autoFix(source)
              pass → render with "🔧 auto-fixed" badge
              fail → re-prompt LLM with error context (max 1 retry)
                     pass → render
                     fail → final fallback: render as ```mermaid``` code block
                            + message "Diagram could not be rendered. Source shown."
```
**Principle: Mermaid failure must NEVER break the answer view. Always degrade to source.**

### IndexedDB Errors
| Error | Handling |
|---|---|
| Quota exceeded | Warning + "Clean old drafts" button |
| Browser blocks IDB (private mode) | Fall back to sessionStorage + warning "Progress not persisted across sessions" |
| Schema migration | Dexie version + upgrade hooks; on failure dump old data to download |

### Server Boot Errors
| Error | Handling |
|---|---|
| `.env.local` missing | Don't fail boot; check at first LLM call → guide to /settings |
| Seed questions load failure | Build-time fail loud |
| Port 3000 busy | Next.js auto-picks port; console shows new URL |

### User Input Errors
| Case | Handling |
|---|---|
| Empty topic | Submit disabled |
| Topic > 200 chars | Live char counter; submit disabled |
| Prompt-injection attempts | Hardened system prompt server-side; no client-side filter (local OSS tool) |
| Off-topic input | LLM declines: "This doesn't appear to be a system design topic. Try: ..." |

### Global Boundaries
- React Error Boundary per page
- Errors surface a "Copy error details" button (for issue reports)
- **Zero telemetry** (privacy promise of local OSS tool)

---

## 7. Testing Strategy

### Pyramid
```
        E2E (sparse)        Playwright: 2-3 critical user journeys
        Integration         Vitest + MSW: API routes + LLM mocks
        Unit (bulk)         Vitest: validators, schemas, utils
```

### Unit Tests
| Module | Coverage |
|---|---|
| `mermaid/validator.ts` | Valid/invalid fixtures, including common LLM mistakes |
| `mermaid/autofix.ts` | Known broken Mermaid → fixed; unfixable → throws |
| `llm/schemas.ts` | Zod schema vs real LLM output fixtures (pass/fail) |
| `seed/loader.ts` | Front-matter parsing, attribution extraction |
| `storage/indexeddb.ts` | CRUD + migration via fake-indexeddb |

### Integration Tests
| Scenario | Tool |
|---|---|
| `/api/generate` happy path | Vitest + MSW LLM mock → verify streaming response |
| `/api/generate` bad mermaid | Mock returns broken mermaid → verify autofix → retry → fallback chain |
| `/api/generate` 401 | Mock returns 401 → verify error envelope |
| `/api/seed-questions/[slug]` | Real file read; attribution correctness |

### E2E Tests (Playwright)
1. **Seed question happy path**: home → click Kafka → write draft → reload (draft persists) → reveal answer
2. **BYOK setup flow**: unset → try generate → redirected to settings → invalid key → corrected → success
3. **Mermaid render fallback**: inject broken mermaid → fallback UI appears → no crash

### Out of Scope (YAGNI)
- Real LLM API in tests (use mocks; manual smoke periodically)
- shadcn/ui internals
- Mermaid library rendering correctness
- Cross-browser (commit to Chrome/Firefox/Safari latest only)

### CI
- GitHub Actions: lint + typecheck + unit + integration on every push
- E2E on PR (Playwright headless container)
- Coverage target: unit 80%+ (no coverage-chasing)

### Fixtures
```
test/fixtures/
├── llm-responses/{kafka-good, kafka-bad-mermaid, unrelated-topic, schema-violation}.json
├── mermaid/{valid,invalid}/*.mmd
└── seed-questions/sample.md
```

---

## 8. Out of Scope (v1 → v2)

Explicitly deferred:
- **Follow-up questions / multi-turn dialogue** — v2
- **LLM-judged self-evaluation** ("how good is my draft?") — v2
- **Hosted public demo / cloud sync** — v2 (keep local-first promise of v1)
- **L5/L6 rubric scoring UI** — v2
- **Cache layer for repeated topics** — v2 (Hybrid Approach C)
- **Authentication / accounts** — never (local tool)
- **Mobile-optimized layout** — desktop-first MVP

---

## 9. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Mermaid generation unreliable | High | Validator + maid autofix + LLM retry + source fallback (designed in §6) |
| OSS seed content licensing dispute | Medium | Inherit CC-BY-SA, per-file `_attribution.json` with source URL + license |
| LLM cost surprises (BYOK user) | Medium | Token counter in UI; warn before generating; suggest cheaper models |
| Setup friction (Node + .env) | Medium | One-command quickstart docs + interactive `npm run setup` script |
| Different LLM providers produce inconsistent quality | High | Recommend tested model list per provider; document known-good combos |

---

## 10. Next Step

Hand off to `writing-plans` skill to produce a step-by-step implementation plan.
