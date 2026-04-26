# AI Pulse — Project Instructions

## Stack
- **Frontend:** React 19 + TypeScript (strict), Vite, Tailwind CSS, Recharts, Framer Motion
- **Backend:** Tauri v2, Rust
- **IPC validation:** Zod schemas at the TS boundary (`src/lib/ipcSchemas.ts` — single source of truth)
- **State:** Zustand with `useShallow` for stable selectors

## Architecture Rules
- All Tauri commands return `Result<T, String>` on the Rust side
- Every IPC payload is validated with `safeParse` — never cast raw `invoke()` output
- Shared Zod schemas live in `src/lib/ipcSchemas.ts`; both `claudeUsage.ts` and `codexUsage.ts` import from it
- No barrel files — direct imports only

## Data Sources
- Claude sessions: `~/.claude/projects/*/sessions/*.jsonl` (input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens per assistant message)
- Codex sessions: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` (token_count events with total_token_usage)
- Claude stats cache: `~/.claude/stats-cache.json` (model usage + daily totals, used as fallback/supplement)

## Rust / Clippy
- Lint flags: `-W clippy::all -W clippy::pedantic -D warnings`
- Global allows at crate top: `clippy::too_many_lines`, `clippy::missing_panics_doc`
- Use `#[allow(...)]` with a comment only when suppression is justified
- Prefer `let…else` over `match { val => val, _ => return/continue }`
- Use `.clamp(min, max)` not `.max(min).min(max)`
- Use `.is_ok_and(…)` / `.is_some_and(…)` not `map_or(false, …)`

## Git Workflow
- Always `git push origin <branch>` immediately after committing — never let local and remote diverge
- Always push before running `gh pr merge` — GitHub merges the remote state, not local commits
- Conventional commits: `feat(scope):`, `fix(scope):`, `chore:`, `refactor(scope):`
- Small atomic commits — one concern per commit

## Pre-commit Hook
Runs automatically on every commit (`.githooks/pre-commit`):
1. `npm run types` — TypeScript strict check
2. `npm run lint` — ESLint
3. Clippy (pedantic) — only when `.rs` or `Cargo.toml` files are staged

## Dev Commands
```
npm run tauri dev     # start dev server + Tauri window
npm run tauri build   # production build
npm run types         # tsc --noEmit
npm run lint          # eslint src
```

## Release
- Version source of truth: `package.json` → `"version"`
- Tag format: `v<version>` (e.g. `v0.1.0`)
- Push tag then create GitHub release: `gh release create v<version>`
