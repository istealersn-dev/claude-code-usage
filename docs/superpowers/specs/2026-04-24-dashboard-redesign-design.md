# Dashboard Redesign — Design Spec
Date: 2026-04-24

## Overview

Three targeted improvements to the AI Pulse dashboard:
1. Header/title bar redesign for clearer visual hierarchy
2. Models tab showing token usage bars instead of bare names
3. Chart data fix: pull real input/output/cache token counts from Claude session JSONL files

---

## 1. Header Redesign

### Current state
- Row 1: provider icon + `<select>` dropdown (labeled "AI PULSE") + cost + ⚙ + ↻
- Row 2: 1D / 3D / 7D / 30D timeframe pills
- "AI PULSE" is embedded inside a `<select>` element — not visually prominent

### Target state

**Row 1 — Brand + provider + actions**
- ⚡ icon (theme color)
- "AI PULSE" text: bold, uppercase, letter-spacing, theme color — rendered as a static `<span>`, not inside a dropdown
- Vertical divider (muted, `#003566`)
- Provider selector: dot (provider color) + provider name + ▼ arrow — styled as a lightweight inline element, visually secondary to the brand. Still backed by a native `<select>` for accessibility; the visible element is an overlay triggering it.
- Spacer
- Lifetime cost label (muted teal)
- ⚙ settings icon
- ↻ refresh icon

**Row 2 — Timeframe**
- "RANGE" label (muted, uppercase, 8px)
- Spacer
- 1D / 3D / 7D / 30D pill group (existing style, unchanged)
- Row hidden for providers without real data (Gemini)

### Files affected
- `src/components/Dashboard.tsx` — header JSX (lines ~275–352)

---

## 2. Models Tab — Usage Bars

### Current state
Each model row shows: name (left) + cost in USD (right, "—" when $0).
Cost data is unreliable since `stats-cache.json` doesn't track per-model cost precisely.

### Target state
Each model row shows:
- Model name (left, existing style)
- Horizontal usage bar: fills proportionally to that model's share of **total tokens** across all models. Styled with provider theme color, rounded, thin (~4px height), placed below the model name or inline to the right.
- Token count (right, muted, formatted as "123k") 
- No cost column

### Data source
`realModelUsage` (Claude) and `realCodexModelUsage` (Codex) already contain `{ name, tokens, cost }`. The bar width is `(model.tokens / totalTokens) * 100%`. Total is summed from all entries in the array.

### Files affected
- `src/components/Dashboard.tsx` — Models tab render block (lines ~510–531)

---

## 3. Chart Data Fix — JSONL Token Parsing

### Current state
`get_claude_stats` reads `~/.claude/stats-cache.json`, which contains `dailyActivity` with `messageCount`, `sessionCount`, `toolCallCount` — but **no per-token-type breakdown**. As a result, `inputTokens` and `cacheTokens` passed to the chart are always 0; only `outputTokens` renders.

### Target state
The Rust command scans raw Claude session JSONL files and aggregates real token counts by day and type:
- `inputTokens` — from `usage.inputTokens` per message
- `outputTokens` — from `usage.outputTokens` per message  
- `cacheTokens` — from `usage.cacheReadInputTokens + usage.cacheCreationInputTokens` per message

### Implementation approach

**File location:** `~/.claude/projects/*/sessions/*.jsonl` (one file per session)

**JSONL structure per line (relevant fields):**
```json
{
  "type": "assistant",
  "message": {
    "usage": {
      "input_tokens": 1234,
      "output_tokens": 456,
      "cache_read_input_tokens": 789,
      "cache_creation_input_tokens": 100
    }
  },
  "timestamp": "2026-04-01T10:00:00Z"
}
```

**Aggregation:** Group by `timestamp.date()`, sum all four token fields per day. Only process files whose last-modified date falls within the requested `days` window to avoid scanning the full history on every call.

**Return shape:** Extend the existing `DailyUsage` struct in `lib.rs` to include `input_tokens`, `output_tokens`, `cache_tokens` fields (replacing the current zeros). The frontend `UsageData` type already has these fields — no frontend type changes needed.

**Performance:** Files are filtered by mtime before parsing. For the 30-day max window, this touches only recent session files. Parsing is synchronous on the Tauri command thread (acceptable for this use case).

**Fallback:** If the sessions directory doesn't exist or no files are found for the window, return zeros as today (no regression).

### Files affected
- `src-tauri/src/lib.rs` — `get_claude_stats` command, `DailyUsage` struct
- No frontend changes needed (types already correct)

---

## Out of scope
- Projects tab per-project breakdown (data not available in Claude session files)
- Codex JSONL parsing (separate file format, separate task)
- Gemini token breakdown (mock data only)
