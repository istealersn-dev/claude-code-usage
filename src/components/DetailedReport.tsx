import { motion } from "framer-motion";
import { X, Download, FileText, BarChart2, Activity, Wrench, Puzzle, Layers, Code2 } from "lucide-react";
import { UsageChart } from "./UsageChart";
import { PROVIDERS, Provider } from "@/lib/data";

interface DetailedReportProps {
  provider: Provider;
  onClose: () => void;
}

export function DetailedReport({ provider, onClose }: DetailedReportProps) {
  const providerData = PROVIDERS[provider];
  const totalCost = providerData.projectUsage.reduce((acc, curr) => acc + curr.cost, 0);
  const totalTokens = providerData.projectUsage.reduce((acc, curr) => acc + curr.tokens, 0);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-5xl max-h-[90vh] bg-[#000814] border border-[#003566] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#003566] bg-[#001d3d]/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#003566] rounded-lg">
              <FileText className="w-5 h-5" style={{ color: providerData.themeColor }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{providerData.name} Intelligence & Analytics</h2>
              <p className="text-xs text-gray-400 font-mono">Billing Period: Oct 1 - Oct 31, 2023</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-[#003566] hover:bg-[#004b91] text-white rounded-lg transition-colors">
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
              <p className="text-2xl font-mono text-white">${totalCost.toFixed(2)}</p>
              <p className="text-[10px] text-emerald-400 mt-1">↓ 12% from last month</p>
            </div>
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Tokens</p>
              <p className="text-2xl font-mono text-white">{(totalTokens / 1000000).toFixed(1)}M</p>
              <p className="text-[10px] text-rose-400 mt-1">↑ 5% from last month</p>
            </div>
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Active Projects</p>
              <p className="text-2xl font-mono text-white">{providerData.projectUsage.length}</p>
              <p className="text-[10px] text-gray-500 mt-1">Across 2 workspaces</p>
            </div>
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Sessions</p>
              <p className="text-2xl font-mono text-white">
                {providerData.detailedAnalytics.reduce((acc, curr) => acc + curr.sessions, 0)}
              </p>
              <p className="text-[10px] text-emerald-400 mt-1">↑ 18% from last month</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" style={{ color: providerData.themeColor }} />
              <h3 className="text-sm font-medium">30-Day Usage Trend</h3>
            </div>
            <div className="h-[250px]">
              <UsageChart data={providerData.usageData} color={providerData.themeColor} />
            </div>
          </div>

          {/* Project Breakdown */}
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
                    {/* Tools Used */}
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

                    {/* Plugins Used */}
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

                    {/* MCP Usage */}
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

                    {/* Skills Usage */}
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
        </div>
      </motion.div>
    </div>
  );
}
