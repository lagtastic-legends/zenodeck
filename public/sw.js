/**
 * ZENODECK — Lightweight PWA Service Worker & Cross-Origin Isolation Injector
 * Ensures offline app shell availability, PWA installability, and unlocks
 * SharedArrayBuffer on static browser / mobile hosts by injecting COOP/COEP headers.
 */

const CACHE_NAME = "zenodeck-v3.13.0";
const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon.png",
  "/logo.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

/**
 * Injects Cross-Origin Isolation headers into outgoing responses to ensure
 * window.crossOriginIsolated is true and SharedArrayBuffer is available.
 */
function withCrossOriginIsolationHeaders(response) {
  if (!response || response.status === 0 || response.type === "opaque") {
    return response;
  }

  // Clone headers and append COOP/COEP isolation tokens
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
  newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");
  newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip dynamic API requests, range streaming queries, and non-http protocols
  if (
    url.pathname.startsWith("/api/") ||
    event.request.headers.has("range") ||
    !url.protocol.startsWith("http")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return isolated cached asset and refresh in background if online
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return withCrossOriginIsolationHeaders(cachedResponse);
      }

      return fetch(event.request)
        .then((networkResponse) => {
          return withCrossOriginIsolationHeaders(networkResponse);
        })
        .catch(() => {
          // Fallback to cached index for navigation requests when offline
          if (event.request.mode === "navigate") {
            return caches.match("/").then((indexFallback) => {
              return indexFallback ? withCrossOriginIsolationHeaders(indexFallback) : indexFallback;
            });
          }
        });
    })
  );
});
