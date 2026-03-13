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

export interface ClaudeUsageResult {
  usageData: UsageData[];
  modelUsage: ModelUsage[];
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
    cost: 0,
  }));

  let totalTokens = 0;
  const modelUsage: ModelUsage[] = raw.model_stats.map((m) => {
    const tokens = m.input_tokens + m.output_tokens + m.cache_tokens;
    totalTokens += tokens;
    return { name: m.name, tokens, cost: 0 };
  });

  return {
    usageData,
    modelUsage,
    totalTokens,
    totalSessions: raw.total_sessions,
  };
}
