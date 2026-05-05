# Update Guide

How to keep the instruction layer (`AGENTS.md`, `CLAUDE.md`, `.dev/`)
accurate as the codebase evolves.

## When to update

| Trigger | What to update |
|---------|---------------|
| New API route added | `AGENTS.md` §4 Module Map, `.dev/api-reference.md` |
| New server module | `AGENTS.md` §4, `.dev/function-index.md` |
| New component | `AGENTS.md` §4 |
| Schema change (`schemas.ts`) | `.dev/architecture.md` data structures, `.dev/config-reference.md` |
| New env var or header | `.dev/config-reference.md`, `AGENTS.md` §2 if it's a hard constraint |
| Quality gate constant changed | `.dev/config-reference.md` |
| New content chapter/seed | `AGENTS.md` §7 (if the how-to needs updating) |
| Build tooling changed | `AGENTS.md` §1 verification table, `.dev/config-reference.md` |
| New naming convention | `AGENTS.md` §5, `.dev/coding-style.md` |

## Update workflow

1. Edit `AGENTS.md` (keep under ~120 lines for the main body).
2. Run `cp AGENTS.md CLAUDE.md`.
3. Run `bash .dev/scripts/diff-summary.sh` — must report byte-identical.
4. Edit the relevant `.dev/*.md` file(s).
5. Run `bash .dev/scripts/verify.sh` to confirm repo still passes.

## File inventory

| File | Purpose | Max size |
|------|---------|----------|
| `AGENTS.md` | Entry point for AI agents | ~120 lines |
| `CLAUDE.md` | Byte-identical copy | same |
| `.dev/architecture.md` | System diagram, data flow, pitfalls | <300 lines |
| `.dev/api-reference.md` | Endpoint specs, how-to-add | <300 lines |
| `.dev/coding-style.md` | Naming, errors, tests, templates | <300 lines |
| `.dev/function-index.md` | Intent-indexed function lookup | <300 lines |
| `.dev/config-reference.md` | Every config key, env, header | <300 lines |
| `.dev/UPDATE_GUIDE.md` | This file | <100 lines |
| `.dev/scripts/verify.sh` | Full verification script | — |
| `.dev/scripts/diff-summary.sh` | Parity check script | — |

## Principles

- Progressive disclosure: `AGENTS.md` is the only auto-loaded file.
  `.dev/` files are read on demand.
- Keep `AGENTS.md` concise. Move detail to `.dev/`.
- Real code examples > abstract descriptions.
- Update docs in the same commit as the code change they describe.
