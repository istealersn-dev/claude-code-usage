import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Provider } from "./data";

interface AppState {
  provider: Provider;
  setProvider: (p: Provider) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      provider: "claude",
      setProvider: (p) => set({ provider: p }),
    }),
    {
      name: "ai-pulse-store",
      partialize: (state) => ({ provider: state.provider }),
    }
  )
);
