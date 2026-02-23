export interface UsageData {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  cost: number;
}

export interface ProjectUsage {
  name: string;
  tokens: number;
  cost: number;
}

export interface ModelUsage {
  name: string;
  tokens: number;
  cost: number;
}

export interface ToolUsage {
  name: string;
  calls: number;
  tokens: number;
}

export interface MCPUsage {
  server: string;
  queries: number;
  tokens: number;
}

export interface ProjectBreakdown {
  name: string;
  sessions: number;
  avgSessionLength: string;
  topTool: string;
  topMCP: string;
  tokens: number;
}

export const MOCK_USAGE_DATA: UsageData[] = [
  { date: "Feb 15", inputTokens: 120000, outputTokens: 15000, cacheTokens: 450000, cost: 0.85 },
  { date: "Feb 16", inputTokens: 150000, outputTokens: 18000, cacheTokens: 520000, cost: 1.10 },
  { date: "Feb 17", inputTokens: 90000, outputTokens: 12000, cacheTokens: 300000, cost: 0.65 },
  { date: "Feb 18", inputTokens: 200000, outputTokens: 25000, cacheTokens: 600000, cost: 1.45 },
  { date: "Feb 19", inputTokens: 180000, outputTokens: 22000, cacheTokens: 580000, cost: 1.30 },
  { date: "Feb 20", inputTokens: 250000, outputTokens: 30000, cacheTokens: 800000, cost: 1.95 },
  { date: "Feb 21", inputTokens: 160000, outputTokens: 19000, cacheTokens: 480000, cost: 1.15 },
];

export const PROJECT_USAGE: ProjectUsage[] = [
  { name: "e-commerce-platform", tokens: 1250000, cost: 4.50 },
  { name: "mobile-app-v2", tokens: 850000, cost: 3.20 },
  { name: "internal-tools", tokens: 450000, cost: 1.80 },
];

export const MODEL_USAGE: ModelUsage[] = [
  { name: "claude-3-5-sonnet", tokens: 2100000, cost: 8.50 },
  { name: "claude-3-haiku", tokens: 450000, cost: 1.00 },
];

export const TOOL_USAGE: ToolUsage[] = [
  { name: "edit_file", calls: 342, tokens: 850000 },
  { name: "view_file", calls: 512, tokens: 420000 },
  { name: "shell_exec", calls: 128, tokens: 150000 },
  { name: "read_url_content", calls: 45, tokens: 80000 },
];

export const MCP_USAGE: MCPUsage[] = [
  { server: "github-mcp", queries: 156, tokens: 320000 },
  { server: "postgres-mcp", queries: 89, tokens: 180000 },
  { server: "jira-mcp", queries: 34, tokens: 50000 },
];

export const DETAILED_PROJECT_BREAKDOWN: ProjectBreakdown[] = [
  { name: "e-commerce-platform", sessions: 42, avgSessionLength: "45m", topTool: "edit_file", topMCP: "postgres-mcp", tokens: 1250000 },
  { name: "mobile-app-v2", sessions: 28, avgSessionLength: "32m", topTool: "view_file", topMCP: "github-mcp", tokens: 850000 },
  { name: "internal-tools", sessions: 15, avgSessionLength: "18m", topTool: "shell_exec", topMCP: "jira-mcp", tokens: 450000 },
];

export const AI_INSIGHTS = [
  "You are spending 45% of tokens on 'view_file' in 'mobile-app-v2'. Consider using targeted grep searches to reduce context window usage.",
  "The 'postgres-mcp' server is heavily queried in 'e-commerce-platform'. Caching schema definitions could save ~$1.20/week.",
  "Session lengths have increased by 20% this week, correlating with a 15% drop in error rates. Claude is successfully resolving complex tasks.",
];

export const TOTAL_CONTEXT_LIMIT = 200000; // 200k context window
export const CURRENT_CONTEXT_USAGE = 145000; // Current usage
