import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { z } from "zod";
import type { UsageData, ModelUsage } from "./data";
import { DEFAULT_TIMEFRAME, TIMEFRAME_DAYS } from "./store";
import type { Timeframe } from "./store";
import { RawDailyUsageSchema, RawModelStatSchema, RawProjectStatSchema } from "./ipcSchemas";

// Codex returns the same ProviderStats shape from Rust — cost_usd and
// projected_monthly_cost_usd are always 0/null (Codex CLI logs no USD cost).
const RawCodexStatsSchema = z.object({
  daily_usage: z.array(RawDailyUsageSchema),
  model_stats: z.array(RawModelStatSchema),
  project_stats: z.array(RawProjectStatSchema),
  total_sessions: z.number(),
  total_cost_usd: z.number(),
  trend_pct: z.number().nullable(),
  projected_monthly_cost_usd: z.number().nullable(),
});

// ── Mapped result ─────────────────────────────────────────────────────────────

export interface CodexUsageResult {
  usageData: UsageData[];
  modelUsage: ModelUsage[];
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

  for (const m of raw.model_stats) {
    const total = m.input_tokens + m.output_tokens + m.cache_tokens;
    totalTokens += total;
    modelUsage.push({ name: m.name, tokens: total, cost: m.cost_usd });
  }

  return {
    usageData,
    modelUsage,
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
