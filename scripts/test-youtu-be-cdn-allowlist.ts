setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 15000).unref();

import fs from "fs";
import path from "path";
import {
  canonicalizeYouTubeUrl,
  extractCanonicalYouTubeId,
  isAllowedStreamHost,
  isPrivateOrLoopbackHost,
  ALLOWED_STREAM_DOMAINS,
} from "../src/lib/media/stream-security";
import { detectPlatform } from "../src/lib/media/detector";
import { extractYouTubeId } from "../src/lib/youtube/innertube";
import { GET as handleStreamGet } from "../src/app/api/youtube/stream/route";

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ PASS: ${label}`);
    totalPassed++;
  } else {
    console.error(`  ✗ FAIL: ${label}${detail ? ` -> ${detail}` : ""}`);
    totalFailed++;
  }
}

async function runTests() {
  console.log("====================================================================");
  console.log("  ZENODECK YOUTU.BE CANONICALIZATION & CDN ALLOWLIST VERIFICATION   ");
  console.log("====================================================================\n");

  // 1. Canonicalization & Platform Detection
  console.log("--- 1. YouTube Short / Mobile / Shorts URL Canonicalization ---");
  const expectedCanonical = "https://www.youtube.com/watch?v=rxwTkp_xHSE";
  const urlVariants = [
    "https://youtu.be/rxwTkp_xHSE",
    "https://youtu.be/rxwTkp_xHSE?si=abc123&t=45",
    "https://m.youtube.com/watch?v=rxwTkp_xHSE&feature=mweb",
    "https://www.youtube.com/shorts/rxwTkp_xHSE?feature=share",
    "https://youtube.com/shorts/rxwTkp_xHSE",
    "https://www.youtube.com/live/rxwTkp_xHSE",
    "https://www.youtube.com/watch?v=rxwTkp_xHSE",
  ];

  for (const input of urlVariants) {
    const canonical = canonicalizeYouTubeUrl(input);
    assert(
      canonical === expectedCanonical,
      `canonicalizeYouTubeUrl("${input}") === "${expectedCanonical}"`,
      `Got "${canonical}"`
    );
    const id = extractYouTubeId(input);
    assert(id === "rxwTkp_xHSE", `extractYouTubeId("${input}") === "rxwTkp_xHSE"`, `Got "${id}"`);
    const detected = detectPlatform(input);
    assert(
      detected?.platform === "youtube" && detected.cleanUrl === expectedCanonical && detected.id === "rxwTkp_xHSE",
      `detectPlatform("${input}") canonicalizes cleanly`,
      `Got ${JSON.stringify(detected)}`
    );
  }

  // Preserve playlist IDs and non-YouTube URLs
  assert(
    canonicalizeYouTubeUrl("https://music.youtube.com/watch?v=rxwTkp_xHSE&list=PL1234567890") ===
      "https://www.youtube.com/watch?v=rxwTkp_xHSE&list=PL1234567890",
    "Preserves valid list= query parameter on YouTube URLs"
  );
  assert(
    canonicalizeYouTubeUrl("https://www.youtube-nocookie.com/embed/rxwTkp_xHSE?autoplay=1") ===
      "https://www.youtube-nocookie.com/embed/rxwTkp_xHSE?autoplay=1",
    "Preserves youtube-nocookie.com/embed/ URLs for iframe preview"
  );
  assert(
    canonicalizeYouTubeUrl("https://www.tiktok.com/@creator/video/7234567890") ===
      "https://www.tiktok.com/@creator/video/7234567890",
    "Leaves non-YouTube URLs untouched"
  );
  assert(
    extractCanonicalYouTubeId("https://127.0.0.1/redirect?next=youtu.be/rxwTkp_xHSE") === null,
    "Does not extract spoofed youtu.be path from untrusted host query string"
  );

  // 2. Authorized Media CDN Allowlist
  console.log("\n--- 2. Authorized Media CDN Allowlist Coverage ---");
  const requiredDomains = [
    "youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
    "googlevideo.com",
    "ytimg.com",
    "ggpht.com",
    "tiktokcdn.com",
    "tiktokv.com",
    "cdninstagram.com",
    "fbcdn.net",
    "twimg.com",
    "redd.it",
    "vimeocdn.com",
    "sndcdn.com",
  ];
  for (const domain of requiredDomains) {
    assert(
      ALLOWED_STREAM_DOMAINS.includes(domain),
      `ALLOWED_STREAM_DOMAINS includes "${domain}"`
    );
  }

  const allowedUrls = [
    "https://youtu.be/rxwTkp_xHSE",
    "https://www.youtube.com/watch?v=rxwTkp_xHSE",
    "https://m.youtube.com/watch?v=rxwTkp_xHSE",
    "https://www.youtube-nocookie.com/embed/rxwTkp_xHSE?autoplay=1&enablejsapi=1",
    "https://manifest.googlevideo.com/api/manifest/dash/id/123",
    "https://rr3---sn-4g5ednsd.googlevideo.com/videoplayback?itag=137",
    "https://i.ytimg.com/vi/rxwTkp_xHSE/hqdefault.jpg",
    "https://yt3.ggpht.com/ytc/AKedOLR_sample",
    "https://v16m.tiktokcdn.com/video/tos/sample.mp4",
    "https://api22-normal-c-useast1a.tiktokv.com/aweme/v1/play/",
    "https://scontent.cdninstagram.com/v/t50.2886-16/sample.mp4",
    "https://scontent-iad3-1.xx.fbcdn.net/v/t42.1790-2/sample.mp4",
    "https://video.twimg.com/ext_tw_video/123456/pu/vid/1280x720/sample.mp4",
    "https://v.redd.it/abcdef123/DASH_720.mp4",
    "https://vod-secure.vimeocdn.com/vimeo-prod-skyfire/sample.mp4",
    "https://cf-hls-media.sndcdn.com/playlist/sample.m3u8",
  ];

  for (const url of allowedUrls) {
    assert(isAllowedStreamHost(url), `Allows legitimate media URL: ${url}`);
  }

  // 3. SSRF Blocking Guard
  console.log("\n--- 3. Strict SSRF / Private & Loopback Blocking ---");
  const blockedUrls = [
    "http://127.0.0.1/admin",
    "http://localhost:3000/api/youtube/info",
    "http://sub.localhost/test",
    "http://10.0.0.1/internal.mp4",
    "http://172.16.5.4/internal.mp4",
    "http://192.168.1.1/router",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]:8080/secret",
    "http://[fe80::1]/link-local",
    "http://[fd00::1]/ula",
    "http://0.0.0.0/zero",
    "http://2130706433/",
    "http://0x7f000001/",
    "https://youtube.com@127.0.0.1/stream.mp4",
    "https://googlevideo.com.attacker.example/fake.mp4",
    "https://evil-googlevideo.com/fake.mp4",
    "file:///etc/passwd",
    "javascript:alert(1)",
  ];

  for (const url of blockedUrls) {
    assert(!isAllowedStreamHost(url), `Blocks SSRF / untrusted URL: ${url}`);
  }

  assert(isPrivateOrLoopbackHost("127.0.0.1"), "Flags 127.0.0.1 as loopback");
  assert(isPrivateOrLoopbackHost("::ffff:127.0.0.1"), "Flags IPv4-mapped loopback");
  assert(isPrivateOrLoopbackHost("169.254.169.254"), "Flags cloud metadata IP");

  // 4. Route Handler SSRF Enforcement
  console.log("\n--- 4. /api/youtube/stream Route Handler SSRF Enforcement ---");
  for (const badTarget of [
    "http://127.0.0.1/secret",
    "http://169.254.169.254/latest/meta-data/",
    "https://evil.example.com/stream.mp4",
  ]) {
    const req = new Request(
      `http://localhost:3000/api/youtube/stream?url=${encodeURIComponent(badTarget)}`
    );
    const res = await handleStreamGet(req);
    assert(res.status === 403, `Route returns HTTP 403 for blocked target: ${badTarget}`, `Got ${res.status}`);
  }

  // 5. Downloader UI State Guards
  console.log("\n--- 5. Universal Media Downloader UI Canonicalization & Error Clearing ---");
  const uiPath = path.resolve(process.cwd(), "src/components/tools/youtube-downloader.tsx");
  const uiSrc = fs.readFileSync(uiPath, "utf-8");

  assert(
    uiSrc.includes("canonicalizeYouTubeUrl"),
    "youtube-downloader.tsx imports and uses canonicalizeYouTubeUrl"
  );
  assert(
    (uiSrc.match(/setResolveError\(null\);\s*setVideoInfo\(/g) || []).length >= 2,
    "youtube-downloader.tsx clears resolveError before setting resolved videoInfo"
  );
  assert(
    uiSrc.includes("videoInfo?.isCloudRestricted") &&
      uiSrc.includes("Forbidden|authorized video stream CDN"),
    "youtube-downloader.tsx suppresses redundant 403 Forbidden banners when Web App cloud fallback card is active"
  );

  console.log("\n====================================================================");
  console.log(`TOTAL PASSED: ${totalPassed} | TOTAL FAILED: ${totalFailed}`);
  console.log("====================================================================");

  if (totalFailed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
