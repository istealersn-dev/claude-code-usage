export type Provider = 'claude' | 'codex' | 'gemini';

/** The provider selected by default on first launch. */
export const DEFAULT_PROVIDER: Provider = 'claude';

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

export interface DetailedProjectAnalytics {
  name: string;
  sessions: number;
  toolsUsed: { name: string; count: number }[];
  pluginsUsed: { name: string; count: number }[];
  mcpUsage: { name: string; requests: number }[];
  skillsUsage: { name: string; count: number }[];
}

export interface ProviderData {
  name: string;
  themeColor: string;
  themeDark: string;
  contextLimit: number;
  currentUsage: number;
  usageData: UsageData[];
  projectUsage: ProjectUsage[];
  modelUsage: ModelUsage[];
  detailedAnalytics: DetailedProjectAnalytics[];
}

const claudeData: ProviderData = {
  name: "AI Pulse",
  themeColor: "#ffd60a",
  themeDark: "#ffc300",
  contextLimit: 200000,
  currentUsage: 145000,
  usageData: [
    { date: "Feb 15", inputTokens: 120000, outputTokens: 15000, cacheTokens: 450000, cost: 0.85 },
    { date: "Feb 16", inputTokens: 150000, outputTokens: 18000, cacheTokens: 520000, cost: 1.10 },
    { date: "Feb 17", inputTokens: 90000, outputTokens: 12000, cacheTokens: 300000, cost: 0.65 },
    { date: "Feb 18", inputTokens: 200000, outputTokens: 25000, cacheTokens: 600000, cost: 1.45 },
    { date: "Feb 19", inputTokens: 180000, outputTokens: 22000, cacheTokens: 580000, cost: 1.30 },
    { date: "Feb 20", inputTokens: 250000, outputTokens: 30000, cacheTokens: 800000, cost: 1.95 },
    { date: "Feb 21", inputTokens: 160000, outputTokens: 19000, cacheTokens: 480000, cost: 1.15 },
  ],
  projectUsage: [
    { name: "e-commerce-platform", tokens: 1250000, cost: 4.50 },
    { name: "mobile-app-v2", tokens: 850000, cost: 3.20 },
    { name: "internal-tools", tokens: 450000, cost: 1.80 },
  ],
  modelUsage: [
    { name: "claude-3-5-sonnet", tokens: 2100000, cost: 8.50 },
    { name: "claude-3-haiku", tokens: 450000, cost: 1.00 },
  ],
  detailedAnalytics: [
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
    }
  ]
};

const codexData: ProviderData = {
  name: "OpenAI Codex",
  themeColor: "#10a37f",
  themeDark: "#0d8a6a",
  contextLimit: 128000,
  currentUsage: 85000,
  usageData: [
    { date: "Feb 15", inputTokens: 80000, outputTokens: 10000, cacheTokens: 0, cost: 0.55 },
    { date: "Feb 16", inputTokens: 95000, outputTokens: 12000, cacheTokens: 0, cost: 0.65 },
    { date: "Feb 17", inputTokens: 60000, outputTokens: 8000, cacheTokens: 0, cost: 0.40 },
    { date: "Feb 18", inputTokens: 120000, outputTokens: 15000, cacheTokens: 0, cost: 0.85 },
    { date: "Feb 19", inputTokens: 110000, outputTokens: 14000, cacheTokens: 0, cost: 0.75 },
    { date: "Feb 20", inputTokens: 150000, outputTokens: 20000, cacheTokens: 0, cost: 1.10 },
    { date: "Feb 21", inputTokens: 100000, outputTokens: 12000, cacheTokens: 0, cost: 0.70 },
  ],
  projectUsage: [
    { name: "e-commerce-platform", tokens: 850000, cost: 3.50 },
    { name: "legacy-api", tokens: 450000, cost: 1.20 },
  ],
  modelUsage: [
    { name: "gpt-4o", tokens: 1100000, cost: 4.20 },
    { name: "gpt-4-turbo", tokens: 200000, cost: 0.50 },
  ],
  detailedAnalytics: [
    {
      name: "e-commerce-platform",
      sessions: 35,
      toolsUsed: [
        { name: "Code Generation", count: 120 },
        { name: "Refactoring", count: 60 },
      ],
      pluginsUsed: [
        { name: "Copilot Chat", count: 150 },
      ],
      mcpUsage: [],
      skillsUsage: [
        { name: "TypeScript", count: 180 },
        { name: "React", count: 150 },
      ],
    },
    {
      name: "legacy-api",
      sessions: 12,
      toolsUsed: [
        { name: "Debugging", count: 45 },
        { name: "Code Generation", count: 20 },
      ],
      pluginsUsed: [
        { name: "Copilot Chat", count: 65 },
      ],
      mcpUsage: [],
      skillsUsage: [
        { name: "Java", count: 120 },
        { name: "Spring", count: 85 },
      ],
    }
  ]
};

const geminiData: ProviderData = {
  name: "Google Gemini",
  themeColor: "#8ab4f8",
  themeDark: "#669df6",
  contextLimit: 1000000,
  currentUsage: 450000,
  usageData: [
    { date: "Feb 15", inputTokens: 220000, outputTokens: 25000, cacheTokens: 150000, cost: 0.45 },
    { date: "Feb 16", inputTokens: 250000, outputTokens: 28000, cacheTokens: 180000, cost: 0.50 },
    { date: "Feb 17", inputTokens: 190000, outputTokens: 22000, cacheTokens: 100000, cost: 0.35 },
    { date: "Feb 18", inputTokens: 300000, outputTokens: 35000, cacheTokens: 200000, cost: 0.65 },
    { date: "Feb 19", inputTokens: 280000, outputTokens: 32000, cacheTokens: 180000, cost: 0.60 },
    { date: "Feb 20", inputTokens: 350000, outputTokens: 40000, cacheTokens: 250000, cost: 0.80 },
    { date: "Feb 21", inputTokens: 260000, outputTokens: 29000, cacheTokens: 160000, cost: 0.55 },
  ],
  projectUsage: [
    { name: "data-pipeline", tokens: 1550000, cost: 2.50 },
    { name: "ml-models", tokens: 950000, cost: 1.40 },
  ],
  modelUsage: [
    { name: "gemini-1.5-pro", tokens: 1800000, cost: 3.10 },
    { name: "gemini-1.5-flash", tokens: 700000, cost: 0.80 },
  ],
  detailedAnalytics: [
    {
      name: "data-pipeline",
      sessions: 25,
      toolsUsed: [
        { name: "Code Generation", count: 85 },
        { name: "Data Analysis", count: 65 },
      ],
      pluginsUsed: [
        { name: "Gemini Code Assist", count: 110 },
      ],
      mcpUsage: [
        { name: "BigQuery Schema", requests: 45 },
      ],
      skillsUsage: [
        { name: "Python", count: 160 },
        { name: "SQL", count: 120 },
      ],
    },
    {
      name: "ml-models",
      sessions: 18,
      toolsUsed: [
        { name: "Code Generation", count: 60 },
        { name: "Debugging", count: 40 },
      ],
      pluginsUsed: [
        { name: "Gemini Code Assist", count: 80 },
      ],
      mcpUsage: [
        { name: "Vertex AI Docs", requests: 25 },
      ],
      skillsUsage: [
        { name: "Python", count: 140 },
        { name: "TensorFlow", count: 90 },
      ],
    }
  ]
};

export const PROVIDERS: Record<Provider, ProviderData> = {
  claude: claudeData,
  codex: codexData,
  gemini: geminiData
};
