"use client";

/**
 * ZenoDeck Download History Vault Store (src/lib/youtube/history-store.ts)
 * =======================================================================
 * Client-side persistent storage tracking downloaded videos, audios, and
 * subtitles across sessions. Powered by Zustand and localStorage.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface DownloadHistoryItem {
  id: string;
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  durationFormatted: string;
  qualityBadge: string;
  format: string; // "mp4", "mp3", "m4a", "wav", "srt", "vtt", "txt"
  fileSizeBytes: number;
  downloadedAt: number;
  isAudioOnly: boolean;
  audioStreamUrl?: string;
  localFileName?: string;
  platform?: "youtube" | "tiktok" | "instagram" | "twitter" | "reddit";
}

interface HistoryStore {
  items: DownloadHistoryItem[];
  addItem: (item: Omit<DownloadHistoryItem, "id" | "downloadedAt">) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;
}

const MAX_HISTORY_ITEMS = 50;

// Memory storage fallback for SSR and testing environments
const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
})();

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const newItem: DownloadHistoryItem = {
            ...item,
            id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            downloadedAt: Date.now(),
          };

          // Filter out duplicate identical videoId + qualityBadge to avoid clutter
          const filtered = state.items.filter(
            (i) => !(i.videoId === item.videoId && i.qualityBadge === item.qualityBadge)
          );

          return {
            items: [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS),
          };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      clearHistory: () => set({ items: [] }),
    }),
    {
      name: "zenodeck-youtube-history",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" && window.localStorage ? window.localStorage : memoryStorage
      ),
    }
  )
);
