/**
 * Shared Media Stream Security & YouTube URL Canonicalization
 * ============================================================
 * Single source of truth for:
 * 1. Canonicalizing short, mobile, Shorts, Live, and embed YouTube URLs
 *    into `https://www.youtube.com/watch?v=<id>` before resolver/proxy use.
 * 2. Enforcing SSRF-safe CDN host allowlisting for `/api/youtube/stream`.
 */

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const PLAYLIST_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const YOUTUBE_ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

/**
 * Extracts a canonical 11-character YouTube video ID from a verified YouTube URL or bare ID.
 */
export function extractCanonicalYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.toLowerCase().replace(/\.+$/, "");
    if (!YOUTUBE_ALLOWED_HOSTS.has(host)) {
      return null;
    }

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
      return YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : null;
    }

    const vParam = parsed.searchParams.get("v");
    if (vParam && YOUTUBE_VIDEO_ID_PATTERN.test(vParam)) {
      return vParam;
    }

    const pathMatch = parsed.pathname.match(/^\/(?:shorts|live|embed|v)\/([a-zA-Z0-9_-]{11})(?:[/?#]|$)/);
    return pathMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Canonicalizes `youtu.be/<id>`, `m.youtube.com/watch?v=<id>`,
 * `youtube.com/shorts/<id>`, `music.youtube.com/watch?v=<id>`, and
 * `youtube.com/live/<id>` into `https://www.youtube.com/watch?v=<id>`
 * (preserving a valid `list=` playlist parameter if present).
 * Non-YouTube URLs are returned trimmed and unmodified.
 */
export function canonicalizeYouTubeUrl(inputUrl: string): string {
  const trimmed = inputUrl.trim();
  if (!trimmed) return trimmed;

  // Preserve youtube-nocookie.com/embed/... URLs used verbatim by iframe / fallback checks
  if (/^https?:\/\/(?:www\.)?youtube-nocookie\.com\/embed\//i.test(trimmed)) {
    return trimmed;
  }

  const videoId = extractCanonicalYouTubeId(trimmed);
  if (!videoId) {
    return trimmed;
  }

  // Only preserve list= when present on an explicit URL (not bare IDs)
  let playlistId: string | null = null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    const listParam = parsed.searchParams.get("list");
    if (listParam && PLAYLIST_ID_PATTERN.test(listParam)) {
      playlistId = listParam;
    }
  } catch {
    const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (listMatch?.[1] && PLAYLIST_ID_PATTERN.test(listMatch[1])) {
      playlistId = listMatch[1];
    }
  }

  return playlistId
    ? `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`
    : `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Authorized media CDN and upstream extractor domains allowed through `/api/youtube/stream`.
 */
export const ALLOWED_STREAM_DOMAINS: readonly string[] = [
  // YouTube & Google media CDNs
  "googlevideo.com",
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "ytimg.com",
  "ggpht.com",
  // TikTok / ByteDance
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokv.com",
  "byteoversea.com",
  "ibytedtos.com",
  "tikwm.com",
  "tiktok.com",
  // Meta (Instagram / Facebook / Threads)
  "cdninstagram.com",
  "fbcdn.net",
  "fbsbx.com",
  "facebook.com",
  "instagram.com",
  "threads.net",
  "threadscdn.com",
  // X / Twitter
  "twimg.com",
  "twitter.com",
  "x.com",
  "vxtwitter.com",
  "fxtwitter.com",
  // Reddit
  "v.redd.it",
  "reddit.com",
  "redd.it",
  "redditmedia.com",
  "preview.redd.it",
  "packaged-media.redd.it",
  // Vimeo & shared CDN backbones
  "vimeocdn.com",
  "vimeo.com",
  "akamaized.net",
  "akamaihd.net",
  "edgekey.net",
  "cloudfront.net",
  // Twitch
  "ttvnw.net",
  "twitch.tv",
  "jtvnw.net",
  // Pinterest / Bluesky / SoundCloud / resolver mirrors
  "pinimg.com",
  "pinterest.com",
  "bsky.app",
  "bsky.social",
  "sndcdn.com",
  "soundcloud.com",
  "rapidcdn.app",
  "cobalt.tools",
  "snapinst.app",
];

/**
 * Returns true if the hostname represents a loopback, private, link-local,
 * metadata, or internal address that must never be reached by the stream proxy (SSRF guard).
 */
export function isPrivateOrLoopbackHost(rawHostname: string): boolean {
  const host = rawHostname
    .trim()
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.+$/, "");

  if (!host) return true;

  // Local / internal DNS names
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localdomain")
  ) {
    return true;
  }

  // IPv6 loopback / unspecified / unique-local / link-local / IPv4-mapped loopback or private
  if (host.includes(":")) {
    if (
      host === "::" ||
      host === "::1" ||
      host === "0:0:0:0:0:0:0:1" ||
      host.startsWith("fe80:") ||
      host.startsWith("fe80::") ||
      host.startsWith("fc") ||
      host.startsWith("fd")
    ) {
      return true;
    }
    const v4Mapped = host.match(/^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/i);
    if (v4Mapped) {
      return isPrivateOrLoopbackHost(v4Mapped[1]);
    }
    // Block any raw IPv6 literal from the domain allowlist proxy
    return true;
  }

  // Reject decimal/hex integer IPv4 obfuscation (e.g. 2130706433, 0x7f000001)
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    return true;
  }

  // Standard dotted IPv4 check
  const ipv4Parts = host.split(".");
  if (ipv4Parts.length === 4 && ipv4Parts.every((p) => /^\d{1,3}$/.test(p) || /^0x[0-9a-f]+$/i.test(p))) {
    const octets = ipv4Parts.map((p) => (p.startsWith("0x") ? parseInt(p, 16) : parseInt(p, 10)));
    if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) return true;

    const [a, b] = octets;
    if (
      a === 0 || // 0.0.0.0/8 ("this network")
      a === 10 || // 10.0.0.0/8 RFC1918
      a === 127 || // 127.0.0.0/8 loopback
      (a === 169 && b === 254) || // 169.254.0.0/16 link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 RFC1918
      (a === 192 && b === 168) || // 192.168.0.0/16 RFC1918
      (a === 100 && b >= 64 && b <= 127) // 100.64.0.0/10 CGNAT
    ) {
      return true;
    }
    // Reject all raw IPv4 literals since allowlist entries are CDN hostnames
    return true;
  }

  return false;
}

/**
 * Validates that a target URL is HTTP(S), free of SSRF/private/loopback destinations,
 * and matches an authorized media CDN domain or subdomain.
 */
export function isAllowedStreamHost(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    // Reject embedded userinfo credentials (e.g. https://youtube.com@127.0.0.1/)
    if (parsed.username || parsed.password) {
      return false;
    }

    const host = parsed.hostname.toLowerCase().replace(/\.+$/, "");
    if (!host || isPrivateOrLoopbackHost(host)) {
      return false;
    }

    return ALLOWED_STREAM_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}
