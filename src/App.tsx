import { Dashboard } from "@/components/Dashboard";
import { DetailedReport } from "@/components/DetailedReport";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { DEFAULT_PROVIDER } from "@/lib/data";
import type { Provider } from "@/lib/data";

/** Root application wrapper — transparent container for the Tauri menubar window. */
export default function App() {
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider>(DEFAULT_PROVIDER);

  return (
    <div className="w-screen min-h-screen bg-transparent text-white font-sans flex justify-center items-start pt-2">
      <Dashboard
        onOpenDetailedReport={(provider) => {
          setSelectedProvider(provider);
          setShowDetailedReport(true);
        }}
      />
      <AnimatePresence>
        {showDetailedReport && (
          <DetailedReport
            key="detailed-report"
            provider={selectedProvider}
            onClose={() => setShowDetailedReport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
