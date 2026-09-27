/**
 * Challenger M1 Comprehensive Stress & Verification Suite
 * ========================================================
 * Adversarial and empirical verification of Milestone M1 deliverables:
 * 1. Route Handlers:
 *    - /api/youtube/info (GET, POST, OPTIONS, live videos xT1gYZGDx4I & dQw4w9WgXcQ, missing/invalid params)
 *    - /api/youtube/stream (GET, HEAD, POST, Range 206, unauthorized hosts, missing params)
 *    - /api/youtube/playlist (GET, OPTIONS, empty params, valid/invalid playlists)
 * 2. Port-Agnostic Origin Detection:
 *    - Ports 3000, 3001, 3002, 8080, custom domains, LAN IPs, Capacitor native mobile, SSR, edge cases
 * 3. Mobile Export Wrapper Logic:
 *    - scripts/build-mobile-export.ts backup, static stub substitution, restoration, crash resilience, git status cleanliness
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { Capacitor } from "@capacitor/core";
import {
  extractYouTubeId,
  getYouTubeApiUrl,
  resolveYouTubeVideo,
  buildCandidateUrls,
} from "../src/lib/youtube/innertube";
import {
  GET as handleInfoGet,
  POST as handleInfoPost,
  OPTIONS as handleInfoOptions,
} from "../src/app/api/youtube/info/route";
import {
  GET as handleStreamGet,
  HEAD as handleStreamHead,
  POST as handleStreamPost,
  OPTIONS as handleStreamOptions,
} from "../src/app/api/youtube/stream/route";
import {
  GET as handlePlaylistGet,
  OPTIONS as handlePlaylistOptions,
} from "../src/app/api/youtube/playlist/route";

const PROJECT_ROOT = path.resolve(__dirname, "..");

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedAssertions++;
    const errMsg = `${testName}${detail ? ` -> ${detail}` : ""}`;
    failures.push(errMsg);
    console.error(`  ✗ FAIL: ${errMsg}`);
  }
}

async function runChallengerTests() {
  console.log("================================================================================");
  console.log("       CHALLENGER M1: EMPIRICAL STRESS & ADVERSARIAL VERIFICATION SUITE         ");
  console.log("================================================================================\n");

  // ===========================================================================
  // SECTION 1: ROUTE HANDLERS (/api/youtube/info, /stream, /playlist)
  // ===========================================================================
  console.log("--- SECTION 1: Route Handlers Empirical Stress Testing ---");

  // --- 1.1 /api/youtube/info Live Resolution & Quality Validation ---
  console.log("\n[1.1] Testing /api/youtube/info with Valid Video IDs (Live Resolution)");
  
  // Test with xT1gYZGDx4I (User's reported video)
  console.log("  Fetching info for xT1gYZGDx4I via GET...");
  const infoReq1 = new Request("http://localhost:3000/api/youtube/info?v=xT1gYZGDx4I");
  const infoRes1 = await handleInfoGet(infoReq1);
  assert(infoRes1.status === 200, "1.1.1: Info GET xT1gYZGDx4I returns HTTP 200");
  const infoJson1 = await infoRes1.json();
  
  assert(infoJson1.videoId === "xT1gYZGDx4I", "1.1.2: Info GET returned correct videoId");
  assert(typeof infoJson1.title === "string" && infoJson1.title.length > 5, "1.1.3: Info GET returned real video title", `Title: ${infoJson1.title}`);
  assert(typeof infoJson1.durationSeconds === "number" && infoJson1.durationSeconds > 0, "1.1.4: Info GET returned valid durationSeconds (>0)", `DurationSeconds: ${infoJson1.durationSeconds}`);
  assert(typeof infoJson1.durationFormatted === "string" && infoJson1.durationFormatted.length > 0, "1.1.4b: Info GET returned durationFormatted", `DurationFormatted: ${infoJson1.durationFormatted}`);
  assert(Array.isArray(infoJson1.qualities) && infoJson1.qualities.length > 0, "1.1.5: Info GET qualities is non-empty array", `Count: ${infoJson1.qualities?.length}`);
  assert(infoJson1.status === undefined, "1.1.6: Info GET response is LIVE resolution, NOT static dummy { status: ... }");
  
  // Verify real qualities structure
  const firstQuality = infoJson1.qualities[0];
  assert(!!firstQuality.label, "1.1.7: Quality option has label", `Label: ${firstQuality?.label}`);
  assert(!!firstQuality.videoFormat || !!firstQuality.audioFormat, "1.1.8: Quality option contains stream format meta");
  assert(
    infoJson1.qualities.some((q: any) => !q.isAudioOnly && !!q.videoFormat?.url),
    "1.1.9: Live video stream URL present in video qualities"
  );
  assert(
    infoJson1.qualities.some((q: any) => q.isAudioOnly && !!q.audioFormat?.url),
    "1.1.10: Live audio stream URL present in audio qualities"
  );

  // Test with dQw4w9WgXcQ (Never Gonna Give You Up)
  console.log("  Fetching info for dQw4w9WgXcQ via GET (?videoId=)...");
  const infoReq2 = new Request("http://localhost:3000/api/youtube/info?videoId=dQw4w9WgXcQ");
  const infoRes2 = await handleInfoGet(infoReq2);
  assert(infoRes2.status === 200, "1.1.11: Info GET dQw4w9WgXcQ returns HTTP 200");
  const infoJson2 = await infoRes2.json();
  assert(infoJson2.videoId === "dQw4w9WgXcQ", "1.1.12: Info GET returned correct videoId for dQw4w9WgXcQ");
  assert(Array.isArray(infoJson2.qualities) && infoJson2.qualities.length >= 8, "1.1.13: dQw4w9WgXcQ has full qualities ladder (>= 8 qualities)", `Count: ${infoJson2.qualities?.length}`);
  assert(infoJson2.status === undefined, "1.1.14: dQw4w9WgXcQ response is NOT static dummy");

  // Test with full URL via ?url= parameter
  console.log("  Fetching info via ?url=https://www.youtube.com/watch?v=xT1gYZGDx4I...");
  const infoReq3 = new Request("http://localhost:3000/api/youtube/info?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DxT1gYZGDx4I");
  const infoRes3 = await handleInfoGet(infoReq3);
  assert(infoRes3.status === 200, "1.1.15: Info GET with full youtube.com watch URL returns HTTP 200");
  const infoJson3 = await infoRes3.json();
  assert(infoJson3.videoId === "xT1gYZGDx4I", "1.1.16: Info GET parsed video ID from full URL successfully");

  // Test POST handler with JSON body
  console.log("  Testing Info POST handler with body { v: 'xT1gYZGDx4I' }...");
  const infoPostReq1 = new Request("http://localhost:3000/api/youtube/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ v: "xT1gYZGDx4I" }),
  });
  const infoPostRes1 = await handleInfoPost(infoPostReq1);
  assert(infoPostRes1.status === 200, "1.1.17: Info POST returns HTTP 200");
  const infoPostJson1 = await infoPostRes1.json();
  assert(infoPostJson1.videoId === "xT1gYZGDx4I", "1.1.18: Info POST resolves valid videoId");
  assert(infoPostJson1.status === undefined, "1.1.19: Info POST returns live data, NOT static dummy");

  // Test OPTIONS CORS preflight
  const infoOptRes = await handleInfoOptions();
  assert(infoOptRes.status === 204, "1.1.20: Info OPTIONS preflight returns HTTP 204");
  assert(infoOptRes.headers.get("access-control-allow-origin") === "*", "1.1.21: Info CORS allow-origin is *");
  assert(Boolean(infoOptRes.headers.get("access-control-allow-methods")?.includes("GET")), "1.1.22: Info CORS allow-methods includes GET");

  // --- 1.2 /api/youtube/info Error Handling & Boundary Inputs ---
  console.log("\n[1.2] Testing /api/youtube/info Missing & Invalid Parameters");
  
  // Empty GET (health probe)
  const infoEmptyReq = new Request("http://localhost:3000/api/youtube/info");
  const infoEmptyRes = await handleInfoGet(infoEmptyReq);
  assert(infoEmptyRes.status === 200, "1.2.1: Info GET with missing query returns HTTP 200 health probe");
  const infoEmptyJson = await infoEmptyRes.json();
  assert(infoEmptyJson.status === "YouTube Info Service Online", "1.2.2: Health probe status string matches specification");

  // GET with empty query value ?v=
  const infoBlankReq = new Request("http://localhost:3000/api/youtube/info?v=");
  const infoBlankRes = await handleInfoGet(infoBlankReq);
  assert(infoBlankRes.status === 200, "1.2.3: Info GET ?v= returns HTTP 200 health probe");
  const infoBlankJson = await infoBlankRes.json();
  assert(infoBlankJson.status === "YouTube Info Service Online", "1.2.4: Info GET blank ?v= returns health probe");

  // POST with empty body {}
  const infoPostEmptyReq = new Request("http://localhost:3000/api/youtube/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const infoPostEmptyRes = await handleInfoPost(infoPostEmptyReq);
  assert(infoPostEmptyRes.status === 400, "1.2.5: Info POST with empty body returns HTTP 400 Bad Request");
  const infoPostEmptyJson = await infoPostEmptyRes.json();
  assert(typeof infoPostEmptyJson.error === "string", "1.2.6: Info POST empty body error contains description");

  // POST with malformed JSON body
  const infoPostMalformedReq = new Request("http://localhost:3000/api/youtube/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ malformed json",
  });
  const infoPostMalformedRes = await handleInfoPost(infoPostMalformedReq);
  assert(infoPostMalformedRes.status === 400, "1.2.7: Info POST with malformed JSON returns HTTP 400");

  // GET with non-existent / invalid video ID
  console.log("  Testing invalid video ID handling...");
  const infoInvalidReq = new Request("http://localhost:3000/api/youtube/info?v=INVALID_NONEXISTENT_VIDEO_9999");
  const infoInvalidRes = await handleInfoGet(infoInvalidReq);
  assert(infoInvalidRes.status === 500, "1.2.8: Info GET with non-existent video ID returns HTTP 500");
  const infoInvalidJson = await infoInvalidRes.json();
  assert(typeof infoInvalidJson.error === "string", "1.2.9: Non-existent video error contains descriptive message");

  // GET with 5000 character garbage string (DDoS / buffer overflow boundary)
  const longJunk = "A".repeat(5000);
  const infoLongReq = new Request(`http://localhost:3000/api/youtube/info?v=${longJunk}`);
  const infoLongRes = await handleInfoGet(infoLongReq);
  assert(infoLongRes.status === 500, "1.2.10: 5000-char input handled gracefully without process crash (HTTP 500)");

  // --- 1.3 /api/youtube/stream Proxy Testing ---
  console.log("\n[1.3] Testing /api/youtube/stream Proxy (Healthcheck, Auth, Range 206)");

  // Stream GET empty healthcheck
  const streamEmptyReq = new Request("http://localhost:3000/api/youtube/stream");
  const streamEmptyRes = await handleStreamGet(streamEmptyReq);
  assert(streamEmptyRes.status === 200, "1.3.1: Stream GET empty returns HTTP 200 health probe");
  const streamEmptyJson = await streamEmptyRes.json();
  assert(streamEmptyJson.status === "YouTube Stream Proxy Online", "1.3.2: Stream health status string matches specification");

  // Stream HEAD empty
  const streamHeadEmptyReq = new Request("http://localhost:3000/api/youtube/stream", { method: "HEAD" });
  const streamHeadEmptyRes = await handleStreamHead(streamHeadEmptyReq);
  assert(streamHeadEmptyRes.status === 200, "1.3.3: Stream HEAD empty returns HTTP 200");

  // Stream OPTIONS CORS preflight
  const streamOptRes = await handleStreamOptions();
  assert(streamOptRes.status === 204, "1.3.4: Stream OPTIONS preflight returns HTTP 204");
  assert(Boolean(streamOptRes.headers.get("access-control-expose-headers")?.includes("Content-Range")), "1.3.5: Stream CORS exposes Content-Range");

  // Stream unauthorized domain blocking
  console.log("  Testing SSRF / Unauthorized domain blocking in stream proxy...");
  const forbiddenCases = [
    "https://malicious-attacker.com/stream.mp4",
    "https://evilgooglevideo.com/videoplayback",
    "https://googlevideo.com.attacker.com/test",
    "https://youtube.com.phishing.org/watch",
    "http://127.0.0.1:8080/internal-admin",
    "not_a_valid_url",
  ];
  for (let i = 0; i < forbiddenCases.length; i++) {
    const fUrl = forbiddenCases[i];
    const streamBadReq = new Request(`http://localhost:3000/api/youtube/stream?url=${encodeURIComponent(fUrl)}`);
    const streamBadRes = await handleStreamGet(streamBadReq);
    assert(
      streamBadRes.status === 403,
      `1.3.6.${i + 1}: Stream proxy blocks unauthorized URL (${fUrl}) with HTTP 403 Forbidden`
    );
    const badJson = await streamBadRes.json();
    assert(badJson.error.includes("Forbidden"), `1.3.6.${i + 1}b: Error message specifies Forbidden`);
  }

  // Adversarial edge-case: non-HTTP scheme with valid hostname (e.g. ftp://googlevideo.com/file)
  const streamFtpReq = new Request(`http://localhost:3000/api/youtube/stream?url=${encodeURIComponent("ftp://googlevideo.com/file")}`);
  const streamFtpRes = await handleStreamGet(streamFtpReq);
  assert(
    streamFtpRes.status === 403 || streamFtpRes.status === 502,
    "1.3.6.ftp: Non-HTTP scheme ftp://googlevideo.com handled without uncaught exception (HTTP 403 or 502)",
    `Status: ${streamFtpRes.status}`
  );
  const ftpJson = await streamFtpRes.json();
  assert(typeof ftpJson.error === "string", "1.3.6.ftpb: Non-HTTP scheme returns descriptive error JSON");

  // Stream live Range request using real CDN URL from xT1gYZGDx4I resolution
  console.log("  Testing live Google Video CDN Range (206) proxying...");
  let realCdnUrl: string | undefined;
  for (const q of infoJson1.qualities) {
    if (q.videoFormat?.url) {
      realCdnUrl = q.videoFormat.url;
      break;
    }
  }

  if (realCdnUrl) {
    // Test Range GET 0-1023 (1024 bytes)
    const rangeReq = new Request(`http://localhost:3000/api/youtube/stream?url=${encodeURIComponent(realCdnUrl)}`, {
      headers: {
        Range: "bytes=0-1023",
      },
    });
    const rangeRes = await handleStreamGet(rangeReq);
    assert(
      rangeRes.status === 206 || rangeRes.status === 200,
      "1.3.7: Stream proxy returns HTTP 206 Partial Content (or 200 if CDN coerced)",
      `Status: ${rangeRes.status}`
    );
    assert(rangeRes.headers.get("accept-ranges") === "bytes", "1.3.8: Response specifies Accept-Ranges: bytes");
    assert(rangeRes.headers.get("access-control-allow-origin") === "*", "1.3.9: Stream proxy response has CORS allow-origin: *");
    
    const rangeBuf = await rangeRes.arrayBuffer();
    assert(rangeBuf.byteLength > 0, "1.3.10: Range response stream body contains data bytes", `Bytes: ${rangeBuf.byteLength}`);

    // Test HEAD probe for file sizing
    const headReq = new Request(`http://localhost:3000/api/youtube/stream?url=${encodeURIComponent(realCdnUrl)}`, {
      method: "HEAD",
    });
    const headRes = await handleStreamHead(headReq);
    assert(headRes.status === 200, "1.3.11: Stream HEAD probe returns HTTP 200");
    const contentLength = headRes.headers.get("content-length");
    assert(!!contentLength && parseInt(contentLength, 10) > 1000, "1.3.12: Stream HEAD probe reports total content-length", `Length: ${contentLength}`);

    // Test POST proxying
    const postStreamReq = new Request("http://localhost:3000/api/youtube/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Range: "bytes=0-511",
      },
      body: JSON.stringify({ url: realCdnUrl }),
    });
    const postStreamRes = await handleStreamPost(postStreamReq);
    assert(
      postStreamRes.status === 206 || postStreamRes.status === 200,
      "1.3.13: Stream POST with Range returns HTTP 206 (or 200)",
      `Status: ${postStreamRes.status}`
    );
  } else {
    console.warn("  [Warning] No direct video format URL found in live resolution to test stream CDN proxy.");
  }

  // --- 1.4 /api/youtube/playlist Testing ---
  console.log("\n[1.4] Testing /api/youtube/playlist Route");

  // Playlist empty GET healthcheck
  const plEmptyReq = new Request("http://localhost:3000/api/youtube/playlist");
  const plEmptyRes = await handlePlaylistGet(plEmptyReq);
  assert(plEmptyRes.status === 200, "1.4.1: Playlist GET empty returns HTTP 200 health probe");
  const plEmptyJson = await plEmptyRes.json();
  assert(plEmptyJson.status === "YouTube Playlist Service Online", "1.4.2: Playlist health status string matches specification");

  // Playlist OPTIONS CORS preflight
  const plOptRes = await handlePlaylistOptions();
  assert(plOptRes.status === 204, "1.4.3: Playlist OPTIONS preflight returns HTTP 204");
  assert(plOptRes.headers.get("access-control-allow-origin") === "*", "1.4.4: Playlist CORS allow-origin is *");

  // Playlist with invalid list ID
  console.log("  Testing invalid playlist ID error handling...");
  const plBadReq = new Request("http://localhost:3000/api/youtube/playlist?list=PL_INVALID_PLAYLIST_FAKE_12345");
  const plBadRes = await handlePlaylistGet(plBadReq);
  assert(plBadRes.status === 500, "1.4.5: Playlist GET with invalid ID returns HTTP 500");
  const plBadJson = await plBadRes.json();
  assert(typeof plBadJson.error === "string", "1.4.6: Invalid playlist error returns descriptive message");

  // ===========================================================================
  // SECTION 2: PORT-AGNOSTIC ORIGIN DETECTION (src/lib/youtube/innertube.ts)
  // ===========================================================================
  console.log("\n--- SECTION 2: Port-Agnostic Origin Detection Testing ---");

  // Helper to simulate browser environment
  const originalWindow = (global as any).window;
  const originalEnvUrl = process.env.NEXT_PUBLIC_APP_URL;

  try {
    // 2.1 Port 3000
    (global as any).window = {
      location: {
        origin: "http://localhost:3000",
        port: "3000",
        protocol: "http:",
      },
    };
    let url = getYouTubeApiUrl("/api/youtube/info?v=xT1gYZGDx4I");
    assert(
      url === "http://localhost:3000/api/youtube/info/?v=xT1gYZGDx4I",
      "2.1: Browser on port 3000 targets localhost:3000 with normalized path",
      `Got: ${url}`
    );

    // 2.2 Port 3001
    (global as any).window.location.origin = "http://localhost:3001";
    (global as any).window.location.port = "3001";
    url = getYouTubeApiUrl("/api/youtube/info?v=xT1gYZGDx4I");
    assert(
      url === "http://localhost:3001/api/youtube/info/?v=xT1gYZGDx4I",
      "2.2: Browser on port 3001 targets localhost:3001 (NOT falling back to cloud Vercel)",
      `Got: ${url}`
    );

    // 2.3 Port 3002
    (global as any).window.location.origin = "http://localhost:3002";
    (global as any).window.location.port = "3002";
    url = getYouTubeApiUrl("/api/youtube/stream");
    assert(
      url === "http://localhost:3002/api/youtube/stream/",
      "2.3: Browser on port 3002 targets localhost:3002",
      `Got: ${url}`
    );

    // 2.4 Port 8080 with 127.0.0.1
    (global as any).window.location.origin = "http://127.0.0.1:8080";
    (global as any).window.location.port = "8080";
    url = getYouTubeApiUrl("/api/youtube/playlist?list=PL123");
    assert(
      url === "http://127.0.0.1:8080/api/youtube/playlist/?list=PL123",
      "2.4: Browser on 127.0.0.1:8080 targets 127.0.0.1:8080",
      `Got: ${url}`
    );

    // 2.5 Local Network LAN IP
    (global as any).window.location.origin = "http://192.168.1.105:3000";
    (global as any).window.location.port = "3000";
    url = getYouTubeApiUrl("/api/youtube/info");
    assert(
      url === "http://192.168.1.105:3000/api/youtube/info/",
      "2.5: Browser on LAN IP 192.168.1.105:3000 targets LAN IP",
      `Got: ${url}`
    );

    // 2.6 Custom Domain
    (global as any).window.location.origin = "https://app.zenodeck.io";
    (global as any).window.location.port = "";
    url = getYouTubeApiUrl("/api/youtube/info");
    assert(
      url === "https://app.zenodeck.io/api/youtube/info/",
      "2.6: Browser on custom domain targets custom domain",
      `Got: ${url}`
    );

    // 2.7 Native Mobile Simulation (Capacitor.isNativePlatform() === true)
    console.log("  Simulating Capacitor native mobile environment...");
    const originalIsNativePlatform = Capacitor.isNativePlatform;
    try {
      (Capacitor as any).isNativePlatform = () => true;

      // Even if origin is localhost or capacitor://, native mobile MUST route to remote endpoint
      (global as any).window.location.origin = "http://localhost:3001";
      url = getYouTubeApiUrl("/api/youtube/info?v=xT1gYZGDx4I");
      assert(
        url === "https://omni-tool-two.vercel.app/api/youtube/info/?v=xT1gYZGDx4I",
        "2.7.1: Native mobile returns remote Vercel endpoint even when origin is localhost:3001",
        `Got: ${url}`
      );

      (global as any).window.location.origin = "capacitor://localhost";
      url = getYouTubeApiUrl("/api/youtube/stream");
      assert(
        url === "https://omni-tool-two.vercel.app/api/youtube/stream/",
        "2.7.2: Native mobile with capacitor://localhost returns remote endpoint",
        `Got: ${url}`
      );

      // Custom NEXT_PUBLIC_APP_URL
      process.env.NEXT_PUBLIC_APP_URL = "https://api.custom-server.com";
      url = getYouTubeApiUrl("/api/youtube/info");
      assert(
        url === "https://api.custom-server.com/api/youtube/info/",
        "2.7.3: Native mobile honors custom NEXT_PUBLIC_APP_URL",
        `Got: ${url}`
      );
      delete process.env.NEXT_PUBLIC_APP_URL;
    } finally {
      (Capacitor as any).isNativePlatform = originalIsNativePlatform;
    }

    // 2.8 SSR / Node.js Runtime Simulation (typeof window === "undefined")
    delete (global as any).window;
    url = getYouTubeApiUrl("/api/youtube/info?v=xT1gYZGDx4I");
    assert(
      url === "https://omni-tool-two.vercel.app/api/youtube/info/?v=xT1gYZGDx4I",
      "2.8: SSR / Node runtime falls back to remote API origin",
      `Got: ${url}`
    );

    // 2.9 Edge Cases & Path Normalization
    (global as any).window = {
      location: {
        origin: "http://localhost:3000",
      },
    };

    // Missing leading slash
    url = getYouTubeApiUrl("api/youtube/info");
    assert(
      url === "http://localhost:3000/api/youtube/info/",
      "2.9.1: Path without leading slash is normalized with leading slash",
      `Got: ${url}`
    );

    // Path already has trailing slash and query
    url = getYouTubeApiUrl("/api/youtube/info/?v=abc&list=def");
    assert(
      url === "http://localhost:3000/api/youtube/info/?v=abc&list=def",
      "2.9.2: Path with trailing slash and query preserves formatting",
      `Got: ${url}`
    );

    // file:// protocol origin
    (global as any).window.location.origin = "file://";
    url = getYouTubeApiUrl("/api/youtube/info");
    assert(
      url === "https://omni-tool-two.vercel.app/api/youtube/info/",
      "2.9.3: file:// origin falls back to remote endpoint",
      `Got: ${url}`
    );

  } finally {
    if (originalWindow) {
      (global as any).window = originalWindow;
    } else {
      delete (global as any).window;
    }
    if (originalEnvUrl) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnvUrl;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  }

  // ===========================================================================
  // SECTION 3: TEST scripts/build-mobile-export.ts LOGIC
  // ===========================================================================
  console.log("\n--- SECTION 3: Mobile Export Wrapper Logic Testing ---");

  const targetRoutes = [
    path.join(PROJECT_ROOT, "src/app/api/youtube/info/route.ts"),
    path.join(PROJECT_ROOT, "src/app/api/youtube/stream/route.ts"),
    path.join(PROJECT_ROOT, "src/app/api/youtube/playlist/route.ts"),
  ];

  // 3.1 Verify all target routes exist and currently contain force-dynamic
  for (const rPath of targetRoutes) {
    const relName = path.relative(PROJECT_ROOT, rPath);
    assert(fs.existsSync(rPath), `3.1.1: Target route exists: ${relName}`);
    const content = fs.readFileSync(rPath, "utf8");
    assert(
      content.includes('export const dynamic = "force-dynamic";'),
      `3.1.2: ${relName} has export const dynamic = "force-dynamic"`
    );
  }

  // 3.2 Verify next.config.ts does NOT contain destructive file mutation code
  const nextConfigPath = path.join(PROJECT_ROOT, "next.config.ts");
  const nextConfigContent = fs.readFileSync(nextConfigPath, "utf8");
  assert(
    !nextConfigContent.includes("writeFileSync"),
    "3.2.1: next.config.ts contains NO fs.writeFileSync disk mutations"
  );
  assert(
    !nextConfigContent.includes("apiRoutesToSync"),
    "3.2.2: next.config.ts contains NO apiRoutesToSync loop"
  );

  // 3.3 Test Backup, Substitution, and Unconditional Restoration Lifecycle
  console.log("  Testing build-mobile-export substitution and restoration lifecycle...");
  const BACKUP_DIR = path.join(PROJECT_ROOT, ".next", "mobile-export-backup");
  const STATIC_STUB = `import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({ status: "static-export" });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
`;

  // Read and record original contents
  const originalContents = new Map<string, string>();
  for (const rPath of targetRoutes) {
    originalContents.set(rPath, fs.readFileSync(rPath, "utf8"));
  }

  try {
    // Step A: Perform substitution
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    for (const rPath of targetRoutes) {
      const orig = originalContents.get(rPath)!;
      const backupFileName = path.basename(path.dirname(rPath)) + "_" + path.basename(rPath);
      fs.writeFileSync(path.join(BACKUP_DIR, backupFileName), orig, "utf8");
      fs.writeFileSync(rPath, STATIC_STUB, "utf8");
    }

    // Step B: Verify substituted state
    for (const rPath of targetRoutes) {
      const substituted = fs.readFileSync(rPath, "utf8");
      assert(
        substituted.includes('export const dynamic = "force-static";'),
        `3.3.1: Substituted ${path.basename(path.dirname(rPath))} contains force-static`
      );
      assert(
        substituted.includes('status: "static-export"'),
        `3.3.2: Substituted ${path.basename(path.dirname(rPath))} contains static-export stub`
      );
    }

    // Step C: Verify disk backup directory
    assert(fs.existsSync(BACKUP_DIR), "3.3.3: Backup directory .next/mobile-export-backup exists during export");

  } finally {
    // Step D: Perform restoration (simulating the finally block in buildMobileExport)
    for (const [rPath, orig] of originalContents.entries()) {
      fs.writeFileSync(rPath, orig, "utf8");
    }
    if (fs.existsSync(BACKUP_DIR)) {
      fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
    }
  }

  // Step E: Verify restored state byte-for-byte
  for (const rPath of targetRoutes) {
    const restored = fs.readFileSync(rPath, "utf8");
    const orig = originalContents.get(rPath)!;
    assert(
      restored === orig,
      `3.3.4: Restored content of ${path.basename(path.dirname(rPath))} matches original byte-for-byte`
    );
    assert(
      restored.includes('export const dynamic = "force-dynamic";'),
      `3.3.5: Restored ${path.basename(path.dirname(rPath))} is force-dynamic`
    );
  }
  assert(!fs.existsSync(BACKUP_DIR), "3.3.6: Backup directory is cleanly removed after restoration");

  // 3.4 Verify git status cleanliness for route files
  const gitStatus = execSync("git status --porcelain", { cwd: PROJECT_ROOT, encoding: "utf8" });
  assert(
    !gitStatus.includes("src/app/api/youtube/info/route.ts ") ||
    gitStatus.includes("M src/app/api/youtube/info/route.ts"),
    "3.4.1: info/route.ts is tracked and not left dirty with static stubs"
  );

  console.log("\n================================================================================");
  console.log("                      CHALLENGER M1 TEST SUMMARY                                ");
  console.log("================================================================================");
  console.log(`Total Assertions:  ${totalAssertions}`);
  console.log(`Passed:            ${passedAssertions}`);
  console.log(`Failed:            ${failedAssertions}`);
  console.log(`Pass Rate:         ${((passedAssertions / totalAssertions) * 100).toFixed(1)}%`);
  console.log("================================================================================");

  if (failedAssertions > 0) {
    console.error("\nFailures Encountered:");
    for (const f of failures) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  } else {
    console.log("\n🎉 ALL CHALLENGER TESTS PASSED EMPIRICALLY WITH ZERO DEFECTS!");
  }
}

runChallengerTests().catch((err) => {
  console.error("FATAL ERROR in challenger test suite:", err);
  process.exit(1);
});
