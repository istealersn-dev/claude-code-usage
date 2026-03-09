# Agent Teams Playbook — Tauri Migration
**Team:** `tauri-migration`
**Goal:** Migrate AI Pulse from a browser simulation to a native macOS Tauri v2 menubar app.
**Source of truth:** `docs/MIGRATION_PLAN.md`, `docs/Design_System.md`, `docs/PRD.md`

---

## Team Structure

| Role | Responsibility |
|---|---|
| **Lead** | Your Claude session. Coordinates agents, approves plans, unblocks dependencies, calls handoffs, signs off on completion. |
| **tauri-agent** | All Rust/Tauri backend work. |
| **frontend-agent** | All React/TypeScript frontend work. |
| **qa-agent** | Quality gate. Runs checks and fixes errors after both agents complete. |

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

---

## Starting the Team

Once inside Claude (the lead), paste this prompt:

```
Read docs/AGENT_PLAYBOOK.md, docs/MIGRATION_PLAN.md, docs/Design_System.md, and docs/PRD.md.

You are the team lead for the Tauri v2 migration of AI Pulse. Your job is to:
1. Create the task list from the Task Breakdown in the playbook
2. Spawn 3 teammates with their exact spawn prompts from the playbook
3. Approve or reject each agent's plan before they touch any file
4. Only approve plans that match docs/MIGRATION_PLAN.md exactly and do not touch locked files
5. Explicitly call each handoff: tell qa-agent when tauri-agent and frontend-agent are both done
6. Sign off on completion only when qa-agent reports all three checks pass clean

Do not write any code yourself. Coordinate only.
```

---

## Team Lead Coordination Protocol

The lead is active throughout — not just at start and end.

### Phase 1 — Setup (Lead only)
1. Create the task list from the Task Breakdown table below
2. Spawn all three teammates with their spawn prompts
3. Instruct tauri-agent and frontend-agent to present their plans before touching any files

### Phase 2 — Plan Review (Lead approves/rejects)
- Review each plan against `docs/MIGRATION_PLAN.md`
- Reject if any locked file is touched: `Dashboard.tsx`, `LiquidGauge.tsx`, `UsageChart.tsx`, `SettingsModal.tsx`, `ReportWindow.tsx`
- Reject if any design token changes are proposed
- Approve explicitly with "Plan approved. Proceed."

### Phase 3 — Parallel Execution (Lead monitors)
- tauri-agent and frontend-agent work in parallel after plan approval
- Lead monitors for blockers and messages to unblock
- Lead does NOT merge or modify any agent's work

### Phase 4 — QA Handoff (Lead calls it)
- When BOTH tauri-agent and frontend-agent message "Done", lead messages qa-agent:
  > "tauri-agent and frontend-agent are complete. Begin QA: run npm run lint, npm run types, npm run test. Fix any errors introduced. Report back when all three pass clean."

### Phase 5 — Sign-off (Lead closes the loop)
- When qa-agent reports all three pass clean, lead messages tauri-agent:
  > "QA signed off. Commit all changes and open the PR."
- Lead reviews the PR URL and confirms to the user

---

## Agent Definitions

### tauri-agent

**Spawn prompt:**
```
You are tauri-agent on the AI Pulse Tauri migration team.

Read docs/MIGRATION_PLAN.md, docs/Design_System.md, and docs/PRD.md before doing anything.

Your scope: all Rust and Tauri configuration work only. Do not touch any React/TypeScript files except to add the @tauri-apps/api package.

INPUTS (wait for these before starting):
- Branch `feat/tauri-migration` must exist (you create it as task 1)
- No other dependencies to start

YOUR TASKS (in order):
1. Create branch `feat/tauri-migration` from main
2. Install @tauri-apps/cli as a devDependency, add `"tauri": "tauri"` to package.json scripts
3. Run `npx tauri init` with: App name=AI Pulse, Window title=AI Pulse, Web assets=../dist, Dev URL=http://localhost:3000, dev command=npm run dev, build command=npm run build
4. Configure src-tauri/tauri.conf.json: transparent=true, decorations=false, width=440, height=640, visible=false, resizable=false, alwaysOnTop=true
5. Add tauri-plugin-positioner to Cargo.toml
6. Write src-tauri/src/main.rs: tray icon toggle using app.trayIcon (Tauri v2 API), positioner to TrayCenter, hide on focus-loss using get_webview_window (not get_window)
7. Create tray icon assets in src-tauri/icons/: monochrome Activity+AP icon, iconTemplate.png at 16x16, 32x32, 48x48

OUTPUTS (signal when done):
- Message the lead: "tauri-agent done. src-tauri scaffolded, tray toggle implemented, icons created."

BEFORE TOUCHING ANY FILE:
- Present your full implementation plan to the lead and wait for "Plan approved. Proceed."

CONSTRAINTS:
- Branch: feat/tauri-migration only — never commit to main
- Locked files — do not touch: Dashboard.tsx, LiquidGauge.tsx, UsageChart.tsx, SettingsModal.tsx, ReportWindow.tsx, DetailedReport.tsx, App.tsx
- Tauri v2 API only: app.trayIcon not systemTray, get_webview_window not get_window
- Window size is 440×640 (not 400×600) — required for shadow-2xl to render without clipping
- Commit format: feat(tauri):, fix(tauri):
- No force push
```

---

### frontend-agent

**Spawn prompt:**
```
You are frontend-agent on the AI Pulse Tauri migration team.

Read docs/MIGRATION_PLAN.md, docs/Design_System.md, and docs/PRD.md before doing anything.

Your scope: React/TypeScript frontend refactoring only. Do not touch any Rust or Tauri config files.

INPUTS (wait for these before starting):
- Branch `feat/tauri-migration` must exist (tauri-agent creates it — confirm it exists before starting)

YOUR TASKS (in order):
1. Checkout branch feat/tauri-migration
2. Install @tauri-apps/api as a dependency
3. Delete src/components/Menubar.tsx entirely
4. Rewrite App.tsx as a transparent wrapper per MIGRATION_PLAN.md section 4.4:
   - Root div: `min-h-screen bg-transparent text-white font-sans overflow-hidden flex justify-center items-start pt-2`
   - Renders <Dashboard> and <DetailedReport> only
   - No desktop simulation (no bg-gradient, no "CLAUDE" text, no window chrome)
   - Preserve AnimatePresence wrapping DetailedReport
5. Update the DetailedReport trigger in Dashboard.tsx to open a Tauri WebviewWindow:
   - Import WebviewWindow from @tauri-apps/api/window
   - new WebviewWindow('detailed-report', { url: '/report.html', title: 'Detailed Usage Report', width: 1000, height: 800 })

OUTPUTS (signal when done):
- Message the lead: "frontend-agent done. Menubar.tsx deleted, App.tsx rewritten as transparent wrapper, DetailedReport trigger updated to WebviewWindow."

BEFORE TOUCHING ANY FILE:
- Present your full implementation plan to the lead and wait for "Plan approved. Proceed."

CONSTRAINTS:
- Branch: feat/tauri-migration only — never commit to main
- Locked files — do not touch: Dashboard.tsx, LiquidGauge.tsx, UsageChart.tsx, SettingsModal.tsx, ReportWindow.tsx
- Dashboard.tsx may ONLY be touched for the WebviewWindow trigger change (task 5) — no other modifications
- Zero visual changes — all design tokens (colors, spacing, radii, shadows) must remain identical
- Commit format: feat(web):, fix(web):
- No force push
```

---

### qa-agent

**Spawn prompt:**
```
You are qa-agent on the AI Pulse Tauri migration team.

Read docs/MIGRATION_PLAN.md before doing anything.

Your scope: quality gate only. Do not make feature changes. Only fix TypeScript, lint, or test errors.

INPUTS (do not start until the lead explicitly tells you to begin):
- Lead will message: "tauri-agent and frontend-agent are complete. Begin QA."

YOUR TASKS (in order):
1. Run `npm run lint` — fix any lint errors introduced by the migration
2. Run `npm run types` — fix any TypeScript errors introduced by the migration
3. Run `npm run test` — fix any test failures introduced by the migration
4. For each fix: only change what is needed to make the check pass. Do not refactor or improve unrelated code.
5. When all three pass clean, message the lead: "QA signed off. lint ✓ types ✓ test ✓"

OUTPUTS (signal when done):
- Message the lead with the exact status of each check and confirmation all three pass.

CONSTRAINTS:
- Branch: feat/tauri-migration only
- Locked files — do not touch: Dashboard.tsx, LiquidGauge.tsx, UsageChart.tsx, SettingsModal.tsx, ReportWindow.tsx
- Only fix errors — do not improve or refactor working code
- If a check fails and you cannot fix it without touching a locked file, message the lead to decide
```

---

## Task Breakdown

| # | Task | Owner | Blocked By |
|---|---|---|---|
| 1 | Create `feat/tauri-migration` branch | tauri-agent | — |
| 2 | Install `@tauri-apps/cli`, add `tauri` npm script | tauri-agent | 1 |
| 3 | Run `npx tauri init` with correct config values | tauri-agent | 2 |
| 4 | Configure `src-tauri/tauri.conf.json` (transparent, 440×640, tray) | tauri-agent | 3 |
| 5 | Add `tauri-plugin-positioner` to `Cargo.toml` | tauri-agent | 3 |
| 6 | Write `src-tauri/src/main.rs` (tray toggle, positioner, focus-hide) | tauri-agent | 4, 5 |
| 7 | Create tray icon in `src-tauri/icons/` | tauri-agent | 3 |
| 8 | Checkout branch, install `@tauri-apps/api` | frontend-agent | 1 |
| 9 | Delete `Menubar.tsx`, rewrite `App.tsx` as transparent wrapper | frontend-agent | 8 |
| 10 | Update `DetailedReport` trigger → `WebviewWindow` | frontend-agent | 8, 9 |
| 11 | Run lint + types + test, fix all errors | qa-agent | 6, 7, 10 |
| 12 | Commit all changes with conventional commit messages | tauri-agent | 11 |
| 13 | Open PR to `main` via `gh pr create` | tauri-agent | 12 |

---

## Handoff Signals

| Signal | From | To | Meaning |
|---|---|---|---|
| "Plan approved. Proceed." | Lead | tauri-agent / frontend-agent | Agent may begin file changes |
| "tauri-agent done." | tauri-agent | Lead | Tasks 1–7 complete |
| "frontend-agent done." | frontend-agent | Lead | Tasks 8–10 complete |
| "Begin QA." | Lead | qa-agent | Both agents done; QA may start |
| "QA signed off." | qa-agent | Lead | All checks pass; ready to commit + PR |
| "Commit and open PR." | Lead | tauri-agent | Final step authorized |

---

## Key Constraints (apply to all agents)

- **Branch:** all work on `feat/tauri-migration` — never commit to `main`
- **Locked files:** `Dashboard.tsx`, `LiquidGauge.tsx`, `UsageChart.tsx`, `SettingsModal.tsx`, `ReportWindow.tsx` — do not touch
- **Design tokens:** frozen per `docs/Design_System.md` — zero visual changes
- **Window size:** 440×640 (not 400×600) — required for `shadow-2xl` to render without clipping
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
- [ ] `DetailedReport` trigger opens a `WebviewWindow`
- [ ] `npm run lint` passes
- [ ] `npm run types` passes
- [ ] `npm run test` passes
- [ ] All changes committed on `feat/tauri-migration`
- [ ] PR open against `main`
