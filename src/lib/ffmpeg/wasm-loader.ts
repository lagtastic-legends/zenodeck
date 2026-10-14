/**
 * ZENODECK MEDIA ENGINE — Resilient WebAssembly & Core Asset Loader
 * =================================================================
 *
 * Replaces @ffmpeg/util's fragile toBlobURL/downloadWithProgress which causes:
 * "TypeError: Failed to execute 'arrayBuffer' on 'Response': body stream already read"
 *
 * Features:
 * 1. Persistent IndexedDB caching:
 *    Stores the ~32MB WASM binary on device. Subsequent boots take <50ms with 0KB network.
 * 2. Multi-CDN Mirror Fallback:
 *    Local bundled assets (/ffmpeg/...) -> Fast jsDelivr Edge CDN -> unpkg CDN.
 * 3. Safe Stream Reading:
 *    Streams chunks with byte-level progress without dirtying response bodies.
 * 4. Header & Magic Byte Integrity:
 *    Validates the '\0asm' (0x00 0x61 0x73 0x6d) header before instantiating.
 */

const DB_NAME = "zenodeck_media_cache";
const STORE_NAME = "wasm_cache";
const DB_VERSION = 1;
const WASM_CACHE_KEY = "ffmpeg_core_v0.12.10_wasm";
const EXPECTED_WASM_SIZE = 32_232_419;

const OPFS_DIR = "zenodeck_wasm";
const OPFS_FILE = "ffmpeg_core_v0.12.10.wasm";

export interface WasmProgressCallback {
  (progress: { received: number; total: number; percent: number; done: boolean }): void;
}

export interface WasmLogger {
  (level: "info" | "warn" | "error" | "success", message: string): void;
}

/**
 * Checks whether Origin Private File System (OPFS) is available in current runtime.
 */
export async function isOpfsAvailable(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return false;
  }
  try {
    const root = await navigator.storage.getDirectory();
    return root !== null && typeof root.getDirectoryHandle === "function";
  } catch {
    return false;
  }
}

/**
 * Retrieves cached WASM binary from sandboxed OPFS disk storage.
 */
export async function getOpfsCachedWasm(): Promise<ArrayBuffer | null> {
  try {
    if (!(await isOpfsAvailable())) return null;
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(OPFS_DIR, { create: false });
    const fileHandle = await dir.getFileHandle(OPFS_FILE, { create: false });
    const file = await fileHandle.getFile();
    if (file.size < 4) return null;
    const buffer = await file.arrayBuffer();
    return isValidWasmHeader(buffer) ? buffer : null;
  } catch {
    return null;
  }
}

/**
 * Persists downloaded WASM binary to OPFS sandboxed disk storage.
 */
export async function cacheWasmToOpfs(buffer: ArrayBuffer): Promise<boolean> {
  try {
    if (!isValidWasmHeader(buffer) || !(await isOpfsAvailable())) return false;
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(OPFS_DIR, { create: true });
    const fileHandle = await dir.getFileHandle(OPFS_FILE, { create: true });
    if (typeof (fileHandle as any).createWritable === "function") {
      const writable = await (fileHandle as any).createWritable();
      await writable.write(buffer);
      await writable.close();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Removes cached WASM binary from OPFS.
 */
export async function clearOpfsCachedWasm(): Promise<boolean> {
  try {
    if (!(await isOpfsAvailable())) return false;
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(OPFS_DIR, { create: false });
    await dir.removeEntry(OPFS_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open IndexedDB for offline WASM binary storage.
 */
function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Retrieve cached WASM binary from IndexedDB.
 */
export async function getIdbCachedWasm(): Promise<ArrayBuffer | null> {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(WASM_CACHE_KEY);

      request.onsuccess = () => {
        const data = request.result;
        if (data instanceof ArrayBuffer && isValidWasmHeader(data)) {
          resolve(data);
        } else if (data instanceof Uint8Array) {
          const ab = data.buffer.slice(
            data.byteOffset,
            data.byteOffset + data.byteLength,
          ) as ArrayBuffer;
          if (isValidWasmHeader(ab)) {
            resolve(ab);
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Persist downloaded WASM binary to IndexedDB.
 */
export async function cacheWasmToIdb(buffer: ArrayBuffer): Promise<boolean> {
  if (!isValidWasmHeader(buffer)) return false;

  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(buffer, WASM_CACHE_KEY);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Purge cached WASM binary from IndexedDB.
 */
export async function clearIdbCachedWasm(): Promise<boolean> {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(WASM_CACHE_KEY);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Multi-tier offline cache lookup:
 * 1. Checks OPFS sandboxed disk first (zero JS heap pressure).
 * 2. Falls back to IndexedDB.
 * 3. Re-hydrates OPFS in background if found in IndexedDB.
 */
export async function getCachedWasmBinary(): Promise<ArrayBuffer | null> {
  // 1. Try OPFS first
  try {
    const opfsBuf = await getOpfsCachedWasm();
    if (opfsBuf) return opfsBuf;
  } catch {}

  // 2. Fall back to IndexedDB
  try {
    const idbBuf = await getIdbCachedWasm();
    if (idbBuf) {
      cacheWasmToOpfs(idbBuf).catch(() => {});
      return idbBuf;
    }
  } catch {}

  return null;
}

/**
 * Persist downloaded WASM binary to both OPFS and IndexedDB for instant future boots.
 */
export async function cacheWasmBinary(buffer: ArrayBuffer): Promise<boolean> {
  if (!isValidWasmHeader(buffer)) return false;

  const [opfsOk, idbOk] = await Promise.all([
    cacheWasmToOpfs(buffer).catch(() => false),
    cacheWasmToIdb(buffer).catch(() => false),
  ]);

  return opfsOk || idbOk;
}

/**
 * Purge cached WASM binary from all offline storage tiers.
 */
export async function clearCachedWasmBinary(): Promise<boolean> {
  const [opfsOk, idbOk] = await Promise.all([
    clearOpfsCachedWasm().catch(() => false),
    clearIdbCachedWasm().catch(() => false),
  ]);

  return opfsOk || idbOk;
}

/**
 * Validates the WebAssembly magic number: '\0asm' (0x00, 0x61, 0x73, 0x6d).
 */
export function isValidWasmHeader(buffer: ArrayBuffer | ArrayBufferLike): boolean {
  if (!buffer || buffer.byteLength < 4) return false;
  const view = new Uint8Array(buffer, 0, 4);
  return (
    view[0] === 0x00 &&
    view[1] === 0x61 &&
    view[2] === 0x73 &&
    view[3] === 0x6d
  );
}

/**
 * Helper to determine if running inside Capacitor native container.
 */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as any;
  return Boolean(
    win?.Capacitor?.isNativePlatform?.() ||
    win?._capacitor ||
    typeof win?.Capacitor !== "undefined",
  );
}

/**
 * Get prioritized mirror URLs for the WASM core.
 * In native mobile (Capacitor), static WASM is intentionally excluded from the APK
 * bundle (<25MB limit), so CDN edge mirrors are prioritized first.
 */
export function getWasmMirrors(): string[] {
  const mirrors: string[] = [];

  const cdnMirrors = [
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm",
    "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm",
    "https://cdnjs.cloudflare.com/ajax/libs/ffmpeg-core/0.12.10/ffmpeg-core.wasm",
  ];

  let localUrl: string | null = null;
  if (typeof window !== "undefined") {
    try {
      localUrl = new URL("/ffmpeg/ffmpeg-core.wasm", window.location.href).href;
    } catch {
      localUrl = "/ffmpeg/ffmpeg-core.wasm";
    }
  }

  if (isCapacitorNative()) {
    // Native mobile app: prioritize global CDN edge POPs directly
    mirrors.push(...cdnMirrors);
    if (localUrl) mirrors.push(localUrl);
  } else {
    // Web / Local dev: check local asset first if present, then CDN edge mirrors
    if (localUrl) mirrors.push(localUrl);
    mirrors.push(...cdnMirrors);
  }

  return mirrors;
}

/**
 * Get prioritized mirror URLs for the core JavaScript module.
 */
export function getCoreMirrors(): string[] {
  const mirrors: string[] = [];

  // 1. Local self-hosted module
  if (typeof window !== "undefined") {
    try {
      mirrors.push(new URL("/ffmpeg/ffmpeg-core.js", window.location.href).href);
    } catch {
      mirrors.push("/ffmpeg/ffmpeg-core.js");
    }
  }

  // 2. jsDelivr ESM CDN
  mirrors.push("https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js");

  // 3. unpkg ESM CDN
  mirrors.push("https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js");

  return mirrors;
}

/**
 * Safely download WASM binary with real progress, failover, and caching.
 * NEVER calls response.arrayBuffer() on an already-read response body stream.
 */
export async function loadWasmCoreBlobUrl(
  onProgress?: WasmProgressCallback,
  logger?: WasmLogger,
): Promise<{ blobUrl: string; fromCache: boolean; byteLength: number; wasmBinary?: ArrayBuffer }> {
  // Check local offline IndexedDB cache first
  try {
    const cachedBuffer = await getCachedWasmBinary();
    if (cachedBuffer) {
      logger?.(
        "success",
        `Engine core loaded from local offline cache (${(cachedBuffer.byteLength / (1024 * 1024)).toFixed(1)} MB). Zero network required.`,
      );
      onProgress?.({
        received: cachedBuffer.byteLength,
        total: cachedBuffer.byteLength,
        percent: 1,
        done: true,
      });
      const blob = new Blob([cachedBuffer], { type: "application/wasm" });
      return {
        blobUrl: URL.createObjectURL(blob),
        fromCache: true,
        byteLength: cachedBuffer.byteLength,
        wasmBinary: cachedBuffer,
      };
    }
  } catch (cacheErr) {
    logger?.("warn", `Cache lookup bypassed: ${cacheErr}`);
  }

  const mirrors = getWasmMirrors();
  let lastError: Error | null = null;

  for (let i = 0; i < mirrors.length; i++) {
    const url = mirrors[i];
    logger?.("info", `Fetching WASM core (${i + 1}/${mirrors.length}) → ${url}`);

    try {
      const resp = await fetch(url, {
        headers: { Accept: "application/wasm,*/*" },
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      }

      // Determine expected total bytes
      const headerLength = resp.headers.get("content-length");
      const parsedLength = headerLength ? parseInt(headerLength, 10) : NaN;
      const expectedTotal =
        Number.isFinite(parsedLength) && parsedLength > 0
          ? parsedLength
          : EXPECTED_WASM_SIZE;

      let finalBuffer: ArrayBuffer;

      // Stream chunks if readable stream is available
      if (resp.body && typeof resp.body.getReader === "function") {
        const reader = resp.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.length;
              onProgress?.({
                received,
                total: expectedTotal,
                percent: Math.min(received / expectedTotal, 0.99),
                done: false,
              });
            }
          }

          // Merge all chunks into a contiguous Uint8Array
          const merged = new Uint8Array(received);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }
          finalBuffer = merged.buffer;
        } catch (streamErr) {
          // IMPORTANT: If reader stream is interrupted or canceled,
          // NEVER call resp.arrayBuffer()! Initiate a clean fresh request.
          logger?.(
            "warn",
            `Stream read failed (${streamErr instanceof Error ? streamErr.message : streamErr}), retrying mirror with direct buffer fetch...`,
          );
          const retryResp = await fetch(url);
          if (!retryResp.ok) throw new Error(`HTTP ${retryResp.status}`);
          finalBuffer = await retryResp.arrayBuffer();
        }
      } else {
        // Direct arrayBuffer when streaming reader is unsupported
        finalBuffer = await resp.arrayBuffer();
      }

      // Verify that the payload is actually WebAssembly
      if (!isValidWasmHeader(finalBuffer)) {
        throw new Error("Payload verification failed (invalid WebAssembly magic header).");
      }

      onProgress?.({
        received: finalBuffer.byteLength,
        total: finalBuffer.byteLength,
        percent: 1,
        done: true,
      });

      logger?.(
        "success",
        `WASM core downloaded successfully (${(finalBuffer.byteLength / (1024 * 1024)).toFixed(1)} MB).`,
      );

      // Asynchronously store into IndexedDB so subsequent runs don't need network
      cacheWasmBinary(finalBuffer).catch(() => {});

      const blob = new Blob([finalBuffer], { type: "application/wasm" });
      return {
        blobUrl: URL.createObjectURL(blob),
        fromCache: false,
        byteLength: finalBuffer.byteLength,
        wasmBinary: finalBuffer,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger?.("warn", `Mirror failed (${url}): ${lastError.message}`);
    }
  }

  throw lastError || new Error("All WASM mirrors failed to load.");
}

/**
 * Resolve the core JS module URL, falling back through mirrors if necessary.
 * Avoids method: "HEAD" because Android WebViewAssetLoader and certain CDNs reject HEAD.
 */
export async function resolveCoreModuleUrl(logger?: WasmLogger): Promise<string> {
  const mirrors = getCoreMirrors();

  // 1. If running in browser or Capacitor, test local mirror with GET + abort signal
  if (typeof window !== "undefined") {
    const localMirror = mirrors[0];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const resp = await fetch(localMirror, { method: "GET", signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) {
        logger?.("info", `Core JS resolved locally → ${localMirror}`);
        return localMirror;
      }
    } catch {
      logger?.("warn", `Local Core JS check bypassed, evaluating fast edge mirrors...`);
    }
  }

  // 2. Fall back through remote mirrors
  for (let i = 1; i < mirrors.length; i++) {
    const url = mirrors[i];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(url, { method: "GET", signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) {
        logger?.("info", `Core JS resolved via CDN → ${url}`);
        return url;
      }
    } catch {
      // Continue to next mirror
    }
  }

  // Fallback to primary mirror URL directly
  return mirrors[0];
}
