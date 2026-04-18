import { invoke } from "@tauri-apps/api/core";
import type { UsageData, ModelUsage } from "./data";

// ── Raw shapes returned by the Rust command ───────────────────────────────────

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

// ── Mapped result ─────────────────────────────────────────────────────────────

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
