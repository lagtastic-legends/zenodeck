"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useHaptics, type HapticImpact } from "@/hooks/use-haptics";
import { useUIAudio } from "@/hooks/useUIAudio";
import { cn } from "@/lib/utils";

/**
 * HUMAN-CRAFTED BUTTON COMPONENT
 * 
 * Demonstrating the 5 Design Pillars:
 * 1. Opinionated typography (tracked-out medium/bold, optical kerning)
 * 2. Multi-layered physical depth (layered shadows, rim specular highlights)
 * 3. Tactile micro-interactions (spring physics, active scale down to 0.965)
 * 4. Mobile ergonomics (minimum 44x44px touch target)
 * 5. Empathetic state feedback (animated micro-loader & graceful disabled state)
 */
export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2.5 whitespace-nowrap text-sm font-semibold tracking-wide outline-none select-none transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer",
  {
    variants: {
      variant: {
        // 1. Primary: Rich cyber-violet gradient with top rim highlight & reactive ambient glow
        default:
          "bg-gradient-to-b from-primary via-primary to-plasma text-primary-foreground shadow-[0_4px_16px_-2px_oklch(0.64_0.24_298/0.4),inset_0_1px_1px_0_rgba(255,255,255,0.28)] border border-primary/50 hover:shadow-[0_8px_24px_-2px_oklch(0.64_0.24_298/0.55),inset_0_1px_1.5px_0_rgba(255,255,255,0.35)]",

        // 2. Tactile / Secondary: Deep obsidian slab with physical bevel and lift
        secondary:
          "bg-card/90 text-foreground border border-border/80 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.08)] hover:border-primary/40 hover:bg-card hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.45),inset_0_1px_1.5px_0_rgba(255,255,255,0.14)]",

        // 3. Glass / Outline: Frosted glassmorphism with subtle specular reflection
        outline:
          "bg-card/40 backdrop-blur-md text-foreground border border-border/70 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2),inset_0_1px_1px_0_rgba(255,255,255,0.06)] hover:bg-card/70 hover:border-primary/50 hover:text-foreground",

        // 4. Ghost: Weightless elegance with delicate hover tint
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-white/[0.06] active:bg-white/[0.1]",

        // 5. Destructive: Deep ember with physical warning aura
        destructive:
          "bg-gradient-to-b from-destructive to-destructive/90 text-white border border-destructive/60 shadow-[0_4px_16px_-2px_rgba(220,38,38,0.4),inset_0_1px_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_8px_24px_-2px_rgba(220,38,38,0.55)]",

        // 6. Neon Cyan: Radiant cyber luminescence
        neon:
          "bg-gradient-to-b from-neon to-neon/80 text-background font-bold border border-neon/50 shadow-[0_4px_18px_-2px_oklch(0.84_0.14_202/0.45),inset_0_1px_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_8px_28px_-2px_oklch(0.84_0.14_202/0.65)]",

        // 7. Terracotta: 10% Fired clay hero action with specular rim & burnt sienna depth
        terracotta:
          "bg-gradient-to-b from-[#C2652A] via-[#C2652A] to-[#964228] text-white font-medium border border-[#A8521C]/80 shadow-[0_4px_16px_-2px_rgba(194,101,42,0.45),inset_0_1px_1.5px_0_rgba(255,255,255,0.4)] hover:from-[#D97736] hover:to-[#A8521C] hover:shadow-[0_8px_24px_-2px_rgba(194,101,42,0.55),inset_0_1px_2px_0_rgba(255,255,255,0.5)] active:from-[#964228] active:to-[#7E331E]",

        // 8. Link
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto min-h-0",
      },
      size: {
        // Ergonomic mobile-first touch sizing (minimum 44px touch height)
        default: "min-h-[44px] px-5 py-2.5 rounded-tactile text-sm",
        sm: "min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs tracking-wider",
        lg: "min-h-[50px] px-7 py-3.5 rounded-tactile text-base font-bold",
        icon: "size-11 min-h-[44px] min-w-[44px] rounded-tactile p-0",
        pill: "min-h-[44px] px-6 py-2.5 rounded-full text-sm",
        mobileCta: "min-h-[48px] w-full px-6 py-3 rounded-tactile text-sm font-display font-bold uppercase tracking-tactile",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/* 120Hz GPU-Optimized Spring Physics Tuning */
const springPhysics = {
  type: "spring",
  stiffness: 380,
  damping: 28,
  mass: 0.7,
} as const;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  haptic?: HapticImpact | "none";
  audio?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      haptic = "light",
      audio = true,
      children,
      disabled,
      onPointerDown,
      onMouseEnter,
      onClick,
      ...props
    },
    ref
  ) => {
    const haptics = useHaptics();
    const { playHover, playClick } = useUIAudio();

    const clickedRef = React.useRef(false);

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading && audio) {
        playHover();
      }
      onMouseEnter?.(e);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading && audio) {
        playClick();
        clickedRef.current = true;
      }
      if (!disabled && !isLoading && haptic !== "none") {
        void haptics.impact(haptic);
      }
      onPointerDown?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading && audio && !clickedRef.current) {
        playClick();
      }
      clickedRef.current = false;
      onClick?.(e);
    };

    // When asChild is requested (e.g. Next.js Link or Radix Trigger), pass through to Slot
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          onMouseEnter={handleMouseEnter}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    // Otherwise, render tactile spring-powered motion.button
    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        onMouseEnter={handleMouseEnter}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        whileHover={
          disabled || isLoading
            ? undefined
            : {
                y: -2,
                transition: springPhysics,
              }
        }
        whileTap={
          disabled || isLoading
            ? undefined
            : {
                scale: 0.965,
                y: 1,
                transition: springPhysics,
              }
        }
        className={cn(buttonVariants({ variant, size, className }))}
        style={{ transform: "translate3d(0, 0, 0)", backfaceVisibility: "hidden" }}
        {...(props as HTMLMotionProps<"button">)}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin text-current" />
            <span className="opacity-80 font-mono text-xs">processing…</span>
          </>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
