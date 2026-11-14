"use client";

/**
 * ZenoDeck Universal Download Queue Runner (src/lib/media/download-queue-runner.ts)
 * ===============================================================================
 * Coordinates FIFO background processing of queued media downloads, managing
 * streaming execution, Pause/Resume controllers, notification dispatch, and Vault commits.
 */

import { useEffect, useRef } from "react";
import {
  useDownloadQueueStore,
  type QueueDownloadItem,
} from "./download-queue-store";
import {
  downloadYouTubeStream,
  createPauseController,
  type PauseController,
} from "@/lib/youtube/turbo-downloader";
import { downloadUniversalMedia } from "@/lib/media/downloader";
import { useHistoryStore } from "@/lib/youtube/history-store";
import { notifyJobSuccess, notifyJobError } from "@/lib/notifications";
import { acquireWakeLock, releaseWakeLock } from "@/lib/wake-lock";
import { formatDuration } from "@/lib/youtube/innertube";

class DownloadQueueService {
  private isProcessing = false;
  private currentTaskId: string | null = null;
  private abortController: AbortController | null = null;
  private pauseController: PauseController | null = null;

  public getActiveTaskId(): string | null {
    return this.currentTaskId;
  }

  public pauseActiveTask(): void {
    if (this.pauseController) {
      this.pauseController.pause();
    }
  }

  public resumeActiveTask(): void {
    if (this.pauseController) {
      this.pauseController.resume();
    }
  }

  public cancelActiveTask(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.currentTaskId = null;
    this.isProcessing = false;
  }

  public async processNext(): Promise<void> {
    if (this.isProcessing) return;

    const store = useDownloadQueueStore.getState();
    if (store.isGlobalPaused) return;

    // Pick first item that is "queued"
    const nextTask = store.items.find((item) => item.status === "queued");
    if (!nextTask) return;

    this.isProcessing = true;
    this.currentTaskId = nextTask.id;
    this.abortController = new AbortController();
    this.pauseController = createPauseController();

    store.setStatus(nextTask.id, "downloading");
    void acquireWakeLock();

    try {
      let resultUrl = "";
      let localFileName = "";
      let fileSizeBytes = 0;

      if (nextTask.platform === "youtube") {
        // YouTube Turbo Downloader Engine
        const result = await downloadYouTubeStream({
          option: nextTask.qualityOption,
          videoTitle: nextTask.title,
          originalUrl: nextTask.url,
          author: nextTask.author,
          thumbnailUrl: nextTask.thumbnailUrl,
          maxParallelWorkers: 6,
          signal: this.abortController.signal,
          clipRange: nextTask.clipRange
            ? { startTime: nextTask.clipRange.startTime, endTime: nextTask.clipRange.endTime }
            : undefined,
          pauseController: this.pauseController,
          onProgress: (p) => {
            store.updateProgress(nextTask.id, {
              percent: p.progress,
              speedMbps: p.speedMbps,
              downloadedBytes: p.downloadedBytes,
              totalBytes: p.totalBytes,
              etaSeconds: p.etaSeconds,
              phase: p.phase,
              message: p.statusMessage,
            });
          },
        });

        resultUrl = result.url;
        localFileName = result.filename;
        fileSizeBytes = result.fileSizeBytes;
      } else {
        // Universal Downloader for TikTok, Instagram, Twitter, Reddit, Facebook, Vimeo
        const universalMedia = {
          id: nextTask.id,
          platform: nextTask.platform,
          title: nextTask.title,
          author: nextTask.author,
          thumbnailUrl: nextTask.thumbnailUrl,
          duration: 0,
          qualities: [
            {
              id: nextTask.qualityOption.id,
              label: nextTask.qualityOption.label,
              ext: nextTask.format || "mp4",
              downloadUrl: nextTask.url,
              isAudioOnly: nextTask.isAudioOnly,
              fileSize: nextTask.qualityOption.approxSizeBytes,
            },
          ],
        };

        const universalOpt = universalMedia.qualities[0];

        const result = await downloadUniversalMedia(universalMedia as any, universalOpt as any, {
          clipRange: nextTask.clipRange
            ? { startTime: nextTask.clipRange.startTime, endTime: nextTask.clipRange.endTime }
            : undefined,
          abortSignal: this.abortController.signal,
          onProgress: (p) => {
            store.updateProgress(nextTask.id, {
              percent: p.percent,
              speedMbps: p.speedMBs || 0,
              downloadedBytes: p.transferredBytes || 0,
              totalBytes: p.totalBytes || 0,
              etaSeconds: 0,
              phase: p.phase,
              message: p.message,
            });
          },
        });

        resultUrl = result.url;
        localFileName = result.filename;
        fileSizeBytes = result.fileSizeBytes;
      }

      // Mark task completed
      store.setStatus(nextTask.id, "completed", {
        resultUrl,
        localFileName,
        fileSizeBytes,
      });

      // Record in History Vault
      try {
        useHistoryStore.getState().addItem({
          videoId: nextTask.id,
          title: nextTask.title,
          author: nextTask.author,
          thumbnailUrl: nextTask.thumbnailUrl,
          durationFormatted: nextTask.durationFormatted || "0:00",
          qualityBadge: nextTask.qualityOption.badge || nextTask.qualityOption.label,
          format: nextTask.format || "mp4",
          fileSizeBytes,
          isAudioOnly: nextTask.isAudioOnly,
          audioStreamUrl: nextTask.isAudioOnly ? resultUrl : undefined,
          localFileName,
          platform: nextTask.platform,
        });
      } catch (vaultErr) {
        console.warn("Failed to commit completed queue item to Vault:", vaultErr);
      }

      // Dispatch Notification
      void notifyJobSuccess(
        `Download Complete: ${nextTask.title}`,
        `${nextTask.qualityOption.label || nextTask.qualityOption.badge} (${localFileName})`
      );
    } catch (err: any) {
      if (err.name === "AbortError" || err.message?.includes("aborted")) {
        console.log(`Task ${nextTask.id} was aborted by user.`);
        store.setStatus(nextTask.id, "cancelled", { error: "Cancelled by user" });
      } else {
        console.error(`Task ${nextTask.id} failed:`, err);
        const errMsg = err.message || "Download failed. Please check your network and retry.";
        store.setStatus(nextTask.id, "failed", { error: errMsg });
        void notifyJobError(nextTask.title, errMsg);
      }
    } finally {
      this.isProcessing = false;
      this.currentTaskId = null;
      this.abortController = null;
      this.pauseController = null;
      void releaseWakeLock();

      // Automatically queue up the next task
      setTimeout(() => {
        void this.processNext();
      }, 300);
    }
  }
}

// Global Singleton Instance
export const downloadQueueService = new DownloadQueueService();

/**
 * React Hook: Mounts queue runner in active view and auto-processes pending downloads
 */
export function useDownloadQueueRunner() {
  const isGlobalPaused = useDownloadQueueStore((s) => s.isGlobalPaused);
  const queueLength = useDownloadQueueStore((s) => s.items.length);
  const queuedCount = useDownloadQueueStore(
    (s) => s.items.filter((i) => i.status === "queued").length
  );

  useEffect(() => {
    if (!isGlobalPaused && queuedCount > 0) {
      void downloadQueueService.processNext();
    }
  }, [isGlobalPaused, queuedCount, queueLength]);

  return {
    activeTaskId: downloadQueueService.getActiveTaskId(),
    pauseActive: () => downloadQueueService.pauseActiveTask(),
    resumeActive: () => downloadQueueService.resumeActiveTask(),
    cancelActive: () => downloadQueueService.cancelActiveTask(),
  };
}
