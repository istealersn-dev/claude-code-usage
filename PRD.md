# PRODUCT REQUIREMENTS DOCUMENT
## AI Pulse (formerly Claude Pulse)
**Menubar Usage Monitor for AI Coding Assistants**

**Version:** 1.2 (Updated to reflect multi-provider support)
**Author:** Stan
**Date:** March 4, 2026
**Status:** Draft / Implementation in Progress
**Platform:** macOS (primary), Windows/Linux (future)
**Tech Stack:** React 18+ + TypeScript + Tailwind v4 + Framer Motion + Recharts (Targeting Tauri v2 via Migration Plan)
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
8. Data Pipeline & JSONL Parsing
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
AI Pulse is a macOS menubar application that provides real-time visibility into token consumption, session analytics, and cost tracking for leading AI coding assistants (Claude Code, OpenAI Codex, Google Gemini). Currently built as a high-fidelity React web simulation (with a defined migration path to Tauri v2 for native performance), it is designed with Apple's liquid design philosophy for a premium, WOW-factor engineering tool experience.

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
5. **Zero Configuration** — Detects Claude Code’s JSONL files automatically. Works out of the box.

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
The application is accessed via a menubar widget (currently simulated in the web environment). Clicking the "CC" command icon toggles the main dashboard.

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

### 7.1 Current State: High-Fidelity Web Simulation
The application is currently built as a React + Vite web application that simulates the macOS desktop environment.
* **UI Layer:** React 18+, TypeScript, Tailwind CSS v4.
* **Animation:** Framer Motion.
* **Charts:** Recharts.
* **Icons:** Lucide React.

### 7.2 Target State: Tauri v2 Native App
A `MIGRATION_PLAN.md` has been established to port this UI into a native macOS menubar app using Tauri.
* **Menubar / Tray:** Tauri v2 System Tray API (Rust).
* **Data Layer:** Rust (Tauri commands) for JSONL file watching, parsing, aggregation, and caching.

---

## 8. Data Pipeline & JSONL Parsing (Target Architecture)
*(Note: Currently using mock data in `lib/data.ts` which supports multiple providers). The following applies to the Rust backend implementation).*
* **Data Sources:** Reads directly from provider-specific local logs or cache files (e.g., `~/.claude/projects/{path}/{uuid}.jsonl` for Claude, or equivalent paths for Codex/Gemini).
* **Token Aggregation:** Deduplicates assistant messages by ID before summing input/output/cache tokens.
* **File Watching:** Uses Rust’s `notify` crate to watch for file modifications and stream live updates to the React frontend.

---

## 9. UI Component Specification

### 9.1 Component Hierarchy
* `<App />`: Root component (currently simulates the macOS desktop).
* `<Menubar />`: Top navigation bar containing the widget trigger.
* `<Dashboard />`: The main popover panel containing the core UI.
* `<LiquidGauge />`: Custom SVG + Framer Motion fluid simulation.
* `<UsageChart />`: Recharts-based bar chart for token trends.
* `<DetailedReport />`: Expanded modal for Intelligence & Analytics.
* `<SettingsModal />`: In-panel overlay for user configuration.

### 9.2 State Management
Currently utilizing React `useState` and `useEffect`. Will transition to Zustand for global state management (usage, sessions, projects, costs, preferences) as the backend integration progresses.

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
│   ├── Dashboard.tsx        # Main popover UI
│   ├── DetailedReport.tsx   # Analytics modal
│   ├── LiquidGauge.tsx      # SVG fluid animation
│   ├── Menubar.tsx          # macOS menubar simulation
│   ├── SettingsModal.tsx    # Settings overlay
│   └── UsageChart.tsx       # Recharts implementation
├── lib/
│   ├── data.ts              # Mock data & interfaces
│   └── utils.ts             # Tailwind merge utilities
├── App.tsx                  # Root simulation layout
├── index.css                # Global styles & Tailwind
└── main.tsx                 # React entry point
```

---

## 13. Development Phases & Milestones

* **Phase 1: High-Fidelity UI Simulation (COMPLETED)**
  * Build core UI components (Dashboard, Liquid Gauge, Charts).
  * Implement Apple Liquid design language with Tailwind and Framer Motion.
  * Add Intelligence & Analytics detailed reporting.
* **Phase 2: Tauri Integration (NEXT)**
  * Initialize Tauri v2.
  * Configure frameless, transparent tray window.
  * Map React UI to Tauri window lifecycle.
* **Phase 3: Rust Backend & Data Pipeline**
  * Implement JSONL parser and file watcher in Rust.
  * Connect Rust commands to React frontend.
* **Phase 4: Polish & Ship**
  * Native macOS vibrancy integration.
  * DMG packaging and distribution.

---

## 14. Success Metrics
* **Daily active usage:** Open panel 5+ times/day.
* **Glance value:** 80% of checks are menubar-only (no panel open).
* **Memory:** < 40MB RSS.

---

## 15. Open Questions & Future Scope
* **Plan detection:** Can we auto-detect Pro vs Max plan from local files, or does the user need to configure it?
* **Multi-machine:** If a user runs AI assistants on multiple machines, should we support cloud sync?
* **Future Platforms:** Windows and Linux support via Tauri.
* **Team Dashboard:** Aggregated usage across team members via shared data.

---
*End of Document*
