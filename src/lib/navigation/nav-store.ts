"use client";

/**
 * Client view router & hierarchical navigation engine for ZenoDeck.
 * Coordinates view transitions, back navigation stack, and active tool selection.
 *
 * Implements a 5-tier back navigation protocol:
 *  1. Overlays & drawers (AI chat, Search, Modals, Floating Toolbar).
 *  2. Multi-step sub-navigation (stepping back inside active tool flows).
 *  3. Unsaved work & active job guards (confirmation before data loss).
 *  4. In-app history stack (returning to previous tool/view).
 *  5. Direct-link safety & root fallback (safe return to Dashboard or native app exit).
 */

import { create } from "zustand";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

export const DASHBOARD_VIEW = "dashboard";

export interface OverlayEntry {
  id: string;
  close: () => boolean | void;
}

export type StepHandler = () => boolean;

export interface DirtyCheckResult {
  hasUnsaved: boolean;
  message?: string;
  fileName?: string;
  category?: "video" | "audio" | "image" | "pdf" | "file";
}

export type DirtyGuard = () => boolean | DirtyCheckResult;

export interface ConfirmDialogState {
  isOpen: boolean;
  title?: string;
  message: string;
  fileName?: string;
  category?: "video" | "audio" | "image" | "pdf" | "file";
  onConfirm: () => void;
  onCancel: () => void;
}

interface NavState {
  view: string;
  history: string[];
  overlays: OverlayEntry[];
  stepHandlers: StepHandler[];
  dirtyGuards: DirtyGuard[];
  confirmDialogState: ConfirmDialogState | null;
  isAudioMuted: boolean;

  // Actions
  navigate: (view: string, options?: { replace?: boolean }) => void;
  reset: () => void;
  forceReset: () => void;
  setConfirmDialog: (state: ConfirmDialogState | null) => void;
  setAudioMuted: (muted: boolean) => void;
  toggleAudioMuted: () => void;
  registerOverlay: (id: string, close: () => boolean | void) => () => void;
  registerStepHandler: (handler: StepHandler) => () => void;
  registerDirtyGuard: (guard: DirtyGuard) => () => void;
  handleBack: () => Promise<boolean>;
  _executeHistoryPop: () => Promise<boolean>;
}

const getInitialView = (): string => {
  if (typeof window !== "undefined" && window.location.hash) {
    const raw = window.location.hash.replace(/^#/, "");
    if (raw === "video-editor" || raw === "editor") return "video-converter";
    if (raw && raw !== DASHBOARD_VIEW) {
      return raw;
    }
  }
  return DASHBOARD_VIEW;
};

const getInitialAudioMuted = (): boolean => {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem("omni_ui_audio_muted") === "true";
    } catch {}
  }
  return false;
};

export const useNavStore = create<NavState>((set, get) => ({
  view: getInitialView(),
  history: [],
  overlays: [],
  stepHandlers: [],
  dirtyGuards: [],
  confirmDialogState: null,
  isAudioMuted: getInitialAudioMuted(),

  navigate: (nextView, options) => {
    const targetView = nextView === "video-editor" || nextView === "editor" ? "video-converter" : nextView;
    const currentView = get().view;
    if (currentView === targetView) return;

    const currentHistory = get().history;
    const newHistory = options?.replace
      ? currentHistory
      : [...currentHistory, currentView];

    set({
      view: targetView,
      history: newHistory,
      stepHandlers: [],
      dirtyGuards: [],
    });

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      try {
        const hash = targetView === DASHBOARD_VIEW ? "" : `#${targetView}`;
        const newUrl = window.location.pathname + hash;
        if (options?.replace) {
          window.history.replaceState({ view: nextView }, "", newUrl);
        } else {
          window.history.pushState({ view: nextView }, "", newUrl);
        }
      } catch {
        // ignore history state exceptions in sandboxed contexts
      }
    }
  },

  reset: () => {
    void get().handleBack();
  },

  forceReset: () => {
    set({
      view: DASHBOARD_VIEW,
      history: [],
      stepHandlers: [],
      dirtyGuards: [],
      confirmDialogState: null,
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      try {
        window.history.replaceState({ view: DASHBOARD_VIEW }, "", window.location.pathname);
      } catch {
        // ignore
      }
    }
  },

  setConfirmDialog: (state) => {
    set({ confirmDialogState: state });
  },

  setAudioMuted: (muted) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("omni_ui_audio_muted", String(muted));
      } catch {}
    }
    set({ isAudioMuted: muted });
  },

  toggleAudioMuted: () => {
    const next = !get().isAudioMuted;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("omni_ui_audio_muted", String(next));
      } catch {}
    }
    set({ isAudioMuted: next });
  },

  registerOverlay: (id, close) => {
    set((state) => ({
      overlays: [...state.overlays.filter((o) => o.id !== id), { id, close }],
    }));
    return () => {
      set((state) => ({
        overlays: state.overlays.filter((o) => o.id !== id),
      }));
    };
  },

  registerStepHandler: (handler) => {
    set((state) => ({
      stepHandlers: [...state.stepHandlers, handler],
    }));
    return () => {
      set((state) => ({
        stepHandlers: state.stepHandlers.filter((h) => h !== handler),
      }));
    };
  },

  registerDirtyGuard: (guard) => {
    set((state) => ({
      dirtyGuards: [...state.dirtyGuards, guard],
    }));
    return () => {
      set((state) => ({
        dirtyGuards: state.dirtyGuards.filter((g) => g !== guard),
      }));
    };
  },

  _executeHistoryPop: async () => {
    const state = get();
    const history = [...state.history];

    // 4. In-App Navigation Stack: Return to previous visited view
    if (history.length > 0) {
      const prevView = history.pop()!;
      set({
        view: prevView,
        history,
        stepHandlers: [],
        dirtyGuards: [],
      });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        try {
          const hash = prevView === DASHBOARD_VIEW ? "" : `#${prevView}`;
          window.history.replaceState({ view: prevView }, "", window.location.pathname + hash);
        } catch {
          // ignore
        }
      }
      return true;
    }

    // 5. Direct Link / Fallback: If user entered directly with no history, return safely to dashboard
    if (state.view !== DASHBOARD_VIEW) {
      set({
        view: DASHBOARD_VIEW,
        history: [],
        stepHandlers: [],
        dirtyGuards: [],
      });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        try {
          window.history.replaceState({ view: DASHBOARD_VIEW }, "", window.location.pathname);
        } catch {
          // ignore
        }
      }
      return true;
    }

    // Already on dashboard with no prior history: Clean exit on native Android
    if (Capacitor.isNativePlatform()) {
      await CapacitorApp.exitApp();
      return true;
    }

    return false;
  },

  handleBack: async () => {
    const state = get();

    // If unsaved confirm dialog is currently open, pressing back cancels/dismisses it
    if (state.confirmDialogState?.isOpen) {
      state.confirmDialogState.onCancel();
      return true;
    }

    // TIER 1: Close topmost overlay or drawer first (AI chat, Search, Menu)
    if (state.overlays.length > 0) {
      const overlaysCopy = [...state.overlays];
      const topOverlay = overlaysCopy.pop();
      if (topOverlay) {
        set({ overlays: overlaysCopy });
        try {
          const res = topOverlay.close();
          if (res !== false) return true;
        } catch {
          return true;
        }
      }
    }

    // TIER 2: Sub-step navigation inside active tool flows (e.g. Output view -> Editor view)
    // Takes user back one step inside the active task without closing or leaving it
    if (state.stepHandlers.length > 0) {
      const handlers = [...state.stepHandlers];
      for (let i = handlers.length - 1; i >= 0; i--) {
        try {
          const handled = handlers[i]();
          if (handled) return true;
        } catch {
          // continue
        }
      }
    }

    // TIER 3: Check for unsaved work or active operations BEFORE exiting the task
    let hasUnsaved = false;
    let guardMessage =
      "You have an active operation or unsaved work in progress. Going back will discard your current progress. Are you sure you want to proceed?";
    let guardFileName: string | undefined = undefined;
    let guardCategory: "video" | "audio" | "image" | "pdf" | "file" | undefined = undefined;

    for (const guard of state.dirtyGuards) {
      try {
        const res = guard();
        if (typeof res === "boolean" && res) {
          hasUnsaved = true;
          break;
        } else if (typeof res === "object" && res && res.hasUnsaved) {
          hasUnsaved = true;
          if (res.message) guardMessage = res.message;
          if (res.fileName) guardFileName = res.fileName;
          if (res.category) guardCategory = res.category;
          break;
        }
      } catch {
        // ignore
      }
    }

    if (hasUnsaved) {
      return new Promise<boolean>((resolve) => {
        set({
          confirmDialogState: {
            isOpen: true,
            title: "Discard Unsaved Work?",
            message: guardMessage,
            fileName: guardFileName,
            category: guardCategory,
            onConfirm: () => {
              set({ confirmDialogState: null });
              // Discard confirmed: proceed directly to leaving the task / popping history
              get()._executeHistoryPop().then(resolve);
            },
            onCancel: () => {
              set({ confirmDialogState: null });
              resolve(false);
            },
          },
        });
      });
    }

    // TIERS 4 & 5: Pop in-app history stack or safely fall back to dashboard / exit
    return await get()._executeHistoryPop();
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    const raw = window.location.hash.replace(/^#/, "");
    const target = raw && raw !== DASHBOARD_VIEW ? raw : DASHBOARD_VIEW;
    if (useNavStore.getState().view !== target) {
      useNavStore.getState().navigate(target, { replace: true });
    }
  });
}
