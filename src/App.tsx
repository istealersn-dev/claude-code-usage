import { Dashboard } from "@/components/Dashboard";
import { DetailedReport } from "@/components/DetailedReport";
import type { Provider } from "@/lib/data";

const VALID_PROVIDERS = new Set<Provider>(["claude", "codex", "gemini"]);
function parseProvider(raw: string | null): Provider {
  if (raw !== null && VALID_PROVIDERS.has(raw as Provider)) return raw as Provider;
  return "claude";
}

/** Root application wrapper — transparent container for the Tauri menubar window.
 *  When opened as the report window (?window=report&provider=X), renders
 *  DetailedReport directly instead of the tray popup.
 */
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isReportWindow = params.get("window") === "report";
  const reportProvider = parseProvider(params.get("provider"));

  if (isReportWindow) {
    return (
      <DetailedReport
        provider={reportProvider}
        onClose={() => window.close()}
      />
    );
  }

  return (
    <div className="w-screen min-h-screen bg-transparent text-white font-sans flex justify-center items-start pt-2">
      <Dashboard />
    </div>
  );
}
