"use client";

/**
 * ZenoDeck — Typed OffscreenCanvas Worker Bridge Hook
 *
 * Bridges the UI thread with visual-render.worker.ts. Dispatches visual frame
 * transforms off-thread, streams live progress, and triggers synchronized
 * audio-haptic sensory feedback at milestone checkpoints.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSensoryFeedback } from "./useSensoryFeedback";
import type {
  AsciiOptions,
  ScaleOptions,
  AsciiToken,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from "@/workers/visual-render.worker";

export interface AsciiResult {
  text: string;
  tokens?: AsciiToken[];
  width: number;
  height: number;
}

export interface UseOffscreenShaderReturn {
  isSupported: boolean;
  isProcessing: boolean;
  progress: number;
  renderAscii: (source: Blob | ImageBitmap, options?: AsciiOptions) => Promise<AsciiResult>;
  scaleFrame: (source: Blob | ImageBitmap, options: ScaleOptions) => Promise<Blob>;
  cancelCurrentTask: () => void;
}

export function useOffscreenShader(): UseOffscreenShaderReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<
    Map<
      string,
      {
        resolve: (val: unknown) => void;
        reject: (err: Error) => void;
      }
    >
  >(new Map());

  const sensory = useSensoryFeedback();
  const lastMilestoneRef = useRef<number>(0);

  // Validate environment support
  useEffect(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      setIsSupported(false);
      return;
    }
    const hasOffscreen = typeof OffscreenCanvas !== "undefined";
    setIsSupported(hasOffscreen);
  }, []);

  // Worker initialization and lifecycle management
  const getOrCreateWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      const worker = new Worker(
        new URL("../workers/visual-render.worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.onmessage = (e: MessageEvent<WorkerOutboundMessage>) => {
        const msg = e.data;
        if (!msg) return;

        if (msg.type === "PROGRESS") {
          setProgress(msg.progress);

          // Fire haptic detent at 25%, 50%, and 75% milestones
          const milestone = Math.floor(msg.progress / 25) * 25;
          if (milestone > lastMilestoneRef.current && milestone < 100) {
            lastMilestoneRef.current = milestone;
            sensory.triggerTap({ hapticOnly: true });
          }
          return;
        }

        if (msg.type === "ASCII_RESULT") {
          const pending = pendingRequests.current.get(msg.id);
          if (pending) {
            pendingRequests.current.delete(msg.id);
            setIsProcessing(false);
            setProgress(100);
            sensory.triggerSuccess();
            pending.resolve({
              text: msg.asciiText,
              tokens: msg.tokens,
              width: msg.width,
              height: msg.height,
            } as AsciiResult);
          }
          return;
        }

        if (msg.type === "FRAME_RESULT") {
          const pending = pendingRequests.current.get(msg.id);
          if (pending) {
            pendingRequests.current.delete(msg.id);
            setIsProcessing(false);
            setProgress(100);
            sensory.triggerSuccess();
            pending.resolve(msg.blob);
          }
          return;
        }

        if (msg.type === "ERROR") {
          if (msg.id && pendingRequests.current.has(msg.id)) {
            const pending = pendingRequests.current.get(msg.id);
            pendingRequests.current.delete(msg.id);
            setIsProcessing(false);
            sensory.triggerError();
            pending?.reject(new Error(msg.error));
          } else {
            setIsProcessing(false);
            sensory.triggerError();
          }
        }
      };

      worker.onerror = (err) => {
        console.error("Offscreen visual worker error:", err);
        setIsProcessing(false);
        sensory.triggerError();
      };

      workerRef.current = worker;
    }

    return workerRef.current;
  }, [sensory]);

  // Teardown worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingRequests.current.clear();
    };
  }, []);

  /**
   * Helper to convert Blob to ImageBitmap
   */
  const ensureBitmap = async (source: Blob | ImageBitmap): Promise<ImageBitmap> => {
    if (source instanceof ImageBitmap) {
      return source;
    }
    return await createImageBitmap(source);
  };

  /**
   * Renders Image or Video frame to ASCII art string and colored tokens off-thread.
   */
  const renderAscii = useCallback(
    async (source: Blob | ImageBitmap, options: AsciiOptions = { columns: 80 }): Promise<AsciiResult> => {
      const worker = getOrCreateWorker();
      const bitmap = await ensureBitmap(source);
      const id = `ascii_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      setIsProcessing(true);
      setProgress(0);
      lastMilestoneRef.current = 0;
      sensory.triggerProcessStart();

      return new Promise<AsciiResult>((resolve, reject) => {
        pendingRequests.current.set(id, {
          resolve: (res) => resolve(res as AsciiResult),
          reject,
        });

        const msg: WorkerInboundMessage = {
          type: "RENDER_ASCII",
          id,
          bitmap,
          options,
        };

        // Transfer bitmap to worker to avoid memory copies
        worker.postMessage(msg, [bitmap]);
      });
    },
    [getOrCreateWorker, sensory]
  );

  /**
   * Scales and compresses a frame to WebP/JPEG off-thread.
   */
  const scaleFrame = useCallback(
    async (source: Blob | ImageBitmap, options: ScaleOptions): Promise<Blob> => {
      const worker = getOrCreateWorker();
      const bitmap = await ensureBitmap(source);
      const id = `scale_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      setIsProcessing(true);
      setProgress(0);
      lastMilestoneRef.current = 0;
      sensory.triggerProcessStart();

      return new Promise<Blob>((resolve, reject) => {
        pendingRequests.current.set(id, {
          resolve: (res) => resolve(res as Blob),
          reject,
        });

        const msg: WorkerInboundMessage = {
          type: "SCALE_FRAME",
          id,
          bitmap,
          options,
        };

        worker.postMessage(msg, [bitmap]);
      });
    },
    [getOrCreateWorker, sensory]
  );

  const cancelCurrentTask = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    pendingRequests.current.forEach(({ reject }) => {
      reject(new Error("Offscreen visual render task canceled by user."));
    });
    pendingRequests.current.clear();
    setIsProcessing(false);
    setProgress(0);
  }, []);

  return {
    isSupported,
    isProcessing,
    progress,
    renderAscii,
    scaleFrame,
    cancelCurrentTask,
  };
}
