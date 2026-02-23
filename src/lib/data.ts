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

export const TOTAL_CONTEXT_LIMIT = 200000; // 200k context window
export const CURRENT_CONTEXT_USAGE = 145000; // Current usage

export interface DetailedProjectAnalytics {
  name: string;
  sessions: number;
  toolsUsed: { name: string; count: number }[];
  pluginsUsed: { name: string; count: number }[];
  mcpUsage: { name: string; requests: number }[];
  skillsUsage: { name: string; count: number }[];
}

export const DETAILED_ANALYTICS: DetailedProjectAnalytics[] = [
  {
    name: "e-commerce-platform",
    sessions: 42,
    toolsUsed: [
      { name: "Code Generation", count: 156 },
      { name: "Refactoring", count: 89 },
      { name: "Debugging", count: 45 },
    ],
    pluginsUsed: [
      { name: "React Snippets", count: 120 },
      { name: "Tailwind CSS", count: 85 },
    ],
    mcpUsage: [
      { name: "Database Schema", requests: 34 },
      { name: "API Docs", requests: 56 },
    ],
    skillsUsage: [
      { name: "TypeScript", count: 210 },
      { name: "React", count: 180 },
      { name: "Node.js", count: 95 },
    ],
  },
  {
    name: "mobile-app-v2",
    sessions: 28,
    toolsUsed: [
      { name: "Code Generation", count: 98 },
      { name: "UI Components", count: 76 },
      { name: "Testing", count: 32 },
    ],
    pluginsUsed: [
      { name: "React Native", count: 145 },
      { name: "Expo Tools", count: 67 },
    ],
    mcpUsage: [
      { name: "Design System", requests: 45 },
      { name: "API Docs", requests: 23 },
    ],
    skillsUsage: [
      { name: "React Native", count: 160 },
      { name: "TypeScript", count: 140 },
      { name: "Jest", count: 45 },
    ],
  },
  {
    name: "internal-tools",
    sessions: 15,
    toolsUsed: [
      { name: "Scripting", count: 65 },
      { name: "Data Processing", count: 43 },
    ],
    pluginsUsed: [
      { name: "Python Tools", count: 88 },
    ],
    mcpUsage: [
      { name: "Internal Wiki", requests: 78 },
    ],
    skillsUsage: [
      { name: "Python", count: 120 },
      { name: "SQL", count: 85 },
      { name: "Bash", count: 30 },
    ],
  },
];
