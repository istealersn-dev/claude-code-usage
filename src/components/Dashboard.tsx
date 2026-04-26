import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LiquidGauge } from "./LiquidGauge";
import { UsageChart } from "./UsageChart";
import { PROVIDERS, Provider } from "@/lib/data";
import { fetchClaudeStats, onClaudeStatsUpdated } from "@/lib/claudeUsage";
import { fetchCodexStats, onCodexStatsUpdated } from "@/lib/codexUsage";
import { useAppStore, ALL_TIMEFRAMES } from "@/lib/store";
import type { Timeframe } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import type { ClaudeUsageResult } from "@/lib/claudeUsage";
import type { CodexUsageResult } from "@/lib/codexUsage";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { Box, Layers, Zap, TrendingUp, DollarSign, RefreshCw, Code2, Sparkles, Settings, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsModal } from "./SettingsModal";

const PROVIDER_ICONS: Record<Provider, React.ElementType> = {
  claude: Zap,
  codex: Code2,
  gemini: Sparkles,
};

const mockRefresh = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 1500));

export function Dashboard() {
  const { provider, setProvider, timeframe, setTimeframe, isSettingsOpen, openSettings, closeSettings, resetPreferences, budgetLimitUsd, autoLaunchEnabled, setAutoLaunchEnabled } = useAppStore(
    useShallow((s) => ({
      provider: s.provider,
      setProvider: s.setProvider,
      timeframe: s.timeframe,
      setTimeframe: s.setTimeframe,
      isSettingsOpen: s.isSettingsOpen,
      openSettings: s.openSettings,
      closeSettings: s.closeSettings,
      resetPreferences: s.resetPreferences,
      budgetLimitUsd: s.budgetLimitUsd,
      autoLaunchEnabled: s.autoLaunchEnabled,
      setAutoLaunchEnabled: s.setAutoLaunchEnabled,
    }))
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
  // Codex equivalents — cost always null (Codex CLI does not log USD).
  const [codexUsageData, setCodexUsageData] = useState<typeof providerData.usageData | null>(null);
  const [realCodexModelUsage, setRealCodexModelUsage] = useState<typeof providerData.modelUsage | null>(null);
  const [codexTotalCost, setCodexTotalCost] = useState<number | null>(null);
  const [codexTrendPct, setCodexTrendPct] = useState<number | null>(null);
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

  const applyCodexResult = useCallback((result: CodexUsageResult) => {
    setCodexUsageData(result.usageData);
    setRealCodexModelUsage(result.modelUsage);
    setCodexTotalCost(result.totalCostUsd > 0 ? result.totalCostUsd : null);
    setCodexTrendPct(result.trendPct);
  }, []);

  // Reset viewMode when provider changes — setState during render is the React-recommended
  // pattern for "derived state from props" and avoids synchronous setState inside effects.
  const [prevProvider, setPrevProvider] = useState<Provider>(provider);
  const [viewMode, setViewMode] = useState<"projects" | "models">("models");
  const isRealDataProvider = provider === "claude" || provider === "codex";

  if (prevProvider !== provider) {
    setPrevProvider(provider);
    // Claude + Codex expose models but no per-project data — default to models.
    setViewMode(isRealDataProvider ? "models" : "projects");
  }

  // Derived display values — no synchronous setState in effects needed.
  // Order of preference per provider:
  //   claude → real fetched data, else mock
  //   codex  → real fetched data, else mock
  //   other  → mock-refresh data (keyed by provider), else mock
  const usageData = (() => {
    if (provider === "claude") return claudeUsageData ?? providerData.usageData;
    if (provider === "codex") return codexUsageData ?? providerData.usageData;
    return mockRefreshData?.provider === provider ? mockRefreshData.usageData : providerData.usageData;
  })();
  const contextUsage = provider !== "claude" && provider !== "codex" && mockRefreshData?.provider === provider
    ? mockRefreshData.contextUsage
    : providerData.currentUsage;
  const displayModelUsage = (() => {
    if (provider === "claude") return realModelUsage ?? providerData.modelUsage;
    if (provider === "codex") return realCodexModelUsage ?? providerData.modelUsage;
    return providerData.modelUsage;
  })();

  const contextPercentage = (contextUsage / providerData.contextLimit) * 100;
  const totalCost = providerData.projectUsage.reduce((acc, curr) => acc + curr.cost, 0);

  const ProviderIcon = PROVIDER_ICONS[provider];

  const getCostLabel = () => {
    if (provider === "claude") return claudeTotalCost !== null ? `$${claudeTotalCost.toFixed(2)} lifetime` : "—";
    if (provider === "codex") return codexTotalCost !== null ? `$${codexTotalCost.toFixed(2)} lifetime` : "—";
    return `$${totalCost.toFixed(2)} this month`;
  };

  // Keep ref in sync so async callbacks can check the current provider
  useEffect(() => { providerRef.current = provider; }, [provider]);

  // On mount, sync the Zustand store from the OS's real autostart state —
  // the LaunchAgent plist may have been removed outside the app, so the
  // persisted boolean cannot be trusted as source of truth.
  useEffect(() => {
    invoke<boolean>("is_autolaunch_enabled")
      .then((enabled) => setAutoLaunchEnabled(enabled))
      .catch((e: unknown) => {
        if (import.meta.env.DEV) console.warn("is_autolaunch_enabled failed:", e);
      });
  }, [setAutoLaunchEnabled]);

  const handleToggleAutoLaunch = useCallback(
    (enable: boolean) => {
      invoke<void>("toggle_autolaunch", { enable })
        .then(() => setAutoLaunchEnabled(enable))
        .catch((e: unknown) => {
          if (import.meta.env.DEV) console.warn("toggle_autolaunch failed:", e);
          setAutoLaunchEnabled(!enable);
          setError("Auto-launch toggle failed");
        });
    },
    [setAutoLaunchEnabled]
  );

  const handleResetPreferences = useCallback(() => {
    invoke<void>("toggle_autolaunch", { enable: false })
      .catch(() => {})
      .then(() => resetPreferences());
  }, [resetPreferences]);

  // Fetch real Claude stats — setState only in async callbacks, never synchronously.
  // Also subscribes to the Rust-side file watcher so edits to stats-cache.json
  // auto-refresh the dashboard without needing manual refresh.
  useEffect(() => {
    if (provider !== "claude" || isRefreshing) return;
    let cancelled = false;
    fetchClaudeStats(timeframe)
      .then((result) => {
        if (cancelled) return;
        applyClaudeResult(result);
      })
      .catch((e: unknown) => { if (import.meta.env.DEV) console.warn("stats-cache fallback:", e); });
    const unlistenPromise = onClaudeStatsUpdated(() => {
      if (cancelled) return;
      fetchClaudeStats(timeframe)
        .then((result) => {
          if (cancelled) return;
          applyClaudeResult(result);
        })
        .catch((e: unknown) => { if (import.meta.env.DEV) console.warn("stats-cache watcher fallback:", e); });
    });
    return () => {
      cancelled = true;
      unlistenPromise.then((fn) => fn()).catch(() => {});
    };
  }, [provider, applyClaudeResult, timeframe, isRefreshing]);

  // Fetch real Codex stats + subscribe to the Rust-side recursive watcher on
  // ~/.codex/sessions so new rollout lines auto-refresh the dashboard.
  useEffect(() => {
    if (provider !== "codex" || isRefreshing) return;
    let cancelled = false;
    fetchCodexStats(timeframe)
      .then((result) => {
        if (cancelled) return;
        applyCodexResult(result);
      })
      .catch((e: unknown) => { if (import.meta.env.DEV) console.warn("codex sessions fallback:", e); });
    const unlistenPromise = onCodexStatsUpdated(() => {
      if (cancelled) return;
      fetchCodexStats(timeframe)
        .then((result) => {
          if (cancelled) return;
          applyCodexResult(result);
        })
        .catch((e: unknown) => { if (import.meta.env.DEV) console.warn("codex watcher fallback:", e); });
    });
    return () => {
      cancelled = true;
      unlistenPromise.then((fn) => fn()).catch(() => {});
    };
  }, [provider, applyCodexResult, timeframe, isRefreshing]);

  const handleRefresh = () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setError(null);

    if (provider === "claude") {
      // Re-fetch real data from the local stats file
      fetchClaudeStats(timeframe)
        .then((result) => {
          if (providerRef.current !== "claude") return;
          applyClaudeResult(result);
          setIsRefreshing(false);
        })
        .catch(() => {
          setError("Update failed");
          setIsRefreshing(false);
        });
    } else if (provider === "codex") {
      // Re-parse ~/.codex/sessions/*.jsonl
      fetchCodexStats(timeframe)
        .then((result) => {
          if (providerRef.current !== "codex") return;
          applyCodexResult(result);
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
      className="relative w-full max-h-screen flex flex-col bg-[#000814]/95 border border-[#003566] rounded-2xl shadow-2xl overflow-hidden text-white font-sans"
      style={{ '--theme-color': providerData.themeColor } as React.CSSProperties}
    >
      {/* Header */}
        <div className="shrink-0 bg-[#001d3d]/50 border-b border-[#003566] flex flex-col">
          {/* Row 1: Brand + provider selector + actions */}
          <div className="px-3 sm:px-4 pt-3 pb-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {/* Brand */}
              <ProviderIcon className="w-4 h-4" style={{ color: providerData.themeColor }} />
              <span
                className="text-xs font-extrabold tracking-widest uppercase"
                style={{ color: providerData.themeColor }}
              >
                AI Pulse
              </span>
              {/* Divider */}
              <div className="w-px h-3.5 bg-[#003566] mx-1" />
              {/* Inline provider selector */}
              <div className="relative flex items-center gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: providerData.themeColor }}
                />
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as Provider)}
                  aria-label="Select provider"
                  className="bg-transparent text-[10px] font-semibold tracking-wide uppercase outline-none cursor-pointer appearance-none pr-4 text-gray-400 hover:text-white transition-colors"
                >
                  <option value="claude">Claude</option>
                  <option value="codex">Codex</option>
                  <option value="gemini">Gemini</option>
                </select>
                <ChevronDown className="w-2.5 h-2.5 text-gray-500 absolute right-0 pointer-events-none" />
              </div>
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
                    {getCostLabel()}
                  </motion.span>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-2 text-gray-400">
                <button
                  onClick={openSettings}
                  aria-label="Open settings"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Settings className="w-3 h-3" />
                </button>
                <button onClick={handleRefresh} aria-label="Refresh data" className="text-gray-400 hover:text-white transition-colors">
                  <RefreshCw className={cn("w-3 h-3 transition-all", isRefreshing && "animate-spin text-[#ffd60a]")} />
                </button>
              </div>
            </div>
          </div>
          {/* Row 2: Timeframe range filter */}
          {isRealDataProvider && (
            <div className="px-3 sm:px-4 pb-2 flex items-center gap-2">
              <span className="text-[8px] uppercase tracking-widest text-gray-500 font-semibold">
                Range
              </span>
              <div className="flex-1" />
              {ALL_TIMEFRAMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  aria-pressed={timeframe === t}
                  className={cn(
                    "px-2 py-0.5 text-[10px] uppercase font-bold rounded transition-all",
                    timeframe === t
                      ? "bg-[#003566]"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                  style={timeframe === t ? { color: providerData.themeColor } : undefined}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {provider === "claude" && claudeTotalCost !== null && budgetLimitUsd !== null && claudeTotalCost > budgetLimitUsd && (
          <div className="shrink-0 bg-red-900/40 border-b border-red-700/50 px-4 py-1.5 text-[10px] text-red-300 flex items-center gap-2">
            <span>⚠</span>
            <span>Lifetime spend ${claudeTotalCost.toFixed(2)} exceeds budget ${budgetLimitUsd.toFixed(2)}</span>
          </div>
        )}

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
                   {(() => {
                     const trend = provider === "claude"
                       ? claudeTrendPct
                       : provider === "codex"
                         ? codexTrendPct
                         : null;
                     if (trend === null) {
                       return (
                         <>Usage up <span className="font-bold" style={{ color: providerData.themeColor }}>—</span> from last week.</>
                       );
                     }
                     return (
                       <>
                         Usage{" "}
                         <span className="font-bold" style={{ color: providerData.themeColor }}>
                           {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
                         </span>{" "}
                         vs last week.
                       </>
                     );
                   })()}
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
              <TrendingUp className="w-3 h-3" /> {isRealDataProvider ? `${timeframe} Token Trend` : "Token Trend"}
            </h3>
            <div key={`chart-wrapper-${provider}`} className="bg-[#001d3d]/30 rounded-xl p-2 border border-[#003566]/30 h-[180px] sm:h-[220px]">
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
                    ) : provider === "codex" ? (
                      <p className="text-[10px] text-gray-500 text-center py-4 px-2 leading-relaxed">
                        Project breakdown is not available — Codex session files do not record a project identifier
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
                    {(() => {
                      const totalTokens = displayModelUsage.reduce((sum, m) => sum + m.tokens, 0);
                      return displayModelUsage.map((model) => {
                        const barPct = totalTokens > 0 ? (model.tokens / totalTokens) * 100 : 0;
                        const tokenLabel = model.tokens >= 1_000_000
                          ? `${(model.tokens / 1_000_000).toFixed(1)}M`
                          : model.tokens >= 1_000
                          ? `${Math.round(model.tokens / 1_000)}k`
                          : String(model.tokens);
                        return (
                          <div key={model.name} className="flex flex-col gap-1 p-1.5 sm:p-2 hover:bg-[#001d3d]/50 rounded-lg transition-colors cursor-pointer group">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: providerData.themeColor }} />
                                <span className="text-gray-300 group-hover:text-white transition-colors">{model.name}</span>
                              </div>
                              <span className="text-[9px] font-mono text-gray-500 group-hover:text-gray-300 transition-colors">{tokenLabel}</span>
                            </div>
                            <div className="h-[3px] bg-[#001d3d] rounded-full overflow-hidden ml-3.5">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${barPct}%`, backgroundColor: providerData.themeColor, opacity: 0.65 }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
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
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={closeSettings}
          themeColor={providerData.themeColor}
          onResetPreferences={handleResetPreferences}
          budgetLimitUsd={budgetLimitUsd}
          onSetBudgetLimit={useAppStore.getState().setBudgetLimit}
          autoLaunchEnabled={autoLaunchEnabled}
          onToggleAutoLaunch={handleToggleAutoLaunch}
        />
      </motion.div>
  );
}
