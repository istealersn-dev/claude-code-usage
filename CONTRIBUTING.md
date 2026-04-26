# Contributing to AI Pulse

Thanks for your interest in contributing. AI Pulse is a small, focused macOS menubar app — contributions that stay within that scope are most likely to be merged quickly.

---

## What to work on

Check the [open issues](https://github.com/istealersn-dev/ai-pulse/issues) for things that are already being tracked. Before opening a PR for a new feature or a non-trivial change, open an issue first so we can align on approach.

Good areas to contribute:

- **Gemini data pipeline** — the provider selector exists but there is no real data source yet. Session file format research and a Rust parser would be welcome.
- **Windows / Linux support** — the app is macOS-only today. Porting the tray/window setup and the auto-launch plugin to other platforms is tracked but not started.
- **Test coverage** — Rust unit tests for the JSONL parsers and aggregation logic.
- **Bug fixes** — anything in the issue tracker labelled `bug`.

---

## Getting started

```bash
# 1. Clone and install JS deps
git clone https://github.com/istealersn-dev/ai-pulse.git
cd ai-pulse
npm install          # also wires the pre-commit hook

# 2. Run in dev mode (Rust compiles on first run — ~60s cold, fast incremental)
npm run tauri dev
```

Requirements: macOS 13+, Node.js 18+, Rust stable (`rustup`), Tauri CLI v2.

---

## Code standards

The pre-commit hook runs all three checks automatically. PRs must pass them.

| Check | Command | Notes |
|---|---|---|
| TypeScript | `npm run types` | Strict mode, no `any` |
| ESLint | `npm run lint` | Configured in `eslint.config.js` |
| Clippy | `cargo clippy` | Pedantic — `-W clippy::pedantic -D warnings` |

A few things to keep in mind:

- **Rust**: follow existing `let...else` / `.is_some_and()` / `.clamp()` patterns. All `clippy::pedantic` lints must pass.
- **TypeScript**: strict mode, no `any`, no `@ts-ignore`. Errors are values — use `Result`-style patterns, not thrown exceptions at internal boundaries.
- **No mock data for real providers** — data shown in the UI must come from local session files. Do not add hardcoded numbers.
- **No new dependencies without discussion** — keep the bundle small.

---

## Submitting a PR

1. Branch off `main`: `git checkout -b feat/your-feature`
2. Keep commits small and use conventional prefixes: `feat(scope):`, `fix(scope):`, `refactor(scope):`
3. The pre-commit hook must pass before the commit is accepted
4. Open the PR against `main` with a clear description of what changes and why
5. Link the related issue if one exists

---

## Data sources

AI Pulse reads **local files only** — no network calls, no telemetry, no data leaves the machine. Any contribution must preserve this property. Do not add any form of analytics, crash reporting, or remote data fetching.

Current sources:

| Provider | Path |
|---|---|
| Claude Code | `~/.claude/projects/*/sessions/*.jsonl`, `~/.claude/stats-cache.json` |
| OpenAI Codex | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` |
| Gemini | Not yet implemented |

---

## License

By contributing you agree that your changes will be released under the project's [MIT License](LICENSE).
