"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OmniTheme = "cyber" | "terracotta" | "precision";

interface ThemeState {
  theme: OmniTheme;
  setTheme: (theme: OmniTheme) => void;
  toggleTheme: () => void;
}

export function isApkPlatform(): boolean {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_MOBILE_EXPORT === "1";
  }
  return (
    process.env.NEXT_PUBLIC_MOBILE_EXPORT === "1" ||
    (window as any).Capacitor?.isNativePlatform?.() === true ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "ionic:" ||
    document.documentElement.getAttribute("data-platform") === "apk"
  );
}

function applyThemeToDom(theme: OmniTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  
  if (isApkPlatform()) {
    root.setAttribute("data-platform", "apk");
  }

  root.setAttribute("data-theme", theme);
  
  if (theme === "terracotta" || theme === "precision") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  }

  // Update mobile status bar theme color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    const color =
      theme === "precision" ? "#f3fbff" : theme === "terracotta" ? "#FAF5EE" : "#0a0813";
    metaTheme.setAttribute("content", color);
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: isApkPlatform() ? "precision" : "cyber",
      setTheme: (theme) => {
        applyThemeToDom(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const isApk = isApkPlatform();
        let next: OmniTheme;
        if (isApk) {
          next = get().theme === "precision" ? "cyber" : "precision";
        } else {
          next = get().theme === "cyber" ? "terracotta" : "cyber";
        }
        applyThemeToDom(next);
        set({ theme: next });
      },
    }),
    {
      name: "omni_theme_preference",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (isApkPlatform()) {
          // Unconditionally ensure Precision Engineering theme and APK platform flag are locked for APK
          applyThemeToDom(state?.theme ?? "precision");
        } else if (state?.theme) {
          applyThemeToDom(state.theme);
        }
      },
    }
  )
);
