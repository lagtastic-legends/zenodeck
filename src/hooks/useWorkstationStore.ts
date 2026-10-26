"use client";

import { create } from "zustand";

export type WorkstationLayoutMode = "standard" | "wide" | "focus";
export type InspectorTab = "stdout" | "hardware" | "specs";
export type InspectorWidth = "standard" | "wide";

export interface HandoffPayload {
  file: File | Blob;
  filename: string;
  mimeType: string;
  sourceTool?: string;
  timestamp: number;
}

interface WorkstationState {
  sidebarCollapsed: boolean;
  inspectorCollapsed: boolean;
  inspectorTab: InspectorTab;
  inspectorWidth: InspectorWidth;
  layoutMode: WorkstationLayoutMode;
  handoffFile: HandoffPayload | null;

  setSidebarCollapsed: (collapsed: boolean) => void;
  setInspectorCollapsed: (collapsed: boolean) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setInspectorWidth: (width: InspectorWidth) => void;
  setLayoutMode: (mode: WorkstationLayoutMode) => void;
  setHandoffFile: (payload: HandoffPayload | null) => void;
  consumeHandoffFile: () => HandoffPayload | null;
  toggleSidebar: () => void;
  toggleInspector: () => void;
  toggleFocusMode: () => void;
}

export const useWorkstationStore = create<WorkstationState>((set, get) => ({
  sidebarCollapsed: false,
  inspectorCollapsed: false,
  inspectorTab: "stdout",
  inspectorWidth: "standard",
  layoutMode: "standard",
  handoffFile: null,

  setHandoffFile: (payload) => set({ handoffFile: payload }),

  consumeHandoffFile: () => {
    const current = get().handoffFile;
    if (current) {
      set({ handoffFile: null });
    }
    return current;
  },

  setSidebarCollapsed: (collapsed) => {
    set((state) => ({
      sidebarCollapsed: collapsed,
      layoutMode: collapsed && state.inspectorCollapsed ? "focus" : collapsed ? "wide" : "standard",
    }));
  },

  setInspectorCollapsed: (collapsed) => {
    set((state) => ({
      inspectorCollapsed: collapsed,
      layoutMode: state.sidebarCollapsed && collapsed ? "focus" : state.sidebarCollapsed ? "wide" : "standard",
    }));
  },

  setInspectorTab: (tab) => set({ inspectorTab: tab }),

  setInspectorWidth: (width) => set({ inspectorWidth: width }),

  setLayoutMode: (mode) => {
    if (mode === "focus") {
      set({
        layoutMode: "focus",
        sidebarCollapsed: true,
        inspectorCollapsed: true,
      });
    } else if (mode === "wide") {
      set({
        layoutMode: "wide",
        sidebarCollapsed: true,
        inspectorCollapsed: false,
      });
    } else {
      set({
        layoutMode: "standard",
        sidebarCollapsed: false,
        inspectorCollapsed: false,
      });
    }
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    get().setSidebarCollapsed(next);
  },

  toggleInspector: () => {
    const next = !get().inspectorCollapsed;
    get().setInspectorCollapsed(next);
  },

  toggleFocusMode: () => {
    const current = get().layoutMode;
    if (current === "focus") {
      get().setLayoutMode("standard");
    } else {
      get().setLayoutMode("focus");
    }
  },
}));
