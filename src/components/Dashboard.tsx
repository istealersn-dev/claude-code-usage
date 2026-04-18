import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LiquidGauge } from "./LiquidGauge";
import { UsageChart } from "./UsageChart";
import { PROVIDERS, Provider } from "@/lib/data";
import { fetchClaudeStats, onClaudeStatsUpdated } from "@/lib/claudeUsage";
import { useAppStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import type { ClaudeUsageResult } from "@/lib/claudeUsage";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Box, Layers, Zap, TrendingUp, DollarSign, RefreshCw, Code2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const PROVIDER_ICONS: Record<Provider, React.ElementType> = {
  claude: Zap,
  codex: Code2,
  gemini: Sparkles,
};

const mockRefresh = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 1500));

export function Dashboard() {
  const { provider, setProvider } = useAppStore(
    useShallow((s) => ({ provider: s.provider, setProvider: s.setProvider }))
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerRef = useRef(provider);

  const providerData = PROVIDERS[provider];

  // Async overrides — set only from fetch callbacks, never synchronously in effects
  const [claudeUsageData, setClaudeUsageData] = useState<typeof providerData.usageData | null>(null);
  const [realModelUsage, setRealModelUsage] = useState<typeof providerData.modelUsage | null>(null);
  const [claudeTotalCost, setClaudeTotalCost] = useState<number | null>(null);
  const [claudeTrendPct, setClaudeTrendPct] = useState<number | null>(null);
  const [claudeProjectedCost, setClaudeProjectedCost] = useState<number | null>(null);
  // Non-Claude mock-refresh override, keyed by provider to avoid stale data across provider switches
  const [mockRefreshData, setMockRefreshData] = useState<{
    provider: Provider;
    usageData: typeof providerData.usageData;
    contextUsage: number;
  } | null>(null);

  const applyClaudeResult = useCallback((result: ClaudeUsageResult) => {
    if (result.usageData.length > 0) setClaudeUsageData(result.usageData);
    if (result.modelUsage.length > 0) setRealModelUsage(result.modelUsage);
    setClaudeTotalCost(result.totalCostUsd > 0 ? result.totalCostUsd : null);
    setClaudeTrendPct(result.trendPct);
    setClaudeProjectedCost(result.projectedMonthlyCostUsd ?? null);
  }, []);

  // Reset viewMode when provider changes — setState during render is the React-recommended
  // pattern for "derived state from props" and avoids synchronous setState inside effects.
  const [prevProvider, setPrevProvider] = useState<Provider>(provider);
  const [viewMode, setViewMode] = useState<"projects" | "models">("models");
  if (prevProvider !== provider) {
    setPrevProvider(provider);
    setViewMode(provider === "claude" ? "models" : "projects");
  }

  // Derived display values — no synchronous setState in effects needed
  const usageData = provider === "claude"
    ? (claudeUsageData ?? providerData.usageData)
    : (mockRefreshData?.provider === provider ? mockRefreshData.usageData : providerData.usageData);
  const contextUsage = provider !== "claude" && mockRefreshData?.provider === provider
    ? mockRefreshData.contextUsage
    : providerData.currentUsage;
  const displayModelUsage = (provider === "claude" ? realModelUsage : null) ?? providerData.modelUsage;

  const contextPercentage = (contextUsage / providerData.contextLimit) * 100;
  const totalCost = providerData.projectUsage.reduce((acc, curr) => acc + curr.cost, 0);

  const ProviderIcon = PROVIDER_ICONS[provider];

  // Keep ref in sync so async callbacks can check the current provider
  useEffect(() => { providerRef.current = provider; }, [provider]);

  // Fetch real Claude stats — setState only in async callbacks, never synchronously.
  // Also subscribes to the Rust-side file watcher so edits to stats-cache.json
  // auto-refresh the dashboard without needing manual refresh.
  useEffect(() => {
    if (provider !== "claude") return;
    let cancelled = false;
    let unlistenFn: (() => void) | null = null;
    fetchClaudeStats()
      .then((result) => {
        if (cancelled) return;
        applyClaudeResult(result);
      })
      .catch((e: unknown) => { if (import.meta.env.DEV) console.warn("stats-cache fallback:", e); });
    onClaudeStatsUpdated(() => {
      if (cancelled) return;
      fetchClaudeStats()
        .then((result) => {
          if (cancelled) return;
          applyClaudeResult(result);
        })
        .catch(() => {});
    }).then((fn) => { unlistenFn = fn; }).catch(() => {});
    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, [provider, applyClaudeResult]);

  const handleRefresh = () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setError(null);

    if (provider === "claude") {
      // Re-fetch real data from the local stats file
      fetchClaudeStats()
        .then((result) => {
          if (providerRef.current !== "claude") return;
          applyClaudeResult(result);
          setIsRefreshing(false);
        })
        .catch(() => {
          setError("Update failed");
          setIsRefreshing(false);
        });
    } else {
      // Mock refresh for non-Claude providers
      mockRefresh()
        .then(() => {
          const randomFactor = 0.95 + Math.random() * 0.1;
          const newContextUsage = Math.min(
            providerData.contextLimit,
            Math.max(0, providerData.currentUsage * randomFactor)
          );
          const newData = [...providerData.usageData];
          const lastDay = { ...newData[newData.length - 1] };
          lastDay.inputTokens = Math.floor(lastDay.inputTokens * (0.9 + Math.random() * 0.2));
          lastDay.outputTokens = Math.floor(lastDay.outputTokens * (0.9 + Math.random() * 0.2));
          newData[newData.length - 1] = lastDay;
          setMockRefreshData({ provider, usageData: newData, contextUsage: newContextUsage });
          setIsRefreshing(false);
        })
        .catch(() => {
          setError("Update failed");
          setIsRefreshing(false);
        });
    }
  };

  return (
    /* backdrop-blur removed: native vibrancy handles blur on macOS */
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="relative w-[360px] sm:w-[400px] max-h-[calc(100vh-50px)] flex flex-col bg-[#000814]/60 border border-[#003566] rounded-2xl shadow-2xl overflow-hidden text-white font-sans"
      style={{ '--theme-color': providerData.themeColor } as React.CSSProperties}
    >
      {/* Header */}
        <div className="shrink-0 bg-[#001d3d]/50 border-b border-[#003566] flex flex-col">
          <div className="p-3 sm:p-4 pb-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ProviderIcon className="w-4 h-4" style={{ color: providerData.themeColor }} />
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="bg-transparent text-xs sm:text-sm font-semibold tracking-wide uppercase outline-none cursor-pointer appearance-none"
                style={{ color: providerData.themeColor }}
              >
                <option value="claude">AI Pulse</option>
                <option value="codex">OpenAI Codex</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
                <AnimatePresence mode="wait">
                  {error ? (
                    <motion.span
                      key="error"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-[10px] sm:text-xs text-red-400 font-mono"
                    >
                      {error}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="cost"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-[10px] sm:text-xs text-gray-400 font-mono"
                    >
                      {provider === "claude"
                        ? (claudeTotalCost !== null ? `$${claudeTotalCost.toFixed(2)} lifetime` : "—")
                        : `$${totalCost.toFixed(2)} this month`}
                    </motion.span>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-2 text-gray-400">
                    <RefreshCw
                      className={cn(
                        "w-3 h-3 hover:text-white cursor-pointer transition-all",
                        isRefreshing && "animate-spin text-[#ffd60a]"
                      )}
                      onClick={handleRefresh}
                    />
                </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 custom-scrollbar">
          {/* Top Section: Liquid Gauge & Key Stats */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex flex-col items-center">
               <div key={`gauge-wrapper-${provider}`}>
                  <LiquidGauge percentage={contextPercentage} isError={!!error} color={providerData.themeColor} darkColor={providerData.themeDark} />
               </div>
               <div className="mt-2 text-center">
                 <p className="text-[10px] text-gray-400 uppercase tracking-wider">Context Limit</p>
                 <p className="text-xs font-mono text-white">
                   {(contextUsage / 1000).toFixed(0)}k / {(providerData.contextLimit / 1000).toFixed(0)}k
                 </p>
               </div>
            </div>

            <div className="flex-1 space-y-2 sm:space-y-3">
               <div className="bg-[#001d3d]/40 p-2 sm:p-3 rounded-xl border border-[#003566]/50">
                 <div className="flex items-center gap-2 mb-1" style={{ color: providerData.themeColor }}>
                   <TrendingUp className="w-3 h-3" />
                   <span className="text-[10px] uppercase font-bold">Trend</span>
                 </div>
                 <p className="text-[10px] sm:text-xs text-gray-300 leading-tight">
                   {provider === "claude" && claudeTrendPct !== null ? (
                     <>
                       Usage{" "}
                       <span className="font-bold" style={{ color: providerData.themeColor }}>
                         {claudeTrendPct >= 0 ? "+" : ""}{claudeTrendPct.toFixed(1)}%
                       </span>{" "}
                       vs last week.
                     </>
                   ) : (
                     <>Usage up <span className="font-bold" style={{ color: providerData.themeColor }}>—</span> from last week.</>
                   )}
                 </p>
               </div>

               <div className="bg-[#001d3d]/40 p-2 sm:p-3 rounded-xl border border-[#003566]/50">
                 <div className="flex items-center gap-2 mb-1" style={{ color: providerData.themeColor }}>
                   <DollarSign className="w-3 h-3" />
                   <span className="text-[10px] uppercase font-bold">Projected</span>
                 </div>
                 <p className="text-[10px] sm:text-xs text-gray-300 leading-tight">
                   Est.{" "}
                   <span className="text-white font-mono">
                     {provider === "claude" && claudeProjectedCost !== null
                       ? `$${claudeProjectedCost.toFixed(2)}`
                       : "—"}
                   </span>{" "}
                   by month end.
                 </p>
               </div>
            </div>
          </div>

          {/* Chart Section */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> 30-Day Token Trend
            </h3>
            <div key={`chart-wrapper-${provider}`} className="bg-[#001d3d]/30 rounded-xl p-2 border border-[#003566]/30 h-[160px] sm:h-[200px]">
              <UsageChart data={usageData} color={providerData.themeColor} />
            </div>
          </div>

          {/* Breakdown Section with Toggle */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex bg-[#001d3d] p-0.5 rounded-lg border border-[#003566]">
                <button
                  onClick={() => setViewMode("projects")}
                  className={cn(
                    "px-3 py-1 text-[10px] uppercase font-bold rounded-md transition-all flex items-center gap-1",
                    viewMode === "projects"
                      ? "bg-[#003566] shadow-sm"
                      : "text-gray-400 hover:text-white"
                  )}
                  style={viewMode === "projects" ? { color: providerData.themeColor } : {}}
                >
                  <Layers className="w-3 h-3" /> Projects
                </button>
                <button
                  onClick={() => setViewMode("models")}
                  className={cn(
                    "px-3 py-1 text-[10px] uppercase font-bold rounded-md transition-all flex items-center gap-1",
                    viewMode === "models"
                      ? "bg-[#003566] shadow-sm"
                      : "text-gray-400 hover:text-white"
                  )}
                  style={viewMode === "models" ? { color: providerData.themeColor } : {}}
                >
                  <Box className="w-3 h-3" /> Models
                </button>
              </div>
            </div>

            <div className="bg-[#001d3d]/20 rounded-xl p-2 sm:p-3 border border-[#003566]/30 min-h-[120px]">
              <AnimatePresence mode="wait">
                {viewMode === "projects" ? (
                  <motion.div
                    key="projects"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1 sm:space-y-2"
                  >
                    {provider === "claude" ? (
                      <p className="text-[10px] text-gray-500 text-center py-4 px-2 leading-relaxed">
                        Project breakdown is not available — Claude Code does not expose per-project usage in stats-cache.json
                      </p>
                    ) : (
                      providerData.projectUsage.map((project) => (
                        <div key={project.name} className="relative flex justify-between items-center text-[10px] sm:text-xs group cursor-pointer p-1.5 sm:p-2 hover:bg-[#001d3d]/50 rounded-lg transition-colors">
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#000814] border border-[#003566] text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-10 shadow-xl translate-y-2 group-hover:translate-y-0">
                            <span className="font-mono" style={{ color: providerData.themeColor }}>{(project.tokens / 1000).toFixed(0)}k</span> tokens
                            <span className="mx-1 text-gray-500">•</span>
                            <span className="text-white font-mono">${project.cost.toFixed(2)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#003566] transition-colors" style={{ backgroundColor: providerData.themeColor }} />
                            <span className="text-gray-300 group-hover:text-white transition-colors">
                              {project.name}
                            </span>
                          </div>
                          <span className="font-mono opacity-80 group-hover:opacity-100" style={{ color: providerData.themeColor }}>
                            ${project.cost.toFixed(2)}
                          </span>
                        </div>
                      ))
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="models"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1 sm:space-y-2"
                  >
                    {displayModelUsage.map((model) => (
                      <div key={model.name} className="flex justify-between items-center text-[10px] sm:text-xs group cursor-pointer p-1.5 sm:p-2 hover:bg-[#001d3d]/50 rounded-lg transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#003566] transition-colors" style={{ backgroundColor: providerData.themeColor }} />
                          <span className="text-gray-300 group-hover:text-white transition-colors">
                            {model.name}
                          </span>
                        </div>
                        <span className="font-mono opacity-80 group-hover:opacity-100" style={{ color: providerData.themeColor }}>
                          {model.cost === 0 ? "—" : `$${model.cost.toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-[#000814] p-3 border-t border-[#003566] text-center">
          <button
            onClick={() => {
              WebviewWindow.getByLabel("detailed-report")
                .then((existing) => {
                  if (existing) return existing.setFocus();
                  new WebviewWindow("detailed-report", {
                    url: `/?window=report&provider=${provider}`,
                    title: "Detailed Usage Report",
                    width: 1000,
                    height: 800,
                    decorations: true,
                    resizable: true,
                  });
                })
                .catch(() => setError("Could not open report"));
            }}
            className="text-[10px] transition-colors uppercase tracking-widest font-bold"
            style={{ color: providerData.themeColor }}
          >
            View Detailed Report
          </button>
        </div>
      </motion.div>
  );
}
