# AI Pulse — Phase 3 & 4 Implementation Playbook

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 3 data pipeline and Phase 4 feature work for AI Pulse — wiring real cost/trend data from stats-cache.json, adding live file watching, persisting state with Zustand, and delivering timeframe filtering, Settings Modal, CSV export, and native macOS vibrancy.

**Architecture:** Two-wave parallel execution. Wave 1 has three fully independent streams (Rust data enhancements, Zustand store, native vibrancy) that each run in their own git worktree. Wave 2 streams (file watcher, timeframe dropdown, settings modal, CSV export) open after Wave 1 merges to main. Each stream produces a PR.

**Tech Stack:** Rust + Tauri v2, React 19, TypeScript strict, Tailwind v4, Zustand, `notify` crate (Rust), `window-vibrancy` crate (Rust), Vitest

---

## Parallel Execution Map

```
main
 ├── Wave 1 (all start now, fully independent)
 │    ├── feat/cost-trend      ← Stream A: costUSD + trend + billing period
 │    ├── feat/zustand-store   ← Stream B: Zustand provider persistence
 │    └── feat/vibrancy        ← Stream C: native macOS vibrancy
 │
 └── Wave 2 (open after Wave 1 merges)
      ├── feat/file-watcher    ← Stream D: notify crate live updates
      ├── feat/timeframe       ← Stream E: timeframe dropdown (needs A + B)
      ├── feat/settings-modal  ← Stream F: Settings Modal (needs B)
      └── feat/csv-export      ← Stream G: CSV export (independent)
```

Each stream below is a self-contained plan an agent can execute start-to-finish.

---

## Stream A: costUSD + Trend + Billing Period

**Branch:** `feat/cost-trend`  
**Files modified:**
- Modify: `src-tauri/src/lib.rs` — extend `ModelStat`, `ClaudeStats`, `get_claude_stats`
- Modify: `src/lib/claudeUsage.ts` — map new fields
- Modify: `src/components/Dashboard.tsx` — display real cost, trend %, projection
- Modify: `src/components/DetailedReport.tsx` — display real total cost

### A-1: Extend Rust structs and command

**Files:** `src-tauri/src/lib.rs`

- [ ] **Step 1: Add `cost_usd` to `ModelUsageEntry`**

In `src-tauri/src/lib.rs`, extend the `ModelUsageEntry` struct (currently around line 49):

```rust
#[allow(clippy::struct_field_names)]
#[derive(serde::Deserialize)]
struct ModelUsageEntry {
    #[serde(rename = "inputTokens", default)]
    input_tokens: u64,
    #[serde(rename = "outputTokens", default)]
    output_tokens: u64,
    #[serde(rename = "cacheReadInputTokens", default)]
    cache_read_tokens: u64,
    #[serde(rename = "cacheCreationInputTokens", default)]
    cache_creation_tokens: u64,
    #[serde(rename = "costUSD", default)]
    cost_usd: f64,
}
```

- [ ] **Step 2: Add cost and trend fields to `ModelStat` and `ClaudeStats`**

Replace the existing `ModelStat` and `ClaudeStats` structs:

```rust
/// Aggregate token counts and cost for a single Claude model.
#[derive(serde::Serialize)]
pub struct ModelStat {
    /// Model identifier as it appears in `stats-cache.json`.
    name: String,
    /// Total input tokens across all sessions for this model.
    input_tokens: u64,
    /// Total output tokens across all sessions for this model.
    output_tokens: u64,
    /// Combined cache read and cache creation tokens for this model.
    cache_tokens: u64,
    /// Total cost in USD for this model from stats-cache.json.
    cost_usd: f64,
}

/// Top-level response returned by [`get_claude_stats`] over Tauri IPC.
#[derive(serde::Serialize)]
pub struct ClaudeStats {
    /// Last 30 days of usage, sorted oldest-first.
    daily_usage: Vec<DailyUsage>,
    /// Per-model breakdown, sorted by total token count descending.
    model_stats: Vec<ModelStat>,
    /// Lifetime session count from `stats-cache.json`.
    total_sessions: u64,
    /// Sum of costUSD across all models — total spend to date.
    total_cost_usd: f64,
    /// Percentage change in tokens: last 7 days vs previous 7 days.
    /// None if fewer than 7 days of data exist.
    trend_pct: Option<f64>,
    /// Projected month-end cost based on daily average of current month.
    /// None if no daily data exists for the current month.
    projected_monthly_cost_usd: Option<f64>,
}
```

- [ ] **Step 3: Update `get_claude_stats` to populate new fields**

Replace the return statement in `get_claude_stats` (after the existing `model_stats` sort):

```rust
    // Compute total cost from modelUsage entries.
    let total_cost_usd: f64 = cache.model_usage.values().map(|m| m.cost_usd).sum();

    // Trend: compare token sum of last 7 days vs previous 7 days.
    let trend_pct: Option<f64> = {
        let n = entries.len();
        if n >= 7 {
            let last7: u64 = entries[n - 7..].iter()
                .map(|d| d.input_tokens + d.output_tokens + d.cache_tokens)
                .sum();
            let prev7: u64 = if n >= 14 {
                entries[n - 14..n - 7].iter()
                    .map(|d| d.input_tokens + d.output_tokens + d.cache_tokens)
                    .sum()
            } else {
                0
            };
            if prev7 > 0 {
                #[allow(clippy::cast_precision_loss)]
                Some(((last7 as f64 - prev7 as f64) / prev7 as f64) * 100.0)
            } else {
                None
            }
        } else {
            None
        }
    };

    // Projected month-end cost: daily average of current month * days remaining.
    let projected_monthly_cost_usd: Option<f64> = {
        // Use today's date to find entries from the current calendar month.
        // stats-cache dates are "YYYY-MM-DD" ISO strings — check prefix.
        use std::time::{SystemTime, UNIX_EPOCH};
        // Get current year-month as "YYYY-MM" via a simple epoch calculation.
        // Accurate to within a day; good enough for projection.
        let secs = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let days_since_epoch = secs / 86400;
        // Rough year/month from days — not calendar-precise but sufficient.
        // We use the date strings directly: filter entries whose date starts
        // with the same year-month prefix as the most recent entry.
        if let Some(latest) = daily.last() {
            let ym = &latest.date[..7]; // "YYYY-MM"
            let month_entries: Vec<_> = daily.iter()
                .filter(|d| d.date.starts_with(ym))
                .collect();
            let days_elapsed = month_entries.len() as f64;
            if days_elapsed > 0.0 {
                // Estimate days in month as 30.
                let days_in_month = 30.0_f64;
                let daily_avg_cost = total_cost_usd / days_elapsed;
                Some(daily_avg_cost * days_in_month)
            } else {
                None
            }
        } else {
            None
        }
    };

    // Build model stats sorted by total token count descending.
    let mut model_stats: Vec<ModelStat> = cache
        .model_usage
        .into_iter()
        .map(|(name, m)| ModelStat {
            name,
            input_tokens: m.input_tokens,
            output_tokens: m.output_tokens,
            cache_tokens: m.cache_read_tokens + m.cache_creation_tokens,
            cost_usd: m.cost_usd,
        })
        .collect();

    model_stats.sort_by(|a, b| {
        let ta = a.input_tokens + a.output_tokens + a.cache_tokens;
        let tb = b.input_tokens + b.output_tokens + b.cache_tokens;
        tb.cmp(&ta)
    });

    Ok(ClaudeStats {
        daily_usage: entries,
        model_stats,
        total_sessions: cache.total_sessions,
        total_cost_usd,
        trend_pct,
        projected_monthly_cost_usd,
    })
```

- [ ] **Step 4: Build to verify no compile errors**

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1
```

Expected: `Finished` with no errors. Fix any type mismatches before continuing.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(rust): add costUSD, trend_pct, projected_monthly_cost to ClaudeStats IPC"
```

---

### A-2: Update TypeScript mapping

**Files:** `src/lib/claudeUsage.ts`

- [ ] **Step 1: Extend raw types and result interface**

Replace the contents of `src/lib/claudeUsage.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import type { UsageData, ModelUsage } from "./data";

interface RawDailyUsage {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
}

interface RawModelStat {
  name: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  cost_usd: number;
}

interface RawClaudeStats {
  daily_usage: RawDailyUsage[];
  model_stats: RawModelStat[];
  total_sessions: number;
  total_cost_usd: number;
  trend_pct: number | null;
  projected_monthly_cost_usd: number | null;
}

export interface ModelDetail {
  name: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface ClaudeUsageResult {
  usageData: UsageData[];
  modelUsage: ModelUsage[];
  modelDetails: ModelDetail[];
  totalTokens: number;
  totalSessions: number;
  totalCostUsd: number;
  trendPct: number | null;
  projectedMonthlyCostUsd: number | null;
}

export async function fetchClaudeStats(): Promise<ClaudeUsageResult> {
  const raw = await invoke<RawClaudeStats>("get_claude_stats");

  const usageData: UsageData[] = raw.daily_usage.map((d) => ({
    date: d.date,
    inputTokens: d.input_tokens,
    outputTokens: d.output_tokens,
    cacheTokens: d.cache_tokens,
  }));

  let totalTokens = 0;
  const modelUsage: ModelUsage[] = [];
  const modelDetails: ModelDetail[] = [];

  for (const m of raw.model_stats) {
    const total = m.input_tokens + m.output_tokens + m.cache_tokens;
    totalTokens += total;
    modelUsage.push({ name: m.name, tokens: total, cost: m.cost_usd });
    modelDetails.push({
      name: m.name,
      inputTokens: m.input_tokens,
      outputTokens: m.output_tokens,
      cacheTokens: m.cache_tokens,
      totalTokens: total,
      costUsd: m.cost_usd,
    });
  }

  return {
    usageData,
    modelUsage,
    modelDetails,
    totalTokens,
    totalSessions: raw.total_sessions,
    totalCostUsd: raw.total_cost_usd,
    trendPct: raw.trend_pct,
    projectedMonthlyCostUsd: raw.projected_monthly_cost_usd,
  };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors. Fix any type gaps before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/lib/claudeUsage.ts
git commit -m "feat(ts): map costUSD, trendPct, projectedMonthlyCostUsd from IPC"
```

---

### A-3: Wire real data into Dashboard

**Files:** `src/components/Dashboard.tsx`

- [ ] **Step 1: Add state for new fields**

After the existing `const [realModelUsage, ...]` line, add:

```typescript
const [claudeTotalCost, setClaudeTotalCost] = useState<number | null>(null);
const [claudeTrendPct, setClaudeTrendPct] = useState<number | null>(null);
const [claudeProjectedCost, setClaudeProjectedCost] = useState<number | null>(null);
```

- [ ] **Step 2: Populate in the fetchClaudeStats `.then()` callback**

In both the `useEffect` fetch and `handleRefresh`, after the existing `setRealModelUsage` call add:

```typescript
if (result.totalCostUsd > 0) setClaudeTotalCost(result.totalCostUsd);
setClaudeTrendPct(result.trendPct);
setClaudeProjectedCost(result.projectedMonthlyCostUsd);
```

- [ ] **Step 3: Display real cost in header**

Find the header cost display (currently `{provider === "claude" ? "—" : ...}`). Replace with:

```tsx
{provider === "claude"
  ? (claudeTotalCost !== null ? `$${claudeTotalCost.toFixed(2)} total` : "—")
  : `$${totalCost.toFixed(2)} this month`}
```

- [ ] **Step 4: Display trend and projection cards**

Find the two mini-cards (Trend and Projected). Replace their placeholder `—` values:

```tsx
{/* Trend card */}
<p className="text-[10px] sm:text-xs text-gray-300 leading-tight">
  Usage{" "}
  {provider === "claude" && claudeTrendPct !== null ? (
    <>
      <span className="font-bold" style={{ color: providerData.themeColor }}>
        {claudeTrendPct >= 0 ? "+" : ""}{claudeTrendPct.toFixed(1)}%
      </span>{" "}
      vs last week.
    </>
  ) : (
    <span className="font-bold" style={{ color: providerData.themeColor }}>—</span>
  )}
</p>

{/* Projected card */}
<p className="text-[10px] sm:text-xs text-gray-300 leading-tight">
  Est.{" "}
  {provider === "claude" && claudeProjectedCost !== null ? (
    <span className="text-white font-mono">${claudeProjectedCost.toFixed(2)}</span>
  ) : (
    <span className="text-white font-mono">—</span>
  )}{" "}
  by month end.
</p>
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat(dashboard): display real cost, trend %, and monthly projection"
```

---

### A-4: Wire real cost into DetailedReport

**Files:** `src/components/DetailedReport.tsx`

- [ ] **Step 1: Add state for real total cost**

After the existing `const [liveModelDetails, ...]` state line, add:

```typescript
const [liveTotalCostUsd, setLiveTotalCostUsd] = useState<number | null>(null);
```

- [ ] **Step 2: Populate in the fetchClaudeStats `.then()` callback**

After the existing `setLiveModelDetails` call:

```typescript
if (result.totalCostUsd > 0) setLiveTotalCostUsd(result.totalCostUsd);
```

- [ ] **Step 3: Replace `—` in Total Cost stat card**

Find the Total Cost stat card. Replace its content:

```tsx
<p className="text-2xl font-mono text-white">
  {provider === "claude"
    ? (liveTotalCostUsd !== null ? `$${liveTotalCostUsd.toFixed(2)}` : "—")
    : `$${totalCost.toFixed(2)}`}
</p>
```

- [ ] **Step 4: Display per-model cost in Model Breakdown**

In the model detail card, find the token grid and add a Cost row below it:

```tsx
<div className="grid grid-cols-4 gap-4 mb-4">
  <div>
    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Input</p>
    <p className="text-sm font-mono text-white">{(model.inputTokens / 1000).toFixed(0)}k</p>
  </div>
  <div>
    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Output</p>
    <p className="text-sm font-mono text-white">{(model.outputTokens / 1000).toFixed(0)}k</p>
  </div>
  <div>
    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Cache</p>
    <p className="text-sm font-mono text-white">{(model.cacheTokens / 1000).toFixed(0)}k</p>
  </div>
  <div>
    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Cost</p>
    <p className="text-sm font-mono" style={{ color: providerData.themeColor }}>
      {model.costUsd > 0 ? `$${model.costUsd.toFixed(4)}` : "—"}
    </p>
  </div>
</div>
```

Note: `model` here is of type `ModelDetail` from `claudeUsage.ts` which now has `costUsd: number`.

- [ ] **Step 5: Type-check and commit**

```bash
npx tsc --noEmit 2>&1
git add src/components/DetailedReport.tsx
git commit -m "feat(report): display real total cost and per-model cost from IPC"
```

- [ ] **Step 6: Open PR**

```bash
gh pr create --base main --head feat/cost-trend \
  --title "feat(data): wire costUSD, trend, and projection from stats-cache.json" \
  --body "Closes out the cost: 0 placeholder. Wires costUSD from modelUsage, computes 7-day trend %, and projects month-end cost. All three values now flow Rust → IPC → TypeScript → UI."
```

---

## Stream B: Zustand Provider Persistence

**Branch:** `feat/zustand-store`  
**Files modified:**
- Modify: `package.json` — add zustand
- Create: `src/lib/store.ts` — Zustand store
- Modify: `src/components/Dashboard.tsx` — read/write provider from store

### B-1: Install Zustand

- [ ] **Step 1: Install**

```bash
npm install zustand
```

- [ ] **Step 2: Verify**

```bash
cat package.json | grep zustand
```

Expected: `"zustand": "^5.x.x"` in dependencies.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add zustand"
```

---

### B-2: Create the store

**Files:** `src/lib/store.ts`

- [ ] **Step 1: Create store file**

Create `src/lib/store.ts`:

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Provider } from "./data";

interface AppState {
  provider: Provider;
  setProvider: (p: Provider) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      provider: "claude",
      setProvider: (p) => set({ provider: p }),
    }),
    {
      name: "ai-pulse-store",
      partialize: (state) => ({ provider: state.provider }),
    }
  )
);
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat(store): add Zustand store with persisted provider selection"
```

---

### B-3: Wire provider into Dashboard

**Files:** `src/components/Dashboard.tsx`

- [ ] **Step 1: Replace local provider state with store**

At the top of `Dashboard`, replace:

```typescript
const [provider, setProvider] = useState<Provider>("claude");
```

with:

```typescript
const provider = useAppStore((s) => s.provider);
const setProvider = useAppStore((s) => s.setProvider);
```

Add the import at the top of the file:

```typescript
import { useAppStore } from "@/lib/store";
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

- [ ] **Step 3: Verify in dev mode**

```bash
npm run tauri dev
```

Switch providers, close and reopen the tray popup — the selected provider should persist.

- [ ] **Step 4: Commit and open PR**

```bash
git add src/components/Dashboard.tsx src/lib/store.ts package.json package-lock.json
git commit -m "feat(ux): persist provider selection across sessions via Zustand"
gh pr create --base main --head feat/zustand-store \
  --title "feat(ux): persist provider selection with Zustand" \
  --body "Adds Zustand store with localStorage persistence. Provider selection survives tray popup close and app restart."
```

---

## Stream C: Native macOS Vibrancy

**Branch:** `feat/vibrancy`  
**Files modified:**
- Modify: `src-tauri/Cargo.toml` — add window-vibrancy
- Modify: `src-tauri/src/lib.rs` — apply vibrancy in setup
- Modify: `src/index.css` — reduce backdrop-blur opacity since system handles blur
- Modify: `src/components/Dashboard.tsx` — reduce panel background opacity

### C-1: Add window-vibrancy crate

- [ ] **Step 1: Add dependency**

In `src-tauri/Cargo.toml`, under `[dependencies]`:

```toml
window-vibrancy = "0.5"
```

- [ ] **Step 2: Verify it resolves**

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | head -20
```

Expected: crate downloads and compiles. Fix version if resolution fails (check `cargo search window-vibrancy` for latest).

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore(deps): add window-vibrancy crate"
```

---

### C-2: Apply vibrancy to the main window

**Files:** `src-tauri/src/lib.rs`

- [ ] **Step 1: Add import at top of file**

After the existing `use` statements add:

```rust
#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
```

- [ ] **Step 2: Apply vibrancy in setup, after the transparency block**

In the `setup` closure, after the existing `with_webview` block that sets transparency, add:

```rust
            // Apply native macOS vibrancy — replaces CSS backdrop-blur with
            // the system compositor effect for better performance and accuracy.
            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                let _ = apply_vibrancy(
                    &window,
                    NSVisualEffectMaterial::HudWindow,
                    None,
                    Some(16.0), // corner radius matching rounded-2xl (≈16px)
                );
            }
```

- [ ] **Step 3: Build to verify**

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1
```

Expected: `Finished` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat(rust): apply NSVisualEffectMaterial vibrancy to main tray window"
```

---

### C-3: Tune CSS to complement vibrancy

**Files:** `src/components/Dashboard.tsx`, `src/index.css`

- [ ] **Step 1: Reduce panel background opacity**

In `Dashboard.tsx`, find the root `motion.div` className. Change:

```
bg-[#000814]/90 backdrop-blur-xl
```

to:

```
bg-[#000814]/60
```

The `backdrop-blur-xl` CSS class is no longer needed — the system vibrancy handles blurring. The 60% dark overlay preserves contrast without fighting the system compositor.

- [ ] **Step 2: Run dev and eyeball the result**

```bash
npm run tauri dev
```

Click the tray icon. The panel should show a native frosted-glass effect through the dark overlay. If the overlay is too dark/light, adjust the opacity value (`/60` → `/50` or `/70`) until it looks right.

- [ ] **Step 3: Commit and open PR**

```bash
git add src/components/Dashboard.tsx src/index.css src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat(ux): replace CSS backdrop-blur with native macOS vibrancy"
gh pr create --base main --head feat/vibrancy \
  --title "feat(ux): native macOS vibrancy on tray popup" \
  --body "Replaces CSS backdrop-blur with NSVisualEffectMaterial.HudWindow via window-vibrancy crate. Produces a true system-compositor frosted-glass effect. CSS overlay opacity reduced to 60% to complement rather than fight the system blur."
```

---

## Stream D: File Watcher (Wave 2)

> **Prerequisite:** `feat/cost-trend` merged to main.

**Branch:** `feat/file-watcher`  
**Files modified:**
- Modify: `src-tauri/Cargo.toml` — add notify
- Modify: `src-tauri/src/lib.rs` — spawn file watcher, emit event
- Modify: `src-tauri/capabilities/main.json` — add event emit permission
- Modify: `src/lib/claudeUsage.ts` — listen for event, export listener setup fn
- Modify: `src/components/Dashboard.tsx` — call listener setup on mount

### D-1: Add notify crate

- [ ] **Step 1: Add dependency**

In `src-tauri/Cargo.toml`:

```toml
notify = { version = "6", features = ["macos_kqueue"] }
```

- [ ] **Step 2: Build to verify**

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore(deps): add notify crate for file watching"
```

---

### D-2: Spawn file watcher in Rust

**Files:** `src-tauri/src/lib.rs`

- [ ] **Step 1: Add imports**

After existing `use` statements:

```rust
use notify::{RecommendedWatcher, RecursiveMode, Watcher, Config as NotifyConfig};
```

- [ ] **Step 2: Spawn watcher in setup, after tray build**

After `app.manage(tray);`, add:

```rust
            // Spawn a file watcher for stats-cache.json.
            // On change, emit "claude-stats-updated" to the main window so
            // the frontend re-fetches without user interaction.
            if let Ok(home) = std::env::var("HOME") {
                let watch_path = std::path::PathBuf::from(&home)
                    .join(".claude")
                    .join("stats-cache.json");
                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    let (tx, mut rx) = tokio::sync::mpsc::channel(1);
                    let mut watcher = RecommendedWatcher::new(
                        move |res: notify::Result<notify::Event>| {
                            if res.is_ok() {
                                let _ = tx.blocking_send(());
                            }
                        },
                        NotifyConfig::default(),
                    );
                    if let Ok(ref mut w) = watcher {
                        let _ = w.watch(&watch_path, RecursiveMode::NonRecursive);
                    }
                    while rx.recv().await.is_some() {
                        // Debounce: wait 500ms then emit once.
                        tokio::time::sleep(Duration::from_millis(500)).await;
                        // Drain any queued events during the debounce window.
                        while rx.try_recv().is_ok() {}
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.emit("claude-stats-updated", ());
                        }
                    }
                });
            }
```

- [ ] **Step 3: Build**

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat(rust): watch stats-cache.json and emit claude-stats-updated on change"
```

---

### D-3: Listen in TypeScript

**Files:** `src/lib/claudeUsage.ts`

- [ ] **Step 1: Export a listener setup function**

Add to the bottom of `src/lib/claudeUsage.ts`:

```typescript
import { listen } from "@tauri-apps/api/event";

/** Subscribes to file-watcher events from Rust and calls `onUpdate` each time
 *  stats-cache.json changes. Returns an unlisten function for cleanup. */
export async function onClaudeStatsUpdated(onUpdate: () => void): Promise<() => void> {
  return listen<void>("claude-stats-updated", () => onUpdate());
}
```

- [ ] **Step 2: Add emit permission to main capability**

In `src-tauri/capabilities/main.json`, add to permissions array:

```json
"core:event:allow-listen"
```

- [ ] **Step 3: Call listener in Dashboard**

In `Dashboard.tsx`, in the Claude `useEffect` (the one that calls `fetchClaudeStats`), after the initial fetch:

```typescript
import { onClaudeStatsUpdated } from "@/lib/claudeUsage";

// Inside the useEffect, after the initial fetchClaudeStats call:
let unlistenFn: (() => void) | null = null;
onClaudeStatsUpdated(() => {
  if (cancelled) return;
  fetchClaudeStats()
    .then((result) => {
      if (cancelled) return;
      if (result.usageData.length > 0) setClaudeUsageData(result.usageData);
      if (result.modelUsage.length > 0) setRealModelUsage(result.modelUsage);
    })
    .catch(() => {});
}).then((fn) => { unlistenFn = fn; });

return () => {
  cancelled = true;
  unlistenFn?.();
};
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1
```

- [ ] **Step 5: Commit and PR**

```bash
git add src/lib/claudeUsage.ts src/components/Dashboard.tsx src-tauri/capabilities/main.json
git commit -m "feat(ux): auto-refresh dashboard when stats-cache.json changes"
gh pr create --base main --head feat/file-watcher \
  --title "feat(ux): live update dashboard via file watcher" \
  --body "Rust notify watcher emits claude-stats-updated when stats-cache.json changes. Frontend listener re-fetches and updates all Claude data without user interaction. Debounced at 500ms."
```

---

## Stream E: Timeframe Dropdown (Wave 2)

> **Prerequisites:** `feat/cost-trend` and `feat/zustand-store` merged to main.

**Branch:** `feat/timeframe`  
**Files modified:**
- Modify: `src-tauri/src/lib.rs` — add `days` param to `get_claude_stats`
- Modify: `src/lib/claudeUsage.ts` — pass `days` to invoke
- Modify: `src/lib/store.ts` — persist timeframe selection
- Modify: `src/components/Dashboard.tsx` — add timeframe selector UI

### E-1: Add `days` parameter to Rust command

**Files:** `src-tauri/src/lib.rs`

- [ ] **Step 1: Change command signature**

```rust
#[tauri::command]
fn get_claude_stats(days: Option<u32>) -> Result<ClaudeStats, String> {
```

- [ ] **Step 2: Use `days` when slicing entries**

Replace the existing `if entries.len() > 30` block:

```rust
    let limit = days.unwrap_or(30) as usize;
    if entries.len() > limit {
        entries = entries.split_off(entries.len() - limit);
    }
```

- [ ] **Step 3: Build**

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(rust): add optional days param to get_claude_stats for timeframe filtering"
```

---

### E-2: Persist timeframe in store

**Files:** `src/lib/store.ts`

- [ ] **Step 1: Add timeframe to store**

```typescript
export type Timeframe = "1d" | "3d" | "7d" | "30d";

interface AppState {
  provider: Provider;
  setProvider: (p: Provider) => void;
  timeframe: Timeframe;
  setTimeframe: (t: Timeframe) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      provider: "claude",
      setProvider: (p) => set({ provider: p }),
      timeframe: "30d",
      setTimeframe: (t) => set({ timeframe: t }),
    }),
    {
      name: "ai-pulse-store",
      partialize: (state) => ({ provider: state.provider, timeframe: state.timeframe }),
    }
  )
);
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat(store): add persisted timeframe selection"
```

---

### E-3: Update TypeScript fetch to pass days

**Files:** `src/lib/claudeUsage.ts`

- [ ] **Step 1: Accept timeframe in fetch function**

```typescript
const TIMEFRAME_DAYS: Record<string, number> = {
  "1d": 1, "3d": 3, "7d": 7, "30d": 30,
};

export async function fetchClaudeStats(timeframe = "30d"): Promise<ClaudeUsageResult> {
  const days = TIMEFRAME_DAYS[timeframe] ?? 30;
  const raw = await invoke<RawClaudeStats>("get_claude_stats", { days });
  // ... rest unchanged
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit 2>&1
git add src/lib/claudeUsage.ts
git commit -m "feat(ts): pass days param to get_claude_stats based on timeframe"
```

---

### E-4: Add timeframe selector UI to Dashboard

**Files:** `src/components/Dashboard.tsx`

- [ ] **Step 1: Read timeframe from store**

```typescript
const timeframe = useAppStore((s) => s.timeframe);
const setTimeframe = useAppStore((s) => s.setTimeframe);
```

- [ ] **Step 2: Pass timeframe to fetchClaudeStats calls**

In the `useEffect` and `handleRefresh`, change:

```typescript
fetchClaudeStats()
```

to:

```typescript
fetchClaudeStats(timeframe)
```

Also add `timeframe` to the `useEffect` dependency array.

- [ ] **Step 3: Add the selector UI in the header**

After the existing provider selector row, add a second row inside the header `<div className="shrink-0 ...">`:

```tsx
<div className="px-3 sm:px-4 pb-2 flex items-center gap-2">
  {(["1d", "3d", "7d", "30d"] as const).map((t) => (
    <button
      key={t}
      onClick={() => setTimeframe(t)}
      className={cn(
        "px-2 py-0.5 text-[10px] uppercase font-bold rounded transition-all",
        timeframe === t
          ? "bg-[#003566]"
          : "text-gray-500 hover:text-gray-300"
      )}
      style={timeframe === t ? { color: providerData.themeColor } : {}}
    >
      {t}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1
```

- [ ] **Step 5: Commit and PR**

```bash
git add src/components/Dashboard.tsx src/lib/claudeUsage.ts src/lib/store.ts src-tauri/src/lib.rs
git commit -m "feat(ux): timeframe dropdown — filter chart to 1d/3d/7d/30d"
gh pr create --base main --head feat/timeframe \
  --title "feat(ux): timeframe dropdown for token chart" \
  --body "Adds 1d/3d/7d/30d filter buttons. Selection persisted in Zustand. Passed to Rust command which slices daily_usage accordingly. Chart and stats update immediately on selection."
```

---

## Stream F: Settings Modal (Wave 2)

> **Prerequisite:** `feat/zustand-store` merged to main.

**Branch:** `feat/settings-modal`  
**Files modified:**
- Create: `src/components/SettingsModal.tsx`
- Modify: `src/lib/store.ts` — add settings open/close state
- Modify: `src/components/Dashboard.tsx` — wire gear icon to open modal

### F-1: Add settings state to store

**Files:** `src/lib/store.ts`

- [ ] **Step 1: Add isSettingsOpen**

```typescript
interface AppState {
  provider: Provider;
  setProvider: (p: Provider) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      provider: "claude",
      setProvider: (p) => set({ provider: p }),
      isSettingsOpen: false,
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
    }),
    {
      name: "ai-pulse-store",
      partialize: (state) => ({ provider: state.provider }),
    }
  )
);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat(store): add settings open/close state"
```

---

### F-2: Build SettingsModal component

**Files:** `src/components/SettingsModal.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/SettingsModal.tsx`:

```tsx
import { motion, AnimatePresence } from "framer-motion";
import { X, Key, Bell, Palette, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type SettingsTab = "api-keys" | "budget" | "appearance" | "storage";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor: string;
}

export function SettingsModal({ isOpen, onClose, themeColor }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("api-keys");

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "budget", label: "Budget", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "storage", label: "Storage", icon: Trash2 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-50 bg-[#000814]/95 backdrop-blur-sm rounded-2xl flex flex-col"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-4 border-b border-[#003566]">
            <h2 className="text-sm font-semibold tracking-wide" style={{ color: themeColor }}>
              Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab nav */}
          <div className="shrink-0 flex gap-1 px-4 pt-3">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg transition-all",
                  activeTab === id
                    ? "bg-[#003566]"
                    : "text-gray-500 hover:text-gray-300"
                )}
                style={activeTab === id ? { color: themeColor } : {}}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {activeTab === "api-keys" && (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-400">
                  Claude Code reads data locally — no API key needed. Keys are required for Codex and Gemini (coming soon).
                </p>
                {(["OpenAI", "Google"] as const).map((provider) => (
                  <div key={provider}>
                    <label className="text-[10px] uppercase text-gray-400 tracking-wider block mb-1">
                      {provider} API Key
                    </label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      disabled
                      className="w-full bg-[#001d3d]/40 border border-[#003566]/50 rounded-lg px-3 py-2 text-xs text-gray-500 font-mono cursor-not-allowed"
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === "budget" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase text-gray-400 tracking-wider block mb-1">
                    Monthly Budget (USD)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    disabled
                    className="w-full bg-[#001d3d]/40 border border-[#003566]/50 rounded-lg px-3 py-2 text-xs text-gray-500 font-mono cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-gray-500">Budget alerts coming in a future release.</p>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-400">Theme customization coming in a future release.</p>
              </div>
            )}

            {activeTab === "storage" && (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  AI Pulse reads data directly from local AI assistant files — it stores no data of its own except your settings preferences.
                </p>
                <button
                  onClick={() => { localStorage.clear(); onClose(); }}
                  className="w-full px-3 py-2 text-xs font-medium bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors border border-red-900/50"
                >
                  Clear Saved Preferences
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsModal.tsx
git commit -m "feat(ui): add SettingsModal component with API keys, budget, appearance, storage tabs"
```

---

### F-3: Wire gear icon in Dashboard

**Files:** `src/components/Dashboard.tsx`

- [ ] **Step 1: Import SettingsModal and store actions**

```typescript
import { SettingsModal } from "./SettingsModal";
import { useAppStore } from "@/lib/store";
// Add to existing lucide imports:
import { Settings } from "lucide-react";
```

- [ ] **Step 2: Read store state**

In `Dashboard()`:

```typescript
const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);
const openSettings = useAppStore((s) => s.openSettings);
const closeSettings = useAppStore((s) => s.closeSettings);
```

- [ ] **Step 3: Add gear button to header**

In the header actions row, alongside the `RefreshCw` icon:

```tsx
<Settings
  className="w-3 h-3 hover:text-white cursor-pointer transition-all"
  onClick={openSettings}
/>
```

- [ ] **Step 4: Render SettingsModal inside the root motion.div (absolute overlay)**

Just before the closing `</motion.div>` of the Dashboard:

```tsx
<SettingsModal
  isOpen={isSettingsOpen}
  onClose={closeSettings}
  themeColor={providerData.themeColor}
/>
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1
```

- [ ] **Step 6: Commit and PR**

```bash
git add src/components/Dashboard.tsx src/components/SettingsModal.tsx src/lib/store.ts
git commit -m "feat(ux): wire Settings modal via gear icon in Dashboard header"
gh pr create --base main --head feat/settings-modal \
  --title "feat(ux): Settings Modal with API keys, budget, appearance, storage tabs" \
  --body "Adds Settings overlay modal accessible from the gear icon in the Dashboard header. Four tabs: API Keys (placeholder for future Codex/Gemini keys), Budget alerts (placeholder), Appearance (placeholder), Storage (clear preferences). Opened/closed via Zustand store."
```

---

## Stream G: CSV Export (Wave 2)

**Branch:** `feat/csv-export`  
**Files modified:**
- Create: `src/lib/exportCsv.ts`
- Modify: `src/components/DetailedReport.tsx` — wire Export CSV button

### G-1: Build CSV utility

**Files:** `src/lib/exportCsv.ts`

- [ ] **Step 1: Create utility**

Create `src/lib/exportCsv.ts`:

```typescript
import type { UsageData } from "./data";
import type { ModelDetail } from "./claudeUsage";

function toCsvRow(cells: (string | number)[]): string {
  return cells
    .map((c) => (typeof c === "string" && c.includes(",") ? `"${c}"` : String(c)))
    .join(",");
}

export function exportUsageCsv(
  usageData: UsageData[],
  modelDetails: ModelDetail[],
  provider: string
): void {
  const lines: string[] = [];

  lines.push(`AI Pulse Export — ${provider} — ${new Date().toISOString()}`);
  lines.push("");

  lines.push("Daily Usage");
  lines.push(toCsvRow(["Date", "Input Tokens", "Output Tokens", "Cache Tokens"]));
  for (const row of usageData) {
    lines.push(toCsvRow([row.date, row.inputTokens, row.outputTokens, row.cacheTokens]));
  }

  if (modelDetails.length > 0) {
    lines.push("");
    lines.push("Model Breakdown");
    lines.push(toCsvRow(["Model", "Input Tokens", "Output Tokens", "Cache Tokens", "Total Tokens", "Cost USD"]));
    for (const m of modelDetails) {
      lines.push(toCsvRow([m.name, m.inputTokens, m.outputTokens, m.cacheTokens, m.totalTokens, m.costUsd.toFixed(6)]));
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-pulse-${provider}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/exportCsv.ts
git commit -m "feat(lib): add exportUsageCsv utility"
```

---

### G-2: Wire Export CSV button in DetailedReport

**Files:** `src/components/DetailedReport.tsx`

- [ ] **Step 1: Import the utility**

```typescript
import { exportUsageCsv } from "@/lib/exportCsv";
```

- [ ] **Step 2: Wire the button**

Find the Export CSV button (currently a no-op). Replace:

```tsx
<button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-[#003566] hover:bg-[#004b91] text-white rounded-lg transition-colors">
  <Download className="w-3.5 h-3.5" /> Export CSV
</button>
```

with:

```tsx
<button
  onClick={() => exportUsageCsv(liveUsageData, liveModelDetails, providerData.name)}
  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-[#003566] hover:bg-[#004b91] text-white rounded-lg transition-colors"
>
  <Download className="w-3.5 h-3.5" /> Export CSV
</button>
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1
```

- [ ] **Step 4: Commit and PR**

```bash
git add src/components/DetailedReport.tsx src/lib/exportCsv.ts
git commit -m "feat(ux): wire Export CSV button in DetailedReport"
gh pr create --base main --head feat/csv-export \
  --title "feat(ux): CSV export in Detailed Report" \
  --body "Implements the Export CSV button. Downloads a .csv with daily usage and per-model breakdown. Works for all providers — Claude gets real data, Codex/Gemini get mock data until their pipelines are built."
```

---

## Execution Instructions for Parallel Dispatch

When dispatching agents, create a git worktree per stream:

```bash
# Wave 1 — run these three simultaneously
git worktree add ../ai-pulse-cost-trend -b feat/cost-trend
git worktree add ../ai-pulse-zustand -b feat/zustand-store
git worktree add ../ai-pulse-vibrancy -b feat/vibrancy

# Each agent gets:
# - Its worktree path as working directory
# - The stream section above as its implementation spec
# - Instruction to open a PR when done and tag @greptile-apps
```

After Wave 1 PRs are reviewed and merged, run Wave 2:

```bash
git worktree add ../ai-pulse-watcher -b feat/file-watcher
git worktree add ../ai-pulse-timeframe -b feat/timeframe
git worktree add ../ai-pulse-settings -b feat/settings-modal
git worktree add ../ai-pulse-csv -b feat/csv-export
```

Each agent should:
1. Execute every step in its stream section
2. Run `npx tsc --noEmit` and `cargo build` before each commit
3. Open a PR with `@greptile-apps` tagged per CLAUDE.md
4. Report back with the PR URL when done

---

## Definition of Done

- [ ] All 7 stream PRs merged to main
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml -- -W clippy::all -W clippy::pedantic -D warnings` passes
- [ ] `npm run tauri dev` shows: real cost in header, trend %, projected cost, live refresh on file change, timeframe buttons, settings modal, CSV export, native vibrancy
