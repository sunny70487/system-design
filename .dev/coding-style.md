# Coding Style

## Pre-commit checklist

Before reporting completion, verify:

1. `npm run lint` — zero errors.
2. `npm run typecheck` — zero `TS####` errors.
3. No `as any`, `@ts-ignore`, `@ts-expect-error`.
4. No `console.log` / `console.*` in `src/`.
5. Imports use `@/` alias for `src/`-rooted paths.
6. New route exports `runtime = 'nodejs'` + `dynamic = 'force-dynamic'`.
7. Co-located `*.test.ts(x)` added for new modules.
8. `bash .dev/scripts/verify.sh` prints `VERIFY: OK`.

## Naming (quick reference)

| Kind | Rule | Example |
|------|------|---------|
| Server file | kebab-case `.ts` | `mermaid-retry.ts` |
| Component file | PascalCase `.tsx` | `TopicInput.tsx` |
| shadcn primitive | lowercase `.tsx` | `button.tsx` |
| Function | camelCase | `generateQuestion` |
| Component | PascalCase | `LLMSettingsPanel` |
| Class | PascalCase (`Error` suffix) | `LowQualityError` |
| Constant | SCREAMING_SNAKE | `MIN_BUSINESS_ITEMS` |
| Type/Interface | PascalCase | `GeneratedRecord` |
| Zod schema | PascalCase + `Schema` | `QuestionSchema` |
| LLM JSON field | snake_case | `problem_statement` |
| SQLite column | snake_case | `question_json` |
| HTTP header | `x-llm-*` lowercase | `x-llm-base-url` |

## Error handling patterns

Three idioms — pick the one matching the layer:

### 1. Custom Error class (deep library → route handler)

```ts
// src/lib/server/llm/generate.ts
export class LowQualityError extends Error {
  constructor(public missing: string[]) {
    super(`Low quality: missing ${missing.join(', ')}`);
  }
}

// src/app/api/generate/route.ts
} catch (e) {
  if (e instanceof LowQualityError) {
    return NextResponse.json(
      { error: 'low_quality', missing: e.missing },
      { status: 502 },
    );
  }
  // ...
}
```

### 2. Result-type discriminated union (recoverable pipeline)

```ts
// src/lib/server/mermaid/pipeline.ts
type PipelineResult =
  | { status: 'ok'; source: string; autoFixed: boolean; llmRetried: boolean }
  | { status: 'fallback'; source: string; error: string };
```

### 3. Empty-catch coercion (parse-or-default)

```ts
let body: Record<string, unknown> = {};
try { body = await req.json(); } catch { /* empty body is valid */ }
```

Always narrow unknown errors:
```ts
const msg = e instanceof Error ? e.message : String(e);
```

## Logging

None. There is no logger. Do not add `console.log`. Surface failures
via thrown errors, Result-type returns, or JSON error responses.

## Test conventions

- Co-locate: `generate.test.ts` next to `generate.ts`.
- Mock external boundaries with `vi.mock(...)`:
  ```ts
  vi.mock('@/lib/server/llm/provider', () => ({
    getProvider: vi.fn(),
  }));
  ```
- Tests touching SQLite rely on `SD_DB_PATH=:memory:` from
  `src/test/setup.ts`.
- Assert both status codes AND `error` discriminator strings.
- Use `describe` / `it` blocks; no `test()` standalone.

## File templates

### New API route (`src/app/api/<name>/route.ts`)

```ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ok */ }

  // Validate with Zod
  // Call business logic
  // Return NextResponse.json(...)
}
```

### New server module (`src/lib/server/<area>/<name>.ts`)

```ts
import { z } from 'zod';

// Named exports only
export function doSomething(input: string): Result {
  // ...
}
```

### New React component (`src/components/<area>/<Name>.tsx`)

```tsx
'use client'; // only if interactive

interface Props { /* ... */ }

export function MyComponent({ ... }: Props) {
  return <div>...</div>;
}
```

## Import ordering (observed convention)

1. Node built-ins (none currently used directly).
2. External packages (`next/...`, `react`, `ai`, `zod`, etc.).
3. Internal `@/lib/...` modules.
4. Relative siblings (`./...`).

No enforced auto-sort; keep consistent within a file.

## TypeScript style

- `strict: true` — never weaken.
- Rely on inference; add explicit return types only where surrounding
  code already does.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- No `enum` — use string literal unions or `as const` objects.
