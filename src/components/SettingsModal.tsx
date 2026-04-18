import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Key, DollarSign, Palette, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsTab = "api-keys" | "budget" | "appearance" | "storage";

// Issue 5: hoisted to module level — not recreated on every render
const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "budget", label: "Budget", icon: DollarSign },  // Issue 7: DollarSign, not Bell
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "storage", label: "Storage", icon: Trash2 },
];

// Issue 3: typed constant, no loose string array cast
const COMING_SOON_PROVIDERS = [
  { label: "OpenAI (Codex)", placeholder: "sk-..." },
  { label: "Google (Gemini)", placeholder: "AIza..." },
] as const;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor: string;
  // Issue 1: accept scoped reset action rather than calling localStorage directly
  onResetPreferences: () => void;
}

export function SettingsModal({ isOpen, onClose, themeColor, onResetPreferences }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("api-keys");

  // Issue 2: reset tab to default whenever modal transitions to open
  useEffect(() => {
    if (isOpen) setActiveTab("api-keys");
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-50 bg-[#000814]/95 backdrop-blur-sm rounded-2xl flex flex-col"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-4 border-b border-[#003566]">
            <h2 className="text-sm font-semibold tracking-wide" style={{ color: themeColor }}>
              Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab nav */}
          <div className="shrink-0 flex gap-1 px-4 pt-3">
            {SETTINGS_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg transition-all",
                  activeTab === id
                    ? "bg-[#003566]"
                    : "text-gray-500 hover:text-gray-300"
                )}
                style={activeTab === id ? { color: themeColor } : {}}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {activeTab === "api-keys" && (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-400">
                  Claude Code reads data locally — no API key needed. Keys are required for Codex and Gemini (coming soon).
                </p>
                {/* Issue 3: typed constant, no loose cast */}
                {COMING_SOON_PROVIDERS.map((p) => (
                  <div key={p.label}>
                    <label className="text-[10px] uppercase text-gray-400 tracking-wider block mb-1">
                      {p.label} API Key
                    </label>
                    {/* Issue 4: readOnly + aria-disabled instead of disabled */}
                    <input
                      type="password"
                      placeholder={p.placeholder}
                      readOnly
                      aria-disabled="true"
                      className="w-full bg-[#001d3d]/40 border border-[#003566]/50 rounded-lg px-3 py-2 text-xs text-gray-500 font-mono cursor-not-allowed"
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === "budget" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase text-gray-400 tracking-wider block mb-1">
                    Monthly Budget (USD)
                  </label>
                  {/* Issue 4: readOnly + aria-disabled instead of disabled */}
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    readOnly
                    aria-disabled="true"
                    className="w-full bg-[#001d3d]/40 border border-[#003566]/50 rounded-lg px-3 py-2 text-xs text-gray-500 font-mono cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-gray-500">Budget alerts coming in a future release.</p>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-400">Theme customization coming in a future release.</p>
              </div>
            )}

            {activeTab === "storage" && (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  AI Pulse reads data directly from local AI assistant files — it stores no data of its own except your settings preferences.
                </p>
                {/* Issue 1: delegate to scoped reset action from store */}
                <button
                  onClick={onResetPreferences}
                  className="w-full px-3 py-2 text-xs font-medium bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors border border-red-900/50"
                >
                  Clear Saved Preferences
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
