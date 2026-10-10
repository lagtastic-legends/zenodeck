/**
 * ZenoDeck — Batch & Playlist Download Queue Controller
 * ====================================================
 * Manages multi-item sequential downloads with pause/resume, individual item status,
 * automatic native storage saving, and background progress notifications.
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { nativeSave } from "@/lib/native-save";
import {
  resolveYouTubeVideo,
  type YouTubeQualityOption,
  type YouTubeVideoInfo,
} from "./innertube";
import {
  downloadYouTubeStream,
  type TurboDownloadResult,
  type TurboProgress,
} from "./turbo-downloader";

export interface BatchItem {
  id: string;
  videoId: string;
  title: string;
  author: string;
  durationFormatted: string;
  thumbnailUrl: string;
  status: "idle" | "resolving" | "downloading" | "complete" | "error" | "skipped";
  progress: number;
  speedMbps: number;
  errorMessage?: string;
  resultFilename?: string;
}

export interface BatchQueueOptions {
  items: BatchItem[];
  targetQualityBadge: string; // e.g. "1080P", "720P", "320 KBPS", "NATIVE AAC"
  isAudioOnly: boolean;
  engine?: FFmpeg | null;
  onItemUpdate: (updatedItem: BatchItem, queueStats: QueueStats) => void;
  onQueueComplete: (items: BatchItem[]) => void;
}

export interface QueueStats {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
  overallProgress: number; // 0..100
}

export class BatchQueueController {
  private items: BatchItem[] = [];
  private targetQualityBadge: string;
  private isAudioOnly: boolean;
  private engine?: FFmpeg | null;
  private onItemUpdate: (item: BatchItem, stats: QueueStats) => void;
  private onQueueComplete: (items: BatchItem[]) => void;
  private abortController: AbortController | null = null;
  private isRunning = false;
  private isPaused = false;
  private currentIndex = 0;

  constructor(opts: BatchQueueOptions) {
    this.items = [...opts.items];
    this.targetQualityBadge = opts.targetQualityBadge;
    this.isAudioOnly = opts.isAudioOnly;
    this.engine = opts.engine;
    this.onItemUpdate = opts.onItemUpdate;
    this.onQueueComplete = opts.onQueueComplete;
  }

  public getStats(): QueueStats {
    const total = this.items.length;
    const completed = this.items.filter((i) => i.status === "complete").length;
    const failed = this.items.filter((i) => i.status === "error").length;
    const sumProgress = this.items.reduce((acc, i) => acc + i.progress, 0);
    const overallProgress = total > 0 ? Math.round(sumProgress / total) : 0;

    return {
      total,
      completed,
      failed,
      inProgress: this.isRunning,
      overallProgress,
    };
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.abortController = new AbortController();

    for (let i = 0; i < this.items.length; i++) {
      if (this.isPaused || this.abortController.signal.aborted) {
        break;
      }

      this.currentIndex = i;
      const item = this.items[i];
      if (item.status === "complete" || item.status === "skipped") {
        continue;
      }

      await this.processItem(i);
    }

    this.isRunning = false;
    this.onQueueComplete(this.items);
  }

  private async processItem(index: number): Promise<void> {
    const item = this.items[index];
    const signal = this.abortController?.signal;

    try {
      item.status = "resolving";
      item.progress = 5;
      this.onItemUpdate(item, this.getStats());

      // 1. Resolve streams for item
      const videoInfo: YouTubeVideoInfo = await resolveYouTubeVideo(item.videoId);
      if (signal?.aborted) return;

      // 2. Select appropriate format
      let qualityOption: YouTubeQualityOption | undefined = undefined;

      if (this.isAudioOnly) {
        const audioOpts = videoInfo.qualities.filter((q) => q.isAudioOnly);
        qualityOption =
          audioOpts.find((q) => q.badge === this.targetQualityBadge) ||
          audioOpts.find((q) => q.id === "audio-320") ||
          audioOpts[0];
      } else {
        const videoOpts = videoInfo.qualities.filter((q) => !q.isAudioOnly);
        qualityOption =
          videoOpts.find((q) => q.badge === this.targetQualityBadge) ||
          videoOpts.find((q) => q.badge === "1080P") ||
          videoOpts.find((q) => q.badge === "720P") ||
          videoOpts[0];
      }

      if (!qualityOption) {
        throw new Error("No suitable stream quality found for this video.");
      }

      item.status = "downloading";
      item.progress = 10;
      this.onItemUpdate(item, this.getStats());

      // 3. Download & Mux / Tag
      const result: TurboDownloadResult = await downloadYouTubeStream({
        option: qualityOption,
        videoTitle: item.title,
        author: item.author,
        thumbnailUrl: item.thumbnailUrl,
        engine: this.engine,
        signal,
        onProgress: (prog: TurboProgress) => {
          item.progress = 10 + Math.round((prog.progress / 100) * 88);
          item.speedMbps = prog.speedMbps;
          this.onItemUpdate(item, this.getStats());
        },
      });

      // 4. Save to device
      await nativeSave(result.blob, result.filename);

      item.status = "complete";
      item.progress = 100;
      item.speedMbps = 0;
      item.resultFilename = result.filename;
      this.onItemUpdate(item, this.getStats());
    } catch (err: any) {
      if (signal?.aborted) {
        item.status = "idle";
        return;
      }
      console.error(`Item ${item.title} failed in batch:`, err);
      item.status = "error";
      item.errorMessage = err?.message || "Failed to download";
      item.speedMbps = 0;
      this.onItemUpdate(item, this.getStats());
    }
  }

  public pause(): void {
    this.isPaused = true;
    this.isRunning = false;
    this.abortController?.abort();
  }

  public cancel(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.abortController?.abort();
    this.items.forEach((i) => {
      if (i.status !== "complete") {
        i.status = "idle";
        i.progress = 0;
      }
    });
  }

  public retryFailed(): void {
    this.items.forEach((i) => {
      if (i.status === "error") {
        i.status = "idle";
        i.progress = 0;
        i.errorMessage = undefined;
      }
    });
    void this.start();
  }
}
