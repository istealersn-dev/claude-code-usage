import { useState, useRef, useEffect } from "react";
import { Dashboard } from "./Dashboard";
import { Command, BatteryCharging, Wifi, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Menubar() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Claude Code Usage Dashboard";
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  return (
    <div className="fixed top-0 left-0 right-0 h-8 bg-[#000814]/80 backdrop-blur-md border-b border-[#003566]/30 flex items-center justify-between px-4 z-50 text-white select-none shadow-sm">
      {/* Left Side: Apple Logo & App Name */}
      <div className="flex items-center gap-4 text-xs font-medium">
        <span className="font-bold tracking-tight text-sm"></span>
        <span className="font-semibold">Claude Code</span>
        <span className="opacity-70 hover:opacity-100 cursor-default hidden sm:inline-block">File</span>
        <span className="opacity-70 hover:opacity-100 cursor-default hidden sm:inline-block">Edit</span>
        <span className="opacity-70 hover:opacity-100 cursor-default hidden sm:inline-block">View</span>
        <span className="opacity-70 hover:opacity-100 cursor-default hidden sm:inline-block">Window</span>
        <span className="opacity-70 hover:opacity-100 cursor-default hidden sm:inline-block">Help</span>
      </div>

      {/* Right Side: Status Icons */}
      <div className="flex items-center gap-3 text-xs" ref={menuRef}>
        <div className="flex items-center gap-2 opacity-70 hover:opacity-100 cursor-pointer hidden sm:flex">
            <BatteryCharging className="w-3 h-3" />
            <span>100%</span>
        </div>
        <Wifi className="w-3 h-3 opacity-70 hover:opacity-100 cursor-pointer hidden sm:block" />
        <Search className="w-3 h-3 opacity-70 hover:opacity-100 cursor-pointer hidden sm:block" />
        
        {/* The Widget Trigger */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              isOpen ? "bg-[#003566] text-[#ffd60a]" : "hover:bg-[#001d3d]"
            }`}
          >
            <Command className="w-3 h-3" />
            <span className="font-bold text-[#ffd60a]">CC</span>
          </motion.button>

          {/* Dropdown Dashboard */}
          <AnimatePresence>
            {isOpen && (
              <div className="absolute top-9 right-0 origin-top-right">
                <Dashboard />
              </div>
            )}
          </AnimatePresence>
        </div>

        <span className="opacity-70 hover:opacity-100 cursor-default min-w-[60px] text-right">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
