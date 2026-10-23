/**
 * Fast, non-blocking pre-download stream sizing helper.
 * Probes Content-Length via HTTP HEAD or Range: bytes=0-0 with strict budget.
 */

import { Capacitor, CapacitorHttp } from "@capacitor/core";

export interface ProbeSizeOptions {
  timeoutMs?: number;
  referer?: string;
  userAgent?: string;
}

// In-memory cache for probed stream sizes (max 300 entries)
const sizeCache = new Map<string, number>();

export async function probeRemoteFileSize(
  url: string,
  options?: ProbeSizeOptions
): Promise<number | undefined> {
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return undefined;
  }

  // 1. Fast cache hit (0ms)
  if (sizeCache.has(url)) {
    return sizeCache.get(url);
  }

  const totalTimeoutMs = options?.timeoutMs ?? 1500;
  const startTime = Date.now();

  const userAgent =
    options?.userAgent ??
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

  const headers: Record<string, string> = {
    "User-Agent": userAgent,
    Accept: "*/*",
    "Accept-Encoding": "identity",
  };

  if (options?.referer) {
    headers["Referer"] = options.referer;
  } else {
    try {
      const u = new URL(url);
      headers["Referer"] = `${u.protocol}//${u.hostname}/`;
    } catch {}
  }

  const recordAndReturn = (size: number): number => {
    if (sizeCache.size >= 300) {
      const firstKey = sizeCache.keys().next().value;
      if (firstKey) sizeCache.delete(firstKey);
    }
    sizeCache.set(url, size);
    return size;
  };

  // 2. Native Android / iOS via CapacitorHttp (Bypasses WebView CORS)
  if (typeof window !== "undefined" && typeof Capacitor !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      const headTimeout = Math.min(800, totalTimeoutMs);
      const headRes = await CapacitorHttp.request({
        url,
        method: "HEAD",
        headers,
        connectTimeout: headTimeout,
        readTimeout: headTimeout,
        responseType: "text",
      });

      if (headRes.status >= 200 && headRes.status < 300) {
        const cl = headRes.headers?.["content-length"] || headRes.headers?.["Content-Length"];
        if (cl) {
          const parsed = parseInt(String(cl).trim(), 10);
          if (parsed > 0) return recordAndReturn(parsed);
        }
      }

      const elapsed = Date.now() - startTime;
      const remainingMs = totalTimeoutMs - elapsed;
      if (remainingMs > 250) {
        const rangeRes = await CapacitorHttp.request({
          url,
          method: "GET",
          headers: { ...headers, Range: "bytes=0-0" },
          connectTimeout: remainingMs,
          readTimeout: remainingMs,
          responseType: "text",
        });

        if (rangeRes.status === 200 || rangeRes.status === 206) {
          const cr = rangeRes.headers?.["content-range"] || rangeRes.headers?.["Content-Range"];
          if (cr) {
            const match = String(cr).match(/\/(\d+)$/);
            if (match && match[1]) {
              const parsed = parseInt(match[1], 10);
              if (parsed > 0) return recordAndReturn(parsed);
            }
          }
          const cl = rangeRes.headers?.["content-length"] || rangeRes.headers?.["Content-Length"];
          if (rangeRes.status === 200 && cl) {
            const parsed = parseInt(String(cl).trim(), 10);
            if (parsed > 0) return recordAndReturn(parsed);
          }
        }
      }
    } catch {
      // Graceful fallback on network timeout
    }
    return undefined;
  }

  // 3. Web & Node.js Runtime
  try {
    const headTimeout = Math.min(800, totalTimeoutMs);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), headTimeout);
    let res: Response | null = null;

    try {
      res = await fetch(url, {
        method: "HEAD",
        headers,
        signal: controller.signal,
      });
    } catch {
      // Ignored: HEAD failed or aborted
    } finally {
      clearTimeout(timer);
    }

    if (res && res.ok) {
      const cl = res.headers.get("content-length");
      if (cl) {
        const parsed = parseInt(cl.trim(), 10);
        if (parsed > 0) {
          return recordAndReturn(parsed);
        }
      }
    }

    const elapsed = Date.now() - startTime;
    const remainingMs = totalTimeoutMs - elapsed;
    if (remainingMs > 250) {
      const rangeController = new AbortController();
      const rangeTimer = setTimeout(() => rangeController.abort(), remainingMs);

      try {
        const rangeRes = await fetch(url, {
          method: "GET",
          headers: { ...headers, Range: "bytes=0-0" },
          signal: rangeController.signal,
        });

        // Abort reading stream body immediately to conserve bandwidth
        try {
          if (rangeRes.body) await rangeRes.body.cancel();
        } catch {}

        if (rangeRes.status === 200 || rangeRes.status === 206) {
          const cr = rangeRes.headers.get("content-range");
          if (cr) {
            const match = cr.match(/\/(\d+)$/);
            if (match && match[1]) {
              const parsed = parseInt(match[1], 10);
              if (parsed > 0) return recordAndReturn(parsed);
            }
          }
          const cl = rangeRes.headers.get("content-length");
          if (rangeRes.status === 200 && cl) {
            const parsed = parseInt(cl.trim(), 10);
            if (parsed > 0) return recordAndReturn(parsed);
          }
        }
      } catch {
        // Ignored
      } finally {
        clearTimeout(rangeTimer);
      }
    }
  } catch {
    // Top-level error safety
  }

  return undefined;
}
