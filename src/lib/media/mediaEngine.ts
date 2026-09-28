/**
 * ZenoDeck — Hybrid Media Execution Bridge
 * ==========================================
 * Conditional execution wrapper that routes FFmpeg commands to the
 * optimal engine based on the runtime environment:
 *
 *  • **Web browser** → @ffmpeg/ffmpeg (WASM) with thread injection
 *  • **Native Capacitor** → Native media plugin interface, bypassing
 *    the browser sandbox entirely for raw device speed
 *
 * All callers use the same `MediaEngine` API regardless of platform.
 */

import { Capacitor } from "@capacitor/core";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { injectThreads, getCpuThreadCount } from "./perf-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MediaEngineResult {
  /** Exit code from the underlying engine (0 = success). */
  exitCode: number;
  /** Output file bytes, if the caller requested readback. */
  outputData?: Uint8Array;
  /** Engine that handled the command ("wasm" | "native"). */
  engine: "wasm" | "native";
  /** Wall-clock execution time in milliseconds. */
  elapsedMs: number;
}

export interface MediaEngineExecOptions {
  /** FFmpeg argument array (without the leading `ffmpeg` binary name). */
  args: string[];
  /**
   * Optional WASM FFmpeg instance. When running on the web, this engine
   * is used directly. If omitted on web, the caller must provide one or
   * the exec will throw.
   */
  wasmEngine?: FFmpeg | null;
  /**
   * If provided, the output file at this virtual path will be read back
   * after exec and returned in `MediaEngineResult.outputData`.
   */
  readOutputPath?: string;
  /**
   * If true, automatically inject `-threads N` based on
   * `navigator.hardwareConcurrency`. Default: true.
   */
  autoThreads?: boolean;
}

// ---------------------------------------------------------------------------
// Native plugin interface (Capacitor bridge)
// ---------------------------------------------------------------------------

/**
 * Interface for a native FFmpeg plugin registered in Capacitor.
 * On native platforms, this plugin invokes the device's FFmpeg binary
 * directly — no WASM overhead, no browser sandbox, full CPU/GPU access.
 *
 * To implement: install a Capacitor plugin that exposes this interface
 * (e.g., `capacitor-ffmpeg` or a custom plugin wrapping mobile-ffmpeg).
 */
interface NativeMediaPlugin {
  exec(options: { args: string[] }): Promise<{ exitCode: number }>;
  readFile(options: { path: string }): Promise<{ data: string }>; // base64
}

/**
 * Attempts to load the native Capacitor FFmpeg plugin.
 * Returns null if unavailable (web platform or plugin not installed).
 */
async function loadNativePlugin(): Promise<NativeMediaPlugin | null> {
  if (!isNativePlatform()) return null;

  try {
    // Dynamic import so the native plugin doesn't break web builds.
    // The plugin must be registered under `NativeFFmpeg` in Capacitor.
    const { registerPlugin } = await import("@capacitor/core");
    const plugin = registerPlugin<NativeMediaPlugin>("NativeFFmpeg");
    return plugin;
  } catch {
    return null;
  }
}

// Cached plugin reference
let _nativePlugin: NativeMediaPlugin | null | undefined;

async function getNativePlugin(): Promise<NativeMediaPlugin | null> {
  if (_nativePlugin !== undefined) return _nativePlugin;
  _nativePlugin = await loadNativePlugin();
  return _nativePlugin;
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

/**
 * Returns true if running inside a native Capacitor shell (Android/iOS).
 */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Returns the current platform identifier.
 */
export function getPlatform(): "android" | "ios" | "web" {
  try {
    const p = Capacitor.getPlatform();
    if (p === "android" || p === "ios") return p;
  } catch {
    // Capacitor not available
  }
  return "web";
}

/**
 * Returns runtime performance info for telemetry.
 */
export function getEngineInfo() {
  return {
    platform: getPlatform(),
    isNative: isNativePlatform(),
    cpuThreads: getCpuThreadCount(),
    crossOriginIsolated:
      typeof window !== "undefined" && window.crossOriginIsolated === true,
    sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
  };
}

// ---------------------------------------------------------------------------
// Unified exec
// ---------------------------------------------------------------------------

/**
 * Execute an FFmpeg command through the optimal engine for the current
 * runtime environment.
 *
 * - **Web**: Uses the provided WASM `FFmpeg` instance with automatic
 *   thread injection from `navigator.hardwareConcurrency`.
 * - **Native (Capacitor)**: Routes to the native FFmpeg plugin,
 *   bypassing the browser sandbox for raw device speed. Falls back
 *   to WASM if the native plugin is not installed.
 *
 * @example
 * ```ts
 * const result = await mediaEngineExec({
 *   args: ["-i", "input.mp4", "-vn", "-c:a", "copy", "output.m4a"],
 *   wasmEngine: ffmpegInstance,
 *   readOutputPath: "output.m4a",
 * });
 * console.log(`Done in ${result.elapsedMs}ms via ${result.engine}`);
 * ```
 */
export async function mediaEngineExec(
  options: MediaEngineExecOptions,
): Promise<MediaEngineResult> {
  const { args, wasmEngine, readOutputPath, autoThreads = true } = options;
  const start = performance.now();

  // ── Native path ──────────────────────────────────────────────────────
  if (isNativePlatform()) {
    const nativePlugin = await getNativePlugin();
    if (nativePlugin) {
      try {
        const { exitCode } = await nativePlugin.exec({ args });
        let outputData: Uint8Array | undefined;

        if (readOutputPath && exitCode === 0) {
          const { data } = await nativePlugin.readFile({
            path: readOutputPath,
          });
          // Decode base64 to Uint8Array
          const binary = atob(data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          outputData = bytes;
        }

        return {
          exitCode,
          outputData,
          engine: "native",
          elapsedMs: performance.now() - start,
        };
      } catch (nativeErr) {
        console.warn(
          "Native FFmpeg plugin exec failed, falling back to WASM:",
          nativeErr,
        );
        // Fall through to WASM
      }
    }
  }

  // ── WASM path ────────────────────────────────────────────────────────
  if (!wasmEngine) {
    throw new Error(
      "MediaEngine: No WASM FFmpeg engine provided and native plugin unavailable. " +
        "Pass a loaded FFmpeg instance via `wasmEngine`.",
    );
  }

  const finalArgs = autoThreads ? injectThreads(args) : args;
  const exitCode = await wasmEngine.exec(finalArgs);

  let outputData: Uint8Array | undefined;
  if (readOutputPath && exitCode === 0) {
    outputData = (await wasmEngine.readFile(readOutputPath)) as Uint8Array;
  }

  return {
    exitCode,
    outputData,
    engine: "wasm",
    elapsedMs: performance.now() - start,
  };
}
