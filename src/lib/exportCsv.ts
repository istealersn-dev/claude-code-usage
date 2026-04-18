import type { UsageData } from "./data";
import type { ModelDetail } from "./claudeUsage";

const CSV_MIME_TYPE = "text/csv;charset=utf-8;";
const CSV_LINE_ENDING = "\r\n";

function toCsvRow(cells: (string | number)[]): string {
  return cells
    .map((c) => {
      const s = String(c);
      if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(",");
}

export function buildUsageCsv(
  usageData: UsageData[],
  modelDetails: ModelDetail[],
  provider: string,
  now: Date
): string {
  const lines: string[] = [];

  lines.push(toCsvRow([`AI Pulse Export — ${provider} — ${now.toISOString()}`]));
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
  return lines.join(CSV_LINE_ENDING);
}

export function exportUsageCsv(
  usageData: UsageData[],
  modelDetails: ModelDetail[],
  provider: string
): void {
  const now = new Date();
  const csv = buildUsageCsv(usageData, modelDetails, provider, now);
  const blob = new Blob([csv], { type: CSV_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-pulse-${provider.toLowerCase()}-${now.toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
