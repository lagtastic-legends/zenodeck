"use client";

/**
 * ZenoDeck Universal Download Queue Store (src/lib/media/download-queue-store.ts)
 * ==============================================================================
 * Persistent Zustand store governing the lifecycle, priority order, and state
 * machine of multi-platform background media download jobs across sessions.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PlatformType } from "@/lib/media/types";
import type { YouTubeQualityOption } from "@/lib/youtube/innertube";

export type QueueItemStatus =
  | "queued"
  | "resolving"
  | "downloading"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface QueueProgress {
  percent: number;
  speedMbps: number;
  downloadedBytes: number;
  totalBytes: number;
  etaSeconds: number;
  phase: string;
  message?: string;
}

export interface QueueDownloadItem {
  id: string;
  url: string;
  platform: PlatformType;
  title: string;
  author: string;
  thumbnailUrl: string;
  durationFormatted: string;
  qualityOption: YouTubeQualityOption;
  isAudioOnly: boolean;
  format: string; // "mp4", "mp3", "m4a", "wav", etc.
  status: QueueItemStatus;
  progress: QueueProgress;
  error?: string;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  resultUrl?: string;
  localFileName?: string;
  fileSizeBytes?: number;
  clipRange?: { startTime: string; endTime: string };
}

export type EnqueueInput = Omit<
  QueueDownloadItem,
  "id" | "status" | "progress" | "addedAt" | "startedAt" | "completedAt" | "resultUrl" | "localFileName" | "fileSizeBytes"
>;

interface DownloadQueueState {
  items: QueueDownloadItem[];
  isGlobalPaused: boolean;

  // Actions
  enqueue: (input: EnqueueInput) => string;
  dequeue: (id: string) => void;
  pauseItem: (id: string) => void;
  resumeItem: (id: string) => void;
  pauseAll: () => void;
  resumeAll: () => void;
  retryItem: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  updateProgress: (id: string, progress: Partial<QueueProgress>) => void;
  setStatus: (
    id: string,
    status: QueueItemStatus,
    meta?: {
      error?: string;
      resultUrl?: string;
      localFileName?: string;
      fileSizeBytes?: number;
    }
  ) => void;
}

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

export const useDownloadQueueStore = create<DownloadQueueState>()(
  persist(
    (set, get) => ({
      items: [],
      isGlobalPaused: false,

      enqueue: (input) => {
        const id = `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const newItem: QueueDownloadItem = {
          ...input,
          id,
          status: "queued",
          addedAt: Date.now(),
          progress: {
            percent: 0,
            speedMbps: 0,
            downloadedBytes: 0,
            totalBytes: input.qualityOption.approxSizeBytes || 0,
            etaSeconds: 0,
            phase: "queued",
            message: "Waiting in download queue…",
          },
        };

        set((state) => ({
          items: [...state.items, newItem],
        }));

        return id;
      },

      dequeue: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      pauseItem: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id && (item.status === "downloading" || item.status === "queued")
              ? {
                  ...item,
                  status: "paused",
                  progress: { ...item.progress, phase: "paused", message: "Download paused" },
                }
              : item
          ),
        })),

      resumeItem: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id && item.status === "paused"
              ? {
                  ...item,
                  status: "queued",
                  progress: { ...item.progress, phase: "queued", message: "Waiting in download queue…" },
                }
              : item
          ),
        })),

      pauseAll: () =>
        set((state) => ({
          isGlobalPaused: true,
          items: state.items.map((item) =>
            item.status === "downloading" || item.status === "queued"
              ? {
                  ...item,
                  status: "paused",
                  progress: { ...item.progress, phase: "paused", message: "Paused by user" },
                }
              : item
          ),
        })),

      resumeAll: () =>
        set((state) => ({
          isGlobalPaused: false,
          items: state.items.map((item) =>
            item.status === "paused"
              ? {
                  ...item,
                  status: "queued",
                  progress: { ...item.progress, phase: "queued", message: "Waiting in download queue…" },
                }
              : item
          ),
        })),

      retryItem: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "queued",
                  error: undefined,
                  progress: {
                    percent: 0,
                    speedMbps: 0,
                    downloadedBytes: 0,
                    totalBytes: item.qualityOption.approxSizeBytes || 0,
                    etaSeconds: 0,
                    phase: "queued",
                    message: "Retrying download…",
                  },
                }
              : item
          ),
        })),

      clearCompleted: () =>
        set((state) => ({
          items: state.items.filter((i) => i.status !== "completed"),
        })),

      clearAll: () =>
        set({
          items: [],
          isGlobalPaused: false,
        }),

      moveUp: (id) =>
        set((state) => {
          const index = state.items.findIndex((i) => i.id === id);
          if (index <= 0) return state;
          const newItems = [...state.items];
          const temp = newItems[index - 1];
          newItems[index - 1] = newItems[index];
          newItems[index] = temp;
          return { items: newItems };
        }),

      moveDown: (id) =>
        set((state) => {
          const index = state.items.findIndex((i) => i.id === id);
          if (index < 0 || index >= state.items.length - 1) return state;
          const newItems = [...state.items];
          const temp = newItems[index + 1];
          newItems[index + 1] = newItems[index];
          newItems[index] = temp;
          return { items: newItems };
        }),

      updateProgress: (id, progressUpdate) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  progress: { ...item.progress, ...progressUpdate },
                }
              : item
          ),
        })),

      setStatus: (id, status, meta) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status,
                  ...(status === "downloading" ? { startedAt: item.startedAt || Date.now() } : {}),
                  ...(status === "completed"
                    ? {
                        completedAt: Date.now(),
                        progress: { ...item.progress, percent: 100, phase: "done" },
                      }
                    : {}),
                  ...(meta?.error !== undefined ? { error: meta.error } : {}),
                  ...(meta?.resultUrl !== undefined ? { resultUrl: meta.resultUrl } : {}),
                  ...(meta?.localFileName !== undefined ? { localFileName: meta.localFileName } : {}),
                  ...(meta?.fileSizeBytes !== undefined ? { fileSizeBytes: meta.fileSizeBytes } : {}),
                }
              : item
          ),
        })),
    }),
    {
      name: "zenodeck-download-queue",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" && window.localStorage ? window.localStorage : memoryStorage
      ),
      partialize: (state) => ({
        items: state.items.map((item) => ({
          ...item,
          // When reloading session, reset active "downloading" tasks back to "queued" so they resume cleanly
          status: item.status === "downloading" ? "queued" : item.status,
          resultUrl: undefined, // Object URLs expire on page reload
        })),
        isGlobalPaused: state.isGlobalPaused,
      }),
    }
  )
);
