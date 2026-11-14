"use client";

import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useUIAudio } from "@/hooks/useUIAudio";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";

export function AudioToggle({ className }: { className?: string }) {
  const { isAudioMuted, toggleAudioMuted, playClick, playHover } = useUIAudio();
  const haptics = useHaptics();

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onMouseEnter={() => playHover()}
      onClick={() => {
        haptics.light();
        toggleAudioMuted();
        if (isAudioMuted) {
          setTimeout(() => playClick(), 40);
        }
      }}
      title={isAudioMuted ? "Enable UI Audio Feedback" : "Mute UI Audio Feedback"}
      aria-label={isAudioMuted ? "Enable UI Audio Feedback" : "Mute UI Audio Feedback"}
      className={cn(
        "relative flex h-8 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[10px] font-bold tracking-wider transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/70 cursor-pointer",
        !isAudioMuted
          ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary"
          : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
        className
      )}
    >
      {isAudioMuted ? (
        <VolumeX className="size-3.5 shrink-0" />
      ) : (
        <Volume2 className="size-3.5 shrink-0" />
      )}
      <span className="hidden sm:inline uppercase whitespace-nowrap shrink-0">
        {isAudioMuted ? "Muted" : "Audio"}
      </span>
    </motion.button>
  );
}
