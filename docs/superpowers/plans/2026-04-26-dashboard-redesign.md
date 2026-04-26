# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the header layout for visual clarity, replace the Models tab cost column with token usage bars, and replace the ratio-based chart data with real per-day token counts from Claude session JSONL files.

**Architecture:** All three changes are independent. Tasks 1 and 2 are pure frontend edits to `Dashboard.tsx`. Task 3 extends the Rust IPC command with a new JSONL scanning function; the frontend receives the same response shape so no type changes are needed there.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Rust (Tauri IPC), serde_json

---

## File Map

| File | Change |
|---|---|
| `src/components/Dashboard.tsx` | Header JSX (lines 277–351) + Models tab JSX (lines 515–531) |
| `src-tauri/src/lib.rs` | New `claude_projects_path()`, `SessionLine`, `SessionUsage` structs, `aggregate_claude_sessions()` fn; update `get_claude_stats()` |

---

## Task 1: Header — Brand + Inline Provider Selector

**Files:**
- Modify: `src/components/Dashboard.tsx:1` (imports), `src/components/Dashboard.tsx:277-351` (header JSX)

### Goal
Replace the `<select>` that contains "AI PULSE" as an option with two distinct elements:
- **Row 1:** Static "AI PULSE" brand text | vertical divider | compact inline provider selector | cost | ⚙ | ↻
- **Row 2:** "RANGE" label + timeframe pills (existing pills, unchanged)

---

- [ ] **Step 1: Add `ChevronDown` to the lucide-react import**

In `src/components/Dashboard.tsx` line 15, change:

```tsx
import { Box, Layers, Zap, TrendingUp, DollarSign, RefreshCw, Code2, Sparkles, Settings } from "lucide-react";
```

to:

```tsx
import { Box, Layers, Zap, TrendingUp, DollarSign, RefreshCw, Code2, Sparkles, Settings, ChevronDown } from "lucide-react";
```

- [ ] **Step 2: Replace the header JSX**

Find and replace the entire header block (the `<div className="shrink-0 bg-[#001d3d]/50 border-b border-[#003566] flex flex-col">` block and everything inside it up to but not including the budget warning `<div>`).

Replace:

```tsx
        <div className="shrink-0 bg-[#001d3d]/50 border-b border-[#003566] flex flex-col">
          <div className="p-3 sm:p-4 pb-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ProviderIcon className="w-4 h-4" style={{ color: providerData.themeColor }} />
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="bg-transparent text-xs sm:text-sm font-semibold tracking-wide uppercase outline-none cursor-pointer appearance-none"
                style={{ color: providerData.themeColor }}
              >
                <option value="claude">AI Pulse</option>
                <option value="codex">OpenAI Codex</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
                <AnimatePresence mode="wait">
                  {error ? (
                    <motion.span
                      key="error"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-[10px] sm:text-xs text-red-400 font-mono"
                    >
                      {error}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="cost"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-[10px] sm:text-xs text-gray-400 font-mono"
                    >
                      {getCostLabel()}
                    </motion.span>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-2 text-gray-400">
                    {/* Issue 6: interactive element must be a <button> */}
                    <button
                      onClick={openSettings}
                      aria-label="Open settings"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                    <RefreshCw
                      className={cn(
                        "w-3 h-3 hover:text-white cursor-pointer transition-all",
                        isRefreshing && "animate-spin text-[#ffd60a]"
                      )}
                      onClick={handleRefresh}
                    />
                </div>
            </div>
          </div>
          {isRealDataProvider && (
            <div className="px-3 sm:px-4 pb-2 flex items-center gap-1">
              {ALL_TIMEFRAMES.map((t) => (
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
          )}
        </div>
```

With:

```tsx
        <div className="shrink-0 bg-[#001d3d]/50 border-b border-[#003566] flex flex-col">
          {/* Row 1: Brand + provider selector + actions */}
          <div className="px-3 sm:px-4 pt-3 pb-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {/* Brand */}
              <ProviderIcon className="w-4 h-4" style={{ color: providerData.themeColor }} />
              <span
                className="text-xs font-extrabold tracking-widest uppercase"
                style={{ color: providerData.themeColor }}
              >
                AI Pulse
              </span>
              {/* Divider */}
              <div className="w-px h-3.5 bg-[#003566] mx-1" />
              {/* Inline provider selector */}
              <div className="relative flex items-center gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: providerData.themeColor }}
                />
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as Provider)}
                  className="bg-transparent text-[10px] font-semibold tracking-wide uppercase outline-none cursor-pointer appearance-none pr-4 text-gray-400 hover:text-white transition-colors"
                >
                  <option value="claude">Claude</option>
                  <option value="codex">Codex</option>
                  <option value="gemini">Gemini</option>
                </select>
                <ChevronDown className="w-2.5 h-2.5 text-gray-500 absolute right-0 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {error ? (
                  <motion.span
                    key="error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-[10px] sm:text-xs text-red-400 font-mono"
                  >
                    {error}
                  </motion.span>
                ) : (
                  <motion.span
                    key="cost"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-[10px] sm:text-xs text-gray-400 font-mono"
                  >
                    {getCostLabel()}
                  </motion.span>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-2 text-gray-400">
                <button
                  onClick={openSettings}
                  aria-label="Open settings"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Settings className="w-3 h-3" />
                </button>
                <RefreshCw
                  className={cn(
                    "w-3 h-3 hover:text-white cursor-pointer transition-all",
                    isRefreshing && "animate-spin text-[#ffd60a]"
                  )}
                  onClick={handleRefresh}
                />
              </div>
            </div>
          </div>
          {/* Row 2: Timeframe range filter */}
          {isRealDataProvider && (
            <div className="px-3 sm:px-4 pb-2 flex items-center gap-2">
              <span className="text-[8px] uppercase tracking-widest text-gray-500 font-semibold">
                Range
              </span>
              <div className="flex-1" />
              {ALL_TIMEFRAMES.map((t) => (
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
          )}
        </div>
```

- [ ] **Step 3: Verify the app renders without errors**

Check the Vite dev server terminal — no TypeScript errors should appear. The header should show "AI PULSE" prominently, a divider, then "Claude ▾" in a secondary style, then cost/icons on the right. Row 2 should show "RANGE" label left-aligned and the timeframe pills right-aligned.

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat(ux): redesign header - prominent brand + inline provider selector"
```

---

## Task 2: Models Tab — Token Usage Bars

**Files:**
- Modify: `src/components/Dashboard.tsx:515-531` (Models tab render block)

### Goal
Replace the cost column (`$X.XX` / `—`) with a proportional token usage bar and a formatted token count. The bar width = `model.tokens / totalTokens * 100%`.

---

- [ ] **Step 1: Replace the Models tab item render**

Find this block in `src/components/Dashboard.tsx` (inside the `key="models"` motion.div):

```tsx
                    {displayModelUsage.map((model) => (
                      <div key={model.name} className="flex justify-between items-center text-[10px] sm:text-xs group cursor-pointer p-1.5 sm:p-2 hover:bg-[#001d3d]/50 rounded-lg transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#003566] transition-colors" style={{ backgroundColor: providerData.themeColor }} />
                          <span className="text-gray-300 group-hover:text-white transition-colors">
                            {model.name}
                          </span>
                        </div>
                        <span className="font-mono opacity-80 group-hover:opacity-100" style={{ color: providerData.themeColor }}>
                          {model.cost === 0 ? "—" : `$${model.cost.toFixed(2)}`}
                        </span>
                      </div>
                    ))}
```

Replace with:

```tsx
                    {(() => {
                      const totalTokens = displayModelUsage.reduce((sum, m) => sum + m.tokens, 0);
                      return displayModelUsage.map((model) => {
                        const barPct = totalTokens > 0 ? (model.tokens / totalTokens) * 100 : 0;
                        const tokenLabel = model.tokens >= 1_000_000
                          ? `${(model.tokens / 1_000_000).toFixed(1)}M`
                          : model.tokens >= 1_000
                          ? `${Math.round(model.tokens / 1_000)}k`
                          : String(model.tokens);
                        return (
                          <div key={model.name} className="flex flex-col gap-1 p-1.5 sm:p-2 hover:bg-[#001d3d]/50 rounded-lg transition-colors cursor-pointer group">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: providerData.themeColor }} />
                                <span className="text-gray-300 group-hover:text-white transition-colors">{model.name}</span>
                              </div>
                              <span className="text-[9px] font-mono text-gray-500 group-hover:text-gray-300 transition-colors">{tokenLabel}</span>
                            </div>
                            <div className="h-[3px] bg-[#001d3d] rounded-full overflow-hidden ml-3.5">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${barPct}%`, backgroundColor: providerData.themeColor, opacity: 0.65 }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
```

- [ ] **Step 2: Verify models tab renders usage bars**

Open the app, click the Models tab. Each model row should show:
- Model name on the left
- Token count (formatted as `123k` / `1.2M`) on the right
- A thin bar below the name, filling proportionally to that model's share of total tokens

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat(ux): models tab - replace cost with token usage bars"
```

---

## Task 3: Chart Data — JSONL Token Parsing

**Files:**
- Modify: `src-tauri/src/lib.rs`

### Goal
Replace the cumulative-ratio approach with real per-day token counts read directly from `~/.claude/projects/**/*.jsonl` session files. Each line in those files is a JSON object; assistant messages have a top-level `usage` field with `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`.

JSONL line structure (relevant fields only):
```json
{
  "type": "assistant",
  "timestamp": "2026-04-18T20:11:33.757Z",
  "usage": {
    "input_tokens": 3,
    "output_tokens": 132,
    "cache_read_input_tokens": 0,
    "cache_creation_input_tokens": 22043
  }
}
```

---

- [ ] **Step 1: Add `claude_projects_path` helper after `claude_stats_path`**

In `src-tauri/src/lib.rs`, immediately after the closing `}` of `fn claude_stats_path()`, add:

```rust
/// Returns the path to `~/.claude/projects/`, or `None` if `$HOME` is unset.
fn claude_projects_path() -> Option<std::path::PathBuf> {
    std::env::var("HOME").ok().map(|home| {
        std::path::PathBuf::from(home).join(".claude").join("projects")
    })
}
```

- [ ] **Step 2: Add JSONL parsing structs**

After the closing `}` of the `codex_sessions_path` function (before the `// ── Stats-cache data types` comment), add:

```rust
// ── Claude session JSONL types ────────────────────────────────────────────────

/// One line from a Claude session `.jsonl` file. Only fields needed for
/// token aggregation are deserialized; everything else is ignored.
#[derive(serde::Deserialize)]
struct SessionLine {
    #[serde(rename = "type")]
    kind: String,
    timestamp: Option<String>,
    usage: Option<SessionUsage>,
}

#[derive(serde::Deserialize)]
struct SessionUsage {
    #[serde(default)]
    input_tokens: u64,
    #[serde(default)]
    output_tokens: u64,
    #[serde(default)]
    cache_read_input_tokens: u64,
    #[serde(default)]
    cache_creation_input_tokens: u64,
}
```

- [ ] **Step 3: Add `aggregate_claude_sessions` function**

After the `SessionUsage` struct closing `}`, add:

```rust
/// Scans `~/.claude/projects/**/*.jsonl` for assistant messages within the
/// last `days` calendar days and returns per-day token sums keyed by
/// ISO date (`"YYYY-MM-DD"`). Tuple is `(input, output, cache)`.
///
/// Files are pre-filtered by `mtime` so only recent session files are opened.
fn aggregate_claude_sessions(days: u32) -> HashMap<String, (u64, u64, u64)> {
    let mut daily: HashMap<String, (u64, u64, u64)> = HashMap::new();

    let projects_root = match claude_projects_path() {
        Some(p) => p,
        None => return daily,
    };

    let cutoff = std::time::SystemTime::now()
        .checked_sub(Duration::from_secs(u64::from(days) * 86_400))
        .unwrap_or(std::time::UNIX_EPOCH);

    let project_dirs = match std::fs::read_dir(&projects_root) {
        Ok(d) => d,
        Err(_) => return daily,
    };

    for proj_entry in project_dirs.flatten() {
        let proj_path = proj_entry.path();
        if !proj_path.is_dir() {
            continue;
        }

        let session_files = match std::fs::read_dir(&proj_path) {
            Ok(d) => d,
            Err(_) => continue,
        };

        for file_entry in session_files.flatten() {
            let file_path = file_entry.path();
            let fname = file_path
                .file_name()
                .and_then(|f| f.to_str())
                .unwrap_or("");
            if !fname.ends_with(".jsonl") {
                continue;
            }

            // Skip files not modified within the window.
            if let Ok(meta) = file_path.metadata() {
                if let Ok(mtime) = meta.modified() {
                    if mtime < cutoff {
                        continue;
                    }
                }
            }

            let content = match std::fs::read_to_string(&file_path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            for line in content.lines() {
                if line.is_empty() {
                    continue;
                }
                let msg: SessionLine = match serde_json::from_str(line) {
                    Ok(m) => m,
                    Err(_) => continue,
                };
                if msg.kind != "assistant" {
                    continue;
                }
                let usage = match msg.usage {
                    Some(u) => u,
                    None => continue,
                };
                let ts = match msg.timestamp {
                    Some(t) => t,
                    None => continue,
                };
                // ISO timestamp: "2026-04-18T20:11:33.757Z" → take first 10 chars
                let date = ts.get(..10).unwrap_or("").to_string();
                if date.is_empty() {
                    continue;
                }
                let entry = daily.entry(date).or_insert((0, 0, 0));
                entry.0 += usage.input_tokens;
                entry.1 += usage.output_tokens;
                entry.2 += usage.cache_read_input_tokens + usage.cache_creation_input_tokens;
            }
        }
    }

    daily
}
```

- [ ] **Step 4: Update `get_claude_stats` to use JSONL data**

Inside `fn get_claude_stats`, find the line:

```rust
    let mut daily = cache.daily_model_tokens;
    daily.sort_by(|a, b| a.date.cmp(&b.date));
    let mut entries: Vec<DailyUsage> = daily
        .iter()
        .map(|day| {
            let total: u64 = day.tokens_by_model.values().sum();
            let (inp, out, cac) = if cum_total > 0 {
                #[allow(clippy::cast_possible_truncation)] // result ≤ total ≤ u64::MAX by construction
                let inp = (u128::from(total) * u128::from(cum_input) / u128::from(cum_total)) as u64;
                #[allow(clippy::cast_possible_truncation)] // result ≤ total ≤ u64::MAX by construction
                let out = (u128::from(total) * u128::from(cum_output) / u128::from(cum_total)) as u64;
                let cac = total - inp - out;
                (inp, out, cac)
            } else {
                (total, 0, 0)
            };
            DailyUsage {
                date: format_date_label(&day.date),
                input_tokens: inp,
                output_tokens: out,
                cache_tokens: cac,
            }
        })
        .collect();
```

Replace with:

```rust
    // Aggregate real per-type token counts from session JSONL files.
    // Falls back to the cumulative-ratio estimate for days missing from JSONL.
    let session_data = aggregate_claude_sessions(days.unwrap_or(30));

    let mut daily = cache.daily_model_tokens;
    daily.sort_by(|a, b| a.date.cmp(&b.date));
    let mut entries: Vec<DailyUsage> = daily
        .iter()
        .map(|day| {
            let (inp, out, cac) = if let Some(&(i, o, c)) = session_data.get(&day.date) {
                (i, o, c)
            } else {
                // Fallback: split day total using cumulative model-usage ratios.
                let total: u64 = day.tokens_by_model.values().sum();
                if cum_total > 0 {
                    #[allow(clippy::cast_possible_truncation)]
                    let inp = (u128::from(total) * u128::from(cum_input) / u128::from(cum_total)) as u64;
                    #[allow(clippy::cast_possible_truncation)]
                    let out = (u128::from(total) * u128::from(cum_output) / u128::from(cum_total)) as u64;
                    let cac = total.saturating_sub(inp + out);
                    (inp, out, cac)
                } else {
                    (total, 0, 0)
                }
            };
            DailyUsage {
                date: format_date_label(&day.date),
                input_tokens: inp,
                output_tokens: out,
                cache_tokens: cac,
            }
        })
        .collect();
```

- [ ] **Step 5: Add a unit test for `aggregate_claude_sessions`**

At the bottom of `src-tauri/src/lib.rs` (inside the existing `#[cfg(test)] mod tests { }` block if one exists, otherwise add a new one), add:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aggregate_claude_sessions_returns_empty_for_missing_dir() {
        // Set HOME to a temp dir with no .claude/projects directory.
        // aggregate_claude_sessions should return an empty map, not panic.
        std::env::set_var("HOME", "/tmp/nonexistent-ai-pulse-test-home");
        let result = aggregate_claude_sessions(7);
        assert!(result.is_empty());
    }
}
```

- [ ] **Step 6: Build and verify Rust compiles cleanly**

```bash
cd src-tauri && cargo build 2>&1 | tail -20
```

Expected: `Finished dev profile` with no errors. Warnings about unused variables are acceptable if they pre-existed.

- [ ] **Step 7: Run the unit test**

```bash
cd src-tauri && cargo test 2>&1
```

Expected output includes:
```
test tests::aggregate_claude_sessions_returns_empty_for_missing_dir ... ok
```

- [ ] **Step 8: Commit**

```bash
cd ..
git add src-tauri/src/lib.rs
git commit -m "feat(data): parse claude session JSONL for real per-day input/output/cache tokens"
```

---

## Task 4: Smoke Test End-to-End

- [ ] **Step 1: Restart the Tauri dev app**

Kill any running instance and restart:

```bash
pkill -f "ai-pulse"; npm run tauri dev > /tmp/tauri-dev.log 2>&1 &
```

Wait ~30 seconds for Rust compile + app launch.

- [ ] **Step 2: Verify header**

Click the menu bar icon. Confirm:
- "AI PULSE" text is prominent (bold, theme-colored)
- A thin vertical divider separates it from "Claude ▾"
- "Claude" dropdown is visually secondary (smaller, gray)
- Row 2 shows "RANGE" on the left and `1D 3D 7D 30D` pills on the right

- [ ] **Step 3: Verify Models tab**

Click MODELS tab. Each row should show model name + token count + a proportional bar. The widest bar = the model with the most tokens.

- [ ] **Step 4: Verify chart series**

Select the 30D range. The chart should now show three visible areas: input (dark blue), cache (darker blue), output (yellow). Cache will dominate given the real data ratios but all three should be non-zero.

- [ ] **Step 5: Final commit if any fixup needed, then push branch**

```bash
git push -u origin feat/dashboard-redesign
```
