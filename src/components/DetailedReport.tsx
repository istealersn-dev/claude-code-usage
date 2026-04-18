import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Download, FileText, BarChart2, Activity, Wrench, Puzzle, Layers, Code2, Box } from "lucide-react";
import { UsageChart } from "./UsageChart";
import { PROVIDERS, Provider } from "@/lib/data";
import { fetchClaudeStats } from "@/lib/claudeUsage";
import type { ModelDetail } from "@/lib/claudeUsage";
import type { UsageData } from "@/lib/data";
import { exportUsageCsv } from "@/lib/exportCsv";

interface DetailedReportProps {
  provider: Provider;
  onClose: () => void;
}

export function DetailedReport({ provider, onClose }: DetailedReportProps) {
  const providerData = PROVIDERS[provider];
  const [liveUsageData, setLiveUsageData] = useState<UsageData[]>(providerData.usageData);
  const [liveTotalSessions, setLiveTotalSessions] = useState<number | null>(null);
  const [liveTotalTokens, setLiveTotalTokens] = useState<number | null>(null);
  const [liveModelDetails, setLiveModelDetails] = useState<ModelDetail[]>([]);
  const [liveTotalCostUsd, setLiveTotalCostUsd] = useState<number | null>(null);
  const [claudeFetchState, setClaudeFetchState] = useState<"loading" | "done" | "error">(
    provider === "claude" ? "loading" : "done"
  );

  useEffect(() => {
    if (provider !== "claude") return;
    fetchClaudeStats()
      .then((result) => {
        if (result.usageData.length > 0) setLiveUsageData(result.usageData);
        if (result.totalSessions > 0) setLiveTotalSessions(result.totalSessions);
        if (result.totalTokens > 0) setLiveTotalTokens(result.totalTokens);
        if (result.modelDetails.length > 0) setLiveModelDetails(result.modelDetails);
        if (result.totalCostUsd > 0) setLiveTotalCostUsd(result.totalCostUsd);
        setClaudeFetchState("done");
      })
      .catch(() => {
        setClaudeFetchState("error");
      });
  }, [provider]);

  const totalCost = providerData.projectUsage.reduce((acc, curr) => acc + curr.cost, 0);
  const mockTotalTokens = providerData.projectUsage.reduce((acc, curr) => acc + curr.tokens, 0);
  const totalTokens = liveTotalTokens ?? mockTotalTokens;
  return (
    <div className="min-h-screen bg-[#000814] flex items-start justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl bg-[#000814] border border-[#003566] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#003566] bg-[#001d3d]/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#003566] rounded-lg">
              <FileText className="w-5 h-5" style={{ color: providerData.themeColor }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{providerData.name} Intelligence & Analytics</h2>
              <p className="text-xs text-gray-400 font-mono">Billing Period: —</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportUsageCsv(liveUsageData, liveModelDetails, providerData.name)}
              disabled={provider === "claude" && claudeFetchState === "loading"}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-[#003566] hover:bg-[#004b91] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#003566] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 custom-scrollbar">
          {/* Top Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Cost</p>
              <p className="text-2xl font-mono text-white">
                {provider === "claude"
                  ? (liveTotalCostUsd !== null ? `$${liveTotalCostUsd.toFixed(2)}` : "—")
                  : `$${totalCost.toFixed(2)}`}
              </p>
              <p className="text-[10px] text-emerald-400 mt-1">—</p>
            </div>
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Tokens</p>
              <p className="text-2xl font-mono text-white">{(totalTokens / 1000000).toFixed(1)}M</p>
              <p className="text-[10px] text-gray-500 mt-1">—</p>
            </div>
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                {provider === "claude" ? "Models Active" : "Active Projects"}
              </p>
              <p className="text-2xl font-mono text-white">
                {provider === "claude"
                  ? (liveModelDetails.length > 0 ? liveModelDetails.length : providerData.modelUsage.length)
                  : providerData.projectUsage.length}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">—</p>
            </div>
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Sessions</p>
              <p className="text-2xl font-mono text-white">
                {liveTotalSessions !== null
                  ? liveTotalSessions
                  : providerData.detailedAnalytics.reduce((acc, curr) => acc + curr.sessions, 0)}
              </p>
              <p className="text-[10px] text-emerald-400 mt-1">—</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" style={{ color: providerData.themeColor }} />
              <h3 className="text-sm font-medium">30-Day Usage Trend</h3>
            </div>
            <div className="h-[250px]">
              <UsageChart data={liveUsageData} color={providerData.themeColor} />
            </div>
          </div>

          {/* Project Breakdown / Model Breakdown */}
          {provider === "claude" && claudeFetchState === "loading" ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-xs text-gray-500 font-mono">Loading model data…</p>
            </div>
          ) : provider === "claude" && claudeFetchState === "error" ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-xs text-red-400 font-mono">Could not load Claude stats. Check that stats-cache.json exists.</p>
            </div>
          ) : provider === "claude" && claudeFetchState === "done" && liveModelDetails.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-xs text-gray-500 font-mono">No model usage data found in stats-cache.json.</p>
            </div>
          ) : provider === "claude" && liveModelDetails.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Box className="w-5 h-5" style={{ color: providerData.themeColor }} />
                <h3 className="text-lg font-semibold">Model Breakdown</h3>
              </div>
              <div className="space-y-3">
                {liveModelDetails.map((model) => {
                  const inputPct = model.totalTokens > 0 ? (model.inputTokens / model.totalTokens) * 100 : 0;
                  const outputPct = model.totalTokens > 0 ? (model.outputTokens / model.totalTokens) * 100 : 0;
                  const cachePct = model.totalTokens > 0 ? (model.cacheTokens / model.totalTokens) * 100 : 0;
                  return (
                    <div key={model.name} className="bg-[#001d3d]/20 border border-[#003566]/50 rounded-xl p-5">
                      <div className="flex justify-between items-center border-b border-[#003566]/50 pb-3 mb-4">
                        <h4 className="text-base font-medium font-mono" style={{ color: providerData.themeColor }}>{model.name}</h4>
                        <span className="text-xs font-mono text-gray-400">{(model.totalTokens / 1_000_000).toFixed(1)}M total</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Input</p>
                          <p className="text-sm font-mono text-white">{(model.inputTokens / 1000).toFixed(0)}k</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Output</p>
                          <p className="text-sm font-mono text-white">{(model.outputTokens / 1000).toFixed(0)}k</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Cache</p>
                          <p className="text-sm font-mono text-white">{(model.cacheTokens / 1000).toFixed(0)}k</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Cost</p>
                          <p className="text-sm font-mono" style={{ color: providerData.themeColor }}>
                            {model.costUsd > 0 ? `$${model.costUsd.toFixed(4)}` : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden flex">
                        <div className="h-full" style={{ width: `${inputPct}%`, backgroundColor: providerData.themeColor, opacity: 0.9 }} />
                        <div className="h-full" style={{ width: `${outputPct}%`, backgroundColor: providerData.themeColor, opacity: 0.5 }} />
                        <div className="h-full" style={{ width: `${cachePct}%`, backgroundColor: providerData.themeColor, opacity: 0.2 }} />
                      </div>
                      <div className="flex gap-4 mt-2">
                        <span className="text-[10px] text-gray-500">&#9632; Input</span>
                        <span className="text-[10px] text-gray-500 opacity-60">&#9632; Output</span>
                        <span className="text-[10px] text-gray-500 opacity-30">&#9632; Cache</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5" style={{ color: providerData.themeColor }} />
                <h3 className="text-lg font-semibold">Project Insights</h3>
              </div>

              <div className="space-y-6">
                {providerData.detailedAnalytics.map((project) => (
                  <div key={project.name} className="bg-[#001d3d]/20 border border-[#003566]/50 rounded-xl p-5">
                    <div className="flex justify-between items-center border-b border-[#003566]/50 pb-3 mb-4">
                      <h4 className="text-base font-medium" style={{ color: providerData.themeColor }}>{project.name}</h4>
                      <span className="text-xs font-mono text-gray-400">{project.sessions} Sessions</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <h5 className="text-xs uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                          <Wrench className="w-3 h-3" /> Tools
                        </h5>
                        <ul className="space-y-2">
                          {project.toolsUsed.map(tool => (
                            <li key={tool.name} className="flex justify-between text-xs">
                              <span className="text-gray-300">{tool.name}</span>
                              <span className="font-mono" style={{ color: providerData.themeColor }}>{tool.count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="text-xs uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                          <Puzzle className="w-3 h-3" /> Plugins
                        </h5>
                        <ul className="space-y-2">
                          {project.pluginsUsed.map(plugin => (
                            <li key={plugin.name} className="flex justify-between text-xs">
                              <span className="text-gray-300">{plugin.name}</span>
                              <span className="font-mono" style={{ color: providerData.themeColor }}>{plugin.count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="text-xs uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                          <BarChart2 className="w-3 h-3" /> MCP
                        </h5>
                        <ul className="space-y-2">
                          {project.mcpUsage.map(mcp => (
                            <li key={mcp.name} className="flex justify-between text-xs">
                              <span className="text-gray-300">{mcp.name}</span>
                              <span className="font-mono" style={{ color: providerData.themeColor }}>{mcp.requests}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="text-xs uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                          <Code2 className="w-3 h-3" /> Skills
                        </h5>
                        <ul className="space-y-2">
                          {project.skillsUsage.map(skill => (
                            <li key={skill.name} className="flex justify-between text-xs">
                              <span className="text-gray-300">{skill.name}</span>
                              <span className="font-mono" style={{ color: providerData.themeColor }}>{skill.count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
