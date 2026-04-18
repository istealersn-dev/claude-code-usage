import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Provider } from "./data";
import { DEFAULT_PROVIDER, PROVIDERS } from "./data";

export interface AppState {
  provider: Provider;
  setProvider: (p: Provider) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const VALID_PROVIDERS = new Set(Object.keys(PROVIDERS));

function isValidProvider(value: unknown): value is Provider {
  return typeof value === "string" && VALID_PROVIDERS.has(value);
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      provider: DEFAULT_PROVIDER,
      setProvider: (p) => set({ provider: p }),
      isSettingsOpen: false,
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
    }),
    {
      name: "ai-pulse-store",
      partialize: (state) => ({ provider: state.provider }),
      merge: (persisted, current) => {
        const p = (persisted as Partial<AppState>).provider;
        return { ...current, provider: isValidProvider(p) ? p : DEFAULT_PROVIDER };
      },
    }
  )
);
