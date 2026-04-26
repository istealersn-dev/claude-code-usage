import { useState, type ElementType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Key, DollarSign, Palette, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsTab = "api-keys" | "budget" | "appearance" | "storage";

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: ElementType }[] = [
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "budget", label: "Budget", icon: DollarSign },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "storage", label: "Storage", icon: Trash2 },
];

const COMING_SOON_PROVIDERS = [
  { label: "OpenAI (Codex)", placeholder: "sk-..." },
  { label: "Google (Gemini)", placeholder: "AIza..." },
] as const;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor: string;
  onResetPreferences: () => void;
  budgetLimitUsd: number | null;
  onSetBudgetLimit: (limit: number | null) => void;
  autoLaunchEnabled: boolean;
  onToggleAutoLaunch: (enabled: boolean) => void;
}

export function SettingsModal({ isOpen, onClose, themeColor, onResetPreferences, budgetLimitUsd, onSetBudgetLimit, autoLaunchEnabled, onToggleAutoLaunch }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("api-keys");

  const handleClose = () => {
    setActiveTab("api-keys");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="settings-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          className="absolute inset-0 z-50 bg-[#000814] rounded-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-[#003566]/60">
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors p-1 -ml-1 rounded-lg hover:bg-white/5"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-semibold tracking-wide" style={{ color: themeColor }}>
              Settings
            </h2>
          </div>

          {/* Tab nav */}
          <div className="shrink-0 flex gap-1 px-4 pt-3 pb-1">
            {SETTINGS_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] uppercase font-bold rounded-lg transition-all",
                  activeTab === id
                    ? "bg-[#003566]"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                )}
                style={activeTab === id ? { color: themeColor } : {}}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
            {activeTab === "api-keys" && (
              <div className="space-y-4">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Claude Code reads session data locally — no API key needed. Keys will be required for Codex and Gemini providers (coming soon).
                </p>
                {COMING_SOON_PROVIDERS.map((p) => (
                  <div key={p.label} className="space-y-1">
                    <label className="text-[10px] uppercase text-gray-500 tracking-wider block">
                      {p.label}
                    </label>
                    <input
                      type="password"
                      placeholder={p.placeholder}
                      readOnly
                      aria-disabled="true"
                      className="w-full bg-[#001d3d]/40 border border-[#003566]/40 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono cursor-not-allowed"
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === "budget" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-gray-500 tracking-wider block">
                    Monthly Budget (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={budgetLimitUsd !== null ? String(budgetLimitUsd) : ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") { onSetBudgetLimit(null); return; }
                        const parsed = parseFloat(raw);
                        onSetBudgetLimit(isFinite(parsed) && parsed >= 0 ? parsed : null);
                      }}
                      className="w-full bg-[#001d3d]/40 border border-[#003566]/50 rounded-lg pl-7 pr-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-[#003566]"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500">
                  A warning banner appears on the dashboard when your lifetime spend exceeds this limit.
                  {budgetLimitUsd !== null && (
                    <button
                      onClick={() => onSetBudgetLimit(null)}
                      className="ml-2 text-red-400 hover:text-red-300 underline transition-colors"
                    >
                      Clear limit
                    </button>
                  )}
                </p>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm text-gray-200">Launch at login</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Start AI Pulse automatically on login</p>
                  </div>
                  <button
                    onClick={() => onToggleAutoLaunch(!autoLaunchEnabled)}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative shrink-0",
                      autoLaunchEnabled ? "bg-[color:var(--theme-color,#ffd60a)]" : "bg-gray-700"
                    )}
                    aria-pressed={autoLaunchEnabled}
                    aria-label="Toggle launch at login"
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                        autoLaunchEnabled ? "translate-x-[20px]" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
                <div className="border-t border-[#003566]/40 pt-3">
                  <p className="text-[10px] text-gray-500">Theme customization coming in a future release.</p>
                </div>
              </div>
            )}

            {activeTab === "storage" && (
              <div className="space-y-4">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  AI Pulse reads data directly from local AI assistant session files. The only data it stores are your settings preferences (budget limit, provider selection, timeframe).
                </p>
                <button
                  onClick={() => { onResetPreferences(); handleClose(); }}
                  className="w-full px-3 py-2.5 text-xs font-medium bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-red-900/40"
                >
                  Reset All Preferences
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
