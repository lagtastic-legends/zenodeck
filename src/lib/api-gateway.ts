/**
 * ZenoDeck — Unified Static Export API Gateway & Offline Router
 *
 * Resolves the Next.js `output: 'export'` limitation (`MOBILE_EXPORT=1`) where
 * `src/app/api/*` routes are stripped and relative `fetch('/api/...')` calls 404
 * on `https://localhost` inside the Capacitor Android APK.
 *
 * Routing Rules:
 * 1. Native Offline Deck (/api/zenotap/v1/deck*):
 *    - Handled directly in-process via `ZenoDeckKeyboardBridge` (@/lib/zenodeck-bridge).
 * 2. Media & YouTube Resolvers (/api/youtube/info, /api/media/info):
 *    - Handled directly in-process via InnerTube (@/lib/youtube/innertube) and Universal Resolver.
 * 3. Remote Sync & AI Gateways (/api/zenotap/v1/device/*, /api/zenotap/v1/sync, /api/ai*):
 *    - Dispatched to remote API base URL (`NEXT_PUBLIC_API_BASE_URL` or `NEXT_PUBLIC_APP_URL`)
 *      using `CapacitorHttp` to bypass WebView CORS and host isolation.
 * 4. Web Browser Runtime:
 *    - Preserves standard relative or absolute origin `fetch()` calls.
 */

import { Capacitor, CapacitorHttp } from "@capacitor/core";
import {
  getKeyboardDeckGifs,
  saveGifToKeyboardDeck,
  deleteGifFromKeyboardDeck,
} from "@/lib/zenodeck-bridge";

export interface ZenoApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Returns true if running inside native Capacitor (Android/iOS) or static export mode.
 */
export function isOfflineExportEnvironment(): boolean {
  if (
    typeof Capacitor !== "undefined" &&
    typeof Capacitor.isNativePlatform === "function" &&
    Capacitor.isNativePlatform()
  ) {
    return true;
  }
  return process.env.NEXT_PUBLIC_MOBILE_EXPORT === "1";
}

/**
 * Gets the remote API base URL for cloud endpoints when running in static export / APK.
 */
export function getRemoteApiBaseUrl(): string {
  const remote =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://omni-tool-two.vercel.app";
  return remote.replace(/\/+$/, "");
}

/**
 * Resolves an API path or URL to its proper endpoint depending on execution context.
 */
export function resolveApiUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return "";

  // Absolute external URLs remain intact
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  const cleanPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  // 1. Native mobile APK (Capacitor Android / iOS)
  if (
    typeof Capacitor !== "undefined" &&
    typeof Capacitor.isNativePlatform === "function" &&
    Capacitor.isNativePlatform()
  ) {
    return `${getRemoteApiBaseUrl()}${cleanPath}`;
  }

  if (typeof window !== "undefined") {
    // 2. Web browser environment
    const origin = window.location.origin;
    if (origin && !origin.startsWith("file:")) {
      return `${origin}${cleanPath}`;
    }
  }

  // 3. SSR / Node / Static build fallback
  return `${getRemoteApiBaseUrl()}${cleanPath}`;
}

/**
 * Creates a compliant Web API Response object with custom status and headers.
 */
function createJsonResponse(data: any, status = 200, extraHeaders: Record<string, string> = {}): Response {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  return new Response(body, {
    status,
    statusText: status >= 200 && status < 300 ? "OK" : `HTTP ${status}`,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Zeno-Gateway-Routed": "true",
      ...extraHeaders,
    },
  });
}

/**
 * Intercepts `/api/zenotap/v1/*` requests locally inside the native APK.
 */
async function handleNativeZenoTapRoute(
  endpointPath: string,
  searchParams: URLSearchParams,
  options?: ZenoApiFetchOptions
): Promise<Response | null> {
  const method = (options?.method || "GET").toUpperCase();

  // A. Local Deck List: GET /api/zenotap/v1/deck
  if (endpointPath === "/api/zenotap/v1/deck" && method === "GET") {
    try {
      const gifs = await getKeyboardDeckGifs();
      const deckItems = (gifs || []).map((g) => ({
        id: g.filename,
        userId: "local_device",
        filename: g.filename,
        originalName: g.filename,
        url: g.path,
        size: g.size,
        mimeType: "image/gif",
        createdAt: g.modified,
        updatedAt: g.modified,
      }));

      return createJsonResponse({
        success: true,
        deck: deckItems,
        count: deckItems.length,
        source: "native_bridge",
      });
    } catch (err: any) {
      return createJsonResponse({
        success: true,
        deck: [],
        count: 0,
        source: "native_bridge",
        warning: err?.message,
      });
    }
  }

  // B. Local Deck Delete: DELETE /api/zenotap/v1/deck?id=...
  if (endpointPath === "/api/zenotap/v1/deck" && method === "DELETE") {
    const id = searchParams.get("id") || searchParams.get("filename");
    if (!id) {
      return createJsonResponse({ error: "Missing id or filename parameter" }, 400);
    }

    try {
      const deleted = await deleteGifFromKeyboardDeck(id);
      return createJsonResponse({
        success: deleted !== false,
        deletedId: id,
        source: "native_bridge",
      });
    } catch (err: any) {
      return createJsonResponse({ success: false, error: err?.message || "Delete failed" }, 500);
    }
  }

  // C. Local Deck Upload Ticket: POST /api/zenotap/v1/deck/upload-ticket
  if (endpointPath === "/api/zenotap/v1/deck/upload-ticket" && method === "POST") {
    return createJsonResponse({
      success: true,
      ticket: `offline_ticket_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      expiresInSeconds: 300,
      maxSizeBytes: 50 * 1024 * 1024,
      source: "native_bridge",
    });
  }

  // D. Local Deck Upload: POST /api/zenotap/v1/deck/upload
  if (endpointPath === "/api/zenotap/v1/deck/upload" && method === "POST") {
    try {
      let fileData: Blob | string | null = null;
      let originalName = `zenotap_${Date.now()}.gif`;

      if (options?.body instanceof FormData) {
        const file = options.body.get("file");
        if (file instanceof Blob) {
          fileData = file;
          originalName = (file as any).name || originalName;
        }
        const nameParam = options.body.get("originalName");
        if (typeof nameParam === "string" && nameParam) {
          originalName = nameParam;
        }
      } else if (options?.body instanceof Blob) {
        fileData = options.body;
      } else if (typeof options?.body === "string") {
        fileData = options.body;
      }

      if (!fileData) {
        return createJsonResponse({ error: "No media file payload provided" }, 400);
      }

      const saveResult = await saveGifToKeyboardDeck(fileData, originalName);
      return createJsonResponse({
        success: true,
        item: {
          id: saveResult.filename,
          userId: "local_device",
          filename: saveResult.filename,
          originalName,
          url: saveResult.path,
          size: saveResult.size,
          mimeType: "image/gif",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        source: "native_bridge",
      });
    } catch (err: any) {
      return createJsonResponse({ success: false, error: err?.message || "Upload failed" }, 500);
    }
  }

  return null;
}

/**
 * Dispatches an HTTP request through CapacitorHttp to bypass CORS and host restrictions.
 */
async function fetchViaCapacitorHttp(url: string, options?: ZenoApiFetchOptions): Promise<Response> {
  const method = (options?.method || "GET").toUpperCase();
  const headers: Record<string, string> = {};

  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((val, key) => {
        headers[key] = val;
      });
    } else if (Array.isArray(options.headers)) {
      for (const [k, v] of options.headers) {
        headers[k] = v;
      }
    } else {
      Object.assign(headers, options.headers);
    }
  }

  let dataPayload: any = undefined;
  if (options?.body) {
    if (typeof options.body === "string") {
      try {
        dataPayload = JSON.parse(options.body);
      } catch {
        dataPayload = options.body;
      }
    } else if (options.body instanceof FormData) {
      const obj: Record<string, any> = {};
      options.body.forEach((val, key) => {
        obj[key] = val;
      });
      dataPayload = obj;
    }
  }

  const isBinary = Boolean(
    headers["Range"] ||
    headers["range"] ||
    url.includes("/api/youtube/stream") ||
    url.includes("/api/youtube/download") ||
    url.includes("/api/media/download")
  );

  const responseType = isBinary ? "arraybuffer" : "text";

  try {
    const res = await CapacitorHttp.request({
      url,
      method,
      headers,
      data: dataPayload,
      connectTimeout: options?.timeoutMs || 8000,
      readTimeout: options?.timeoutMs || (isBinary ? 20000 : 15000),
      responseType: responseType as any,
    });

    const isOk = res.status >= 200 && res.status < 300;
    let responseBody: BodyInit;
    const contentType = isBinary ? "application/octet-stream" : "application/json; charset=utf-8";

    if (isBinary) {
      if (typeof res.data === "string") {
        const binStr = atob(res.data);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
        responseBody = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      } else if (res.data instanceof ArrayBuffer) {
        responseBody = res.data;
      } else if (res.data instanceof Uint8Array) {
        responseBody = res.data.buffer.slice(res.data.byteOffset, res.data.byteOffset + res.data.byteLength) as ArrayBuffer;
      } else {
        responseBody = new ArrayBuffer(0);
      }
    } else {
      responseBody = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    }

    return new Response(responseBody, {
      status: res.status,
      statusText: isOk ? "OK" : `HTTP ${res.status}`,
      headers: {
        "Content-Type": contentType,
        "X-Capacitor-Http-Routed": "true",
      },
    });
  } catch (err: any) {
    return createJsonResponse(
      {
        error: `Native HTTP request failed: ${err?.message || "Connection timeout"}`,
        endpoint: url,
      },
      502
    );
  }
}

/**
 * Universal strictly typed API Gateway router for ZenoDeck & ZenoTap.
 * Automatically steers requests between local native bridges and remote production hosts.
 */
export async function zenoApiFetch<T = any>(
  endpointOrUrl: string,
  options?: ZenoApiFetchOptions
): Promise<Response> {
  if (!endpointOrUrl) {
    throw new Error("zenoApiFetch requires a valid endpoint or URL");
  }

  let targetUrl = endpointOrUrl;

  // Append query parameters if provided
  if (options?.params) {
    const [path, existingQuery] = targetUrl.split("?");
    const params = new URLSearchParams(existingQuery || "");
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    const queryString = params.toString();
    targetUrl = queryString ? `${path}?${queryString}` : path;
  }

  const isNative =
    typeof Capacitor !== "undefined" &&
    typeof Capacitor.isNativePlatform === "function" &&
    Capacitor.isNativePlatform();
  const isStaticExport = process.env.NEXT_PUBLIC_MOBILE_EXPORT === "1";

  // Parse path and search params
  let pathname = targetUrl;
  let search = "";
  if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
    try {
      const parsed = new URL(targetUrl);
      pathname = parsed.pathname;
      search = parsed.search;
    } catch {}
  } else {
    const [p, s] = targetUrl.split("?");
    pathname = p;
    search = s ? `?${s}` : "";
  }

  const searchParams = new URLSearchParams(search);

  // 1. Native Offline Interception for /api/zenotap/v1/*
  if (isNative && pathname.startsWith("/api/zenotap/v1/")) {
    const localResponse = await handleNativeZenoTapRoute(pathname, searchParams, options);
    if (localResponse) {
      return localResponse;
    }
  }

  // 2. Native Offline Interception for /api/youtube/info
  if (isNative && pathname === "/api/youtube/info") {
    const videoUrl = searchParams.get("url") || searchParams.get("videoId");
    if (videoUrl) {
      try {
        const { resolveYouTubeVideo } = await import("@/lib/youtube/innertube");
        const videoInfo = await resolveYouTubeVideo(videoUrl);
        return createJsonResponse(videoInfo, 200, { "X-Resolved-Direct": "true" });
      } catch (err: any) {
        console.warn("Direct InnerTube client resolution deferred, routing to remote:", err?.message);
      }
    }
  }

  // 3. Native Offline Interception for /api/media/info
  if (isNative && pathname === "/api/media/info") {
    const mediaUrl = searchParams.get("url");
    if (mediaUrl) {
      try {
        const { resolveMediaUrl } = await import("@/lib/media/universal-resolver");
        const result = await resolveMediaUrl(mediaUrl);
        return createJsonResponse(result.mediaInfo, 200, { "X-Resolved-Direct": "true" });
      } catch (err: any) {
        console.warn("Direct Media client resolution deferred, routing to remote:", err?.message);
      }
    }
  }

  // 4. In native APK or mobile export, dispatch /api/* to remote backend
  if ((isNative || isStaticExport) && pathname.startsWith("/api/")) {
    const remoteUrl = `${getRemoteApiBaseUrl()}${pathname}${search}`;

    if (isNative) {
      // Use CapacitorHttp to avoid WebView origin/CORS rejection
      return await fetchViaCapacitorHttp(remoteUrl, options);
    } else {
      // Static export on web: standard fetch to remote base
      return await fetch(remoteUrl, options);
    }
  }

  // 5. Standard Web Browser Fetch
  const finalUrl = resolveApiUrl(targetUrl);
  return await fetch(finalUrl, options);
}
