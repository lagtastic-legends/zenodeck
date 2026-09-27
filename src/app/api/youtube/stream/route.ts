import { NextResponse } from "next/server";
import { buildCandidateUrls } from "@/lib/youtube/innertube";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type, Authorization, Accept",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Content-Type, Accept-Ranges",
};

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function isAllowedHost(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return (
      parsed.hostname.endsWith(".googlevideo.com") ||
      parsed.hostname.endsWith(".youtube.com") ||
      parsed.hostname === "googlevideo.com" ||
      parsed.hostname === "youtube.com"
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

    const fetchHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Encoding": "identity",
    };

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
        const res = await fetch(urlToTry, {
          method: "GET",
          headers: fetchHeaders,
          redirect: "follow",
          signal: AbortSignal.timeout(3500),
        });

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
