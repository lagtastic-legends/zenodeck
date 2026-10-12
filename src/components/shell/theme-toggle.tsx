"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Palette, Sparkles, SunMedium } from "lucide-react";
import { useThemeStore } from "@/lib/theme/theme-store";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="size-8 rounded-full border border-border/70 bg-card/60 animate-pulse" />
    );
  }

  const isTerracotta = theme === "terracotta";

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileTap={{ scale: 0.92 }}
      title={
        isTerracotta
          ? "Terracotta 60-30-10 Studio Palette (Click to switch to Cyber Dark)"
          : "Cyber Dark Palette (Click to switch to Terracotta 60-30-10 Studio)"
      }
      aria-label="Toggle Theme"
      className={cn(
        "relative flex h-8 items-center gap-2 rounded-full border px-2.5 font-mono text-[10px] font-bold tracking-wider transition-all duration-300",
        isTerracotta
          ? "border-[#DFD3C2] bg-[#FAF5EE] text-[#342A24] shadow-sm hover:border-[#C2652A]/60"
          : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
      )}
    >
      {/* 60-30-10 Color harmony swatch */}
      <span className="flex items-center -space-x-0.5">
        {isTerracotta ? (
          <>
            {/* 60% Canvas */}
            <span
              className="size-2 rounded-full bg-[#FAF5EE] border border-[#DFD3C2]"
              title="60% Raw Linen Canvas"
            />
            {/* 30% Timber / Sandstone */}
            <span
              className="size-2 rounded-full bg-[#342A24]"
              title="30% Espresso Timber & Sandstone"
            />
            {/* 10% Fired Clay Accent */}
            <span
              className="size-2 rounded-full bg-[#C2652A] shadow-[0_0_6px_#C2652A]"
              title="10% Fired Terracotta Hero"
            />
          </>
        ) : (
          <>
            <span className="size-2 rounded-full bg-background border border-border/70" />
            <span className="size-2 rounded-full bg-secondary" />
            <span className="size-2 rounded-full bg-primary shadow-[0_0_6px_oklch(0.64_0.24_298)]" />
          </>
        )}
      </span>

      <span className="hidden sm:inline uppercase">
        {isTerracotta ? "Terracotta" : "Cyber"}
      </span>

      <span className="sm:hidden">
        {isTerracotta ? "🎨" : "⚡"}
      </span>
    </motion.button>
  );
}
