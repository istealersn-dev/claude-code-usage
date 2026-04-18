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
}

interface RawClaudeStats {
  daily_usage: RawDailyUsage[];
  model_stats: RawModelStat[];
  total_sessions: number;
}

// ── Mapped result ─────────────────────────────────────────────────────────────

export interface ModelDetail {
  name: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  totalTokens: number;
}

export interface ClaudeUsageResult {
  usageData: UsageData[];
  modelUsage: ModelUsage[];
  modelDetails: ModelDetail[];
  totalTokens: number;
  totalSessions: number;
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
    modelUsage.push({ name: m.name, tokens: total, cost: 0 });
    modelDetails.push({
      name: m.name,
      inputTokens: m.input_tokens,
      outputTokens: m.output_tokens,
      cacheTokens: m.cache_tokens,
      totalTokens: total,
    });
  }

  return {
    usageData,
    modelUsage,
    modelDetails,
    totalTokens,
    totalSessions: raw.total_sessions,
  };
}
