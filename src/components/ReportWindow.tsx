import { motion } from "framer-motion";
import { X } from "lucide-react";
import { UsageChart } from "./UsageChart";
import { MOCK_USAGE_DATA, PROJECT_USAGE, MODEL_USAGE } from "@/lib/data";

interface ReportWindowProps {
  onClose: () => void;
}

export function ReportWindow({ onClose }: ReportWindowProps) {
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 p-4">
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-[800px] max-w-full h-[600px] max-h-full bg-[#000814]/95 backdrop-blur-3xl border border-[#003566] rounded-xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden"
      >
        {/* Window Header (Draggable Area) */}
        <div className="h-12 border-b border-[#003566] flex items-center px-4 bg-[#001d3d]/50 cursor-grab active:cursor-grabbing shrink-0">
          <div className="flex gap-2 w-20">
            <button 
              onClick={onClose} 
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center group transition-colors"
            >
              <X className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black" />
            </button>
            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
          </div>
          <div className="flex-1 text-center text-sm font-semibold text-gray-300 pointer-events-none">
            Detailed Usage Report
          </div>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>

        {/* Window Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar text-gray-300 space-y-8">
          
          <section>
            <h2 className="text-xl font-bold text-white mb-4">30-Day Token Trend</h2>
            <div className="bg-[#001d3d]/30 rounded-xl p-4 border border-[#003566]/30 h-[250px]">
              <UsageChart data={MOCK_USAGE_DATA} />
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section>
              <h2 className="text-lg font-bold text-white mb-4">Project Breakdown</h2>
              <div className="bg-[#001d3d]/20 rounded-xl border border-[#003566]/30 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#001d3d]/50 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Project</th>
                      <th className="px-4 py-2 font-medium text-right">Tokens</th>
                      <th className="px-4 py-2 font-medium text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#003566]/30">
                    {PROJECT_USAGE.map((p) => (
                      <tr key={p.name} className="hover:bg-[#001d3d]/30 transition-colors">
                        <td className="px-4 py-2 text-gray-200">{p.name}</td>
                        <td className="px-4 py-2 text-right font-mono text-gray-400">{(p.tokens / 1000).toFixed(1)}k</td>
                        <td className="px-4 py-2 text-right font-mono text-[#ffd60a]">${p.cost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-4">Model Usage</h2>
              <div className="bg-[#001d3d]/20 rounded-xl border border-[#003566]/30 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#001d3d]/50 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Model</th>
                      <th className="px-4 py-2 font-medium text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#003566]/30">
                    {MODEL_USAGE.map((m) => (
                      <tr key={m.name} className="hover:bg-[#001d3d]/30 transition-colors">
                        <td className="px-4 py-2 text-gray-200">{m.name}</td>
                        <td className="px-4 py-2 text-right font-mono text-[#ffd60a]">${m.cost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
