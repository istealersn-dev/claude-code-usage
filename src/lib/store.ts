import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Provider } from "./data";
import { DEFAULT_PROVIDER, PROVIDERS } from "./data";

export type Timeframe = "1d" | "3d" | "7d" | "30d";

export const DEFAULT_TIMEFRAME: Timeframe = "30d";

export const ALL_TIMEFRAMES: Timeframe[] = ["1d", "3d", "7d", "30d"];

export interface AppState {
  provider: Provider;
  setProvider: (p: Provider) => void;
  timeframe: Timeframe;
  setTimeframe: (t: Timeframe) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  resetPreferences: () => void;
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
        set({ provider: DEFAULT_PROVIDER, isSettingsOpen: false });
      },
    }),
    {
      name: "ai-pulse-store",
      partialize: (state) => ({ provider: state.provider, timeframe: state.timeframe }),
      merge: (persisted, current) => {
        const p = (persisted as Partial<AppState>).provider;
        const t = (persisted as Partial<AppState>).timeframe;
        return {
          ...current,
          provider: isValidProvider(p) ? p : DEFAULT_PROVIDER,
          timeframe: isValidTimeframe(t) ? t : DEFAULT_TIMEFRAME,
        };
      },
    }
  )
);
