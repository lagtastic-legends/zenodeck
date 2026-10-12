"use client";

/**
 * Ambient cinematic backdrop:
 *  - three slow-drifting neon aurora orbs (violet / cyan / fuchsia)
 *  - an engineering grid that fades radially
 *  - a vignette to focus the content column
 * Purely decorative — pointer-events disabled, GPU-friendly transforms only.
 */

import { motion, useReducedMotion } from "framer-motion";

export function AuroraBackground() {
  const reduceMotion = useReducedMotion();

  const orbs = [
    {
      className:
        "h-[20rem] w-[20rem] sm:h-[42rem] sm:w-[42rem] -top-32 -left-20 sm:-top-64 sm:-left-40 bg-primary/20 blur-[50px] sm:blur-[140px]",
      drift: reduceMotion ? undefined : { x: [0, 40, -15, 0], y: [0, 20, 40, 0] },
    },
    {
      className:
        "h-[18rem] w-[18rem] sm:h-[36rem] sm:w-[36rem] top-1/3 -right-24 sm:-right-52 bg-neon/15 blur-[45px] sm:blur-[130px]",
      drift: reduceMotion ? undefined : { x: [0, -35, 10, 0], y: [0, 30, -20, 0] },
    },
    {
      className:
        "hidden sm:block sm:h-[30rem] sm:w-[30rem] bottom-[-8rem] left-1/4 bg-plasma/15 sm:blur-[120px]",
      drift: reduceMotion ? undefined : { x: [0, 30, -40, 0], y: [0, -40, 20, 0] },
    },
  ];

  return (
    <div
      aria-hidden="true"
      style={{ contain: "strict", transform: "translate3d(0, 0, 0)" }}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Aurora orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${orb.className}`}
          style={{
            willChange: "transform",
            transform: "translate3d(0, 0, 0)",
            backfaceVisibility: "hidden",
            contain: "layout style paint",
          }}
          animate={orb.drift ?? undefined}
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: 26 + i * 6,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }
          }
        />
      ))}

      {/* Engineering grid */}
      <div className="absolute inset-0 bg-hud-grid" />

      {/* Vignette */}
      <div className="absolute inset-0 aurora-vignette" />

      {/* Bottom fade into the abyss */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-abyss/90 to-transparent" />
    </div>
  );
}
