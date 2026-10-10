import { NextResponse } from "next/server";
import { buildCandidateUrls } from "@/lib/youtube/innertube";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type, Authorization, Accept",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Content-Type, Accept-Ranges",
  "Cross-Origin-Resource-Policy": "cross-origin",
};

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const ALLOWED_STREAM_DOMAINS = [
  "googlevideo.com",
  "youtube.com",
  "youtu.be",
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "byteoversea.com",
  "ibytedtos.com",
  "tikwm.com",
  "tiktok.com",
  "cdninstagram.com",
  "fbcdn.net",
  "fbsbx.com",
  "facebook.com",
  "instagram.com",
  "threads.net",
  "threadscdn.com",
  "twimg.com",
  "twitter.com",
  "x.com",
  "vxtwitter.com",
  "fxtwitter.com",
  "v.redd.it",
  "reddit.com",
  "redd.it",
  "redditmedia.com",
  "preview.redd.it",
  "packaged-media.redd.it",
  "vimeocdn.com",
  "vimeo.com",
  "akamaized.net",
  "akamaihd.net",
  "edgekey.net",
  "cloudfront.net",
  "ttvnw.net",
  "twitch.tv",
  "jtvnw.net",
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

function isAllowedHost(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_STREAM_DOMAINS.some(
      (domain) => host === domain || host.endsWith("." + domain)
    );
  } catch {
    return false;
  }
}


async function handleStream(req: Request, isHead = false, bodyUrl?: string) {
  try {
    let targetUrl = bodyUrl;
    if (!targetUrl) {
      const { searchParams } = new URL(req.url);
      targetUrl = searchParams.get("url") || undefined;
    }

    if (!targetUrl) {
      if (isHead) {
        return new NextResponse(null, { status: 200, headers: corsHeaders });
      }
      return NextResponse.json(
        { status: "YouTube Stream Proxy Online" },
        { status: 200, headers: corsHeaders }
      );
    }

    if (!isAllowedHost(targetUrl)) {
      return NextResponse.json(
        { error: "Forbidden: URL host is not an authorized video stream CDN" },
        { status: 403, headers: corsHeaders }
      );
    }

    const candidateUrls = buildCandidateUrls(targetUrl);
    const rangeHeader = req.headers.get("range");

    const isIosStream = targetUrl.includes("c=IOS") || targetUrl.includes("sparams=");
    const fetchHeaders: Record<string, string> = {
      "User-Agent": isIosStream
        ? "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_1 like Mac OS X; en_US)"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Encoding": "identity",
    };

    // Platform-specific Referer injection to prevent 403 Forbidden on CDNs
    if (targetUrl.includes("tiktok") || targetUrl.includes("byteoversea") || targetUrl.includes("ibytedtos")) {
      fetchHeaders["Referer"] = "https://www.tiktok.com/";
    } else if (targetUrl.includes("twimg.com") || targetUrl.includes("twitter.com") || targetUrl.includes("x.com")) {
      fetchHeaders["Referer"] = "https://twitter.com/";
    } else if (targetUrl.includes("instagram.com") || targetUrl.includes("cdninstagram.com")) {
      fetchHeaders["Referer"] = "https://www.instagram.com/";
    } else if (targetUrl.includes("redd.it") || targetUrl.includes("reddit.com")) {
      fetchHeaders["Referer"] = "https://www.reddit.com/";
    } else if (targetUrl.includes("facebook.com") || targetUrl.includes("fbcdn.net") || targetUrl.includes("fbsbx.com")) {
      fetchHeaders["Referer"] = "https://www.facebook.com/";
    } else if (targetUrl.includes("vimeo.com") || targetUrl.includes("vimeocdn.com")) {
      fetchHeaders["Referer"] = "https://vimeo.com/";
    } else if (targetUrl.includes("pinterest.com") || targetUrl.includes("pinimg.com")) {
      fetchHeaders["Referer"] = "https://www.pinterest.com/";
    }

    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    } else if (isHead) {
      // If client requests HEAD to check total size, use Range: bytes=0-0 so CDN responds instantly
      fetchHeaders["Range"] = "bytes=0-0";
    }

    let upstreamRes: Response | null = null;
    let lastError: Error | null = null;

    for (const urlToTry of candidateUrls) {
      try {
        const controller = new AbortController();
        const connectTimeoutMs = isHead ? 6000 : 15000;
        const connectTimer = setTimeout(() => controller.abort(), connectTimeoutMs);

        if (req.signal) {
          req.signal.addEventListener(
            "abort",
            () => {
              clearTimeout(connectTimer);
              controller.abort();
            },
            { once: true }
          );
        }

        const res = await fetch(urlToTry, {
          method: "GET",
          headers: fetchHeaders,
          redirect: "follow",
          signal: controller.signal,
        });

        clearTimeout(connectTimer);

        if (res.ok || res.status === 206 || res.status === 304) {
          upstreamRes = res;
          break;
        } else if (res.status >= 500) {
          lastError = new Error(`CDN returned status ${res.status}`);
          continue;
        } else {
          upstreamRes = res;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!upstreamRes) {
      throw lastError || new Error("Failed to stream from any available CDN node");
    }

    const responseHeaders = new Headers(corsHeaders);
    const headersToForward = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "etag",
    ];

    for (const h of headersToForward) {
      const v = upstreamRes.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }

    if (!responseHeaders.has("accept-ranges")) {
      responseHeaders.set("accept-ranges", "bytes");
    }

    // If this was a HEAD probe using Range: bytes=0-0, extract total file size from Content-Range
    if (isHead) {
      const cr = upstreamRes.headers.get("content-range");
      if (cr) {
        const match = cr.match(/\/(\d+)$/);
        if (match) {
          responseHeaders.set("content-length", match[1]);
        }
      }
      return new NextResponse(null, {
        status: 200,
        headers: responseHeaders,
      });
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("YouTube Stream Proxy error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to stream video chunk." },
      { status: 502, headers: corsHeaders }
    );
  }
}

export async function GET(req: Request) {
  return handleStream(req, false);
}

export async function HEAD(req: Request) {
  return handleStream(req, true);
}

export async function POST(req: Request) {
  let bodyUrl: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    bodyUrl = body?.url;
  } catch {}
  return handleStream(req, false, bodyUrl);
}
