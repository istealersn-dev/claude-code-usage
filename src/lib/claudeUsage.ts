import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import type { UsageData, ModelUsage } from "./data";

// ── Zod schemas for IPC boundary validation ───────────────────────────────────

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

const RawClaudeStatsSchema = z.object({
  daily_usage: z.array(RawDailyUsageSchema),
  model_stats: z.array(RawModelStatSchema),
  total_sessions: z.number(),
  total_cost_usd: z.number(),
  trend_pct: z.number().nullable(),
  projected_monthly_cost_usd: z.number().nullable(),
});

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
  const raw = RawClaudeStatsSchema.parse(await invoke("get_claude_stats"));

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
