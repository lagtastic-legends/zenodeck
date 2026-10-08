/**
 * Python Engine Bridge for ZenoDeck
 * Executes yt-dlp via scripts/youtube_downloader.py safely with execFile
 */

import { execFile } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

export interface PythonMediaResult {
  videoId: string;
  platform: string;
  title: string;
  author: string;
  authorUrl?: string;
  channelId?: string;
  durationSeconds: number;
  durationFormatted: string;
  thumbnailUrl: string;
  viewCount?: string;
  webpageUrl?: string;
  qualities: Array<{
    id: string;
    itag: number | string;
    label: string;
    resolutionLabel: string;
    fps: number;
    badge: string;
    is4K: boolean;
    is60fps: boolean;
    isAudioOnly: boolean;
    audioBitrate?: number;
    container: string;
    approxSizeBytes: number;
    videoFormat?: {
      itag: number | string;
      url: string;
      mimeType: string;
      container: string;
      codec: string;
      bitrate: number;
      contentLength: number;
      width?: number;
      height?: number;
      fps?: number;
    };
    audioFormat?: {
      itag: number | string;
      url: string;
      mimeType: string;
      container: string;
      codec: string;
      bitrate: number;
      contentLength: number;
    };
  }>;
}

export interface PythonDownloadResult {
  status: "success" | "error";
  filename?: string;
  filepath?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  title?: string;
  id?: string;
  platform?: string;
  error?: string;
}

function getScriptPath(): string {
  const p1 = path.join(process.cwd(), "scripts", "youtube_downloader.py");
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), "scripts", "media_downloader.py");
  if (fs.existsSync(p2)) return p2;
  return p1;
}

function getPythonCommand(): string {
  return process.platform === "win32" ? "python" : "python3";
}

/**
 * Validates that an input is either a valid URL or an 11-char YouTube ID.
 */
export function isValidMediaInput(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  const trimmed = input.trim();
  if (/^[0-9A-Za-z_-]{11}$/.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Resolves media info and stream qualities via yt-dlp.
 */
export async function resolveMediaWithPython(
  urlOrId: string,
  timeoutMs = 25000
): Promise<PythonMediaResult | null> {
  if (!isValidMediaInput(urlOrId)) return null;

  const scriptPath = getScriptPath();
  if (!fs.existsSync(scriptPath)) return null;

  return new Promise((resolve) => {
    const pyCmd = getPythonCommand();
    execFile(
      pyCmd,
      [scriptPath, urlOrId.trim(), "--info-json"],
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error || !stdout) {
          return resolve(null);
        }
        try {
          const json = JSON.parse(stdout);
          if (json && (json.videoId || json.id) && Array.isArray(json.qualities) && json.qualities.length > 0) {
            return resolve(json as PythonMediaResult);
          }
        } catch {}
        resolve(null);
      }
    );
  });
}

/**
 * Downloads a media file directly to disk via yt-dlp.
 */
export async function downloadMediaWithPython(
  url: string,
  options?: {
    quality?: string;
    format?: string;
    outputDir?: string;
    timeoutMs?: number;
  }
): Promise<PythonDownloadResult> {
  if (!isValidMediaInput(url)) {
    return { status: "error", error: "Invalid URL or video ID." };
  }

  const scriptPath = getScriptPath();
  if (!fs.existsSync(scriptPath)) {
    return { status: "error", error: "Downloader script not found." };
  }

  const outputDir = options?.outputDir || path.join(os.tmpdir(), "zenodeck-downloads");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const quality = options?.quality || "best";
  const timeoutMs = options?.timeoutMs || 120000; // 2 minutes

  const args = [
    scriptPath,
    url.trim(),
    "--download",
    "--quality",
    quality,
    "--output-dir",
    outputDir,
    "--json-result",
  ];

  if (options?.format) {
    args.push("--format", options.format);
  }

  return new Promise((resolve) => {
    const pyCmd = getPythonCommand();
    execFile(
      pyCmd,
      args,
      { timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (stdout) {
          try {
            // Find last JSON block in stdout if any
            const trimmed = stdout.trim();
            const jsonStart = trimmed.indexOf("{");
            const jsonEnd = trimmed.lastIndexOf("}");
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
              if (parsed.status === "success") {
                return resolve(parsed);
              }
              if (parsed.error) {
                return resolve({ status: "error", error: parsed.error });
              }
            }
          } catch {}
        }

        if (error) {
          return resolve({
            status: "error",
            error: error.message || stderr || "Failed to download media via yt-dlp",
          });
        }

        resolve({ status: "error", error: "Download finished with unexpected output." });
      }
    );
  });
}
