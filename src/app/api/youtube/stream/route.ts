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

import { isAllowedStreamHost } from "@/lib/media/stream-security";

function isAllowedHost(urlStr: string): boolean {
  return isAllowedStreamHost(urlStr);
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

    const isAndroidVrStream = targetUrl.includes("c=ANDROID_VR") || targetUrl.includes("client=28");
    const isIosStream = targetUrl.includes("c=IOS") || targetUrl.includes("sparams=");
    const reqUa = req.headers.get("user-agent");
    const defaultUa = isAndroidVrStream
      ? "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip"
      : isIosStream
      ? "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_1 like Mac OS X;)"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

    const fetchHeaders: Record<string, string> = {
      "User-Agent": reqUa && !reqUa.includes("node-fetch") && !reqUa.includes("Next.js") ? reqUa : defaultUa,
      Accept: "*/*",
      "Accept-Encoding": "identity",
    };

    // Platform-specific Referer injection to prevent 403 Forbidden on CDNs
    if (targetUrl.includes("tiktok") || targetUrl.includes("byteoversea") || targetUrl.includes("ibytedtos")) {
      fetchHeaders["Referer"] = "https://www.tiktok.com/";
    } else if (
      targetUrl.includes("youtube.com") ||
      targetUrl.includes("youtube-nocookie.com") ||
      targetUrl.includes("youtu.be") ||
      targetUrl.includes("ytimg.com") ||
      targetUrl.includes("ggpht.com")
    ) {
      fetchHeaders["Referer"] = "https://www.youtube.com/";
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
    } else if (targetUrl.includes("sndcdn.com") || targetUrl.includes("soundcloud.com")) {
      fetchHeaders["Referer"] = "https://soundcloud.com/";
    }

    const activeRange = rangeHeader || (isHead ? "bytes=0-0" : null);
    if (activeRange) {
      fetchHeaders["Range"] = activeRange;
    }

    let upstreamRes: Response | null = null;
    let lastError: Error | null = null;

    for (const urlToTry of candidateUrls) {
      try {
        let finalUrl = urlToTry;

        const controller = new AbortController();
        const connectTimeoutMs = isHead ? 3000 : 5000;
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

        let res: Response | null = null;
        for (let hop = 0; hop < 4; hop++) {
          if (!isAllowedHost(finalUrl)) {
            res = null;
            lastError = new Error("Forbidden: Redirect target host is not an authorized video stream CDN");
            break;
          }
          const hopRes = await fetch(finalUrl, {
            method: "GET",
            headers: fetchHeaders,
            redirect: "manual",
            signal: controller.signal,
          });
          if (hopRes.status >= 300 && hopRes.status < 400) {
            const location = hopRes.headers.get("location");
            if (!location) {
              res = hopRes;
              break;
            }
            const nextUrl = new URL(location, finalUrl).toString();
            if (!isAllowedHost(nextUrl)) {
              res = null;
              lastError = new Error("Forbidden: Redirect target host is not an authorized video stream CDN");
              break;
            }
            finalUrl = nextUrl;
            continue;
          }
          res = hopRes;
          break;
        }

        clearTimeout(connectTimer);

        if (!res) {
          continue;
        }

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
