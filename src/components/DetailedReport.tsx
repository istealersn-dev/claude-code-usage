import { motion } from "framer-motion";
import { X, Download, FileText, BarChart2, PieChart, Lightbulb, Terminal, Database, Activity } from "lucide-react";
import { UsageChart } from "./UsageChart";
import { 
  MOCK_USAGE_DATA, 
  PROJECT_USAGE, 
  MODEL_USAGE,
  TOOL_USAGE,
  MCP_USAGE,
  DETAILED_PROJECT_BREAKDOWN,
  AI_INSIGHTS
} from "@/lib/data";

interface DetailedReportProps {
  onClose: () => void;
}

export function DetailedReport({ onClose }: DetailedReportProps) {
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
              <FileText className="w-5 h-5 text-[#ffd60a]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Intelligence Report</h2>
              <p className="text-xs text-gray-400 font-mono">Claude Code Analytics & Insights</p>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {/* AI Insights Section */}
          <div className="bg-gradient-to-r from-[#001d3d]/40 to-[#003566]/20 border border-[#003566]/50 p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-4 text-[#ffd60a]">
              <Lightbulb className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider">AI Insights & Optimization</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AI_INSIGHTS.map((insight, idx) => (
                <div key={idx} className="bg-[#000814]/50 p-4 rounded-lg border border-[#003566]/30">
                  <p className="text-xs text-gray-300 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Cost</p>
              <p className="text-2xl font-mono text-white">$45.20</p>
              <p className="text-[10px] text-emerald-400 mt-1">↓ 12% from last month</p>
            </div>
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Tokens</p>
              <p className="text-2xl font-mono text-white">4.2M</p>
              <p className="text-[10px] text-rose-400 mt-1">↑ 5% from last month</p>
            </div>
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Active Sessions</p>
              <p className="text-2xl font-mono text-white">85</p>
              <p className="text-[10px] text-emerald-400 mt-1">Avg length: 32m</p>
            </div>
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tool Executions</p>
              <p className="text-2xl font-mono text-white">1,027</p>
              <p className="text-[10px] text-gray-500 mt-1">Across 4 unique tools</p>
            </div>
          </div>

          {/* Tools & MCP Usage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tools Table */}
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#003566]/50 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#ffd60a]" />
                <h3 className="text-sm font-medium">Claude Code Tools Usage</h3>
              </div>
              <div className="p-0">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#001d3d]/40 text-gray-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Tool Name</th>
                      <th className="px-4 py-2 font-medium text-right">Calls</th>
                      <th className="px-4 py-2 font-medium text-right">Tokens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#003566]/30">
                    {TOOL_USAGE.map((tool) => (
                      <tr key={tool.name} className="hover:bg-[#001d3d]/30 transition-colors">
                        <td className="px-4 py-3 text-gray-200 font-mono">{tool.name}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-400">{tool.calls}</td>
                        <td className="px-4 py-3 text-right font-mono text-[#ffd60a]">{(tool.tokens / 1000).toFixed(1)}k</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MCP Table */}
            <div className="bg-[#001d3d]/20 border border-[#003566]/50 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#003566]/50 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#ffd60a]" />
                <h3 className="text-sm font-medium">MCP Server Usage</h3>
              </div>
              <div className="p-0">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#001d3d]/40 text-gray-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Server</th>
                      <th className="px-4 py-2 font-medium text-right">Queries</th>
                      <th className="px-4 py-2 font-medium text-right">Tokens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#003566]/30">
                    {MCP_USAGE.map((mcp) => (
                      <tr key={mcp.server} className="hover:bg-[#001d3d]/30 transition-colors">
                        <td className="px-4 py-3 text-gray-200 font-mono">{mcp.server}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-400">{mcp.queries}</td>
                        <td className="px-4 py-3 text-right font-mono text-[#ffd60a]">{(mcp.tokens / 1000).toFixed(1)}k</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Project Breakdown Table */}
          <div className="bg-[#001d3d]/20 border border-[#003566]/50 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#003566]/50 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#ffd60a]" />
              <h3 className="text-sm font-medium">Project Breakdown & Session Trends</h3>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-[#001d3d]/40 text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium text-right">Sessions</th>
                    <th className="px-4 py-3 font-medium text-right">Avg Length</th>
                    <th className="px-4 py-3 font-medium">Top Tool</th>
                    <th className="px-4 py-3 font-medium">Top MCP</th>
                    <th className="px-4 py-3 font-medium text-right">Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#003566]/30">
                  {DETAILED_PROJECT_BREAKDOWN.map((project) => (
                    <tr key={project.name} className="hover:bg-[#001d3d]/30 transition-colors">
                      <td className="px-4 py-3 text-gray-200 font-medium">{project.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-400">{project.sessions}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-400">{project.avgSessionLength}</td>
                      <td className="px-4 py-3 font-mono text-gray-400">{project.topTool}</td>
                      <td className="px-4 py-3 font-mono text-gray-400">{project.topMCP}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#ffd60a]">{(project.tokens / 1000).toFixed(1)}k</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
