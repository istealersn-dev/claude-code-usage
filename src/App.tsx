import { Dashboard } from "@/components/Dashboard";
import { DetailedReport } from "@/components/DetailedReport";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Provider } from "@/lib/data";

/** Root application wrapper — transparent container for the Tauri menubar window. */
export default function App() {
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider>("claude");

  return (
    <div style={{ width: '100vw', minHeight: '100vh' }} className="bg-transparent text-white font-sans flex justify-center items-start pt-2">
      <Dashboard
        onOpenDetailedReport={(provider) => {
          setSelectedProvider(provider);
          setShowDetailedReport(true);
        }}
      />
      <AnimatePresence>
        {showDetailedReport && (
          <DetailedReport
            provider={selectedProvider}
            onClose={() => setShowDetailedReport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
