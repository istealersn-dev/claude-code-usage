import { Menubar } from "./components/Menubar";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000814] via-[#001d3d] to-[#003566] text-white font-sans overflow-hidden relative">
      <Menubar />
      
      {/* Desktop Simulation Content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 select-none">
        <h1 className="text-9xl font-black tracking-tighter text-[#003566] mix-blend-overlay">
          AI PULSE
        </h1>
      </div>

      <div className="absolute bottom-10 left-10 text-xs text-gray-500 font-mono">
        <p>macOS Simulation Environment</p>
        <p>AI Pulse Usage Dashboard Preview</p>
      </div>
    </div>
  );
}
