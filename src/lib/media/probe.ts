"use client";

import { Capacitor } from "@capacitor/core";
import { OmniRecorder } from "@/lib/native-recorder";

/**
 * Browser-native media probing — duration & dimensions straight from the
 * HTML media element. Zero ffmpeg cost; the engine stays cold for probing.
 */

export interface VideoMeta {
  durationSec: number;
  width: number;
  height: number;
  hasAudio?: boolean;
}

export function probeVideo(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        URL.revokeObjectURL(url);
        resolve({ durationSec: 0, width: 0, height: 0, hasAudio: false });
      }
    }, 5000);

    const finish = (meta: VideoMeta) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve(meta);
      }
    };

    video.onloadedmetadata = () => {
      let hasAudio: boolean | undefined = undefined;
      try {
        const stream =
          typeof (video as any).captureStream === "function"
            ? (video as any).captureStream()
            : typeof (video as any).mozCaptureStream === "function"
              ? (video as any).mozCaptureStream()
              : null;
        if (stream && typeof stream.getAudioTracks === "function") {
          hasAudio = stream.getAudioTracks().length > 0;
        } else if ((video as any).audioTracks && typeof (video as any).audioTracks.length === "number") {
          hasAudio = (video as any).audioTracks.length > 0;
        } else if (typeof (video as any).mozHasAudio !== "undefined") {
          hasAudio = Boolean((video as any).mozHasAudio);
        }
      } catch {
        // ignore
      }

      finish({
        durationSec: Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        hasAudio,
      });
    };
    video.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        reject(new Error("Unable to read video metadata from this file."));
      }
    };

    video.src = url;
  });
}

export function probeAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        URL.revokeObjectURL(url);
        resolve(0);
      }
    }, 5000);

    audio.onloadedmetadata = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        URL.revokeObjectURL(url);
        resolve(d);
      }
    };
    audio.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        reject(new Error("Unable to read audio metadata from this file."));
      }
    };
    audio.src = url;
  });
}

/**
 * Fast, pure-JS MP4 atom & ID3 tag parser.
 * Reads first 128KB & last 128KB slices in < 2ms.
 * Completely replaces heavy music-metadata.
 */
export async function probeMetadataTitle(file: File): Promise<string | null> {
  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");
  const isNumericName = /^\d+(\.[^.]+)?$/.test(file.name);

  // 1. If running on native Android and filename is numeric, query Android MediaStore directly!
  if (Capacitor.isNativePlatform() && isNumericName) {
    try {
      const res = await OmniRecorder.resolveMediaName({ name: file.name });
      if (res?.realName && res.realName !== file.name) {
        return res.realName;
      }
    } catch {
      // Fall through to binary parsing
    }
  }

  // 2. Fast binary parsing for MP4/MOV/M4A/3GP
  if (
    isVideo ||
    file.name.endsWith(".mp4") ||
    file.name.endsWith(".mov") ||
    file.name.endsWith(".m4a") ||
    file.name.endsWith(".m4v")
  ) {
    try {
      const headSize = Math.min(file.size, 131072);
      const headBuffer = await file.slice(0, headSize).arrayBuffer();
      const headResult = parseMp4Boxes(headBuffer);
      if (headResult.title) return headResult.title;

      // If moov is at tail (common in un-optimized camera recordings)
      let tailResult: { title: string | null; creationDate: Date | null } = { title: null, creationDate: null };
      if (!headResult.creationDate && file.size > 131072) {
        const tailStart = Math.max(0, file.size - 131072);
        const tailBuffer = await file.slice(tailStart, file.size).arrayBuffer();
        tailResult = parseMp4Boxes(tailBuffer);
        if (tailResult.title) return tailResult.title;
      }

      const creationDate = headResult.creationDate || tailResult.creationDate;
      // If the filename is a generic numeric ID (like 1000076567.mp4) and we found the camera recording timestamp
      if (isNumericName && creationDate) {
        const pad = (n: number) => String(n).padStart(2, "0");
        const ext = file.name.includes(".")
          ? file.name.substring(file.name.lastIndexOf("."))
          : isVideo
            ? ".mp4"
            : ".m4a";
        const formatted = `VID_${creationDate.getFullYear()}${pad(creationDate.getMonth() + 1)}${pad(creationDate.getDate())}_${pad(creationDate.getHours())}${pad(creationDate.getMinutes())}${pad(creationDate.getSeconds())}${ext}`;
        return formatted;
      }
    } catch {
      // Fall through
    }
  }

  // 3. Fast binary parsing for MP3 / Audio ID3v2
  if (isAudio || file.name.endsWith(".mp3")) {
    try {
      const sliceSize = Math.min(file.size, 8192);
      const buf = await file.slice(0, sliceSize).arrayBuffer();
      const id3Title = parseId3v2Title(buf);
      if (id3Title) return id3Title;
    } catch {
      // Fall through
    }
  }

  return null;
}

function parseMp4Boxes(buffer: ArrayBuffer): {
  title: string | null;
  creationDate: Date | null;
  hasAudio: boolean;
  hasMoov: boolean;
} {
  const view = new DataView(buffer);
  let title: string | null = null;
  let creationDate: Date | null = null;
  let hasAudio = false;
  let hasMoov = false;

  function scan(offset: number, end: number, depth: number) {
    if (depth > 12 || offset >= end) return;
    while (offset + 8 <= end) {
      const size = view.getUint32(offset);
      if (size < 8 || offset + size > end + 8) break;
      const type = String.fromCharCode(
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7),
      );
      const boxEnd = Math.min(offset + size, end);
      const dataOffset = offset + 8;

      if (type === "moov") {
        hasMoov = true;
        scan(dataOffset, boxEnd, depth + 1);
      } else if (type === "udta" || type === "trak" || type === "mdia") {
        scan(dataOffset, boxEnd, depth + 1);
      } else if (type === "hdlr" && dataOffset + 12 <= boxEnd) {
        const handlerType = String.fromCharCode(
          view.getUint8(dataOffset + 8),
          view.getUint8(dataOffset + 9),
          view.getUint8(dataOffset + 10),
          view.getUint8(dataOffset + 11),
        );
        if (handlerType === "soun") {
          hasAudio = true;
        }
      } else if (type === "meta") {
        scan(dataOffset + 4, boxEnd, depth + 1);
      } else if (type === "ilst") {
        scan(dataOffset, boxEnd, depth + 1);
      } else if (type === "\xa9nam" || type === "titl") {
        for (let sub = dataOffset; sub + 8 <= boxEnd; ) {
          const subSize = view.getUint32(sub);
          if (subSize < 8) break;
          const subType = String.fromCharCode(
            view.getUint8(sub + 4),
            view.getUint8(sub + 5),
            view.getUint8(sub + 6),
            view.getUint8(sub + 7),
          );
          if (subType === "data" && sub + 16 <= sub + subSize) {
            const strBytes = new Uint8Array(buffer, sub + 16, subSize - 16);
            const decoded = new TextDecoder().decode(strBytes).replace(/[\u0000]/g, "").trim();
            if (decoded) {
              title = decoded;
              break;
            }
          }
          sub += subSize;
        }
      } else if (type === "mvhd") {
        const version = view.getUint8(dataOffset);
        let creationSec = 0;
        if (version === 0 && dataOffset + 8 <= boxEnd) {
          creationSec = view.getUint32(dataOffset + 4);
        } else if (version === 1 && dataOffset + 12 <= boxEnd) {
          creationSec = Number(view.getBigUint64(dataOffset + 4));
        }
        if (creationSec > 0) {
          // MP4 epoch is 1904-01-01 UTC (-2082844800000 ms)
          const d = new Date(-2082844800000 + creationSec * 1000);
          const year = d.getUTCFullYear();
          if (year >= 2010 && year <= 2035) {
            creationDate = d;
          }
        }
      }

      offset += size;
    }
  }

  scan(0, view.byteLength, 0);
  return { title, creationDate, hasAudio, hasMoov };
}

function parseId3v2Title(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 10) return null;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null; // "ID3"
  const tagSize =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);
  const max = Math.min(bytes.length, 10 + tagSize);
  let offset = 10;
  while (offset + 10 <= max) {
    const frameId = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    );
    const frameSize =
      ((bytes[offset + 4] & 0x7f) << 21) |
      ((bytes[offset + 5] & 0x7f) << 14) |
      ((bytes[offset + 6] & 0x7f) << 7) |
      (bytes[offset + 7] & 0x7f);
    if (frameSize <= 0 || offset + 10 + frameSize > max) break;
    if (frameId === "TIT2") {
      const strData = new Uint8Array(buffer, offset + 11, frameSize - 1);
      return new TextDecoder().decode(strData).replace(/[\u0000]/g, "").trim();
    }
    offset += 10 + frameSize;
  }
  return null;
}

/**
 * Fast check to determine if a video file has an audio track.
 * Combines zero-delay binary MP4 atom inspection with browser element probe.
 */
export async function probeHasAudio(file: File): Promise<boolean> {
  if (
    file.type.startsWith("audio/") ||
    /\.(mp3|wav|m4a|flac|ogg|aac|opus|wma|aiff)$/i.test(file.name)
  ) {
    return true;
  }

  // 1. Fast binary atom probe for MP4/MOV/M4V
  if (
    /\.(mp4|mov|m4v|3gp)$/i.test(file.name) ||
    file.type.startsWith("video/mp4") ||
    file.type.startsWith("video/quicktime")
  ) {
    try {
      const headSize = Math.min(file.size, 262144);
      const headBuf = await file.slice(0, headSize).arrayBuffer();
      const headRes = parseMp4Boxes(headBuf);
      if (headRes.hasMoov) {
        return headRes.hasAudio;
      }
      if (file.size > 262144) {
        const tailStart = Math.max(0, file.size - 262144);
        const tailBuf = await file.slice(tailStart, file.size).arrayBuffer();
        const tailRes = parseMp4Boxes(tailBuf);
        if (tailRes.hasMoov) {
          return tailRes.hasAudio;
        }
      } else {
        // Small file <= 256KB that lacks a moov box is incomplete or truncated
        return false;
      }
    } catch {
      // Fall through to video element probe
    }
  }

  // 2. Video element probe with captureStream
  return new Promise<boolean>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        URL.revokeObjectURL(url);
        resolve(false); // default false if undetermined
      }
    }, 2500);

    video.onloadedmetadata = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        try {
          const stream =
            typeof (video as any).captureStream === "function"
              ? (video as any).captureStream()
              : typeof (video as any).mozCaptureStream === "function"
                ? (video as any).mozCaptureStream()
                : null;
          if (stream && typeof stream.getAudioTracks === "function") {
            const tracks = stream.getAudioTracks();
            URL.revokeObjectURL(url);
            resolve(tracks.length > 0);
            return;
          }
          if (
            (video as any).audioTracks &&
            typeof (video as any).audioTracks.length === "number"
          ) {
            const hasTracks = (video as any).audioTracks.length > 0;
            URL.revokeObjectURL(url);
            resolve(hasTracks);
            return;
          }
          if (typeof (video as any).mozHasAudio !== "undefined") {
            const hasMoz = Boolean((video as any).mozHasAudio);
            URL.revokeObjectURL(url);
            resolve(hasMoz);
            return;
          }
        } catch {
          // ignore
        }
        URL.revokeObjectURL(url);
        resolve(true);
      }
    };

    video.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve(false);
      }
    };

    video.src = url;
  });
}

/**
 * Probe the original audio codec from an MP4/MOV container.
 * Returns the codec identifier and best-fit output extension for stream copy.
 */
export async function probeAudioCodec(
  file: File,
): Promise<{ codec: string; ext: string }> {
  const CODEC_EXT: Record<string, string> = {
    mp4a: "m4a",
    opus: "ogg",
    "mp3 ": "mp3",
    ".mp3": "mp3",
    "ac-3": "m4a",
    "ec-3": "m4a",
    fLaC: "flac",
    Opus: "ogg",
  };

  try {
    const headSize = Math.min(file.size, 262144);
    const buf = await file.slice(0, headSize).arrayBuffer();
    const view = new DataView(buf);

    function findCodec(offset: number, end: number, depth: number): string | null {
      if (depth > 14 || offset >= end) return null;
      while (offset + 8 <= end) {
        const size = view.getUint32(offset);
        if (size < 8 || offset + size > end + 8) break;
        const type = String.fromCharCode(
          view.getUint8(offset + 4),
          view.getUint8(offset + 5),
          view.getUint8(offset + 6),
          view.getUint8(offset + 7),
        );
        const boxEnd = Math.min(offset + size, end);

        if (type === "moov" || type === "trak" || type === "mdia" || type === "minf" || type === "stbl") {
          const found = findCodec(offset + 8, boxEnd, depth + 1);
          if (found) return found;
        } else if (type === "stsd" && offset + 16 <= boxEnd) {
          // stsd has 8 bytes of version/flags + entry_count before entries
          const entryStart = offset + 16;
          if (entryStart + 8 <= boxEnd) {
            const entryType = String.fromCharCode(
              view.getUint8(entryStart + 4),
              view.getUint8(entryStart + 5),
              view.getUint8(entryStart + 6),
              view.getUint8(entryStart + 7),
            );
            return entryType;
          }
        }
        offset += size;
      }
      return null;
    }

    const codec = findCodec(0, view.byteLength, 0);
    if (codec) {
      const ext = CODEC_EXT[codec] ?? "m4a";
      return { codec, ext };
    }
  } catch {
    // Fall through to default
  }

  // Fallback based on file extension
  const inputExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["webm", "mkv"].includes(inputExt)) return { codec: "opus", ext: "ogg" };
  if (["avi", "wmv"].includes(inputExt)) return { codec: "mp3", ext: "mp3" };
  return { codec: "aac", ext: "m4a" };
}
