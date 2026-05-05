# API Reference

All routes live under `src/app/api/**/route.ts`. They run in the Node
runtime (`export const runtime = 'nodejs'`) and are dynamic
(`export const dynamic = 'force-dynamic'`) because they touch
`better-sqlite3` and the Vercel AI SDK.

## Conventions

- Request bodies (where present) are parsed with
  `await req.json()` inside a `try/catch` that defaults to `{}`, then
  validated with a Zod schema declared at the top of the file.
- Errors are returned as `NextResponse.json({ error, ...details }, { status })`.
- Custom errors carry a stable `error` discriminator the client uses
  (e.g. `'low_quality'`, `'missing_credentials'`).
- LLM credentials are read from headers, never from env vars or the
  body. Use `readCredentialsFromHeaders(req.headers)` from
  `src/lib/server/llm/provider.ts`.

Common headers for LLM-using routes:

| Header | Required | Source |
|--------|----------|--------|
| `x-llm-base-url` | yes | `LLMSettingsPanel` localStorage entry. |
| `x-llm-api-key`  | yes | Same. |
| `x-llm-model`    | yes (for generate) / no (for /api/models) | Same. |

## Endpoint listing

| Method | Path | File | Purpose |
|--------|------|------|---------|
| `POST` | `/api/generate` | `src/app/api/generate/route.ts` | Generate one question, run Mermaid pipeline, persist. |
| `GET`  | `/api/generated` | `src/app/api/generated/route.ts` | List generated question summaries. |
| `GET`  | `/api/generated/[id]` | `src/app/api/generated/[id]/route.ts` | Fetch one generated record. |
| `DELETE` | `/api/generated/[id]` | `src/app/api/generated/[id]/route.ts` | Remove one generated record. |
| `GET`  | `/api/models` | `src/app/api/models/route.ts` | Proxy to upstream `<baseURL>/models`. |

## `POST /api/generate`

**Headers**: `x-llm-base-url`, `x-llm-api-key`, `x-llm-model`.

**Request body**:
```json
{ "topic": "Spotify recommendations" }
```
Zod: `z.object({ topic: z.string().min(1).max(200) })`.

**Response 200**:
```json
{
  "id": "spotify-recommendations-...",
  "createdAt": 1730000000000,
  "question": { /* Question — see schemas.ts */ },
  "diagrams": {
    "architecture": { "status": "ok", "autoFixed": false, "llmRetried": false },
    "workflow":     { "status": "fallback", "error": "..." }
  },
  "mermaid_status": "fallback",
  "mermaid_auto_fixed": false,
  "mermaid_llm_retried": false,
  "mermaid_error": "..."
}
```

**Error responses**:

| Status | `error` | When |
|--------|---------|------|
| 400 | `invalid_topic` | Body fails the Zod check (empty / >200 chars / wrong type). |
| 400 | `missing_credentials` | Any of `x-llm-*` headers is empty. |
| 502 | `low_quality` | The LLM output failed `findMissingSections` after the enrichment retry. Includes a `missing: string[]` field. |
| 502 | `llm_error` | The LLM SDK threw any other error. Includes a `message` field. |
| 500 | `persist_failed` | SQLite insert failed. Includes a `message` field. |

## `GET /api/generated`

No headers. No body. Returns the 50 most recent rows as summaries:
```json
{ "items": [
  { "id": "...", "topic": "...", "title": "...",
    "difficulty": "L5", "createdAt": 1730000000000 }
]}
```

## `GET /api/generated/[id]`

Returns the full `GeneratedRecord` shape from
`src/lib/server/generated/repository.ts`. Returns 404 with
`{ "error": "not_found" }` if no row matches.

## `DELETE /api/generated/[id]`

Returns `{ "ok": true }` on success or 404 `{ "error": "not_found" }`
when nothing was deleted.

## `GET /api/models`

**Headers**: `x-llm-base-url`, `x-llm-api-key` (model not needed).

Proxies to `<baseURL>/models` and returns:
```json
{ "models": ["gpt-4o", "gpt-4o-mini", "o1-preview"] }
```
The list is the sorted set of `data[].id` strings from the upstream
response.

**Errors**:

| Status | `error` | When |
|--------|---------|------|
| 400 | `missing_credentials` | Either header empty. |
| `<upstream status>` | `upstream_error` | Upstream returned non-2xx. Body includes `status` and a truncated `message`. |
| 502 | `upstream_unreachable` | `fetch` itself threw. Body includes `message`. |

## How to add a new endpoint

1. Create `src/app/api/<name>/route.ts`.
2. Export `runtime` and `dynamic`:
   ```ts
   export const runtime = 'nodejs';
   export const dynamic = 'force-dynamic';
   ```
3. Define a Zod body schema at the top of the file (if the route has a
   body).
4. Use `readCredentialsFromHeaders(req.headers)` if you call the LLM.
5. Use the repository functions for any DB access — never call
   `getDb()` from a route handler.
6. Build responses with `NextResponse.json(body, { status })` and
   reserve string `error` discriminators for failure cases.
7. Co-locate `route.test.ts`. Follow `src/app/api/generate/route.test.ts`:
   - `vi.mock` every server module the route imports.
   - Build `Request` objects with `new Request('http://localhost/...', { method, body, headers })`.
   - Assert both the status code and the `error` discriminator.
8. Run `bash .dev/scripts/verify.sh` and confirm `VERIFY: OK`.
