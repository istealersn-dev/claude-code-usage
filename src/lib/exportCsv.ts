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
  a.download = `ai-pulse-${provider.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
