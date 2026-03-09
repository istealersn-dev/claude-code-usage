# Agent Teams Playbook — Tauri Migration
**Team:** `tauri-migration`
**Goal:** Migrate AI Pulse from a browser simulation to a native macOS Tauri v2 menubar app.
**Source of truth:** `docs/MIGRATION_PLAN.md`, `docs/Design_System.md`, `docs/PRD.md`

---

## How Agent Teams Work

> You run **one** Claude session. It is the team lead. The lead spawns teammates automatically into tmux split panes. You do not manually launch agents per pane.

- **Lead**: your Claude session — coordinates, assigns tasks, synthesizes results
- **Teammates**: separate Claude instances spawned by the lead, each in their own pane
- **Shared task list**: all agents see and claim tasks from it
- **Communication**: teammates message each other and the lead directly; messages arrive automatically

---

## Prerequisites

### 1. Enable Agent Teams
Ensure `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set in `.claude/settings.json` (already done).

### 2. Set Display Mode to tmux
Add `"teammateMode": "tmux"` to `.claude/settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "teammateMode": "tmux"
}
```

### 3. Start in a tmux session
```bash
tmux new-session -s ai-pulse
# then launch Claude from inside the tmux session
claude
```
Claude will auto-detect tmux and split panes for each teammate.

---

## Starting the Team

Once inside Claude (the lead), paste this prompt:

```
Read docs/AGENT_PLAYBOOK.md, docs/MIGRATION_PLAN.md, docs/Design_System.md, and docs/PRD.md.

Create an agent team to complete the Tauri v2 migration for AI Pulse. Spawn 3 teammates:

1. **tauri-agent** — owns all Rust/Tauri work: create the feat/tauri-migration branch, install Tauri CLI, scaffold src-tauri/, configure tauri.conf.json for a transparent 440×640 frameless menubar window, implement main.rs with tray toggle + tauri-plugin-positioner, add tray icon assets, and open the final PR.

2. **frontend-agent** — owns all React work: delete src/components/Menubar.tsx, rewrite App.tsx as a transparent wrapper (remove all desktop simulation), install @tauri-apps/api, and update the DetailedReport trigger to open a Tauri WebviewWindow. Must not modify Dashboard.tsx, LiquidGauge.tsx, UsageChart.tsx, or SettingsModal.tsx.

3. **qa-agent** — waits for tauri-agent and frontend-agent to finish, then runs npm run lint, npm run types, and npm run test. Fixes any TypeScript or lint errors introduced. Signs off when all three pass clean.

Require plan approval from each teammate before they make any file changes. Only approve plans that match docs/MIGRATION_PLAN.md exactly and do not touch locked design tokens from docs/Design_System.md. After QA signs off, tauri-agent commits all changes and opens a PR to main.
```

---

## Task Breakdown (for the lead to create)

| # | Task | Owner | Blocked By |
|---|---|---|---|
| 1 | Create `feat/tauri-migration` branch | tauri-agent | — |
| 2 | Install `@tauri-apps/cli`, add `tauri` npm script | tauri-agent | 1 |
| 3 | Run `npx tauri init` with correct config values | tauri-agent | 2 |
| 4 | Configure `src-tauri/tauri.conf.json` (transparent, 440×640, tray) | tauri-agent | 3 |
| 5 | Add `tauri-plugin-positioner` to `Cargo.toml` | tauri-agent | 3 |
| 6 | Write `src-tauri/src/main.rs` (tray toggle, positioner, focus-hide) | tauri-agent | 4, 5 |
| 7 | Create tray icon in `src-tauri/icons/` | tauri-agent | 3 |
| 8 | Install `@tauri-apps/api` | frontend-agent | 1 |
| 9 | Delete `Menubar.tsx`, rewrite `App.tsx` as transparent wrapper | frontend-agent | 1 |
| 10 | Update `DetailedReport` trigger → `WebviewWindow` | frontend-agent | 8, 9 |
| 11 | Run lint + types + test, fix all errors | qa-agent | 6, 7, 10 |
| 12 | Commit all changes with conventional commit messages | tauri-agent | 11 |
| 13 | Open PR to `main` via `gh pr create` | tauri-agent | 12 |

---

## Key Constraints (embed in each teammate's spawn prompt)

- **Branch:** all work on `feat/tauri-migration` — never commit to `main`
- **Locked files:** `Dashboard.tsx`, `LiquidGauge.tsx`, `UsageChart.tsx`, `SettingsModal.tsx`, `ReportWindow.tsx` — do not touch
- **Design tokens:** frozen per `docs/Design_System.md` — zero visual changes
- **Window size:** 440×640 (not 400×600) to allow `shadow-2xl` to render without clipping
- **Tauri v2 API:** use `app.trayIcon` not `systemTray`, `get_webview_window` not `get_window`
- **Commit format:** conventional commits — `feat(tauri):`, `feat(web):`, `fix(tauri):` etc.
- **No force push:** blocked by settings

---

## Navigating the Team

| Action | Shortcut |
|---|---|
| Cycle through teammates | `Shift+Down` |
| Message a teammate directly | Click into their pane and type |
| Interrupt a teammate's turn | `Escape` in their pane |
| Toggle task list | `Ctrl+T` |

---

## Definition of Done

- [ ] `src-tauri/` fully scaffolded and configured
- [ ] `Menubar.tsx` deleted
- [ ] `App.tsx` is a transparent wrapper — no desktop simulation
- [ ] `DetailedReport` opens as a new `WebviewWindow`
- [ ] `npm run lint` passes
- [ ] `npm run types` passes
- [ ] `npm run test` passes
- [ ] All changes committed on `feat/tauri-migration`
- [ ] PR open against `main`
