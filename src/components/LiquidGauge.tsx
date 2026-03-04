import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiquidGaugeProps {
  percentage: number;
  className?: string;
  isError?: boolean;
  color?: string;
  darkColor?: string;
}

export function LiquidGauge({ percentage, className, isError = false, color = "#ffd60a", darkColor = "#ffc300" }: LiquidGaugeProps) {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  
  // The height of the bottle fill area is roughly 140 units (from y=150 to y=10)
  // We want to map 0-100% to this height.
  // y=150 is empty (bottom), y=10 is full (top).
  const fillHeight = 140;
  const yOffset = 150 - (fillHeight * clampedPercentage) / 100;

  return (
    <div className={cn("relative w-32 h-48 mx-auto", className)}>
      <svg
        viewBox="0 0 100 160"
        className="w-full h-full drop-shadow-2xl"
        style={{ filter: "drop-shadow(0 0 15px rgba(0, 53, 102, 0.4))" }}
      >
        <defs>
          <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isError ? "#ef4444" : color} />
            <stop offset="100%" stopColor={isError ? "#b91c1c" : darkColor} />
          </linearGradient>
          
          <clipPath id="bottleClip">
             <path d="M20,10 L80,10 C85,10 90,15 90,20 L90,140 C90,150 82,158 72,158 L28,158 C18,158 10,150 10,140 L10,20 C10,15 15,10 20,10 Z" />
          </clipPath>
        </defs>

        {/* Bottle Background */}
        <path
          d="M20,10 L80,10 C85,10 90,15 90,20 L90,140 C90,150 82,158 72,158 L28,158 C18,158 10,150 10,140 L10,20 C10,15 15,10 20,10 Z"
          fill="rgba(255, 255, 255, 0.05)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
        />

        {/* Liquid Group */}
        <g clipPath="url(#bottleClip)">
          {/* Back Wave */}
          <motion.path
            fill="url(#liquidGradient)"
            fillOpacity="0.6"
            d="M -200 0 Q -175 12 -150 0 T -100 0 Q -75 12 -50 0 T 0 0 Q 25 12 50 0 T 100 0 Q 125 12 150 0 T 200 0 Q 225 12 250 0 T 300 0 V 200 H -200 Z"
            animate={{ x: [-100, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
            initial={{ y: yOffset + 5 }}
            style={{ y: yOffset + 5 }}
          />

          {/* Front Wave */}
          <motion.path
            fill="url(#liquidGradient)"
            d="M -200 0 Q -175 15 -150 0 T -100 0 Q -75 15 -50 0 T 0 0 Q 25 15 50 0 T 100 0 Q 125 15 150 0 T 200 0 Q 225 15 250 0 T 300 0 V 200 H -200 Z"
            animate={{ x: [-100, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            initial={{ y: yOffset }}
            style={{ y: yOffset }}
          />
        </g>

        {/* Bottle Outline (Thick Border) */}
        <path
          d="M20,10 L80,10 C85,10 90,15 90,20 L90,140 C90,150 82,158 72,158 L28,158 C18,158 10,150 10,140 L10,20 C10,15 15,10 20,10 Z"
          fill="none"
          stroke="#003566" 
          strokeWidth="4"
          className="z-20"
        />
      </svg>
      
      {/* Percentage Text Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
        <span className="text-3xl font-bold text-white drop-shadow-lg font-mono tracking-tighter">
          {Math.round(percentage)}<span className="text-base align-top">%</span>
        </span>
      </div>
    </div>
  );
}

