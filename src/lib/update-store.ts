"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  checkForUpdates,
  type AppUpdateInfo,
  dismissUpdateNotification,
} from "@/lib/updater";

interface UpdateStoreState {
  autoUpdateEnabled: boolean;
  updateInfo: AppUpdateInfo | null;
  isChecking: boolean;
  lastChecked: number | null;
  setAutoUpdateEnabled: (enabled: boolean) => void;
  toggleAutoUpdate: () => void;
  setUpdateInfo: (info: AppUpdateInfo | null) => void;
  checkUpdates: (force?: boolean) => Promise<AppUpdateInfo>;
  removeUpdate: () => void;
}

export const useUpdateStore = create<UpdateStoreState>()(
  persist(
    (set, get) => ({
      autoUpdateEnabled: true,
      updateInfo: null,
      isChecking: false,
      lastChecked: null,

      setAutoUpdateEnabled: (enabled: boolean) => {
        set({ autoUpdateEnabled: enabled });
      },

      toggleAutoUpdate: () => {
        set((state) => ({ autoUpdateEnabled: !state.autoUpdateEnabled }));
      },

      setUpdateInfo: (info) => {
        set({ updateInfo: info });
      },

      checkUpdates: async (force = false) => {
        set({ isChecking: true });
        try {
          const info = await checkForUpdates(force);
          set({
            updateInfo: info,
            lastChecked: Date.now(),
            isChecking: false,
          });
          return info;
        } catch (err: any) {
          set({ isChecking: false });
          throw err;
        }
      },

      removeUpdate: () => {
        dismissUpdateNotification();
        set({
          updateInfo: null,
          lastChecked: Date.now(),
        });
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
          window.dispatchEvent(new CustomEvent("zenodeck:update-dismissed"));
        }
      },
    }),
    {
      name: "zenodeck_update_settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        autoUpdateEnabled: state.autoUpdateEnabled,
        lastChecked: state.lastChecked,
      }),
    }
  )
);
