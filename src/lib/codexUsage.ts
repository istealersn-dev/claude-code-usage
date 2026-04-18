import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { z } from "zod";
import type { UsageData, ModelUsage } from "./data";
import type { Timeframe } from "./store";
import { DEFAULT_TIMEFRAME } from "./store";

// ── Zod schemas for IPC boundary validation ───────────────────────────────────
// Codex returns the same `ClaudeStats` shape from the Rust side — cost_usd is
// always 0.0 and projected_monthly_cost_usd is always null because the Codex
// CLI does not log USD cost.

const RawDailyUsageSchema = z.object({
  date: z.string(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_tokens: z.number(),
});

const RawModelStatSchema = z.object({
  name: z.string(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_tokens: z.number(),
  cost_usd: z.number(),
});

const RawCodexStatsSchema = z.object({
  daily_usage: z.array(RawDailyUsageSchema),
  model_stats: z.array(RawModelStatSchema),
  total_sessions: z.number(),
  total_cost_usd: z.number(),
  trend_pct: z.number().nullable(),
  projected_monthly_cost_usd: z.number().nullable(),
});

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  "1d": 1, "3d": 3, "7d": 7, "30d": 30,
};

// ── Mapped result ─────────────────────────────────────────────────────────────

export interface CodexModelDetail {
  name: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface CodexUsageResult {
  usageData: UsageData[];
  modelUsage: ModelUsage[];
  modelDetails: CodexModelDetail[];
  totalTokens: number;
  totalSessions: number;
  totalCostUsd: number;
  trendPct: number | null;
  projectedMonthlyCostUsd: number | null;
}

export async function fetchCodexStats(timeframe: Timeframe = DEFAULT_TIMEFRAME): Promise<CodexUsageResult> {
  const days = TIMEFRAME_DAYS[timeframe];
  const payload = await invoke("get_codex_stats", { days });
  const parsed = RawCodexStatsSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`IPC schema mismatch — check Rust/TS field alignment: ${parsed.error.message}`);
  }
  const raw = parsed.data;

  const usageData: UsageData[] = raw.daily_usage.map((d) => ({
    date: d.date,
    inputTokens: d.input_tokens,
    outputTokens: d.output_tokens,
    cacheTokens: d.cache_tokens,
  }));

  let totalTokens = 0;
  const modelUsage: ModelUsage[] = [];
  const modelDetails: CodexModelDetail[] = [];

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

export async function onCodexStatsUpdated(onUpdate: () => void): Promise<() => void> {
  return listen<void>("codex-stats-updated", () => onUpdate());
}
