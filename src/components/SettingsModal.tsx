import { motion } from "framer-motion";
import { X, Bell, Key, Palette, HardDrive, Shield } from "lucide-react";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 bg-[#000814]/95 backdrop-blur-xl flex flex-col text-white"
    >
      {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#003566] bg-[#001d3d]/30">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#003566] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          
          {/* API Keys */}
          <div className="bg-[#001d3d]/20 border border-[#003566]/50 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-[#001d3d]/40 transition-colors">
            <div className="p-2 bg-[#003566] rounded-lg text-[#ffd60a]">
              <Key className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-medium text-white">API Keys</h3>
              <p className="text-[10px] text-gray-400">Manage Anthropic API keys</p>
            </div>
          </div>

          {/* Budget Alerts */}
          <div className="bg-[#001d3d]/20 border border-[#003566]/50 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-[#001d3d]/40 transition-colors">
            <div className="p-2 bg-[#003566] rounded-lg text-[#ffd60a]">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-medium text-white">Budget & Alerts</h3>
              <p className="text-[10px] text-gray-400">Set spending limits and notifications</p>
            </div>
          </div>

          {/* Data & Privacy */}
          <div className="bg-[#001d3d]/20 border border-[#003566]/50 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-[#001d3d]/40 transition-colors">
            <div className="p-2 bg-[#003566] rounded-lg text-[#ffd60a]">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-medium text-white">Data & Privacy</h3>
              <p className="text-[10px] text-gray-400">Manage telemetry and data sharing</p>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-[#001d3d]/20 border border-[#003566]/50 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-[#001d3d]/40 transition-colors">
            <div className="p-2 bg-[#003566] rounded-lg text-[#ffd60a]">
              <Palette className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-medium text-white">Appearance</h3>
              <p className="text-[10px] text-gray-400">Theme and display preferences</p>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-[#001d3d]/20 border border-[#003566]/50 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-[#001d3d]/40 transition-colors">
            <div className="p-2 bg-[#003566] rounded-lg text-[#ffd60a]">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-medium text-white">Storage</h3>
              <p className="text-[10px] text-gray-400">Clear cache and local data</p>
            </div>
          </div>

        </div>
    </motion.div>
  );
}
