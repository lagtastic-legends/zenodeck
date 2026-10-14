/**
 * ZenoDeck — Pure TypeScript ID3v2.3 Binary Metadata & Cover Art Tagger
 * ======================================================================
 * Embeds Title (TIT2), Artist (TPE1), Album (TALB), Year (TYER),
 * and high-resolution Front Cover Album Art (APIC) directly into MP3 byte buffers.
 *
 * Runs 100% on-device with zero external dependencies in both Browser and Android APK.
 */

import { universalFetch } from "./innertube";

export interface ID3Metadata {
  title: string;
  artist: string;
  album?: string;
  year?: string;
  thumbnailUrl?: string;
  coverImageBuffer?: Uint8Array;
}

/**
 * Encodes a 28-bit integer into a 4-byte synchsafe integer (7 bits per byte)
 */
function encodeSynchsafe(size: number): Uint8Array {
  return new Uint8Array([
    (size >> 21) & 0x7f,
    (size >> 14) & 0x7f,
    (size >> 7) & 0x7f,
    size & 0x7f,
  ]);
}

/**
 * Encodes a regular 32-bit big-endian integer into 4 bytes
 */
function encodeUInt32BE(val: number): Uint8Array {
  return new Uint8Array([
    (val >> 24) & 0xff,
    (val >> 16) & 0xff,
    (val >> 8) & 0xff,
    val & 0xff,
  ]);
}

/**
 * Creates an ID3v2.3 text frame (e.g. TIT2, TPE1, TALB, TYER)
 * Uses UTF-8 encoding (0x03)
 */
function createTextFrame(frameId: string, text: string): Uint8Array {
  if (!text) return new Uint8Array(0);

  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  // 1 byte encoding + text bytes
  const payloadLength = 1 + textBytes.length;

  const header = new Uint8Array(10);
  // Frame ID (4 ASCII bytes)
  for (let i = 0; i < 4; i++) {
    header[i] = frameId.charCodeAt(i);
  }
  // Size (4 bytes big-endian)
  header.set(encodeUInt32BE(payloadLength), 4);
  // Flags (2 bytes: 0x00, 0x00)
  header[8] = 0x00;
  header[9] = 0x00;

  const frame = new Uint8Array(10 + payloadLength);
  frame.set(header, 0);
  frame[10] = 0x03; // UTF-8 text encoding
  frame.set(textBytes, 11);

  return frame;
}

/**
 * Creates an ID3v2.3 APIC (Attached Picture / Front Cover) frame
 */
function createApicFrame(imageBytes: Uint8Array, mimeType = "image/jpeg"): Uint8Array {
  if (!imageBytes || imageBytes.length === 0) return new Uint8Array(0);

  const encoder = new TextEncoder();
  const mimeBytes = encoder.encode(mimeType);
  const descBytes = encoder.encode("Cover");

  // Format:
  // 1 byte: text encoding (0x00 = ISO-8859-1)
  // MIME string + 0x00
  // 1 byte: picture type (0x03 = Front Cover)
  // Description string + 0x00
  // Image binary bytes
  const payloadLength = 1 + (mimeBytes.length + 1) + 1 + (descBytes.length + 1) + imageBytes.length;

  const header = new Uint8Array(10);
  header[0] = 0x41; // 'A'
  header[1] = 0x50; // 'P'
  header[2] = 0x49; // 'I'
  header[3] = 0x43; // 'C'
  header.set(encodeUInt32BE(payloadLength), 4);
  header[8] = 0x00;
  header[9] = 0x00;

  const frame = new Uint8Array(10 + payloadLength);
  frame.set(header, 0);

  let offset = 10;
  frame[offset++] = 0x00; // ISO-8859-1 for mime & desc
  frame.set(mimeBytes, offset);
  offset += mimeBytes.length;
  frame[offset++] = 0x00; // null terminator for mime

  frame[offset++] = 0x03; // Picture Type: 0x03 = Cover (front)

  frame.set(descBytes, offset);
  offset += descBytes.length;
  frame[offset++] = 0x00; // null terminator for desc

  frame.set(imageBytes, offset);

  return frame;
}

/**
 * Strips existing ID3v2 header if present to avoid corrupt/nested tags
 */
export function stripExistingId3v2(data: Uint8Array): Uint8Array {
  if (
    data.length >= 10 &&
    data[0] === 0x49 && // 'I'
    data[1] === 0x44 && // 'D'
    data[2] === 0x33    // '3'
  ) {
    const size =
      ((data[6] & 0x7f) << 21) |
      ((data[7] & 0x7f) << 14) |
      ((data[8] & 0x7f) << 7) |
      (data[9] & 0x7f);
    const totalTagLen = 10 + size;
    if (totalTagLen < data.length) {
      return data.subarray(totalTagLen);
    }
  }
  return data;
}

/**
 * Downloads cover image bytes from thumbnail URL
 */
async function fetchThumbnailBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await universalFetch(url);
    if (!res.ok) return null;
    const textOrData = await res.text();
    // In universalFetch, if web, we can also use direct fetch for arrayBuffer
    if (typeof window !== "undefined" && typeof fetch === "function") {
      try {
        const directRes = await fetch(url);
        if (directRes.ok) {
          const buf = await directRes.arrayBuffer();
          return new Uint8Array(buf);
        }
      } catch {}
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Tags an MP3 audio buffer with ID3v2.3 metadata & cover art
 */
export async function tagMp3Buffer(
  mp3Data: Uint8Array,
  metadata: ID3Metadata
): Promise<Uint8Array> {
  try {
    // Container Header Guard: Never prepend raw ID3 header to MP4/M4A (ftyp) or Ogg/Opus (OggS)
    if (mp3Data.length >= 8) {
      if (
        mp3Data[4] === 0x66 &&
        mp3Data[5] === 0x74 &&
        mp3Data[6] === 0x79 &&
        mp3Data[7] === 0x70
      ) {
        console.warn("tagMp3Buffer: Target is MP4/M4A container (ftyp). Skipping raw ID3 prepending to preserve container integrity.");
        return mp3Data;
      }
      if (
        mp3Data[0] === 0x4f &&
        mp3Data[1] === 0x67 &&
        mp3Data[2] === 0x67 &&
        mp3Data[3] === 0x53
      ) {
        console.warn("tagMp3Buffer: Target is Ogg/Opus container (OggS). Skipping raw ID3 prepending to preserve container integrity.");
        return mp3Data;
      }
    }

    const frames: Uint8Array[] = [];

    // 1. Title (TIT2)
    if (metadata.title) {
      const tit2 = createTextFrame("TIT2", metadata.title);
      if (tit2.length > 0) frames.push(tit2);
    }

    // 2. Artist (TPE1)
    if (metadata.artist) {
      const tpe1 = createTextFrame("TPE1", metadata.artist);
      if (tpe1.length > 0) frames.push(tpe1);
    }

    // 3. Album (TALB)
    const albumName = metadata.album || "ZenoDeck Audio";
    const talb = createTextFrame("TALB", albumName);
    if (talb.length > 0) frames.push(talb);

    // 4. Year (TYER)
    const year = metadata.year || new Date().getFullYear().toString();
    const tyer = createTextFrame("TYER", year);
    if (tyer.length > 0) frames.push(tyer);

    // 5. Album Cover Art (APIC)
    let coverBytes = metadata.coverImageBuffer;
    if (!coverBytes && metadata.thumbnailUrl) {
      coverBytes = (await fetchThumbnailBytes(metadata.thumbnailUrl)) || undefined;
    }

    if (coverBytes && coverBytes.length > 0) {
      const apic = createApicFrame(coverBytes, "image/jpeg");
      if (apic.length > 0) frames.push(apic);
    }

    if (frames.length === 0) {
      return mp3Data;
    }

    // Calculate total frames size
    const totalFramesSize = frames.reduce((acc, f) => acc + f.length, 0);

    // Build ID3v2.3 10-byte header
    const id3Header = new Uint8Array(10);
    id3Header[0] = 0x49; // 'I'
    id3Header[1] = 0x44; // 'D'
    id3Header[2] = 0x33; // '3'
    id3Header[3] = 0x03; // Version 2.3
    id3Header[4] = 0x00; // Revision 0
    id3Header[5] = 0x00; // Flags (no unsynchronization)
    id3Header.set(encodeSynchsafe(totalFramesSize), 6);

    // Clean any prior ID3 header from the raw MP3 data
    const cleanMp3 = stripExistingId3v2(mp3Data);

    // Combine: [Header (10)] + [Frames (totalFramesSize)] + [MP3 audio data]
    const finalBuffer = new Uint8Array(10 + totalFramesSize + cleanMp3.length);
    finalBuffer.set(id3Header, 0);

    let offset = 10;
    for (const frame of frames) {
      finalBuffer.set(frame, offset);
      offset += frame.length;
    }

    finalBuffer.set(cleanMp3, offset);
    return finalBuffer;
  } catch (err) {
    console.warn("ID3 tagging encountered an error, returning original MP3 data:", err);
    return mp3Data;
  }
}
