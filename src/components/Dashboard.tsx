import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LiquidGauge } from "./LiquidGauge";
import { UsageChart } from "./UsageChart";
import { DetailedReport } from "./DetailedReport";
import { PROJECT_USAGE, MODEL_USAGE, CURRENT_CONTEXT_USAGE, TOTAL_CONTEXT_LIMIT, MOCK_USAGE_DATA } from "@/lib/data";
import { Box, Layers, Zap, TrendingUp, DollarSign, RefreshCw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dashboard({ onOpenDetailedReport }: { onOpenDetailedReport: () => void }) {
  const [viewMode, setViewMode] = useState<"projects" | "models">("projects");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // State for data to simulate updates
  const [contextUsage, setContextUsage] = useState(CURRENT_CONTEXT_USAGE);
  const [usageData, setUsageData] = useState(MOCK_USAGE_DATA);

  const contextPercentage = (contextUsage / TOTAL_CONTEXT_LIMIT) * 100;
  const totalCost = PROJECT_USAGE.reduce((acc, curr) => acc + curr.cost, 0);

  const handleRefresh = () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    setError(null);
    
    // Simulate network request
    setTimeout(() => {
      // Simulate 20% chance of failure
      if (Math.random() < 0.2) {
        setError("Update failed");
        setIsRefreshing(false);
        return;
      }

      // Randomize context usage slightly (+/- 5%)
      const randomFactor = 0.95 + Math.random() * 0.1;
      setContextUsage(Math.min(TOTAL_CONTEXT_LIMIT, Math.max(0, CURRENT_CONTEXT_USAGE * randomFactor)));
      
      // Randomize last day of usage data
      const newData = [...usageData];
      const lastDay = { ...newData[newData.length - 1] };
      lastDay.inputTokens = Math.floor(lastDay.inputTokens * (0.9 + Math.random() * 0.2));
      lastDay.outputTokens = Math.floor(lastDay.outputTokens * (0.9 + Math.random() * 0.2));
      newData[newData.length - 1] = lastDay;
      setUsageData(newData);

      setRefreshKey(prev => prev + 1);
      setIsRefreshing(false);
    }, 1500);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-[360px] sm:w-[400px] max-h-[calc(100vh-50px)] flex flex-col bg-[#000814]/90 backdrop-blur-xl border border-[#003566] rounded-2xl shadow-2xl overflow-hidden text-white font-sans"
      >
        {/* Header */}
        <div className="shrink-0 bg-[#001d3d]/50 p-3 sm:p-4 border-b border-[#003566] flex justify-between items-center">
          <h2 className="text-xs sm:text-sm font-semibold tracking-wide uppercase text-[#ffd60a] flex items-center gap-2">
            <Zap className="w-4 h-4" /> Claude Code Usage
          </h2>
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
                    ${totalCost.toFixed(2)} this month
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
                  <Settings className="w-3 h-3 hover:text-white cursor-pointer transition-colors" />
              </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 custom-scrollbar">
          {/* Top Section: Liquid Gauge & Key Stats */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex flex-col items-center">
               <div key={`gauge-wrapper-${refreshKey}`}>
                  <LiquidGauge percentage={contextPercentage} isError={!!error} />
               </div>
               <div className="mt-2 text-center">
                 <p className="text-[10px] text-gray-400 uppercase tracking-wider">Context Limit</p>
                 <p className="text-xs font-mono text-white">
                   {(contextUsage / 1000).toFixed(0)}k / {(TOTAL_CONTEXT_LIMIT / 1000).toFixed(0)}k
                 </p>
               </div>
            </div>
            
            <div className="flex-1 space-y-2 sm:space-y-3">
               <div className="bg-[#001d3d]/40 p-2 sm:p-3 rounded-xl border border-[#003566]/50">
                 <div className="flex items-center gap-2 mb-1 text-[#ffd60a]">
                   <TrendingUp className="w-3 h-3" />
                   <span className="text-[10px] uppercase font-bold">Trend</span>
                 </div>
                 <p className="text-[10px] sm:text-xs text-gray-300 leading-tight">
                   Usage up <span className="text-[#ffd60a] font-bold">12%</span> from last week.
                 </p>
               </div>
               
               <div className="bg-[#001d3d]/40 p-2 sm:p-3 rounded-xl border border-[#003566]/50">
                 <div className="flex items-center gap-2 mb-1 text-[#ffd60a]">
                   <DollarSign className="w-3 h-3" />
                   <span className="text-[10px] uppercase font-bold">Projected</span>
                 </div>
                 <p className="text-[10px] sm:text-xs text-gray-300 leading-tight">
                   Est. <span className="text-white font-mono">$12.50</span> by month end.
                 </p>
               </div>
            </div>
          </div>

          {/* Chart Section */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> 7-Day Token Trend
            </h3>
            <div key={`chart-wrapper-${refreshKey}`} className="bg-[#001d3d]/30 rounded-xl p-2 border border-[#003566]/30 h-[160px] sm:h-[200px]">
              <UsageChart data={usageData} />
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
                      ? "bg-[#003566] text-[#ffd60a] shadow-sm" 
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Layers className="w-3 h-3" /> Projects
                </button>
                <button
                  onClick={() => setViewMode("models")}
                  className={cn(
                    "px-3 py-1 text-[10px] uppercase font-bold rounded-md transition-all flex items-center gap-1",
                    viewMode === "models" 
                      ? "bg-[#003566] text-[#ffd60a] shadow-sm" 
                      : "text-gray-400 hover:text-white"
                  )}
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
                    {PROJECT_USAGE.map((project) => (
                      <div key={project.name} className="relative flex justify-between items-center text-[10px] sm:text-xs group cursor-pointer p-1.5 sm:p-2 hover:bg-[#001d3d]/50 rounded-lg transition-colors">
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#000814] border border-[#003566] text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-10 shadow-xl translate-y-2 group-hover:translate-y-0">
                          <span className="text-[#ffd60a] font-mono">{(project.tokens / 1000).toFixed(0)}k</span> tokens
                          <span className="mx-1 text-gray-500">•</span>
                          <span className="text-white font-mono">${project.cost.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#003566] group-hover:bg-[#ffd60a] transition-colors" />
                          <span className="text-gray-300 group-hover:text-white transition-colors">
                            {project.name}
                          </span>
                        </div>
                        <span className="font-mono text-[#ffd60a] opacity-80 group-hover:opacity-100">
                          ${project.cost.toFixed(2)}
                        </span>
                      </div>
                    ))}
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
                    {MODEL_USAGE.map((model) => (
                      <div key={model.name} className="flex justify-between items-center text-[10px] sm:text-xs group cursor-pointer p-1.5 sm:p-2 hover:bg-[#001d3d]/50 rounded-lg transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#003566] group-hover:bg-[#ffd60a] transition-colors" />
                          <span className="text-gray-300 group-hover:text-white transition-colors">
                            {model.name}
                          </span>
                        </div>
                        <span className="font-mono text-[#ffd60a] opacity-80 group-hover:opacity-100">
                          ${model.cost.toFixed(2)}
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
            onClick={onOpenDetailedReport}
            className="text-[10px] text-[#003566] hover:text-[#ffd60a] transition-colors uppercase tracking-widest font-bold"
          >
            View Detailed Report
          </button>
        </div>
      </motion.div>
    </>
  );
}
