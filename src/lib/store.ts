import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Provider } from "./data";
import { DEFAULT_PROVIDER, PROVIDERS } from "./data";

export type Timeframe = "1d" | "3d" | "7d" | "30d";

export const DEFAULT_TIMEFRAME: Timeframe = "30d";

export const ALL_TIMEFRAMES: Timeframe[] = ["1d", "3d", "7d", "30d"];

export const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  "1d": 1, "3d": 3, "7d": 7, "30d": 30,
};

export interface AppState {
  provider: Provider;
  setProvider: (p: Provider) => void;
  timeframe: Timeframe;
  setTimeframe: (t: Timeframe) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  resetPreferences: () => void;
  budgetLimitUsd: number | null;
  setBudgetLimit: (limit: number | null) => void;
  autoLaunchEnabled: boolean;
  setAutoLaunchEnabled: (enabled: boolean) => void;
}

const VALID_PROVIDERS = new Set(Object.keys(PROVIDERS));

function isValidProvider(value: unknown): value is Provider {
  return typeof value === "string" && VALID_PROVIDERS.has(value);
}

const VALID_TIMEFRAMES = new Set<Timeframe>(ALL_TIMEFRAMES);

function isValidTimeframe(value: unknown): value is Timeframe {
  return typeof value === "string" && VALID_TIMEFRAMES.has(value as Timeframe);
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      provider: DEFAULT_PROVIDER,
      setProvider: (p) => set({ provider: p }),
      timeframe: DEFAULT_TIMEFRAME,
      setTimeframe: (t) => set({ timeframe: t }),
      isSettingsOpen: false,
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      resetPreferences: () => {
        localStorage.removeItem("ai-pulse-store");
        set({ provider: DEFAULT_PROVIDER, timeframe: DEFAULT_TIMEFRAME, isSettingsOpen: false, budgetLimitUsd: null, autoLaunchEnabled: false });
      },
      budgetLimitUsd: null,
      setBudgetLimit: (limit) => set({ budgetLimitUsd: limit }),
      autoLaunchEnabled: false,
      setAutoLaunchEnabled: (enabled) => set({ autoLaunchEnabled: enabled }),
    }),
    {
      name: "ai-pulse-store",
      partialize: (state) => {
        const { autoLaunchEnabled: _omit, ...rest } = state;
        return rest;
      },
      merge: (persisted, current) => {
        const raw = persisted as Partial<AppState>;
        const p = raw.provider;
        const t = raw.timeframe;
        const b = raw.budgetLimitUsd;
        const validBudget = (b === null || b === undefined)
          ? null
          : (typeof b === "number" && isFinite(b) && b >= 0 ? b : null);
        return {
          ...current,
          provider: isValidProvider(p) ? p : DEFAULT_PROVIDER,
          timeframe: isValidTimeframe(t) ? t : DEFAULT_TIMEFRAME,
          budgetLimitUsd: validBudget,
        };
      },
    }
  )
);
