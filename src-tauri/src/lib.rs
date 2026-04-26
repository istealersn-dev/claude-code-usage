#![warn(clippy::all, clippy::pedantic, missing_docs)]
#![allow(
    clippy::too_many_lines,    // run() is a single Tauri builder chain — splitting would reduce clarity
    clippy::missing_panics_doc // run() panics only on fatal app initialisation errors
)]
//! AI Pulse — macOS menubar app for tracking Claude Code token usage.
//!
//! The Rust side has two responsibilities:
//! 1. **Tray + window management** — show/hide the transparent popup on tray click,
//!    position it below the tray icon, auto-hide on focus loss.
//! 2. **IPC command** ([`get_claude_stats`]) — read `~/.claude/stats-cache.json`
//!    and return structured usage data to the React frontend.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use notify::{Config as NotifyConfig, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{Emitter, Manager, tray::TrayIconBuilder, menu::{Menu, MenuItem}};

/// Width of the menubar popup window in logical pixels — must match `tauri.conf.json`.
const WIN_WIDTH_PX: f64 = 440.0;

/// How long after `show()` to ignore focus-lost events (ms).
/// macOS fires a spurious Focused(false) during the tray-click sequence
/// before focus fully settles on the webview.
const FOCUS_SETTLE_MS: u128 = 800;

/// Debounce window for coalescing burst writes from the Claude CLI to
/// `stats-cache.json` before emitting a single `claude-stats-updated` event.
const STATS_WATCHER_DEBOUNCE_MS: u64 = 500;

/// System-wide keyboard shortcut that toggles the main popup from any app.
const GLOBAL_SHORTCUT: &str = "CmdOrCtrl+Shift+A";

/// Returns the path to `~/.claude/stats-cache.json`, or `None` if `$HOME`
/// is unset. Used by both the IPC command and the file-watcher task.
fn claude_stats_path() -> Option<std::path::PathBuf> {
    std::env::var("HOME").ok().map(|home| {
        std::path::PathBuf::from(home)
            .join(".claude")
            .join("stats-cache.json")
    })
}

/// Returns the path to `~/.claude/projects/`, or `None` if `$HOME` is unset.
fn claude_projects_path() -> Option<std::path::PathBuf> {
    std::env::var("HOME").ok().map(|home| {
        std::path::PathBuf::from(home).join(".claude").join("projects")
    })
}

/// Returns the path to the Codex sessions directory.
///
/// Uses `$CODEX_HOME/sessions` when `CODEX_HOME` is set, otherwise falls back
/// to `~/.codex/sessions`. Returns `None` only if neither `CODEX_HOME` nor
/// `HOME` is set.
fn codex_sessions_path() -> Option<std::path::PathBuf> {
    if let Ok(codex_home) = std::env::var("CODEX_HOME") {
        return Some(std::path::PathBuf::from(codex_home).join("sessions"));
    }
    std::env::var("HOME").ok().map(|home| {
        std::path::PathBuf::from(home)
            .join(".codex")
            .join("sessions")
    })
}

// ── Claude session JSONL types ────────────────────────────────────────────────

/// One line from a Claude session `.jsonl` file. Only fields needed for
/// token aggregation are deserialized; everything else is ignored.
///
/// Two formats exist in the wild:
/// - Older: `usage` at the top level alongside `type` and `timestamp`
/// - Newer: `usage` nested under a `message` object
#[derive(serde::Deserialize)]
struct SessionLine {
    #[serde(rename = "type")]
    kind: String,
    timestamp: Option<String>,
    /// Older format — usage at the top level.
    usage: Option<SessionUsage>,
    /// Newer format — usage nested under `message`.
    message: Option<SessionMessage>,
}

#[derive(serde::Deserialize)]
struct SessionMessage {
    usage: Option<SessionUsage>,
}

#[allow(clippy::struct_field_names)]
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

/// Scans `~/.claude/projects/**/*.jsonl` for assistant messages within the
/// last `days` calendar days and returns per-day token sums keyed by
/// ISO date (`"YYYY-MM-DD"`). Tuple is `(input, output, cache)`.
///
/// Files are pre-filtered by `mtime` so only recent session files are opened.
fn aggregate_claude_sessions(days: u32) -> HashMap<String, (u64, u64, u64)> {
    let Some(root) = claude_projects_path() else { return HashMap::new(); };
    aggregate_claude_sessions_at(&root, days)
}

fn aggregate_claude_sessions_at(projects_root: &std::path::Path, days: u32) -> HashMap<String, (u64, u64, u64)> {
    let days = days.min(365);
    let mut daily: HashMap<String, (u64, u64, u64)> = HashMap::new();

    let cutoff = std::time::SystemTime::now()
        .checked_sub(Duration::from_secs(u64::from(days) * 86_400))
        .unwrap_or(std::time::UNIX_EPOCH);

    let Ok(project_dirs) = std::fs::read_dir(projects_root) else { return daily; };

    for proj_entry in project_dirs.flatten() {
        // Use file_type() — unlike is_dir(), it does NOT follow symlinks.
        let Ok(ft) = proj_entry.file_type() else { continue };
        if !ft.is_dir() {
            continue;
        }
        let proj_path = proj_entry.path();

        let Ok(session_files) = std::fs::read_dir(&proj_path) else { continue };

        for file_entry in session_files.flatten() {
            let file_path = file_entry.path();
            let fname = file_path
                .file_name()
                .and_then(|f| f.to_str())
                .unwrap_or("");
            if !std::path::Path::new(fname).extension().is_some_and(|e| e.eq_ignore_ascii_case("jsonl")) {
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

            let Ok(content) = std::fs::read_to_string(&file_path) else { continue };

            for line in content.lines() {
                if line.is_empty() {
                    continue;
                }
                let Ok(msg) = serde_json::from_str::<SessionLine>(line) else { continue };
                if msg.kind != "assistant" {
                    continue;
                }
                // Resolve usage from top-level (older format) or message.usage (newer format).
                let Some(usage) = msg.usage.or_else(|| msg.message.and_then(|m| m.usage)) else { continue };
                let Some(ts) = msg.timestamp else { continue };
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

// ── Per-project aggregation ───────────────────────────────────────────────────

/// Decodes a Claude project directory name back to a human-readable project name.
///
/// Claude encodes the project's absolute path as the directory name by replacing
/// each `/` with `-` (e.g. `-Users-alice-code-my-app` → `my-app`).
/// We strip the HOME prefix then greedily walk the filesystem to find the real path,
/// returning its last component. Falls back to the last dash-segment on failure.
fn project_display_name(dir_name: &str) -> String {
    fn last_dash_segment(s: &str) -> String {
        s.trim_start_matches('-')
            .split('-')
            .rfind(|p| !p.is_empty())
            .unwrap_or(s)
            .to_string()
    }

    fn greedy_last(base: &std::path::Path, rest: &str, depth: u8) -> Option<String> {
        if depth > 10 {
            return None;
        }
        if rest.is_empty() {
            return base.file_name()?.to_str().map(String::from);
        }
        let mut children: Vec<String> = std::fs::read_dir(base)
            .ok()?
            .flatten()
            .filter_map(|e| e.file_name().into_string().ok())
            .filter(|name| rest.starts_with(name.as_str()))
            .collect();
        // Longest match first to avoid short-circuit on common prefixes.
        children.sort_by_key(|s| std::cmp::Reverse(s.len()));
        for child in &children {
            let after = rest[child.len()..].trim_start_matches('-');
            if let Some(result) = greedy_last(&base.join(child), after, depth + 1) {
                return Some(result);
            }
        }
        None
    }

    let Ok(home) = std::env::var("HOME") else {
        return last_dash_segment(dir_name);
    };
    // Encode HOME the same way Claude does: strip leading '/' then replace '/' with '-'.
    let home_encoded = format!("-{}", home.trim_start_matches('/').replace('/', "-"));
    let rest = match dir_name.strip_prefix(&home_encoded) {
        Some(r) => r.trim_start_matches('-'),
        None => return last_dash_segment(dir_name),
    };
    let home_path = std::path::PathBuf::from(&home);
    greedy_last(&home_path, rest, 0).unwrap_or_else(|| last_dash_segment(rest))
}

/// Per-project token totals for the requested window, returned as part of [`ProviderStats`].
#[derive(serde::Serialize)]
pub struct ProjectStat {
    /// Human-readable project name decoded from the session directory name.
    name: String,
    /// Total input + output tokens for this project in the window.
    tokens: u64,
}

/// Returns the context window size (`input` + `cache_read` + `cache_write`) of the most
/// recent assistant message across ALL session JSONL files in `~/.claude/projects/`.
/// Compares by ISO timestamp so the result is not tied to any single project.
fn current_context_tokens() -> u64 {
    let Some(root) = claude_projects_path() else { return 0 };
    let Ok(project_dirs) = std::fs::read_dir(&root) else { return 0 };

    // Only scan files modified within the last 24 hours to bound the walk.
    let cutoff = std::time::SystemTime::now()
        .checked_sub(Duration::from_secs(86_400))
        .unwrap_or(std::time::UNIX_EPOCH);

    let mut latest_ts = String::new();
    let mut latest_ctx: u64 = 0;

    for proj_entry in project_dirs.flatten() {
        let Ok(ft) = proj_entry.file_type() else { continue };
        if !ft.is_dir() { continue; }
        let Ok(files) = std::fs::read_dir(proj_entry.path()) else { continue };

        for file_entry in files.flatten() {
            let path = file_entry.path();
            let fname = path.file_name().and_then(|f| f.to_str()).unwrap_or("");
            if !std::path::Path::new(fname).extension().is_some_and(|e| e.eq_ignore_ascii_case("jsonl")) {
                continue;
            }
            // Pre-filter by mtime before reading the full file.
            if path.metadata().ok().and_then(|m| m.modified().ok()).is_none_or(|mt| mt < cutoff) {
                continue;
            }
            let Ok(content) = std::fs::read_to_string(&path) else { continue };

            for line in content.lines() {
                if line.is_empty() { continue; }
                let Ok(msg) = serde_json::from_str::<SessionLine>(line) else { continue };
                if msg.kind != "assistant" { continue; }
                let Some(ts) = msg.timestamp.as_deref() else { continue };
                // ISO timestamps sort lexicographically — no parsing needed.
                if ts <= latest_ts.as_str() { continue; }
                let Some(usage) = msg.usage.or_else(|| msg.message.and_then(|m| m.usage)) else { continue };
                latest_ts = ts.to_string();
                latest_ctx = usage.input_tokens
                    + usage.cache_read_input_tokens
                    + usage.cache_creation_input_tokens;
            }
        }
    }

    latest_ctx
}

/// Scans `~/.claude/projects/` and aggregates per-project input+output token totals
/// across all session JSONL files whose mtime falls within the last `days` days.
/// Skips temp/worktree directories (those not rooted in `$HOME`).
fn aggregate_claude_projects(days: u32) -> Vec<ProjectStat> {
    let Some(projects_root) = claude_projects_path() else { return vec![]; };
    let Ok(home) = std::env::var("HOME") else { return vec![]; };
    let home_encoded = format!("-{}", home.trim_start_matches('/').replace('/', "-"));

    let cutoff = std::time::SystemTime::now()
        .checked_sub(Duration::from_secs(u64::from(days) * 86_400))
        .unwrap_or(std::time::UNIX_EPOCH);

    let Ok(project_dirs) = std::fs::read_dir(&projects_root) else { return vec![]; };

    let mut stats: Vec<ProjectStat> = project_dirs
        .flatten()
        .filter_map(|proj_entry| {
            // Use file_type() — unlike is_dir(), it does NOT follow symlinks.
            let ft = proj_entry.file_type().ok()?;
            if !ft.is_dir() {
                return None;
            }
            let proj_path = proj_entry.path();
            let dir_name = proj_path.file_name()?.to_str()?.to_string();
            // Skip worktree / temp project dirs (not rooted in $HOME).
            if !dir_name.starts_with(&home_encoded) {
                return None;
            }

            let mut tokens: u64 = 0;

            for file_entry in std::fs::read_dir(&proj_path).ok()?.flatten() {
                let file_path = file_entry.path();
                let fname = file_path.file_name().and_then(|f| f.to_str()).unwrap_or("");
                if !std::path::Path::new(fname).extension().is_some_and(|e| e.eq_ignore_ascii_case("jsonl")) {
                    continue;
                }
                if let Ok(meta) = file_path.metadata() {
                    if let Ok(mtime) = meta.modified() {
                        if mtime < cutoff {
                            continue;
                        }
                    }
                }
                let Ok(content) = std::fs::read_to_string(&file_path) else { continue };
                for line in content.lines() {
                    if line.is_empty() {
                        continue;
                    }
                    let Ok(msg) = serde_json::from_str::<SessionLine>(line) else { continue };
                    if msg.kind != "assistant" {
                        continue;
                    }
                    let Some(usage) = msg.usage.or_else(|| msg.message.and_then(|m| m.usage)) else { continue };
                    tokens += usage.input_tokens + usage.output_tokens;
                }
            }

            if tokens == 0 {
                return None;
            }
            let name = project_display_name(&dir_name);
            Some(ProjectStat { name, tokens })
        })
        .collect();

    stats.sort_by(|a, b| b.tokens.cmp(&a.tokens));
    stats
}

// ── Stats-cache data types ────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct StatsCache {
    #[serde(rename = "dailyModelTokens", default)]
    daily_model_tokens: Vec<DailyModelTokens>,
    #[serde(rename = "modelUsage", default)]
    model_usage: HashMap<String, ModelUsageEntry>,
    #[serde(rename = "totalSessions", default)]
    total_sessions: u64,
}

#[derive(serde::Deserialize)]
struct DailyModelTokens {
    date: String,
    #[serde(rename = "tokensByModel", default)]
    tokens_by_model: HashMap<String, u64>,
}

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

// ── IPC return types ──────────────────────────────────────────────────────────

/// Token usage for a single calendar day, returned as part of [`ProviderStats`].
#[derive(serde::Serialize, Clone)]
pub struct DailyUsage {
    /// Date label formatted for chart axes, e.g. `"Mar 06"`.
    date: String,
    /// Tokens sent by the user (prompt text, tool results).
    input_tokens: u64,
    /// Tokens generated by the model.
    output_tokens: u64,
    /// Prompt-cache read + creation tokens combined.
    cache_tokens: u64,
}

/// Aggregate token counts and cost for a single Claude model, returned as part of [`ProviderStats`].
#[derive(serde::Serialize)]
pub struct ModelStat {
    /// Model identifier as it appears in `stats-cache.json`, e.g. `"claude-sonnet-4-6"`.
    name: String,
    /// Total input tokens across all sessions for this model.
    input_tokens: u64,
    /// Total output tokens across all sessions for this model.
    output_tokens: u64,
    /// Combined cache read and cache creation tokens for this model.
    cache_tokens: u64,
    /// Total cost in USD for this model, sourced directly from `costUSD` in stats-cache.json.
    cost_usd: f64,
}

/// Top-level response returned by [`get_claude_stats`] over Tauri IPC.
#[derive(serde::Serialize)]
pub struct ProviderStats {
    /// Last N days of usage (default 30), sorted oldest-first, date labels ready for chart axes.
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
    /// None if no data exists.
    projected_monthly_cost_usd: Option<f64>,
    /// Per-project token totals for the requested window, sorted by tokens descending.
    project_stats: Vec<ProjectStat>,
    /// Tokens in the active context window from the most recent assistant message
    /// (`input + cache_read + cache_write`). Used to drive the context gauge.
    /// Zero when no session data is available.
    current_context_tokens: u64,
}

// ── Shared stat helpers ───────────────────────────────────────────────────────

fn compute_trend_pct(entries: &[DailyUsage]) -> Option<f64> {
    let n = entries.len();
    if n < 7 { return None; }
    let sum_tokens = |s: &[DailyUsage]| -> u64 {
        s.iter().map(|d| d.input_tokens + d.output_tokens + d.cache_tokens).sum()
    };
    let last7 = sum_tokens(&entries[n - 7..]);
    let prev7 = if n >= 14 { sum_tokens(&entries[n - 14..n - 7]) } else { 0 };
    if prev7 == 0 { return None; }
    #[allow(clippy::cast_precision_loss)]
    Some(((last7 as f64 - prev7 as f64) / prev7 as f64) * 100.0)
}

fn sort_model_stats_by_tokens(stats: &mut [ModelStat]) {
    stats.sort_by_key(|m| std::cmp::Reverse(m.input_tokens + m.output_tokens + m.cache_tokens));
}

// ── Model pricing ─────────────────────────────────────────────────────────────

const OPUS_INPUT:   f64 = 15.0;
const OPUS_OUTPUT:  f64 = 75.0;
const OPUS_CR:      f64 = 1.50;
const OPUS_CW:      f64 = 18.75;

const SONNET_INPUT: f64 = 3.0;
const SONNET_OUTPUT:f64 = 15.0;
const SONNET_CR:    f64 = 0.30;
const SONNET_CW:    f64 = 3.75;

const HAIKU_INPUT:  f64 = 0.80;
const HAIKU_OUTPUT: f64 = 4.0;
const HAIKU_CR:     f64 = 0.08;
const HAIKU_CW:     f64 = 1.00;

/// USD per million tokens: (input, output, `cache_read`, `cache_write`).
/// Matched by substring so new model versions are covered automatically.
fn model_pricing_per_mtok(name: &str) -> (f64, f64, f64, f64) {
    let n = name.to_lowercase();
    if n.contains("opus") {
        (OPUS_INPUT, OPUS_OUTPUT, OPUS_CR, OPUS_CW)
    } else if n.contains("haiku") {
        (HAIKU_INPUT, HAIKU_OUTPUT, HAIKU_CR, HAIKU_CW)
    } else {
        (SONNET_INPUT, SONNET_OUTPUT, SONNET_CR, SONNET_CW)
    }
}

fn compute_model_cost(name: &str, m: &ModelUsageEntry) -> f64 {
    if m.cost_usd > 0.0 {
        return m.cost_usd;
    }
    let (inp, out, cr, cw) = model_pricing_per_mtok(name);
    let mtok = 1_000_000.0_f64;
    #[allow(clippy::cast_precision_loss)]
    {
        (m.input_tokens as f64 / mtok) * inp
            + (m.output_tokens as f64 / mtok) * out
            + (m.cache_read_tokens as f64 / mtok) * cr
            + (m.cache_creation_tokens as f64 / mtok) * cw
    }
}

// ── IPC command ───────────────────────────────────────────────────────────────

/// Reads ~/.claude/stats-cache.json and returns structured usage data.
/// Returns Err if the file is missing or cannot be parsed — the frontend
/// falls back to mock data on error.
///
/// `days` — optional window size (default 30). Slices the last N days from
/// the sorted daily entries before returning.
#[tauri::command]
fn get_claude_stats(days: Option<u32>) -> Result<ProviderStats, String> {
    let path = claude_stats_path().ok_or_else(|| "HOME not set".to_string())?;

    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("stats-cache.json: {e}"))?;

    let cache: StatsCache =
        serde_json::from_str(&content).map_err(|e| format!("parse error: {e}"))?;

    // Compute cumulative input/output/cache fractions from modelUsage.
    // These are used to split each day's total into the three token types.
    let (cum_input, cum_output, cum_cache) = cache.model_usage.values().fold(
        (0u64, 0u64, 0u64),
        |(i, o, c), m| {
            (
                i + m.input_tokens,
                o + m.output_tokens,
                c + m.cache_read_tokens + m.cache_creation_tokens,
            )
        },
    );
    let cum_total = cum_input + cum_output + cum_cache;

    // Aggregate real per-type token counts from session JSONL files.
    // Always fetch at least 30 days so the projected-cost block can reuse
    // this result without a second walk, regardless of the requested window.
    let session_data = aggregate_claude_sessions(days.unwrap_or(30).clamp(30, 365));

    // Build daily usage entries keyed by ISO date so we can merge stats-cache
    // and JSONL-only days, then sort chronologically before formatting labels.
    let mut daily = cache.daily_model_tokens;
    daily.sort_by(|a, b| a.date.cmp(&b.date));

    // Track which ISO dates are already covered by the stats-cache.
    let cache_dates: std::collections::HashSet<String> =
        daily.iter().map(|d| d.date.clone()).collect();

    // (iso_date, DailyUsage) — sorted by ISO date at the end.
    let mut raw: Vec<(String, DailyUsage)> = daily
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
            (day.date.clone(), DailyUsage {
                date: String::new(), // filled after sort
                input_tokens: inp,
                output_tokens: out,
                cache_tokens: cac,
            })
        })
        .collect();

    // Include dates present in JSONL but absent from stats-cache (e.g. when
    // stats-cache hasn't been recomputed since the last session).
    for (date, &(inp, out, cac)) in &session_data {
        if !cache_dates.contains(date) {
            raw.push((date.clone(), DailyUsage {
                date: String::new(),
                input_tokens: inp,
                output_tokens: out,
                cache_tokens: cac,
            }));
        }
    }

    // Sort by ISO date, then apply formatted labels.
    raw.sort_by(|a, b| a.0.cmp(&b.0));
    let mut entries: Vec<DailyUsage> = raw
        .into_iter()
        .map(|(iso, mut d)| { d.date = format_date_label(&iso); d })
        .collect();

    // Trend: % change in total tokens, last 7 days vs previous 7 days.
    // Must be computed on the full sorted dataset BEFORE slicing to `limit`,
    // otherwise short windows (1d, 3d, 7d) always produce trend_pct = None.
    let trend_pct = compute_trend_pct(&entries);

    let limit = days.map_or(30_usize, |d| d as usize);
    if entries.len() > limit {
        entries = entries.split_off(entries.len() - limit);
    }

    // Total cost: use cached costUSD when available, otherwise compute from
    // token counts using the pricing table (stats-cache.json often stores 0).
    let total_cost_usd: f64 = cache.model_usage.iter()
        .map(|(name, m)| compute_model_cost(name, m))
        .sum();
    let lifetime_tokens: u64 = cache.model_usage.values()
        .map(|m| m.input_tokens + m.output_tokens + m.cache_read_tokens + m.cache_creation_tokens)
        .sum();

    // Project monthly cost: cost-per-token rate × last 30 days of JSONL tokens.
    // Reuse session_data when the caller requested ≥ 30 days (avoids a second walk).
    let projected_monthly_cost_usd: Option<f64> = if lifetime_tokens > 0 && total_cost_usd > 0.0 {
        #[allow(clippy::cast_precision_loss)]
        let cost_per_token = total_cost_usd / lifetime_tokens as f64;
        // session_data was fetched for at least 30 days above — always reuse it.
        let tokens_30d: u64 = session_data.values().map(|(i, o, c)| i + o + c).sum();
        #[allow(clippy::cast_precision_loss)]
        if tokens_30d > 0 { Some(tokens_30d as f64 * cost_per_token) } else { None }
    } else {
        None
    };

    // Build model stats sorted by total token count descending.
    let mut model_stats: Vec<ModelStat> = cache
        .model_usage
        .into_iter()
        .map(|(name, m)| ModelStat {
            cost_usd: compute_model_cost(&name, &m),
            name,
            input_tokens: m.input_tokens,
            output_tokens: m.output_tokens,
            cache_tokens: m.cache_read_tokens + m.cache_creation_tokens,
        })
        .collect();

    sort_model_stats_by_tokens(&mut model_stats);

    let project_stats = aggregate_claude_projects(days.unwrap_or(30));
    let current_context_tokens = current_context_tokens();

    Ok(ProviderStats {
        daily_usage: entries,
        model_stats,
        project_stats,
        total_sessions: cache.total_sessions,
        total_cost_usd,
        trend_pct,
        projected_monthly_cost_usd,
        current_context_tokens,
    })
}

// ── Codex session file parsing ────────────────────────────────────────────────

/// Event wrapper shared by every line of a Codex `rollout-*.jsonl` file.
/// Only the fields we care about are declared; unknown fields are ignored.
#[derive(serde::Deserialize)]
struct CodexEvent {
    #[serde(default)]
    timestamp: Option<String>,
    #[serde(rename = "type", default)]
    event_type: String,
    #[serde(default)]
    payload: serde_json::Value,
}

/// Nested `total_token_usage` object from a `token_count` event payload.
#[allow(clippy::struct_field_names)] // field names mirror the JSON schema
#[derive(serde::Deserialize, Default, Clone, Copy)]
struct CodexTotalTokenUsage {
    #[serde(default)]
    input_tokens: u64,
    #[serde(default)]
    cached_input_tokens: u64,
    #[serde(default)]
    output_tokens: u64,
    #[serde(default)]
    reasoning_output_tokens: u64,
}

/// Extracts the session start date ("YYYY-MM-DD") from a rollout filename
/// of the form `rollout-YYYY-MM-DDTHH-MM-SS-...jsonl`. Returns `None` for
/// any other shape so the caller can fall back to other sources.
fn codex_date_from_filename(name: &str) -> Option<String> {
    let stripped = name.strip_prefix("rollout-")?;
    if stripped.len() < 10 {
        return None;
    }
    let date = &stripped[..10];
    // Sanity-check the shape: "YYYY-MM-DD".
    let bytes = date.as_bytes();
    if bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[..4].iter().all(u8::is_ascii_digit)
        && bytes[5..7].iter().all(u8::is_ascii_digit)
        && bytes[8..10].iter().all(u8::is_ascii_digit)
    {
        Some(date.to_string())
    } else {
        None
    }
}

/// Parses the leading `YYYY-MM-DD` prefix of an ISO-8601 timestamp.
fn codex_date_from_timestamp(ts: &str) -> Option<String> {
    if ts.len() >= 10 {
        let candidate = &ts[..10];
        let bytes = candidate.as_bytes();
        if bytes[4] == b'-'
            && bytes[7] == b'-'
            && bytes[..4].iter().all(u8::is_ascii_digit)
            && bytes[5..7].iter().all(u8::is_ascii_digit)
            && bytes[8..10].iter().all(u8::is_ascii_digit)
        {
            return Some(candidate.to_string());
        }
    }
    None
}

/// Parses a single rollout file, returning the session's final date, model,
/// and cumulative token totals. Returns `None` if the file has no
/// `token_count` event (e.g. aborted sessions, streaming-only logs).
fn parse_codex_session_file(path: &std::path::Path) -> Option<(String, Option<String>, CodexTotalTokenUsage)> {
    use std::io::{BufRead, BufReader};

    let file = std::fs::File::open(path).ok()?;
    let reader = BufReader::new(file);

    let mut session_date: Option<String> = None;
    let mut last_model: Option<String> = None;
    let mut last_totals: Option<CodexTotalTokenUsage> = None;

    for line in reader.lines().map_while(Result::ok) {
        if line.trim().is_empty() { continue; }
        let Ok(evt) = serde_json::from_str::<CodexEvent>(&line) else { continue };

        match evt.event_type.as_str() {
            "session_meta" => {
                if session_date.is_none() {
                    // Prefer the top-level timestamp, fall back to payload.timestamp.
                    let ts = evt.timestamp.as_deref()
                        .or_else(|| evt.payload.get("timestamp").and_then(serde_json::Value::as_str));
                    if let Some(ts) = ts {
                        session_date = codex_date_from_timestamp(ts);
                    }
                }
            }
            "turn_context" => {
                if let Some(model) = evt.payload.get("model").and_then(serde_json::Value::as_str) {
                    last_model = Some(model.to_string());
                }
            }
            "event_msg" => {
                let payload_type = evt.payload.get("type").and_then(serde_json::Value::as_str);
                if payload_type == Some("token_count") {
                    if let Some(info) = evt.payload.get("info") {
                        if let Some(tot) = info.get("total_token_usage") {
                            if let Ok(parsed) = serde_json::from_value::<CodexTotalTokenUsage>(tot.clone()) {
                                last_totals = Some(parsed);
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    let totals = last_totals?;
    let date = session_date
        .or_else(|| path.file_name().and_then(|s| s.to_str()).and_then(codex_date_from_filename))?;
    Some((date, last_model, totals))
}

/// Returns true if "YYYY-MM-DD" string `date` falls within the window
/// `[today - (days-1), today]` (inclusive on both ends). Comparison is
/// lexicographic, which is valid for zero-padded ISO dates.
fn codex_date_in_window(date: &str, today: &str, earliest: &str) -> bool {
    date >= earliest && date <= today
}

/// Computes the ISO "YYYY-MM-DD" labels for today and the earliest included day.
/// Uses `SystemTime` rather than `chrono` to avoid adding a dependency.
fn codex_window_bounds(days: u32) -> (String, String) {
    use std::time::{SystemTime, UNIX_EPOCH};

    let now_secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let today_days = now_secs / 86_400;
    let earliest_days = today_days.saturating_sub(u64::from(days.saturating_sub(1)));
    (days_to_ymd(today_days), days_to_ymd(earliest_days))
}

/// Converts a count of days since the Unix epoch (1970-01-01) to "YYYY-MM-DD".
/// Proleptic Gregorian arithmetic; no external dependency.
fn days_to_ymd(mut days: u64) -> String {
    // Algorithm adapted from Howard Hinnant's "date" algorithms (public domain).
    days += 719_468; // shift epoch so year 0000-03-01 = day 0
    let era = days / 146_097;
    let doe = days - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{y:04}-{m:02}-{d:02}")
}

// ── Codex IPC command ─────────────────────────────────────────────────────────

/// Reads `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` files (or
/// `$CODEX_HOME/sessions/...` when set) and returns structured usage data.
///
/// Only date directories within the last `days` (default 30) are visited.
/// Each session's final `token_count` event supplies the cumulative totals.
/// Sessions without a `token_count` event are skipped.
///
/// Returns `Err` when the sessions directory cannot be discovered or read;
/// the frontend falls back to mock data on error.
#[tauri::command]
fn get_codex_stats(days: Option<u32>) -> Result<ProviderStats, String> {
    // Per-model cumulative token totals — local helper struct.
    struct ModelAccum { input: u64, output: u64, cache: u64 }

    let window = days.unwrap_or(30).clamp(1, 365);
    let root = codex_sessions_path().ok_or_else(|| "HOME/CODEX_HOME not set".to_string())?;

    if !root.exists() {
        // Empty state — return a valid empty payload rather than an error so
        // the frontend shows "no data" rather than a fallback to mock data.
        return Ok(ProviderStats {
            daily_usage: Vec::new(),
            model_stats: Vec::new(),
            project_stats: Vec::new(),
            total_sessions: 0,
            total_cost_usd: 0.0,
            trend_pct: None,
            projected_monthly_cost_usd: None,
            current_context_tokens: 0,
        });
    }

    // Walk at least 14 days so trend_pct (last-7 vs prev-7) has enough data even
    // when the user selects a short window like 1d/3d/7d.
    let trend_window = window.max(14);
    let (today, earliest) = codex_window_bounds(trend_window);

    // Per-day token totals (pre-split into input/output/cache buckets).
    let mut daily_input: HashMap<String, u64> = HashMap::new();
    let mut daily_output: HashMap<String, u64> = HashMap::new();
    let mut daily_cache: HashMap<String, u64> = HashMap::new();

    let mut models: HashMap<String, ModelAccum> = HashMap::new();

    let mut total_sessions: u64 = 0;

    // Walk YYYY/MM/DD directories, skipping anything outside the window.
    let year_dirs = std::fs::read_dir(&root)
        .map_err(|e| format!("sessions dir: {e}"))?;
    for year_entry in year_dirs.flatten() {
        let year_path = year_entry.path();
        if !year_entry.file_type().is_ok_and(|ft| ft.is_dir()) { continue; }
        let Some(year_name) = year_path.file_name().and_then(|s| s.to_str()) else { continue };
        if year_name.len() != 4 || !year_name.chars().all(|c| c.is_ascii_digit()) { continue; }

        // Prune whole years that cannot intersect the window.
        if year_name.as_bytes() < &earliest.as_bytes()[..4]
            || year_name.as_bytes() > &today.as_bytes()[..4] {
            continue;
        }

        let Ok(month_dirs) = std::fs::read_dir(&year_path) else { continue };
        for month_entry in month_dirs.flatten() {
            let month_path = month_entry.path();
            if !month_entry.file_type().is_ok_and(|ft| ft.is_dir()) { continue; }
            let Some(month_name) = month_path.file_name().and_then(|s| s.to_str()) else { continue };
            if month_name.len() != 2 || !month_name.chars().all(|c| c.is_ascii_digit()) { continue; }

            let ym_prefix = format!("{year_name}-{month_name}");
            // Prune whole months that cannot intersect the window.
            if ym_prefix.as_str() < &earliest[..7] || ym_prefix.as_str() > &today[..7] {
                continue;
            }

            let Ok(day_dirs) = std::fs::read_dir(&month_path) else { continue };
            for day_entry in day_dirs.flatten() {
                let day_path = day_entry.path();
                if !day_entry.file_type().is_ok_and(|ft| ft.is_dir()) { continue; }
                let Some(day_name) = day_path.file_name().and_then(|s| s.to_str()) else { continue };
                if day_name.len() != 2 || !day_name.chars().all(|c| c.is_ascii_digit()) { continue; }

                let dir_date = format!("{year_name}-{month_name}-{day_name}");
                if !codex_date_in_window(&dir_date, &today, &earliest) { continue; }

                let Ok(files) = std::fs::read_dir(&day_path) else { continue };
                for file_entry in files.flatten() {
                    let file_path = file_entry.path();
                    let Some(fname) = file_path.file_name().and_then(|s| s.to_str()) else { continue };
                    // Codex CLI always writes lowercase `rollout-*.jsonl`; a
                    // case-insensitive match would only add noise.
                    #[allow(clippy::case_sensitive_file_extension_comparisons)]
                    if !fname.starts_with("rollout-") || !fname.ends_with(".jsonl") { continue; }

                    let Some((session_date, model, totals)) = parse_codex_session_file(&file_path) else {
                        continue;
                    };

                    // Defense-in-depth: session_date may differ from directory
                    // (e.g. UTC rollover). Re-check the window.
                    if !codex_date_in_window(&session_date, &today, &earliest) { continue; }

                    total_sessions += 1;

                    // Split tokens into input / output / cache buckets.
                    // - "cache" aggregates prompt-cache reads (cached_input_tokens).
                    // - "input" is net new input (input - cached_input), never negative.
                    // - "output" includes both user-visible and reasoning output.
                    let cache = totals.cached_input_tokens;
                    let input = totals.input_tokens.saturating_sub(totals.cached_input_tokens);
                    let output = totals.output_tokens + totals.reasoning_output_tokens;

                    *daily_input.entry(session_date.clone()).or_insert(0) += input;
                    *daily_output.entry(session_date.clone()).or_insert(0) += output;
                    *daily_cache.entry(session_date).or_insert(0) += cache;

                    if let Some(model_name) = model {
                        let acc = models.entry(model_name).or_insert(ModelAccum {
                            input: 0, output: 0, cache: 0,
                        });
                        acc.input += input;
                        acc.output += output;
                        acc.cache += cache;
                    }
                }
            }
        }
    }

    // Build daily entries sorted oldest-first.
    let mut dates: Vec<String> = daily_input
        .keys()
        .chain(daily_output.keys())
        .chain(daily_cache.keys())
        .cloned()
        .collect();
    dates.sort();
    dates.dedup();

    let daily_usage: Vec<DailyUsage> = dates
        .iter()
        .map(|d| DailyUsage {
            date: format_date_label(d),
            input_tokens: *daily_input.get(d).unwrap_or(&0),
            output_tokens: *daily_output.get(d).unwrap_or(&0),
            cache_tokens: *daily_cache.get(d).unwrap_or(&0),
        })
        .collect();

    // Trend: last 7 days vs previous 7, computed on the full in-window dataset.
    let trend_pct = compute_trend_pct(&daily_usage);

    // Per-model stats, sorted by total tokens descending. Codex logs no cost.
    let mut model_stats: Vec<ModelStat> = models
        .into_iter()
        .map(|(name, m)| ModelStat {
            name,
            input_tokens: m.input,
            output_tokens: m.output,
            cache_tokens: m.cache,
            cost_usd: 0.0,
        })
        .collect();
    sort_model_stats_by_tokens(&mut model_stats);

    // Slice daily_usage to the requested window before returning.
    // trend_pct was computed on the full trend_window dataset above.
    let start = daily_usage.len().saturating_sub(window as usize);
    let daily_usage = daily_usage[start..].to_vec();

    Ok(ProviderStats {
        daily_usage,
        model_stats,
        project_stats: Vec::new(),
        total_sessions,
        total_cost_usd: 0.0,
        trend_pct,
        projected_monthly_cost_usd: None,
        current_context_tokens: 0,
    })
}

// ── Auto-launch IPC commands ──────────────────────────────────────────────────

/// Enables or disables the "launch at login" `LaunchAgent` for AI Pulse.
///
/// Delegates to the `tauri-plugin-autostart` plugin, which on macOS installs a
/// `LaunchAgent` plist under `~/Library/LaunchAgents/`. The agent starts the
/// app on user login; disabling removes the plist.
///
/// Returns an error string if the underlying plugin call fails (e.g. file-
/// system write failure). The frontend logs this to the console in DEV.
#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
fn toggle_autolaunch(app: tauri::AppHandle, enable: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    if enable {
        app.autolaunch().enable().map_err(|e| e.to_string())
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())
    }
}

/// Returns true if the "launch at login" `LaunchAgent` is currently registered
/// for AI Pulse. Used on frontend mount to sync the Zustand toggle state with
/// the actual OS state.
#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
fn is_autolaunch_enabled(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

/// Converts "2026-03-06" → "Mar 06" for chart axis labels.
fn format_date_label(date: &str) -> String {
    let months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let mut parts = date.splitn(3, '-');
    let _year = parts.next();
    let month = parts.next()
        .and_then(|m| m.parse::<usize>().ok())
        .filter(|&m| (1..=12).contains(&m))
        .map(|m| m - 1);
    let day = parts.next().unwrap_or("??");
    match month.and_then(|m| months.get(m)) {
        Some(name) => format!("{name} {day}"),
        None => date.to_string(),
    }
}

// ── App entry point ───────────────────────────────────────────────────────────

/// Runs the Tauri application. Called from main.rs.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Monotonic timestamp of the last window show(). Used by the focus-lost
    // handler to suppress the spurious Focused(false) macOS fires during the
    // tray-click sequence before focus fully settles on the webview.
    let last_shown: Arc<Mutex<Option<Instant>>> = Arc::new(Mutex::new(None));
    let last_shown_event = last_shown.clone();

    // Guards the 50 ms show-delay window. is_visible() returns false during
    // those 50 ms, so without this flag a second click would spawn a second
    // show() task instead of hiding the window as the user expects.
    let pending_show: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));

    tauri::Builder::default()
        // Autostart plugin: installs/removes a macOS LaunchAgent when toggled.
        // MacosLauncher::LaunchAgent is the modern per-user mechanism (no root).
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        // Global shortcut plugin: listens for system-wide hotkeys even when
        // the app has no focused window (needed since we run as Accessory).
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_claude_stats,
            get_codex_stats,
            toggle_autolaunch,
            is_autolaunch_enabled
        ])
        .setup(move |app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Force the WKWebView and NSWindow to be fully transparent.
            // Despite transparent:true in config, macOS can still render a dark
            // rounded rectangle behind the WebView.
            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.with_webview(|wv| unsafe {
                    use objc2::runtime::AnyObject;
                    use objc2::msg_send;

                    let wkwebview = wv.inner().cast::<AnyObject>();
                    let ns_window = wv.ns_window().cast::<AnyObject>();

                    let _: () = msg_send![wkwebview, setOpaque: false];

                    // Use [NSColor clearColor] for both WKWebView and NSWindow so
                    // neither layer renders an opaque background. setOpaque:false
                    // on NSWindow tells the compositor the window has transparent
                    // pixels; setBackgroundColor:clearColor removes the default fill.
                    if let Some(ns_color_cls) = objc2::runtime::AnyClass::get(c"NSColor") {
                        let clear: *mut AnyObject = msg_send![ns_color_cls, clearColor];
                        let _: () = msg_send![wkwebview, setBackgroundColor: clear];
                        let _: () = msg_send![ns_window, setOpaque: false];
                        let _: () = msg_send![ns_window, setBackgroundColor: clear];
                    }
                });
            }


            // Load the dedicated tray icon from the bundled PNG bytes.
            // Falls back to the default window icon if the file is missing.
            let tray_icon = {
                let bytes = include_bytes!("../icons/tray-icon.png");
                tauri::image::Image::from_bytes(bytes)
                    .ok()
                    .or_else(|| app.default_window_icon().cloned())
                    .ok_or("tray icon not found")?
            };

            let quit_item = MenuItem::with_id(app, "quit", "Quit AI Pulse", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&quit_item])?;

            let last_shown_tray = last_shown.clone();
            let pending_show_tray = pending_show.clone();
            let tray = TrayIconBuilder::new()
                .icon(tray_icon)
                .icon_as_template(false)
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    if event.id == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(move |tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        rect,
                        ..
                    } = event {
                        let app_handle = tray.app_handle();
                        let Some(window) = app_handle.get_webview_window("main") else { return };

                        if window.is_visible().unwrap_or(false)
                            || pending_show_tray.load(Ordering::Acquire)
                        {
                            // Atomically cancel any in-flight show task by clearing
                            // the flag. The task checks the flag via swap() before
                            // calling show(), so it will no-op if we got here first.
                            pending_show_tray.store(false, Ordering::Release);
                            let _ = window.hide();
                        } else {
                            // Position window directly below the tray icon only when
                            // showing — avoids a visual snap on hide and skips the
                            // current_monitor() call on every hide click.
                            let scale = window.scale_factor().unwrap_or(1.0);
                            let pos = rect.position.to_physical::<i32>(scale);
                            let size = rect.size.to_physical::<u32>(scale);
                            #[allow(clippy::cast_possible_truncation)] // pixel values never exceed i32::MAX
                            let win_w = (WIN_WIDTH_PX * scale) as i32;
                            let screen_w = window
                                .current_monitor()
                                .ok()
                                .flatten()
                                .map_or(i32::MAX, |m| m.size().width.cast_signed());
                            let x = (pos.x + (size.width.cast_signed()) / 2 - win_w / 2)
                                .max(0)
                                .min(screen_w - win_w);
                            #[allow(clippy::cast_possible_truncation)] // 8px gap in physical pixels, always tiny
                            let y = pos.y + size.height.cast_signed() + (8.0 * scale) as i32;
                            let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
                            pending_show_tray.store(true, Ordering::Release);
                            // Record show time before revealing the window so the
                            // debounce below covers the full macOS focus-settle cycle.
                            if let Ok(mut guard) = last_shown_tray.lock() {
                                *guard = Some(Instant::now());
                            }
                            // Delay show by 50ms to let the WebView composite its
                            // first frame before the window becomes visible,
                            // eliminating the transparent-flash glitch.
                            let window_clone = window.clone();
                            let pending_show_task = pending_show_tray.clone();
                            tauri::async_runtime::spawn(async move {
                                tokio::time::sleep(Duration::from_millis(50)).await;
                                // swap() atomically reads-and-clears the flag.
                                // If it was already cleared by a hide click, skip show().
                                if pending_show_task.swap(false, Ordering::AcqRel) {
                                    let _ = window_clone.show();
                                    let _ = window_clone.set_focus();
                                }
                            });
                        }
                    }
                })
                .build(app)?;

            app.manage(tray);

            // Watch ~/.codex/sessions (or $CODEX_HOME/sessions) recursively for
            // rollout-*.jsonl writes from active Codex CLI sessions and emit
            // "codex-stats-updated" so the frontend re-fetches live.
            if let Some(codex_watch_path) = codex_sessions_path() {
                if codex_watch_path.exists() {
                    let app_handle = app.handle().clone();
                    tauri::async_runtime::spawn(async move {
                        let (tx, mut rx) = tokio::sync::mpsc::channel(8);
                        let _watcher = match RecommendedWatcher::new(
                            move |res: notify::Result<notify::Event>| {
                                match res {
                                    Ok(_) => { let _ = tx.blocking_send(()); }
                                    Err(e) => eprintln!("[ai-pulse] codex watcher error: {e}"),
                                }
                            },
                            NotifyConfig::default(),
                        ) {
                            Ok(mut w) => {
                                if let Err(e) = w.watch(&codex_watch_path, RecursiveMode::Recursive) {
                                    eprintln!("[ai-pulse] could not watch {}: {e}", codex_watch_path.display());
                                    return;
                                }
                                w
                            }
                            Err(e) => {
                                eprintln!("[ai-pulse] could not create codex watcher: {e}");
                                return;
                            }
                        };
                        // `_watcher` must remain alive for the duration of the task.
                        while rx.recv().await.is_some() {
                            tokio::time::sleep(Duration::from_millis(STATS_WATCHER_DEBOUNCE_MS)).await;
                            while rx.try_recv().is_ok() {}
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.emit("codex-stats-updated", ());
                            }
                        }
                    });
                } // end if codex_watch_path.exists()
            }

            // Register Cmd+Shift+A to toggle the main popup from anywhere.
            // Failures are non-fatal — the tray icon click still works without it.
            {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
                let shortcut: Shortcut = match GLOBAL_SHORTCUT.parse() {
                    Ok(s) => s,
                    Err(e) => {
                        eprintln!("[ai-pulse] could not parse global shortcut {GLOBAL_SHORTCUT}: {e}");
                        return Ok(());
                    }
                };
                if let Err(e) = app.global_shortcut()
                    .on_shortcut(shortcut, move |app_handle, _shortcut, event| {
                        // Only act on key-down; ignoring key-up avoids toggling
                        // twice per press.
                        if event.state == ShortcutState::Pressed {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    })
                {
                    eprintln!("[ai-pulse] could not register global shortcut {GLOBAL_SHORTCUT}: {e}");
                }
            }

            // Watch ~/.claude/stats-cache.json for changes and emit an event
            // to the main window so the frontend can re-fetch live.
            // Debounces STATS_WATCHER_DEBOUNCE_MS to coalesce burst writes from Claude CLI.
            if let Some(watch_path) = claude_stats_path() {
                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    let (tx, mut rx) = tokio::sync::mpsc::channel(8);
                    // Bail out of the task entirely if the watcher cannot be created —
                    // otherwise the channel would stay open (held by the closure) and
                    // `rx.recv().await` below would block forever, leaking the task.
                    let _watcher = match RecommendedWatcher::new(
                        move |res: notify::Result<notify::Event>| {
                            match res {
                                Ok(_) => { let _ = tx.blocking_send(()); }
                                Err(e) => eprintln!("[ai-pulse] watcher error: {e}"),
                            }
                        },
                        NotifyConfig::default(),
                    ) {
                        Ok(mut w) => {
                            if let Err(e) = w.watch(&watch_path, RecursiveMode::NonRecursive) {
                                eprintln!("[ai-pulse] could not watch {}: {e}", watch_path.display());
                                return;
                            }
                            w
                        }
                        Err(e) => {
                            eprintln!("[ai-pulse] could not create file watcher: {e}");
                            return;
                        }
                    };
                    // `_watcher` binding keeps the watcher alive for the duration of
                    // this task — dropping it stops file-system notifications.
                    while rx.recv().await.is_some() {
                        tokio::time::sleep(Duration::from_millis(STATS_WATCHER_DEBOUNCE_MS)).await;
                        while rx.try_recv().is_ok() {}
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.emit("claude-stats-updated", ());
                        }
                    }
                });
            }

            Ok(())
        })
        .on_window_event(move |window, event| {
            match event {
                // Switch to Regular when report window gets focus (makes it Cmd+Tab accessible).
                tauri::WindowEvent::Focused(true) if window.label() == "detailed-report" => {
                    #[cfg(target_os = "macos")]
                    let _ = window.app_handle().set_activation_policy(tauri::ActivationPolicy::Regular);
                }
                // Switch back to Accessory when report window is destroyed.
                tauri::WindowEvent::Destroyed if window.label() == "detailed-report" => {
                    #[cfg(target_os = "macos")]
                    let _ = window.app_handle().set_activation_policy(tauri::ActivationPolicy::Accessory);
                }
                tauri::WindowEvent::Focused(false) => {
                    // Only hide the tray popup (main window), not any report windows.
                    if window.label() != "main" {
                        return;
                    }
                    let elapsed_ms = last_shown_event
                        .lock()
                        .ok()
                        .and_then(|guard| guard.as_ref().map(|t| t.elapsed().as_millis()))
                        .unwrap_or(u128::MAX);
                    if elapsed_ms > FOCUS_SETTLE_MS {
                        let _ = window.hide();
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aggregate_claude_sessions_returns_empty_for_missing_dir() {
        // Call the inner function directly with a nonexistent path — no env mutation needed.
        let result = aggregate_claude_sessions_at(
            std::path::Path::new("/tmp/nonexistent-ai-pulse-test-home-xyz/.claude/projects"),
            7,
        );
        assert!(result.is_empty());
    }
}
