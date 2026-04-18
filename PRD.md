# PRODUCT REQUIREMENTS DOCUMENT
## AI Pulse (formerly Claude Pulse)
**Menubar Usage Monitor for AI Coding Assistants**

**Version:** 1.3 (Updated to reflect Tauri migration completion and confirmed data pipeline paths)
**Author:** Stan
**Date:** April 18, 2026
**Status:** In Progress — Tauri migration complete, data pipeline partially implemented
**Platform:** macOS (primary), Windows/Linux (future)
**Tech Stack:** React 19 + TypeScript + Tailwind v4 + Framer Motion + Recharts + Tauri v2 (Rust)
**Codename:** AI Pulse

*Confidential — Internal Use Only*

---

## Table of Contents

1. Executive Summary
2. Problem Statement & Market Context
3. Product Vision & Principles
4. User Personas & Use Cases
5. Feature Specification
6. Apple Liquid Design Language
7. Technical Architecture
8. Data Pipeline — Provider File Paths & Formats
9. UI Component Specification
10. Menubar Behavior & Window Management
11. Performance Requirements
12. Project Structure & File Organization
13. Development Phases & Milestones
14. Success Metrics
15. Open Questions & Future Scope

---

## 1. Executive Summary

**TL;DR**
AI Pulse is a native macOS menubar application that provides real-time visibility into token consumption, session analytics, and cost tracking for leading AI coding assistants (Claude Code, OpenAI Codex, Google Gemini). Built with Tauri v2 and React 19, it is designed with Apple's liquid design philosophy for a premium, WOW-factor engineering tool experience.

Developers using AI coding assistants—especially those on Pro and Max plans or pay-as-you-go APIs—have zero native visibility into their rolling token consumption. Existing community tools are CLI-based, offering no persistent ambient awareness.

AI Pulse solves this by living in the macOS menubar as a persistent, beautiful, glanceable dashboard. One click reveals a rich panel showing today’s usage, cost projections, model breakdown, and deep intelligence-filled analytics—all rendered through a design language inspired by Apple’s fluid, luminous aesthetic. It seamlessly supports switching between Claude, Codex, and Gemini, dynamically adapting its theme and data.

---

## 2. Problem Statement & Market Context

### 2.1 The Problem
* AI coding assistants like Claude Code, OpenAI Codex, and Google Gemini often use opaque rolling token quotas or pay-as-you-go models with no native dashboard.
* Developers hit invisible limits mid-session, breaking flow state and momentum.
* Checking costs or context usage usually requires context-switching out of the coding flow (e.g., running CLI commands or checking web consoles).
* Existing solutions require terminal context-switches and offer no persistent visibility.
* No tool provides ambient awareness—the ability to glance and know your usage state across multiple AI providers without interrupting work.

### 2.2 Market Gap
AI Pulse is the only tool that combines real-time monitoring, native menubar integration, multi-provider support, and premium visual design. It turns usage data into an ambient, delightful experience rather than a chore.

---

## 3. Product Vision & Design Principles

### 3.1 Vision Statement
Make AI coding assistant usage as visible and beautiful as a car’s instrument cluster. You never open an app to check your speedometer—it’s always there, always glanceable, always gorgeous.

### 3.2 Core Design Principles
1. **Ambient Over Active** — Usage awareness should require zero cognitive effort.
2. **Depth Through Light** — Inspired by Apple’s liquid glass aesthetic. Layers of translucency, light refraction, and gentle luminescence create visual depth without heavy shadows or borders.
3. **Engineer’s Delight** — Precision data presented with monospace numerics, tight grids, and information density that respects the user’s intelligence.
4. **Motion With Purpose** — Every animation communicates state change. SVG liquid waves pulse gently.
5. **Zero Configuration** — Reads Claude Code’s local `stats-cache.json` automatically. Works out of the box with no API keys or setup required for Claude.

---

## 4. User Personas & Use Cases

### 4.1 Primary Persona: The Flow-State Engineer
**Profile:** Senior/Staff engineer using AI coding assistants (Claude Code, Copilot/Codex, Gemini) heavily. Runs 3–5 concurrent sessions across repos. Deep in flow state for 4–6 hour blocks.
**Pain:** Gets rate-limited without warning. Loses 10–20 minutes of context when a session dies.
**Need:** Glanceable menubar indicator that shows usage state at all times. Click-to-expand for details, with the ability to switch between different AI providers.

### 4.2 Secondary Persona: The Cost-Conscious API User
**Profile:** Developer or team lead using Claude Code via API pay-as-you-go. Monitors daily/weekly spend.
**Pain:** Only sees costs in Anthropic Console which requires browser context-switch.
**Need:** Real-time cost ticker with daily/weekly/monthly aggregation and model breakdown.

---

## 5. Feature Specification

### 5.1 Menubar Trigger
The application lives in the macOS menubar as a native Tauri tray app. Clicking the tray icon toggles the main dashboard popover. The web simulation environment has been removed.

### 5.2 Dashboard Popover (Primary View)
Clicking the menubar icon reveals a popover panel (400px wide) with the following sections:

#### 5.2.1 Header & Controls
* **Provider Selector:** A dropdown to seamlessly switch between Claude Code, OpenAI Codex, and Google Gemini.
* **Cost:** Displays the total cost for the current month for the selected provider.
* **Quick Actions:** Refresh button (with spinning animation) and Settings gear icon.
* **Timeframe Dropdown:** A clean, inline select menu to filter data by duration (`1h`, `1d`, `3d`, `1w`, `1m`, `Custom`) placed on its own line to prevent a cramped header.

#### 5.2.2 Usage Gauge & Key Stats (Hero Element)
* **Liquid Gauge:** An SVG-based animated fluid simulation showing context consumption percentage.
* **Context Limit:** Displays raw token usage vs. total context limit (e.g., `145k / 200k`).
* **Trend & Projections:** Mini-cards showing usage trends (e.g., "Up 12%") and projected end-of-month costs.

#### 5.2.3 Token Trend Chart
* **7-Day Sparkline:** A Recharts-powered bar chart showing daily token consumption (input/output/cache).

#### 5.2.4 Project & Model Breakdown
* **Toggle View:** A segmented control to switch between "Projects" and "Models".
* **List View:** Displays active projects or models with their respective token usage and cost. Includes hover tooltips for precise token counts.

#### 5.2.5 Footer
* **Detailed Report Trigger:** A button to launch the full-screen Intelligence & Analytics report.

### 5.3 Intelligence & Analytics Report (Detailed View)
A comprehensive, expanded modal view for deep-dive analytics:
* **Top Stats:** Total Cost, Total Tokens, Active Projects, and Total Sessions.
* **30-Day Chart:** Expanded usage trend visualization.
* **Project Insights:** A highly detailed breakdown per project showing:
  * **Tools Used:** Code Generation, Refactoring, Debugging counts.
  * **Plugins Used:** React Snippets, Tailwind CSS, etc.
  * **MCP Usage:** Database Schema, API Docs requests.
  * **Skills Usage:** TypeScript, React, Python, Node.js counts.

### 5.4 Settings Modal
An overlay modal that perfectly covers the Dashboard panel, offering configuration for:
* **API Keys:** Manage API keys for the currently selected provider (Anthropic, OpenAI, Google).
* **Budget & Alerts:** Set spending limits and notifications.
* **Data & Privacy:** Manage telemetry and data sharing.
* **Appearance:** Theme and display preferences.
* **Storage:** Clear cache and local data.

---

## 6. Apple Liquid Design Language

### 6.1 Core Visual Properties
* **Translucent Layers:** Uses Tailwind's `backdrop-blur-xl` with `bg-[#000814]/90` for deep, frosted glass effects.
* **Dynamic Theming:** Primary accents dynamically change based on the selected provider (e.g., Yellow for Claude, Green for Codex, Blue for Gemini) against the deep navy/black background, creating a high-contrast, premium "terminal-meets-glass" aesthetic.
* **Typography System:** Monospace (`font-mono`) for financial and token data, proportional (`font-sans`) for labels.

### 6.2 Motion & Animation
* **Liquid Gauge Animation:** Built using SVG `<path>` elements and Framer Motion. Features overlapping front and back waves that animate continuously on the X-axis to simulate fluid. The fill color dynamically shifts based on error states or usage limits.
* **Panel Transitions:** Popovers and modals use Framer Motion spring animations (`scale: 0.95` to `1`, `y: -20` to `0`) for smooth, physical-feeling entrances and exits.

---

## 7. Technical Architecture

### 7.1 Current State: Tauri v2 Native App *(Migration complete as of April 2026)*
The application is a native macOS menubar app built with Tauri v2. The web simulation environment (Menubar.tsx, desktop background) has been fully removed.
* **UI Layer:** React 19, TypeScript, Tailwind CSS v4.
* **Animation:** Framer Motion.
* **Charts:** Recharts.
* **Icons:** Lucide React.
* **Desktop Runtime:** Tauri v2 — frameless transparent window, system tray, macOS private API for true window transparency.
* **Data Layer (Claude):** Rust command reads `~/.claude/stats-cache.json`. Fully implemented.
* **Data Layer (Codex, Gemini):** Mock data only. Real pipeline not yet built (see §8).

### 7.2 Remaining Data Layer Work
* Rust parsers for Codex and Gemini local session files (see §8 for confirmed paths).
* File watcher using Rust's `notify` crate for live updates (all providers).
* Zustand for global state management (provider selection persistence, preferences).

---

## 8. Data Pipeline — Provider File Paths & Formats *(Updated April 2026)*

Each provider stores session and usage data locally in a different format. The paths and schemas below have been verified against current documentation and community tooling.

### 8.1 Claude Code *(Implemented)*

| Item | Detail |
|---|---|
| **Primary source** | `~/.claude/stats-cache.json` |
| **Raw sessions** | `~/.claude/projects/<encoded-path>/<uuid>.jsonl` |
| **Format** | JSON (stats-cache), JSONL (raw sessions) |
| **Status** | ✅ Rust command `get_claude_stats` implemented |

The `stats-cache.json` is pre-aggregated by Claude Code itself and is the preferred read source — no deduplication logic needed. The raw JSONL files remain available for more granular analysis (e.g., 5-hour billing window breakdowns as used by community tools like `ccusage`).

**Full `stats-cache.json` schema** (fields currently unused by the app are marked *available*):

```
{
  version: string,
  lastComputedDate: string,           // ISO date
  totalSessions: number,              // implemented
  totalMessages: number,              // available — not yet used
  firstSessionDate: string,           // available — not yet used
  hourCounts: number[24],             // available — sessions per hour
  longestSession: { ... },            // available — not yet used
  dailyActivity: [{
    date: string,
    messageCount: number,
    sessionCount: number,
    toolCallCount: number
  }],
  dailyModelTokens: [{                // implemented
    date: string,                     // YYYY-MM-DD
    tokensByModel: Record<string, number>
  }],
  modelUsage: {
    [modelName: string]: {
      inputTokens: number,            // implemented
      outputTokens: number,           // implemented
      cacheReadInputTokens: number,   // implemented
      cacheCreationInputTokens: number, // implemented
      costUSD: number,                // available — currently unused (cost shown as 0)
      contextWindow: number,          // available — not yet used
      maxOutputTokens: number,        // available — not yet used
      webSearchRequests: number       // available — not yet used
    }
  }
}
```

**Action item:** Wire `costUSD` from `modelUsage` into the Rust command return type — it eliminates the need for client-side cost calculation and removes the current `cost: 0` placeholder in model stats.

### 8.2 OpenAI Codex CLI *(Not yet implemented — mock data only)*

| Item | Detail |
|---|---|
| **Config** | `~/.codex/config.toml` |
| **Auth** | `~/.codex/auth.json` |
| **Session transcripts** | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` |
| **History** | `~/.codex/history.jsonl` |
| **Format** | JSONL event stream per session |
| **Status** | ❌ Not implemented — mock data in `lib/data.ts` |

Codex writes one `rollout-*.jsonl` file per session, with each line being a typed event (`thread.started`, `turn.completed`, `item.*`, etc.). Token usage is embedded in `turn.completed` events. There is **no pre-aggregated cache file** — aggregation must be done by iterating session files. Custom `CODEX_HOME` env var overrides the default `~/.codex` path.

### 8.3 Google Gemini CLI *(Not yet implemented — mock data only)*

| Item | Detail |
|---|---|
| **Config** | `~/.gemini/settings.json` |
| **Sessions** | `~/.gemini/tmp/<project_hash>/chats/` |
| **Format** | JSON (current), **migrating to JSONL** (in progress upstream) |
| **Custom home** | `GEMINI_CLI_HOME` env var overrides default |
| **Status** | ❌ Not implemented — mock data in `lib/data.ts` |

The `<project_hash>` is a SHA of the project root directory. All project session folders live under `~/.gemini/tmp/` and must be iterated to aggregate cross-project usage. Token fields in the proposed JSONL format: `{"type":"message_update","id":"...","tokens":{"input":N,"output":N}}`. The format is **still stabilizing** upstream — integration should be deferred until the JSONL migration is complete to avoid breakage.

Gemini CLI also exposes a `gemini_cli.token.usage` OpenTelemetry counter and a `/stats` command, but these are runtime-only and not suitable for historical aggregation.

### 8.4 GitHub Copilot *(Not a current provider — local parsing not viable)*

Copilot stores CLI session state in `~/.copilot/session-state/` backed by a local **SQLite database**. GitHub intentionally does not document the internal schema and it can change between versions. Usage metrics are available only via the GitHub Enterprise REST API (requires org-level access) or IDE telemetry — neither is suitable for local ambient monitoring.

**Decision:** Do not add Copilot as a provider unless GitHub publishes a stable local data API. Note this in §15 Open Questions.

### 8.5 File Watching (All Providers)
Use Rust’s `notify` crate to watch the relevant directories for each active provider and push incremental updates to the React frontend via Tauri events. Watch targets:
* Claude: `~/.claude/stats-cache.json`
* Codex: `~/.codex/sessions/` (recursive, current year/month/day subdirs)
* Gemini: `~/.gemini/tmp/` (recursive)

---

## 9. UI Component Specification

### 9.1 Component Hierarchy
* `<App />`: Transparent root container for the Tauri menubar window. Renders `<Dashboard />` or `<DetailedReport />` based on URL query params (`?window=report`).
* `<Dashboard />`: The main tray popover panel. *(Implemented)*
* `<LiquidGauge />`: Custom SVG + Framer Motion fluid simulation. *(Implemented)*
* `<UsageChart />`: Recharts-based area chart for token trends. *(Implemented)*
* `<DetailedReport />`: Full analytics window, opened as a separate Tauri WebviewWindow. *(Implemented)*
* `<SettingsModal />`: In-panel overlay for user configuration. *(Not yet built)*

> Note: `<Menubar />` has been removed — it was a web simulation component only.

### 9.2 State Management
Currently using React `useState` and `useEffect` with local component state. Zustand adoption is pending — required before adding Settings, persistent provider selection, and budget alert state. Zustand store should cover: active provider, usage data per provider, user preferences, and budget thresholds.

---

## 10. Menubar Behavior & Window Management (Target Architecture)
* **Tray Icon:** Template image (macOS) that respects system light/dark modes.
* **Popover Window:** Frameless, transparent Tauri window positioned directly under the menubar icon.
* **Window Vibrancy:** Will utilize Tauri's native `vibrancy` support (`under-window`, `hudWindow`) to replace CSS backdrop filters for better native performance on macOS.

---

## 11. Performance Requirements
* **Memory footprint:** < 40MB resident (Target).
* **CPU idle:** < 0.5% (Polling only).
* **Panel open time:** < 100ms.
* **Animations:** 60fps hardware-accelerated SVG and CSS transforms.

---

## 12. Project Structure & File Organization
```text
src/
├── components/
│   ├── Dashboard.tsx        # Main tray popover UI ✅
│   ├── DetailedReport.tsx   # Analytics window ✅
│   ├── LiquidGauge.tsx      # SVG fluid animation ✅
│   ├── SettingsModal.tsx    # Settings overlay ❌ not yet built
│   └── UsageChart.tsx       # Recharts implementation ✅
├── lib/
│   ├── claudeUsage.ts       # Tauri IPC → Claude stats ✅
│   ├── data.ts              # Mock data & type interfaces ✅
│   └── utils.ts             # Tailwind merge utilities ✅
├── App.tsx                  # Transparent Tauri root container ✅
├── index.css                # Global styles & Tailwind ✅
└── main.tsx                 # React entry point ✅

src-tauri/
├── src/
│   ├── lib.rs               # Tauri setup, tray, get_claude_stats command ✅
│   └── main.rs              # App entry point ✅
├── capabilities/            # Tauri permission scopes ✅
├── icons/                   # Tray icon assets ✅
└── tauri.conf.json          # Window/bundle config ✅
```

---

## 13. Development Phases & Milestones

* **Phase 1: High-Fidelity UI Simulation (COMPLETED)**
  * Build core UI components (Dashboard, Liquid Gauge, Charts).
  * Implement Apple Liquid design language with Tailwind and Framer Motion.
  * Add Intelligence & Analytics detailed reporting.

* **Phase 2: Tauri Integration (COMPLETED)**
  * Tauri v2 initialized and configured.
  * Frameless, transparent tray window with macOS private API transparency.
  * Tray icon with click-to-toggle, auto-hide on focus loss, window positioning.
  * Separate WebviewWindow for Detailed Report.
  * GitHub Actions release workflow for universal macOS binary + DMG.

* **Phase 3: Rust Backend & Data Pipeline (IN PROGRESS)**
  * ✅ `get_claude_stats` command — reads `~/.claude/stats-cache.json`
  * ✅ Claude model usage and daily token aggregation
  * ❌ Wire `costUSD` from stats-cache into model stats (currently `cost: 0`)
  * ❌ Trend calculation and month-end projection (dashboard shows `—`)
  * ❌ Codex data pipeline (`~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`)
  * ❌ Gemini data pipeline (`~/.gemini/tmp/<hash>/chats/`) — await format stabilisation
  * ❌ File watcher (`notify` crate) for live updates
  * ❌ Zustand state management + provider selection persistence

* **Phase 4: Feature Completion**
  * ❌ Settings Modal (API keys, budget alerts, appearance, storage)
  * ❌ Timeframe dropdown (`1h`, `1d`, `3d`, `1w`, `1m`, `Custom`)
  * ❌ CSV export in Detailed Report
  * ❌ Billing period calculation
  * ❌ Native macOS vibrancy (replace CSS `backdrop-blur` with Tauri vibrancy API)

* **Phase 5: Polish & Ship**
  * ❌ Test suite (Vitest component tests, Rust unit tests)
  * ❌ Performance validation (< 40MB RSS, < 100ms open time)
  * ❌ Fix stale artifacts (`index.html` title, README, `.env.example`)
  * ❌ Signed DMG distribution

---

## 14. Success Metrics
* **Daily active usage:** Open panel 5+ times/day.
* **Glance value:** 80% of checks are menubar-only (no panel open).
* **Memory:** < 40MB RSS.

---

## 15. Open Questions & Future Scope

### Unresolved Questions
* **Plan detection:** Can we auto-detect Claude Pro vs Max plan from `stats-cache.json`, or does the user need to configure it? The `contextWindow` field in `modelUsage` may provide a hint.
* **Multi-machine:** If a user runs AI assistants on multiple machines, should we support cloud sync?
* **Gemini format stability:** The Gemini CLI team is actively migrating session storage from JSON to JSONL (issue #15292). Integration should be deferred until the new format is stable and released.
* **Codex custom home:** Users may set `CODEX_HOME` to a non-default path. The Rust parser must respect this env var before falling back to `~/.codex`.

### Future Provider Candidates
* **GitHub Copilot:** Stores session state in `~/.copilot/session-state/` via a local SQLite database with an undocumented, unstable schema. GitHub does not expose usage data via local files — only via Enterprise REST API. **Not viable as a local-parsing provider** unless GitHub publishes a stable public schema. Track for future re-evaluation.
* **Cursor / AmpCode / other editors:** Community tools (e.g., `tokscale`) already track these. Evaluate if there is user demand before investing.

### Future Platform & Feature Scope
* **Windows and Linux:** Tauri v2 supports both. Path separators and home directory conventions differ — abstract `~` resolution in the Rust data layer.
* **Team Dashboard:** Aggregated usage across team members via shared data store.
* **Auto-launch on login:** Use `tauri-plugin-autostart`.
* **Global keyboard shortcut:** Use Tauri `globalShortcut` API (e.g., `Cmd+Shift+A`) to open the dashboard without clicking the tray icon.

---
*End of Document*
