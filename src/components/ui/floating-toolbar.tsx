"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Plus, Layers, Scissors, Settings, Database } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useUIAudio } from "@/hooks/useUIAudio";

/**
 * 120Hz Spring Dynamics Tuning
 * Near-critical damping for rapid response without jitter or overshoot
 */
const physicsSpring = {
  type: "spring",
  stiffness: 380,
  damping: 26,
  mass: 0.7,
} as const;

/**
 * Safe Haptic Dispatcher with Web Vibration API fallback
 */
export async function triggerHaptic(style: ImpactStyle) {
  try {
    await Haptics.impact({ style });
  } catch {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(style === ImpactStyle.Light ? 12 : 28);
    }
  }
}

/**
 * Physics Variants for the Pill Container
 * Handles expansion height and stagger sequence for inner action items
 */
export const containerVariants: Variants = {
  collapsed: {
    height: 56,
    width: 56,
    borderRadius: 28,
    boxShadow: "0 8px 32px -4px rgba(0, 0, 0, 0.45), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)",
    transition: {
      ...physicsSpring,
      staggerChildren: 0.035,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
  expanded: {
    height: "auto",
    width: 56,
    borderRadius: 28,
    boxShadow: "0 16px 48px -6px rgba(0, 0, 0, 0.65), 0 0 24px -2px oklch(0.64 0.24 298 / 0.35), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.25)",
    transition: {
      ...physicsSpring,
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
};

/**
 * Item Motion Variants
 * Sequential pop-in with scale, opacity, blur release and vertical glide
 */
export const itemVariants: Variants = {
  collapsed: {
    opacity: 0,
    scale: 0.5,
    y: 18,
    filter: "blur(6px)",
    transition: {
      type: "spring",
      stiffness: 420,
      damping: 28,
    },
  },
  expanded: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: physicsSpring,
  },
};

export interface ToolbarAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick?: () => void;
  accentClass?: string;
  accent?: string;
}

export interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  onClick?: () => void;
  accentClass?: string;
}

/**
 * ActionButton — Tactile Android-spec 44x44px tool trigger
 */
export function ActionButton({
  icon: Icon,
  label,
  onClick,
  accentClass = "text-foreground hover:text-primary hover:bg-primary/10 border-border/80",
}: ActionButtonProps) {
  const { playHover, playClick } = useUIAudio();

  const handleClick = () => {
    playClick();
    void triggerHaptic(ImpactStyle.Medium);
    onClick?.();
  };

  return (
    <motion.button
      type="button"
      variants={itemVariants}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      transition={physicsSpring}
      onMouseEnter={() => playHover()}
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={`group relative flex size-11 min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full border bg-card/75 shadow-tactile backdrop-blur-xl outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary ${accentClass}`}
    >
      <Icon className="size-5 transition-transform duration-200 group-hover:scale-110" strokeWidth={1.85} />
      
      {/* Android Floating Micro-Label Pill (Anchored Left) */}
      <span className="pointer-events-none absolute right-[calc(100%+0.85rem)] hidden whitespace-nowrap rounded-full border border-border/80 bg-card/95 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-elevation2 backdrop-blur-xl transition-all duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block opacity-0">
        {label}
      </span>
    </motion.button>
  );
}

export const DEFAULT_TOOLBAR_ACTIONS: ToolbarAction[] = [
  { id: "matrix", label: "Tool Matrix", icon: Layers },
  { id: "editor", label: "Media Studio", icon: Scissors },
  { id: "vault", label: "File Vault", icon: Database },
  { id: "settings", label: "Core Engine", icon: Settings },
];

interface FloatingToolbarProps {
  children?: React.ReactNode;
  actions?: ToolbarAction[];
  onActionClick?: (actionId: string) => void;
  className?: string;
  defaultOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

/**
 * FloatingToolbar — Android-native Expanding Pill Menu
 *
 * Designed with glassmorphic depth, physical spring mechanics,
 * 44x44px touch targets, native Capacitor haptic feedback,
 * and edge-to-edge safe area conformance.
 */
export function FloatingToolbar({
  children,
  actions = DEFAULT_TOOLBAR_ACTIONS,
  onActionClick,
  className = "",
  defaultOpen = false,
  onToggle,
}: FloatingToolbarProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { playHover, playClick } = useUIAudio();

  const handleToggle = () => {
    playClick();
    const nextState = !isOpen;
    // Trigger Light haptic impact on open/close
    void triggerHaptic(ImpactStyle.Light);
    setIsOpen(nextState);
    onToggle?.(nextState);
  };

  /* Auto-hide FAB when scrolling down on mobile, restore when scrolling up or at top */
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY || document.documentElement.scrollTop;
          if (currentY > lastScrollY.current + 18 && currentY > 60 && !isOpen) {
            setIsVisible(false);
          } else if (currentY < lastScrollY.current - 12 || currentY <= 30) {
            setIsVisible(true);
          }
          lastScrollY.current = Math.max(0, currentY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  /* Register as active overlay so back key/gesture collapses the toolbar first */
  useEffect(() => {
    if (isOpen) {
      return useNavStore.getState().registerOverlay("floating-toolbar", () => {
        setIsOpen(false);
        return true;
      });
    }
  }, [isOpen]);

  return (
    <motion.div
      initial={{ y: 0, opacity: 1 }}
      animate={{
        y: isVisible || isOpen ? 0 : 80,
        opacity: isVisible || isOpen ? 1 : 0,
      }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed z-[60] flex flex-col items-center select-none ${
        isVisible || isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      style={{
        right: "calc(env(safe-area-inset-right, 0px) + 1.25rem)",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)",
      }}
    >
      <motion.div
        layout
        initial="collapsed"
        animate={isOpen ? "expanded" : "collapsed"}
        variants={containerVariants}
        className={`pointer-events-auto relative flex flex-col-reverse items-center gap-2 overflow-hidden border border-white/12 bg-card/80 p-1.5 backdrop-blur-2xl ${className}`}
      >
        {/* Master Toggle Trigger Pill */}
        <motion.button
          type="button"
          onClick={handleToggle}
          onMouseEnter={() => playHover()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          transition={physicsSpring}
          aria-label={isOpen ? "Collapse toolbar" : "Expand toolbar"}
          aria-expanded={isOpen}
          className="relative flex size-11 min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-b from-primary via-primary to-plasma text-primary-foreground shadow-[0_4px_16px_oklch(0.64_0.24_298/0.45)] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <motion.div
            animate={{ rotate: isOpen ? 135 : 0 }}
            transition={physicsSpring}
            className="flex items-center justify-center"
          >
            <Plus className="size-5 stroke-[2.5]" />
          </motion.div>
        </motion.button>

        {/* Stack Container for Actions */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              layout
              className="flex flex-col-reverse items-center gap-2 pb-1"
            >
              {children
                ? children
                : actions.map((action) => (
                    <ActionButton
                      key={action.id}
                      icon={action.icon}
                      label={action.label}
                      accentClass={action.accentClass}
                      onClick={() => {
                        setIsOpen(false);
                        action.onClick?.();
                        onActionClick?.(action.id);
                      }}
                    />
                  ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
