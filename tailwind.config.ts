import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "380px",
      },
      /* ------------------------------------------------------------------ */
      /* 1. OPINIONATED TYPOGRAPHY & FLUID SCALES                           */
      /* ------------------------------------------------------------------ */
      fontFamily: {
        display: ["var(--font-orbitron)", "var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-space-grotesk)", "var(--font-manrope)", "ui-sans-serif", "system-ui", "sans-serif"],
        editorial: ["var(--font-eb-garamond)", "serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SF Mono", "monospace"],
      },
      fontSize: {
        // Fluid typography using clamp() to eliminate rigid breakpoint snapping
        "fluid-xs": "clamp(0.72rem, 0.68rem + 0.2vw, 0.82rem)",
        "fluid-sm": "clamp(0.82rem, 0.76rem + 0.3vw, 0.95rem)",
        "fluid-base": "clamp(0.95rem, 0.88rem + 0.35vw, 1.08rem)",
        "fluid-lg": "clamp(1.1rem, 1rem + 0.5vw, 1.3rem)",
        "fluid-xl": "clamp(1.28rem, 1.12rem + 0.8vw, 1.65rem)",
        "fluid-2xl": "clamp(1.6rem, 1.35rem + 1.25vw, 2.25rem)",
        "fluid-3xl": "clamp(2.1rem, 1.7rem + 2vw, 3.2rem)",
        "fluid-hero": "clamp(2.6rem, 1.9rem + 3.5vw, 4.8rem)",
      },
      letterSpacing: {
        widest: "0.28em",
        tactile: "0.14em",
        dense: "-0.03em",
      },

      /* ------------------------------------------------------------------ */
      /* 2. OFF-GRID TACTILE COLOR SYSTEM                                   */
      /* ------------------------------------------------------------------ */
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Hand-crafted Chromatic Accents (No generic slate/blue defaults)
        obsidian: {
          950: "oklch(0.10 0.020 285)",
          900: "oklch(0.12 0.018 290)",
          800: "oklch(0.16 0.022 292)",
          700: "oklch(0.22 0.025 295)",
        },
        luminous: {
          violet: "oklch(0.64 0.24 298)",
          plasma: "oklch(0.70 0.29 332)",
          cyan: "oklch(0.84 0.14 202)",
          mint: "oklch(0.78 0.19 160)",
          amber: "oklch(0.79 0.18 78)",
        },
        terracotta: {
          // 60% Dominant (Canvas / Atmosphere)
          dominant: "#FAF5EE",
          paper: "#FAF5EE",
          linen: "#FAF5EE",
          canvas: "#FAF5EE",

          // 30% Secondary (Surfaces, Contours & Deep Timber Typography)
          surface: "#F3ECE0",
          secondary: "#EDE3D4",
          border: "#DFD3C2",
          borderHover: "#CDBC9F",
          espresso: "#342A24",
          dark: "#342A24",
          timber: "#342A24",
          muted: "#756457",
          subtle: "#8C7A6D",

          // 10% Hero Accent (Fired Clay, Burnt Sienna & Radiant Ember)
          clay: "#C2652A",
          accent: "#C2652A",
          accentHover: "#A8521C",
          burnt: "#964228",
          sienna: "#964228",
          amber: "#D97736",
          glow: "rgba(194, 101, 42, 0.45)",
        },
      },

      /* ------------------------------------------------------------------ */
      /* 3. PHYSICAL DEPTH & MULTI-LAYERED ELEVATIONS                      */
      /* ------------------------------------------------------------------ */
      boxShadow: {
        // Physical multi-tier drop shadows
        subtle: "0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        tactile: "0 4px 12px -2px rgba(0, 0, 0, 0.18), 0 2px 4px -1px rgba(0, 0, 0, 0.12), inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)",
        elevation1: "0 8px 24px -4px rgba(0, 0, 0, 0.28), 0 3px 8px -2px rgba(0, 0, 0, 0.16), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.1)",
        elevation2: "0 16px 36px -6px rgba(0, 0, 0, 0.38), 0 6px 14px -3px rgba(0, 0, 0, 0.22), inset 0 1px 2px 0 rgba(255, 255, 255, 0.14)",
        elevation3: "0 24px 48px -8px rgba(0, 0, 0, 0.48), 0 10px 20px -4px rgba(0, 0, 0, 0.3), inset 0 1px 2.5px 0 rgba(255, 255, 255, 0.18)",
        // Luminous edge glows
        glowPrimary: "0 0 24px -4px oklch(0.64 0.24 298 / 0.45), 0 6px 16px -2px oklch(0.64 0.24 298 / 0.25)",
        glowCyan: "0 0 24px -4px oklch(0.84 0.14 202 / 0.45), 0 6px 16px -2px oklch(0.84 0.14 202 / 0.25)",
        glowPlasma: "0 0 24px -4px oklch(0.70 0.29 332 / 0.45), 0 6px 16px -2px oklch(0.70 0.29 332 / 0.25)",
        glowTerracotta: "0 0 24px -4px rgba(194, 101, 42, 0.45), 0 6px 16px -2px rgba(194, 101, 42, 0.28)",
      },

      /* ------------------------------------------------------------------ */
      /* 4. ASYMMETRICAL LAYOUTS & ERGONOMIC TOUCH TARGETS                 */
      /* ------------------------------------------------------------------ */
      gridTemplateColumns: {
        "asym-60-40": "3fr 2fr",
        "asym-40-60": "2fr 3fr",
        "asym-70-30": "7fr 3fr",
        "asym-30-70": "3fr 7fr",
      },
      minHeight: {
        touch: "44px",
        "touch-lg": "48px",
      },
      minWidth: {
        touch: "44px",
        "touch-lg": "48px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        tactile: "14px",
        organic: "20px",
      },

      /* ------------------------------------------------------------------ */
      /* 5. SPRING PHYSICS & TACTILE ANIMATIONS                            */
      /* ------------------------------------------------------------------ */
      transitionTimingFunction: {
        springSnappy: "cubic-bezier(0.2, 0.9, 0.3, 1.2)",
        springSmooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        springBounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        shimmerOrganic: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        pulseOrganic: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(0.985)" },
        },
      },
      animation: {
        shimmer: "shimmerOrganic 2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        pulseOrganic: "pulseOrganic 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
