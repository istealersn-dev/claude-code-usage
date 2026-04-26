# AI Pulse

A native macOS menubar app that gives developers real-time visibility into token usage, session counts, and cost across AI coding assistants — without leaving the editor.

Built with **Tauri v2** (Rust backend) + **React 19** + **TypeScript**. Reads directly from local session files — no API keys, no network calls, no data leaves your machine.

---

## Features

- **Token usage chart** — area chart of input/output tokens over 1D / 3D / 7D / 30D
- **Cost tracking** — lifetime spend, daily cost, projected monthly cost
- **Trend indicator** — last-7-day vs previous-7-day token delta
- **Project breakdown** — token share by project, sorted by volume
- **Model breakdown** — token share by model with proportional usage bars
- **Budget limit** — set a monthly spend cap; a warning banner fires when breached
- **Provider switching** — Claude Code and OpenAI Codex (Gemini coming soon)
- **Live updates** — file watcher triggers a re-read whenever session files change
- **Global shortcut** — `Cmd+Shift+A` opens the panel from anywhere
- **Launch at login** — optional LaunchAgent via `tauri-plugin-autostart`

---

## Requirements

| Dependency | Version |
|---|---|
| macOS | 13 Ventura or later |
| Node.js | 18+ |
| Rust | stable (via [rustup](https://rustup.rs)) |
| Tauri CLI | v2 (installed via npm) |

---

## Getting Started

```bash
# 1. Install JS dependencies
npm install

# 2. Start the app in dev mode (opens the menubar app with hot reload)
npm run tauri dev
```

The Rust backend compiles on first run — expect ~60s on a cold build. Subsequent incremental builds are much faster.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server only (no Tauri shell) |
| `npm run tauri dev` | Full app in dev mode with hot reload |
| `npm run tauri build` | Production `.app` + `.dmg` in `src-tauri/target/release/bundle/` |
| `npm run types` | TypeScript type check (no emit) |
| `npm run lint` | ESLint across `src/` |
| `npm test` | Vitest unit tests |

---

## Data Sources

AI Pulse reads local files only. No data is uploaded or shared.

### Claude Code
```
~/.claude/projects/*/sessions/*.jsonl
~/.claude/projects/.stats-cache.json   (session counts + model totals)
```
Each JSONL line contains a `usage` object with `input_tokens`, `output_tokens`, `cache_read_input_tokens`, and `cache_creation_input_tokens`. The Rust backend aggregates these by day and model.

### OpenAI Codex
```
~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
$CODEX_HOME/sessions/...               (if CODEX_HOME is set)
```
Each session file's final `token_count` event supplies cumulative `input_tokens`, `cached_input_tokens`, `output_tokens`, and `reasoning_output_tokens`.

### Gemini
Not yet implemented — provider selector is present in the UI; data pipeline coming in a future release.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell / IPC | Tauri v2 (Rust) |
| Frontend | React 19 + TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Charts | Recharts |
| State | Zustand (persisted) |
| IPC validation | Zod |
| File watching | `notify` (macOS kqueue) |
| Auto-launch | `tauri-plugin-autostart` |
| Global shortcut | `tauri-plugin-global-shortcut` |

---

## Project Structure

```
├── src/                        # React frontend
│   ├── components/
│   │   ├── Dashboard.tsx       # Main panel — all provider views
│   │   ├── UsageChart.tsx      # Area chart (Recharts)
│   │   ├── LiquidGauge.tsx     # Animated fill gauge
│   │   └── SettingsModal.tsx   # Budget, appearance, storage settings
│   └── lib/
│       ├── claudeUsage.ts      # Claude IPC fetch + Zod schema
│       ├── codexUsage.ts       # Codex IPC fetch + Zod schema
│       ├── data.ts             # Provider metadata + mock fallback data
│       └── store.ts            # Zustand store (persisted preferences)
├── src-tauri/
│   ├── src/lib.rs              # All Rust IPC commands + file parsing
│   ├── icons/                  # App icon + tray icon assets
│   └── tauri.conf.json         # Window config, bundle targets, CSP
└── package.json
```

---

## Building for Production

```bash
npm run tauri build
```

Output is in `src-tauri/target/release/bundle/`:
- `macos/AI Pulse.app` — standalone app bundle
- `dmg/AI Pulse_0.1.0_aarch64.dmg` — distributable disk image

> **Note:** The app uses `macOSPrivateApi: true` for transparent window rendering. Distributing outside the Mac App Store may require notarization.

---

## License

MIT
