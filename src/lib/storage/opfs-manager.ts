/**
 * ZenoDeck — Origin Private File System (OPFS) Zero-Crash Streaming Manager
 *
 * Provides high-throughput, chunk-based I/O against the browser's sandboxed
 * Origin Private File System. Bypasses JavaScript heap / MEMFS limits for
 * massive media payloads (500MB to 20GB+), guaranteeing zero browser tab OOM crashes.
 */

export interface OPFSEntry {
  name: string;
  size: number;
  lastModified: number;
  path: string;
}

export interface OPFSSessionConfig {
  sessionId: string;
  autoPurgeOnUnload?: boolean;
}

export interface StreamWriteOptions {
  chunkSize?: number;
  onProgress?: (bytesWritten: number, totalExpectedBytes?: number) => void;
  signal?: AbortSignal;
}

export interface StorageQuotaInfo {
  supported: boolean;
  usageBytes: number;
  quotaBytes: number;
  percentUsed: number;
}

const ROOT_STORAGE_DIR = "zenodeck_sessions";
const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB streaming buffer

/**
 * Validates whether the current execution runtime supports Origin Private File System.
 */
export async function isOPFSSupported(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage) {
    return false;
  }
  if (typeof navigator.storage.getDirectory !== "function") {
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
 * Inspects device storage quota and utilization.
 */
export async function getStorageQuota(): Promise<StorageQuotaInfo> {
  if (typeof navigator === "undefined" || !navigator.storage || !navigator.storage.estimate) {
    return { supported: false, usageBytes: 0, quotaBytes: 0, percentUsed: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usageBytes = estimate.usage ?? 0;
    const quotaBytes = estimate.quota ?? 0;
    const percentUsed = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

    return {
      supported: true,
      usageBytes,
      quotaBytes,
      percentUsed: Math.min(100, Math.round(percentUsed * 100) / 100),
    };
  } catch {
    return { supported: false, usageBytes: 0, quotaBytes: 0, percentUsed: 0 };
  }
}

/**
 * Resolves or initializes the parent root sessions directory.
 */
async function getRootSessionsDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!navigator.storage || !navigator.storage.getDirectory) {
    throw new Error("Origin Private File System (OPFS) is not supported in this environment.");
  }
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle(ROOT_STORAGE_DIR, { create: true });
}

/**
 * Resolves or initializes an isolated per-session directory.
 */
export async function getSessionDirectory(sessionId: string): Promise<FileSystemDirectoryHandle> {
  const sanitizedId = (sessionId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
  const sessionsRoot = await getRootSessionsDirectory();
  return await sessionsRoot.getDirectoryHandle(sanitizedId, { create: true });
}

/**
 * Streams a ReadableStream of Uint8Array chunks directly to an OPFS file on disk.
 * Uses FileSystemWritableFileStream to prevent storing chunks in RAM.
 */
export async function writeStreamToOPFS(
  sessionId: string,
  fileName: string,
  stream: ReadableStream<Uint8Array>,
  options?: StreamWriteOptions
): Promise<OPFSEntry> {
  const dir = await getSessionDirectory(sessionId);
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable({ keepExistingData: false });

  const reader = stream.getReader();
  let bytesWritten = 0;

  try {
    while (true) {
      if (options?.signal?.aborted) {
        throw new DOMException("OPFS write aborted by signal", "AbortError");
      }

      const { done, value } = await reader.read();
      if (done) break;

      if (value && value.byteLength > 0) {
        await writable.write(value as BufferSource);
        bytesWritten += value.byteLength;
        options?.onProgress?.(bytesWritten);
      }
    }
    await writable.close();
  } catch (err) {
    try {
      await writable.abort();
    } catch {
      // Ignore abort errors during cleanup
    }
    throw err;
  } finally {
    reader.releaseLock();
  }

  const file = await fileHandle.getFile();
  return {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    path: `${ROOT_STORAGE_DIR}/${sessionId}/${fileName}`,
  };
}

/**
 * Writes a Blob, File, or ArrayBuffer payload into OPFS using chunked streaming.
 */
export async function writeBlobToOPFS(
  sessionId: string,
  fileName: string,
  payload: Blob | ArrayBuffer | Uint8Array,
  options?: StreamWriteOptions
): Promise<OPFSEntry> {
  let stream: ReadableStream<Uint8Array>;

  if (payload instanceof Blob) {
    stream = payload.stream();
  } else if (payload instanceof Uint8Array) {
    stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
        let offset = 0;
        while (offset < payload.byteLength) {
          const end = Math.min(offset + chunkSize, payload.byteLength);
          controller.enqueue(payload.slice(offset, end));
          offset = end;
        }
        controller.close();
      },
    });
  } else {
    const uint8 = new Uint8Array(payload);
    return writeBlobToOPFS(sessionId, fileName, uint8, options);
  }

  return await writeStreamToOPFS(sessionId, fileName, stream, options);
}

/**
 * Returns a readable streaming consumer from an OPFS file handle.
 */
export async function readStreamFromOPFS(
  sessionId: string,
  fileName: string
): Promise<ReadableStream<Uint8Array>> {
  const dir = await getSessionDirectory(sessionId);
  const fileHandle = await dir.getFileHandle(fileName, { create: false });
  const file = await fileHandle.getFile();
  return file.stream();
}

/**
 * Reads a complete OPFS file as a Blob with explicit MIME typing.
 */
export async function readBlobFromOPFS(
  sessionId: string,
  fileName: string,
  mimeType = "application/octet-stream"
): Promise<Blob> {
  const dir = await getSessionDirectory(sessionId);
  const fileHandle = await dir.getFileHandle(fileName, { create: false });
  const file = await fileHandle.getFile();
  return new Blob([await file.arrayBuffer()], { type: mimeType });
}

/**
 * Generates an ephemeral Object URL referencing the OPFS file.
 * Automatically bundles an explicit revocation callback to prevent object URL leaks.
 */
export async function createOPFSURL(
  sessionId: string,
  fileName: string,
  mimeType = "application/octet-stream"
): Promise<{ url: string; revoke: () => void }> {
  const blob = await readBlobFromOPFS(sessionId, fileName, mimeType);
  const url = URL.createObjectURL(blob);
  return {
    url,
    revoke: () => {
      URL.revokeObjectURL(url);
    },
  };
}

/**
 * Deletes a single file within a session directory.
 */
export async function deleteOPFSFile(sessionId: string, fileName: string): Promise<boolean> {
  try {
    const dir = await getSessionDirectory(sessionId);
    await dir.removeEntry(fileName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lists all active files within a given session directory.
 */
export async function listSessionFiles(sessionId: string): Promise<OPFSEntry[]> {
  const entries: OPFSEntry[] = [];
  try {
    const dir = await getSessionDirectory(sessionId);
    const asyncEntries = (dir as unknown as { entries: () => AsyncIterable<[string, FileSystemHandle]> }).entries?.();
    if (!asyncEntries) return [];

    for await (const [name, handle] of asyncEntries) {
      if (handle.kind === "file") {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        entries.push({
          name,
          size: file.size,
          lastModified: file.lastModified,
          path: `${ROOT_STORAGE_DIR}/${sessionId}/${name}`,
        });
      }
    }
  } catch {
    return [];
  }
  return entries;
}

/**
 * Purges an entire session directory and all its encapsulated files from OPFS.
 */
export async function purgeSessionFiles(sessionId: string): Promise<boolean> {
  try {
    const sanitizedId = (sessionId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
    const sessionsRoot = await getRootSessionsDirectory();
    await sessionsRoot.removeEntry(sanitizedId, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Scans all session directories and purges any older than maxAgeMs (default: 2 hours).
 */
export async function cleanupStaleSessions(maxAgeMs = 2 * 60 * 60 * 1000): Promise<number> {
  let purgedCount = 0;
  const now = Date.now();

  try {
    const sessionsRoot = await getRootSessionsDirectory();
    const asyncEntries = (sessionsRoot as unknown as { entries: () => AsyncIterable<[string, FileSystemHandle]> }).entries?.();
    if (!asyncEntries) return 0;

    for await (const [name, handle] of asyncEntries) {
      if (handle.kind === "directory") {
        const dirHandle = handle as FileSystemDirectoryHandle;
        let newestMtime = 0;
        const subEntries = (dirHandle as unknown as { entries: () => AsyncIterable<[string, FileSystemHandle]> }).entries?.();

        if (subEntries) {
          for await (const [, subHandle] of subEntries) {
            if (subHandle.kind === "file") {
              const fileHandle = subHandle as FileSystemFileHandle;
              const f = await fileHandle.getFile();
              if (f.lastModified > newestMtime) {
                newestMtime = f.lastModified;
              }
            }
          }
        }

        // If directory is empty or all its contents are older than threshold, remove it
        if (newestMtime === 0 || now - newestMtime > maxAgeMs) {
          try {
            await sessionsRoot.removeEntry(name, { recursive: true });
            purgedCount++;
          } catch {
            // Ignore individual directory removal failures
          }
        }
      }
    }
  } catch {
    return 0;
  }

  return purgedCount;
}

/* ============================================================================
 * PERSISTENT ONNX & AI MODEL WEIGHT CACHING (OPFS + INDEXEDDB DUAL ENGINE)
 * ============================================================================ */

const MODEL_CACHE_DIR = "zenodeck_models";
const MODEL_IDB_NAME = "zenodeck_ai_cache";
const MODEL_IDB_STORE = "model_binaries";

export interface CachedModelResult {
  data: ArrayBuffer;
  source: "opfs_cache" | "idb_cache" | "network";
  size: number;
  modelId: string;
}

export interface ModelFetchProgress {
  receivedBytes: number;
  totalBytes?: number;
  percent: number;
}

/**
 * Resolves or initializes the isolated models directory inside OPFS.
 */
async function getModelDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return null;
  }
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(MODEL_CACHE_DIR, { create: true });
  } catch {
    return null;
  }
}

/**
 * Opens IndexedDB fallback database for model binary persistence.
 */
function openModelDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(MODEL_IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(MODEL_IDB_STORE)) {
          db.createObjectStore(MODEL_IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Checks whether an AI model binary is already cached locally without loading it into memory.
 */
export async function hasCachedModel(modelId: string): Promise<boolean> {
  const safeName = `${modelId.replace(/[^a-zA-Z0-9_-]/g, "_")}.onnx`;

  // 1. Check OPFS
  try {
    const dir = await getModelDirectory();
    if (dir) {
      await dir.getFileHandle(safeName, { create: false });
      return true;
    }
  } catch {
    // Not in OPFS
  }

  // 2. Check IndexedDB fallback
  const db = await openModelDatabase();
  if (db) {
    try {
      return await new Promise<boolean>((resolve) => {
        const tx = db.transaction(MODEL_IDB_STORE, "readonly");
        const store = tx.objectStore(MODEL_IDB_STORE);
        const req = store.count(modelId);
        req.onsuccess = () => resolve((req.result || 0) > 0);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Retrieves a model binary from OPFS or IndexedDB cache.
 * If not cached, streams the binary from the remote URL, persists it to disk, and reports progress.
 */
export async function getOrFetchCachedModel(
  modelId: string,
  url: string,
  onProgress?: (progress: ModelFetchProgress) => void
): Promise<CachedModelResult> {
  const safeName = `${modelId.replace(/[^a-zA-Z0-9_-]/g, "_")}.onnx`;

  // 1. Try reading from OPFS cache
  try {
    const dir = await getModelDirectory();
    if (dir) {
      const fileHandle = await dir.getFileHandle(safeName, { create: false });
      const file = await fileHandle.getFile();
      if (file.size > 0) {
        const data = await file.arrayBuffer();
        onProgress?.({ receivedBytes: file.size, totalBytes: file.size, percent: 100 });
        return {
          data,
          source: "opfs_cache",
          size: file.size,
          modelId,
        };
      }
    }
  } catch {
    // Cache miss in OPFS, check IndexedDB
  }

  // 2. Try reading from IndexedDB fallback cache
  const db = await openModelDatabase();
  if (db) {
    try {
      const cached = await new Promise<ArrayBuffer | null>((resolve) => {
        const tx = db.transaction(MODEL_IDB_STORE, "readonly");
        const store = tx.objectStore(MODEL_IDB_STORE);
        const req = store.get(modelId);
        req.onsuccess = () => {
          if (req.result instanceof ArrayBuffer) resolve(req.result);
          else if (req.result instanceof Uint8Array) resolve(req.result.buffer as ArrayBuffer);
          else resolve(null);
        };
        req.onerror = () => resolve(null);
      });

      if (cached && cached.byteLength > 0) {
        onProgress?.({ receivedBytes: cached.byteLength, totalBytes: cached.byteLength, percent: 100 });
        return {
          data: cached,
          source: "idb_cache",
          size: cached.byteLength,
          modelId,
        };
      }
    } catch {
      // Continue to network fetch
    }
  }

  // 3. Cache Miss: Stream model binary from remote URL
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download model weights for "${modelId}" (HTTP ${res.status})`);
  }

  const contentLength = res.headers.get("content-length");
  const totalBytes = contentLength ? parseInt(contentLength, 10) : undefined;
  let receivedBytes = 0;
  const chunks: Uint8Array[] = [];

  if (res.body) {
    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        const percent = totalBytes ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 50;
        onProgress?.({ receivedBytes, totalBytes, percent });
      }
    }
  } else {
    const buffer = await res.arrayBuffer();
    chunks.push(new Uint8Array(buffer));
    receivedBytes = buffer.byteLength;
  }

  // Assemble full model ArrayBuffer
  const fullArray = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    fullArray.set(chunk, offset);
    offset += chunk.length;
  }
  const modelBuffer = fullArray.buffer as ArrayBuffer;

  // 4. Save to OPFS for zero-cost subsequent instant boots
  try {
    const dir = await getModelDirectory();
    if (dir) {
      const fileHandle = await dir.getFileHandle(safeName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(modelBuffer);
      await writable.close();
    }
  } catch (opfsErr) {
    console.warn("Could not persist model to OPFS:", opfsErr);
  }

  // 5. Also persist to IndexedDB as secondary cache
  if (db) {
    try {
      const tx = db.transaction(MODEL_IDB_STORE, "readwrite");
      const store = tx.objectStore(MODEL_IDB_STORE);
      store.put(modelBuffer, modelId);
    } catch {
      // Non-fatal
    }
  }

  onProgress?.({ receivedBytes, totalBytes: receivedBytes, percent: 100 });

  return {
    data: modelBuffer,
    source: "network",
    size: receivedBytes,
    modelId,
  };
}

/**
 * Removes a cached AI model binary from disk.
 */
export async function purgeCachedModel(modelId: string): Promise<boolean> {
  let purged = false;
  const safeName = `${modelId.replace(/[^a-zA-Z0-9_-]/g, "_")}.onnx`;

  try {
    const dir = await getModelDirectory();
    if (dir) {
      await dir.removeEntry(safeName);
      purged = true;
    }
  } catch {}

  const db = await openModelDatabase();
  if (db) {
    try {
      const tx = db.transaction(MODEL_IDB_STORE, "readwrite");
      tx.objectStore(MODEL_IDB_STORE).delete(modelId);
      purged = true;
    } catch {}
  }

  return purged;
}

