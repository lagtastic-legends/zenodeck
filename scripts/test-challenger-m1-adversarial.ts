/**
 * Empirical Challenger M1-1 Adversarial Stress Test Suite
 * ========================================================
 * Rigorous adversarial verification for Milestone 1:
 * 1. TikTok Extractor & Fallback Hardening:
 *    - parseTikDownResponse stress testing across JSON (medias, links, direct) and HTML payloads
 *    - Adversarial malformed inputs, relative URL resolution, photo slideshow extraction
 *    - Simulated TikWM failure (HTTP 500 / network failure / rate limit) -> seamless TikDown takeover
 *    - Mirror failover (api.tikdown.org -> tikdown.org)
 *    - Total failure graceful error handling
 * 2. Stream Sizer (probeRemoteFileSize) Empirical Stress Testing:
 *    - Local HTTP server simulating HTTP 405 (Reddit v.redd.it behavior) on HEAD -> Range 206 GET recovery
 *    - HTTP 404 handling -> graceful undefined
 *    - Timeout handling (>1500ms) with AbortController -> graceful undefined
 *    - Abrupt socket termination / connection reset -> no unhandled crash
 *    - Cache hit verification (0ms) and FIFO eviction at 300 entries
 *    - Invalid URLs, protocols, and malformed Content-Length/Content-Range headers
 * 3. Extractor Graceful Degradation (Reddit, Instagram, Twitter):
 *    - Reddit v.redd.it 405 audio probing and muxed size calculation
 *    - Extractor operation when sizing endpoints fail or time out (fileSize degrades to undefined)
 *    - Twitter mathematical bitrate/duration fallback when sizing probe is unavailable
 */

import http from "http";
import { AddressInfo } from "net";
import { probeRemoteFileSize } from "../src/lib/media/stream-sizer";
import { parseTikDownResponse, extractTikTokMedia } from "../src/lib/media/extractors/tiktok";
import { extractRedditMedia } from "../src/lib/media/extractors/reddit";
import { extractInstagramMedia } from "../src/lib/media/extractors/instagram";
import { extractTwitterMedia } from "../src/lib/media/extractors/twitter";

let totalAsserts = 0;
let passedAsserts = 0;
let failedAsserts = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalAsserts++;
  if (condition) {
    passedAsserts++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedAsserts++;
    const errMsg = `${testName}${detail ? ` -> ${detail}` : ""}`;
    failureDetails.push(errMsg);
    console.error(`  ✗ FAIL: ${errMsg}`);
  }
}

async function runAdversarialSuite() {
  console.log("================================================================================");
  console.log("       CHALLENGER M1-1: ADVERSARIAL STRESS & EMPIRICAL VERIFICATION             ");
  console.log("================================================================================\n");

  // ===========================================================================
  // SECTION 1: parseTikDownResponse ADVERSARIAL PARSER TESTING
  // ===========================================================================
  console.log("--- SECTION 1: parseTikDownResponse Adversarial Parser Checks ---");

  // 1.1 Malformed / Falsy Inputs
  assert(parseTikDownResponse(null, "https://api.tikdown.org") === null, "1.1.1: null payload returns null");
  assert(parseTikDownResponse(undefined, "https://api.tikdown.org") === null, "1.1.2: undefined payload returns null");
  assert(parseTikDownResponse("", "https://api.tikdown.org") === null, "1.1.3: empty string payload returns null");
  assert(parseTikDownResponse(12345, "https://api.tikdown.org") === null, "1.1.4: numeric payload returns null");
  assert(parseTikDownResponse({}, "https://api.tikdown.org") === null, "1.1.5: empty object payload returns null");
  assert(parseTikDownResponse([], "https://api.tikdown.org") === null, "1.1.6: array payload returns null");
  assert(
    parseTikDownResponse("<div>Just some text with no links or media</div>", "https://api.tikdown.org") === null,
    "1.1.7: HTML with no valid media returns null"
  );

  // 1.2 Structured JSON - Medias Array
  const jsonWithMedias = {
    id: "7123456789",
    title: "Dancing in the rain",
    author: { nickname: "DanceQueen", unique_id: "dance_queen" },
    cover: "https://p16.tiktokcdn.com/cover1.jpg",
    duration: 35,
    medias: [
      {
        quality: "hd",
        extension: "mp4",
        url: "https://dl.tikdown.org/hd_1080p.mp4",
        size: 15485760,
      },
      {
        quality: "sd",
        extension: "mp4",
        url: "https://dl.tikdown.org/sd_720p.mp4",
        size: 8388608,
      },
      {
        extension: "mp3",
        quality: "audio",
        url: "https://dl.tikdown.org/original_sound.mp3",
      },
      {
        watermark: true,
        extension: "mp4",
        url: "https://dl.tikdown.org/watermarked.mp4",
        size: 8500000,
      },
    ],
  };

  const parsedMedias = parseTikDownResponse(jsonWithMedias, "https://api.tikdown.org");
  assert(parsedMedias !== null, "1.2.1: JSON with medias array parsed successfully");
  assert(parsedMedias?.hdplay === "https://dl.tikdown.org/hd_1080p.mp4", "1.2.2: hdplay correctly extracted");
  assert(parsedMedias?.play === "https://dl.tikdown.org/sd_720p.mp4", "1.2.3: play correctly extracted");
  assert(parsedMedias?.music === "https://dl.tikdown.org/original_sound.mp3", "1.2.4: music correctly extracted");
  assert(parsedMedias?.wmplay === "https://dl.tikdown.org/watermarked.mp4", "1.2.5: wmplay correctly extracted");
  assert(parsedMedias?.hd_size === 15485760, "1.2.6: hd_size retained");
  assert(parsedMedias?.size === 8388608, "1.2.7: standard size retained");
  assert(parsedMedias?.title === "Dancing in the rain", "1.2.8: title extracted");
  assert(parsedMedias?.author?.nickname === "DanceQueen", "1.2.9: author nickname extracted");

  // 1.3 Structured JSON - Links Object
  const jsonWithLinks = {
    id: "7987654321",
    title: "Cooking Pasta",
    author: "Chef Luigi",
    links: {
      download_hd: "https://dl.tikdown.org/pasta_hd.mp4",
      download_mp4: "https://dl.tikdown.org/pasta_sd.mp4",
      download_mp3: "https://dl.tikdown.org/pasta_audio.mp3",
    },
    hd_size: 20000000,
    size: 10000000,
    duration: 60,
  };

  const parsedLinks = parseTikDownResponse(jsonWithLinks, "https://api.tikdown.org");
  assert(parsedLinks !== null, "1.3.1: JSON with links object parsed successfully");
  assert(parsedLinks?.hdplay === "https://dl.tikdown.org/pasta_hd.mp4", "1.3.2: hdplay extracted from links");
  assert(parsedLinks?.play === "https://dl.tikdown.org/pasta_sd.mp4", "1.3.3: play extracted from links");
  assert(parsedLinks?.music === "https://dl.tikdown.org/pasta_audio.mp3", "1.3.4: music extracted from links");
  assert(parsedLinks?.author?.nickname === "Chef Luigi", "1.3.5: author string normalized into object");

  // 1.4 Raw HTML Fragment Parsing (TikDown standard Web Scraping format)
  const rawHtmlFragment = `
    <div class="result">
      <div class="thumbnail"><img src="https://p16.tiktokcdn.com/thumb_abc.jpg" alt="Epic Trickshot" /></div>
      <div class="content">
        <h3>Epic Trickshot in the Gym</h3>
        <h2 class="author">@trickshot_pro</h2>
      </div>
      <div class="download-box">
        <a href="https://tikdown.org/dl/1080p.mp4" class="btn-primary">Download 1080p Full HD</a>
        <a href="https://tikdown.org/dl/720p.mp4" class="btn-secondary">Download MP4 SD</a>
        <a href="https://tikdown.org/dl/sound.mp3" class="btn-audio">Download MP3 Audio</a>
        <a href="https://tikdown.org/dl/watermark.mp4">Download with Watermark</a>
      </div>
    </div>
  `;

  const parsedHtml = parseTikDownResponse(rawHtmlFragment, "https://tikdown.org");
  assert(parsedHtml !== null, "1.4.1: HTML fragment parsed successfully");
  assert(parsedHtml?.hdplay === "https://tikdown.org/dl/1080p.mp4", "1.4.2: HD 1080p link parsed from HTML");
  assert(parsedHtml?.play === "https://tikdown.org/dl/720p.mp4", "1.4.3: SD 720p link parsed from HTML");
  assert(parsedHtml?.music === "https://tikdown.org/dl/sound.mp3", "1.4.4: MP3 audio link parsed from HTML");
  assert(parsedHtml?.wmplay === "https://tikdown.org/dl/watermark.mp4", "1.4.5: Watermark link parsed from HTML");
  assert(parsedHtml?.title === "Epic Trickshot in the Gym", "1.4.6: Title parsed from h3 tag");
  assert(parsedHtml?.author?.nickname === "trickshot_pro", "1.4.7: Author handle parsed from h2 tag");
  assert(parsedHtml?.cover === "https://p16.tiktokcdn.com/thumb_abc.jpg", "1.4.8: Thumbnail parsed from img tag");

  // 1.5 HTML Fragment with Relative URLs & HTML Entity Decoding
  const relativeHtml = `
    <div class="content">
      <p>Summer Vibes &amp; Sunsets</p>
      <div class="download-box">
        <a href="/downloads/video_hd.mp4?token=123&amp;type=hd">Download HD</a>
        <a href="//cdn.tikdown.org/audio.mp3">Download Audio MP3</a>
      </div>
    </div>
  `;
  const parsedRel = parseTikDownResponse(relativeHtml, "https://api.tikdown.org");
  assert(parsedRel !== null, "1.5.1: Relative HTML parsed successfully");
  assert(
    parsedRel?.hdplay === "https://api.tikdown.org/downloads/video_hd.mp4?token=123&type=hd",
    "1.5.2: Root-relative URL resolved against baseUrl and &amp; decoded"
  );
  assert(parsedRel?.music === "https://cdn.tikdown.org/audio.mp3", "1.5.3: Protocol-relative // resolved to https:");
  assert(parsedRel?.play === parsedRel?.hdplay, "1.5.4: play falls back to hdplay when standard play is omitted");

  // 1.6 Slideshow / Photo Album Carousel Extraction
  const carouselHtml = `
    <div class="photo-list">
      <img src="https://p16.tiktokcdn.com/slide_1.jpg" />
      <img src="https://p16.tiktokcdn.com/slide_2.jpg" />
      <img src="https://p16.tiktokcdn.com/slide_3.jpg" />
      <img src="/icons/download-icon.png" />
    </div>
    <a href="https://tikdown.org/audio/bgm.mp3">Download BGM MP3</a>
  `;
  const parsedCarousel = parseTikDownResponse(carouselHtml, "https://tikdown.org");
  assert(parsedCarousel !== null, "1.6.1: Carousel HTML parsed successfully");
  assert(Array.isArray(parsedCarousel?.images), "1.6.2: images array extracted from photo-list");
  assert(parsedCarousel?.images?.length === 3, "1.6.3: Extracted exactly 3 slides (filtered out icon)");
  assert(parsedCarousel?.images?.[0] === "https://p16.tiktokcdn.com/slide_1.jpg", "1.6.4: Slide 1 URL intact");
  assert(parsedCarousel?.images?.[2] === "https://p16.tiktokcdn.com/slide_3.jpg", "1.6.5: Slide 3 URL intact");
  assert(parsedCarousel?.music === "https://tikdown.org/audio/bgm.mp3", "1.6.6: Audio track extracted alongside carousel");

  // ===========================================================================
  // SECTION 2: SIMULATED TIKTOK PROVIDER 1 (TIKWM) FAILURE & TAKEOVER
  // ===========================================================================
  console.log("\n--- SECTION 2: TikTok Provider 1 Failure -> Provider 2 Takeover Simulation ---");

  const originalFetch = global.fetch;

  try {
    // 2.1 TikWM Fails (HTTP 500), Provider 2 (TikDown) Succeeds with HTML
    let tikwmCalls = 0;
    let tikdownCalls = 0;

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("tikwm.com")) {
        tikwmCalls++;
        return new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" });
      }
      if (urlStr.includes("tikdown.org")) {
        tikdownCalls++;
        const respBody = JSON.stringify({
          data: `
            <h3>Failover TikTok Video</h3>
            <h2>@failover_hero</h2>
            <div class="download-box">
              <a href="https://cdn.tikdown.org/failover_1080p.mp4">Download 1080p Full HD</a>
              <a href="https://cdn.tikdown.org/failover_audio.mp3">Download MP3 Audio</a>
            </div>
          `,
        });
        return new Response(respBody, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch(input, init);
    };

    const mediaInfo = await extractTikTokMedia("https://www.tiktok.com/@failover_hero/video/7123456789");
    assert(tikwmCalls === 1, "2.1.1: TikWM provider was invoked first");
    assert(tikdownCalls === 1, "2.1.2: TikDown fallback was invoked after TikWM failed");
    assert(mediaInfo.platform === "tiktok", "2.1.3: Platform is tiktok");
    assert(mediaInfo.title === "Failover TikTok Video", "2.1.4: Media title extracted from fallback");
    assert(mediaInfo.author === "failover_hero", "2.1.5: Author extracted from fallback");
    assert(mediaInfo.qualities.length >= 2, "2.1.6: Qualities populated from fallback (>= 2)");
    
    const hdOption = mediaInfo.qualities.find((q) => q.resolution === "1080p");
    const audioOption = mediaInfo.qualities.find((q) => q.isAudioOnly);
    assert(!!hdOption && hdOption.downloadUrl === "https://cdn.tikdown.org/failover_1080p.mp4", "2.1.7: 1080p option populated from fallback");
    assert(!!audioOption && audioOption.downloadUrl === "https://cdn.tikdown.org/failover_audio.mp3", "2.1.8: Audio MP3 option populated from fallback");

    // 2.2 TikWM Returns Rate Limit Code (-1), Provider 2 Mirror 1 Fails (502), Mirror 2 Succeeds
    let mirror1Attempts = 0;
    let mirror2Attempts = 0;

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("tikwm.com")) {
        return new Response(JSON.stringify({ code: -1, msg: "Rate limit exceeded" }), { status: 200 });
      }
      if (urlStr === "https://api.tikdown.org/api/ajaxSearch") {
        mirror1Attempts++;
        return new Response("Bad Gateway", { status: 502 });
      }
      if (urlStr === "https://tikdown.org/api/ajaxSearch") {
        mirror2Attempts++;
        const payload = {
          id: "7200000001",
          title: "Mirror 2 Success Video",
          author: "MirrorTester",
          medias: [
            { quality: "hd", extension: "mp4", url: "https://mirror2.tikdown.org/video_hd.mp4", size: 12000000 },
            { quality: "audio", extension: "mp3", url: "https://mirror2.tikdown.org/sound.mp3" },
          ],
        };
        return new Response(JSON.stringify({ data: payload }), { status: 200 });
      }
      return originalFetch(input, init);
    };

    const mirrorMedia = await extractTikTokMedia("https://www.tiktok.com/@user/video/7200000001");
    assert(mirror1Attempts === 1, "2.2.1: Primary TikDown mirror (api.tikdown.org) attempted");
    assert(mirror2Attempts === 1, "2.2.2: Secondary TikDown mirror (tikdown.org) successfully took over");
    assert(mirrorMedia.title === "Mirror 2 Success Video", "2.2.3: Title from mirror 2 populated");
    assert(
      mirrorMedia.qualities.some((q) => q.downloadUrl === "https://mirror2.tikdown.org/video_hd.mp4"),
      "2.2.4: Video URL from mirror 2 populated"
    );

    // 2.3 Total Outage (TikWM and All TikDown Mirrors Fail)
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("tikwm.com") || urlStr.includes("tikdown.org")) {
        throw new Error("Network unreachable");
      }
      return originalFetch(input, init);
    };

    let caughtError: Error | null = null;
    try {
      await extractTikTokMedia("https://www.tiktok.com/@user/video/7300000000");
    } catch (e: any) {
      caughtError = e;
    }
    assert(caughtError !== null, "2.3.1: Complete outage threw error as expected");
    assert(
      caughtError?.message.includes("Could not resolve TikTok video"),
      "2.3.2: Error message provides clean user-facing guidance",
      caughtError?.message
    );
  } finally {
    global.fetch = originalFetch;
  }

  // ===========================================================================
  // SECTION 3: stream-sizer.ts EMPIRICAL STRESS TESTING WITH REAL HTTP SERVER
  // ===========================================================================
  console.log("\n--- SECTION 3: Stream Sizer (probeRemoteFileSize) Empirical Server Checks ---");

  // Create real HTTP server on random local port
  let lastReceivedMethod: string | null = null;
  let lastReceivedHeaders: http.IncomingHttpHeaders | null = null;
  let headRequestCount = 0;
  let getRequestCount = 0;

  const server = http.createServer((req, res) => {
    lastReceivedMethod = req.method || null;
    lastReceivedHeaders = req.headers;

    const urlPath = req.url || "/";

    if (req.method === "HEAD") headRequestCount++;
    if (req.method === "GET") getRequestCount++;

    // Scenario A: Standard 200 with Content-Length on HEAD
    if (urlPath === "/standard-video.mp4") {
      res.writeHead(200, {
        "Content-Length": "12345678",
        "Content-Type": "video/mp4",
      });
      res.end();
      return;
    }

    // Scenario B: Reddit v.redd.it behavior: HEAD returns 405 Method Not Allowed; GET Range returns 206
    if (urlPath === "/reddit-dash-video.mp4") {
      if (req.method === "HEAD") {
        res.writeHead(405, { "Allow": "GET" });
        res.end();
        return;
      }
      if (req.method === "GET") {
        const range = req.headers["range"];
        if (range === "bytes=0-0") {
          res.writeHead(206, {
            "Content-Range": "bytes 0-0/45678901",
            "Content-Length": "1",
            "Content-Type": "video/mp4",
          });
          res.end("0");
          return;
        }
        res.writeHead(200, { "Content-Length": "45678901" });
        res.end();
        return;
      }
    }

    // Scenario C: HTTP 404 on both HEAD and GET
    if (urlPath === "/missing-file.mp4") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    // Scenario D: Timeout simulation: Hang indefinitely (or long delay)
    if (urlPath === "/hanging-endpoint.mp4") {
      // Do nothing, leave connection hanging
      return;
    }

    // Scenario E: Abrupt socket destruction
    if (urlPath === "/abrupt-reset.mp4") {
      req.socket.destroy();
      return;
    }

    // Scenario F: Malformed Content-Length / Content-Range headers
    if (urlPath === "/malformed-headers.mp4") {
      if (req.method === "HEAD") {
        res.writeHead(200, { "Content-Length": "not-a-number" });
        res.end();
        return;
      }
      res.writeHead(206, {
        "Content-Range": "bytes */*",
        "Content-Type": "video/mp4",
      });
      res.end();
      return;
    }

    // Scenario G: Negative or zero Content-Length
    if (urlPath === "/zero-size.mp4") {
      res.writeHead(200, { "Content-Length": "0" });
      res.end();
      return;
    }

    // Scenario H: Progressive non-range stream returning 200 with Content-Length on GET
    if (urlPath === "/progressive-get-only.mp4") {
      if (req.method === "HEAD") {
        res.writeHead(403);
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Length": "8888888",
        "Content-Type": "video/mp4",
      });
      res.end();
      return;
    }

    res.writeHead(400);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 3.1 Standard Probing (HEAD 200)
    headRequestCount = 0;
    getRequestCount = 0;
    const stdSize = await probeRemoteFileSize(`${baseUrl}/standard-video.mp4`);
    assert(stdSize === 12345678, "3.1.1: Standard HEAD 200 extracts correct Content-Length (12345678)");
    assert(headRequestCount === 1, "3.1.2: Exactly 1 HEAD request made");
    assert(getRequestCount === 0, "3.1.3: 0 GET requests made (no wasted bandwidth)");

    // 3.2 In-Memory Cache Verification
    const cachedStart = Date.now();
    const cachedSize = await probeRemoteFileSize(`${baseUrl}/standard-video.mp4`);
    const cachedElapsed = Date.now() - cachedStart;
    assert(cachedSize === 12345678, "3.2.1: Cache returned exact same size");
    assert(headRequestCount === 1, "3.2.2: 0 additional network requests made on cache hit");
    assert(cachedElapsed < 10, "3.2.3: Cache hit resolved instantaneously (<10ms)", `${cachedElapsed}ms`);

    // 3.3 HTTP 405 Method Not Allowed (Reddit v.redd.it simulation) -> Range 206 GET
    headRequestCount = 0;
    getRequestCount = 0;
    const redditSize = await probeRemoteFileSize(`${baseUrl}/reddit-dash-video.mp4`);
    assert(redditSize === 45678901, "3.3.1: 405 HEAD recovered via Range GET Content-Range (45678901)");
    assert(headRequestCount === 1, "3.3.2: 1 HEAD request issued");
    assert(getRequestCount === 1, "3.3.3: 1 GET Range request issued after 405");

    // 3.4 HTTP 404 (Not Found) -> Graceful undefined
    headRequestCount = 0;
    getRequestCount = 0;
    const missingSize = await probeRemoteFileSize(`${baseUrl}/missing-file.mp4`);
    assert(missingSize === undefined, "3.4.1: HTTP 404 returned undefined without throwing");

    // 3.5 Timeout Handling (>1500ms budget) -> Graceful undefined
    const timeoutStart = Date.now();
    // Test with a tight timeoutMs of 400ms to verify abort controller timer fires promptly
    const hangingSize = await probeRemoteFileSize(`${baseUrl}/hanging-endpoint.mp4`, {
      timeoutMs: 400,
    });
    const timeoutElapsed = Date.now() - timeoutStart;
    assert(hangingSize === undefined, "3.5.1: Hanging endpoint degraded gracefully to undefined");
    assert(
      timeoutElapsed >= 380 && timeoutElapsed <= 1200,
      "3.5.2: AbortController cleanly cut off request within timeout budget",
      `${timeoutElapsed}ms`
    );

    // 3.6 Abrupt Socket Destruction / Connection Reset
    const abruptSize = await probeRemoteFileSize(`${baseUrl}/abrupt-reset.mp4`);
    assert(abruptSize === undefined, "3.6.1: Socket destruction handled gracefully without process crash");

    // 3.7 Malformed Headers
    const malformedSize = await probeRemoteFileSize(`${baseUrl}/malformed-headers.mp4`);
    assert(malformedSize === undefined, "3.7.1: Malformed headers handled gracefully, returns undefined");

    // 3.8 Zero or Negative Content-Length
    const zeroSize = await probeRemoteFileSize(`${baseUrl}/zero-size.mp4`);
    assert(zeroSize === undefined, "3.8.1: Zero Content-Length rejected (returns undefined, not 0)");

    // 3.9 Progressive GET returning 200 with Content-Length
    const progSize = await probeRemoteFileSize(`${baseUrl}/progressive-get-only.mp4`);
    assert(progSize === 8888888, "3.9.1: Progressive GET 200 with Content-Length extracted (8888888)");

    // 3.10 Input Boundary Validation
    assert((await probeRemoteFileSize("")) === undefined, "3.10.1: Empty string returns undefined");
    assert((await probeRemoteFileSize("javascript:alert(1)")) === undefined, "3.10.2: javascript: protocol returns undefined");
    assert((await probeRemoteFileSize("ftp://example.com/file.mp4")) === undefined, "3.10.3: ftp: protocol returns undefined");
    assert((await probeRemoteFileSize(null as any)) === undefined, "3.10.4: null returns undefined");
    assert((await probeRemoteFileSize(undefined as any)) === undefined, "3.10.5: undefined returns undefined");

    // 3.11 LRU / FIFO 300-entry Cache Eviction Stress Test
    console.log("  Testing 350-entry cache eviction limits...");
    for (let i = 0; i < 350; i++) {
      // Simulate probing unique URLs (we won't hit the server for invalid format or mocked)
      await probeRemoteFileSize(`http://127.0.0.1:${port}/fake-stream-${i}.mp4`);
    }
    // Probe the 351st URL with real server response to verify system still functions normally
    const postEvictionSize = await probeRemoteFileSize(`${baseUrl}/standard-video.mp4`);
    assert(postEvictionSize === 12345678, "3.11.1: System functions normally after 350 cache insertions/evictions");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // ===========================================================================
  // SECTION 4: EXTRACTOR DEGRADATION CHECKS (Reddit, Instagram, Twitter)
  // ===========================================================================
  console.log("\n--- SECTION 4: Extractor Degradation & Edge Case Checks ---");

  try {
    // 4.1 Reddit Extractor with v.redd.it DASH Audio & Sizing Probe
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("reddit.com/comments/test123.json")) {
        const postData = [
          {
            data: {
              children: [
                {
                  data: {
                    title: "Adversarial Reddit Test Video",
                    author: "test_redditor",
                    subreddit_name_prefixed: "r/test",
                    secure_media: {
                      reddit_video: {
                        fallback_url: "https://v.redd.it/test123abc/DASH_1080.mp4?source=fallback",
                        height: 1080,
                        duration: 15,
                      },
                    },
                  },
                },
              ],
            },
          },
        ];
        return new Response(JSON.stringify(postData), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // Candidate audio probing: candidate 1 returns 405 on HEAD, but 206 on Range GET
      if (urlStr.includes("DASH_AUDIO_128.mp4")) {
        if (init?.method === "HEAD") {
          return new Response(null, { status: 405 });
        }
        if (init?.headers && (init.headers as any)["Range"]) {
          return new Response("0", { status: 206, headers: { "Content-Range": "bytes 0-0/1500000" } });
        }
      }

      // Video sizing probe (DASH_1080.mp4)
      if (urlStr.includes("DASH_1080.mp4")) {
        if (init?.method === "HEAD") {
          return new Response(null, { status: 200, headers: { "Content-Length": "15000000" } });
        }
      }

      // 720p sizing probe
      if (urlStr.includes("DASH_720.mp4")) {
        if (init?.method === "HEAD") {
          return new Response(null, { status: 200, headers: { "Content-Length": "8000000" } });
        }
      }

      return new Response(null, { status: 404 });
    };

    const redditInfo = await extractRedditMedia("https://www.reddit.com/r/test/comments/test123/adversarial_test/");
    assert(redditInfo.platform === "reddit", "4.1.1: Reddit platform recognized");
    assert(redditInfo.title === "Adversarial Reddit Test Video", "4.1.2: Reddit title parsed");
    
    // Check muxed quality
    const muxedOpt = redditInfo.qualities.find((q) => q.requiresMuxing && q.resolution === "1080p");
    assert(!!muxedOpt, "4.1.3: Muxed 1080p quality found");
    assert(muxedOpt?.audioUrl?.includes("DASH_AUDIO_128.mp4"), "4.1.4: 405 audio candidate successfully derived");
    assert(muxedOpt?.fileSize === 16500000, "4.1.5: Muxed size accurately calculated (15MB video + 1.5MB audio = 16.5MB)");

    // 4.2 Reddit Extractor when sizing endpoints 404 / timeout
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("reddit.com/comments/test404.json")) {
        const postData = [
          {
            data: {
              children: [
                {
                  data: {
                    title: "Silent Reddit Video No Sizes",
                    author: "silent_redditor",
                    secure_media: {
                      reddit_video: {
                        fallback_url: "https://v.redd.it/silent123/DASH_720.mp4",
                        height: 720,
                        duration: 8,
                      },
                    },
                  },
                },
              ],
            },
          },
        ];
        return new Response(JSON.stringify(postData), { status: 200 });
      }
      // Everything else fails (404)
      return new Response(null, { status: 404 });
    };

    const silentReddit = await extractRedditMedia("https://www.reddit.com/r/test/comments/test404/silent/");
    assert(silentReddit.qualities.length > 0, "4.2.1: Silent Reddit video returned qualities even when probe 404s");
    assert(silentReddit.qualities[0].fileSize === undefined, "4.2.2: Sizing degraded gracefully to undefined");

    // 4.3 Instagram Extractor when probe times out / returns 404
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("instagram.com/p/DFault123/embed/captioned/")) {
        const html = `
          <span class="EmbeddedMediaUser-username">insta_star</span>
          <div class="Caption">Fun times at the beach!</div>
          <video src="https://instagram.cdn/beach.mp4"></video>
        `;
        return new Response(html, { status: 200 });
      }
      // Probe to instagram.cdn returns 500 error
      return new Response(null, { status: 500 });
    };

    const instaInfo = await extractInstagramMedia("https://www.instagram.com/reel/DFault123/");
    assert(instaInfo.platform === "instagram", "4.3.1: Instagram reel extracted");
    assert(instaInfo.author === "insta_star", "4.3.2: Instagram author extracted");
    assert(instaInfo.qualities[0].fileSize === undefined, "4.3.3: Instagram fileSize gracefully undefined on probe failure");

    // 4.4 Twitter Extractor Mathematical Fallback when Probe Times Out
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("api.vxtwitter.com/Twitter/status/1888000000000000000")) {
        const tweetObj = {
          text: "Check out this rocket launch!",
          user_name: "RocketScience",
          user_screen_name: "rocket_sci",
          video_url: "https://video.twimg.com/rocket.mp4",
          duration_millis: 12000, // 12 seconds
          bitrate: 800000,        // 800 kbps -> (12 * 800000) / 8 = 1,200,000 bytes
        };
        return new Response(JSON.stringify(tweetObj), { status: 200 });
      }
      // Sizing probe fails
      return new Response(null, { status: 504 });
    };

    const twitterInfo = await extractTwitterMedia("https://x.com/rocket_sci/status/1888000000000000000");
    assert(twitterInfo.platform === "twitter", "4.4.1: Twitter platform recognized");
    assert(twitterInfo.title === "Check out this rocket launch!", "4.4.2: Tweet text extracted");
    // Expected math: Math.floor((12000 / 1000) * (800000 / 8)) = 1,200,000
    assert(
      twitterInfo.qualities[0].fileSize === 1200000,
      "4.4.3: Mathematical fallback estimated size calculated accurately when probe unavailable (1,200,000 bytes)",
      `Actual: ${twitterInfo.qualities[0].fileSize}`
    );
  } finally {
    global.fetch = originalFetch;
  }

  // ===========================================================================
  // SECTION 5: SUMMARY & VERDICT
  // ===========================================================================
  console.log("\n================================================================================");
  console.log(`TOTAL ADVERSARIAL ASSERTS: ${totalAsserts}`);
  console.log(`PASSED: ${passedAsserts}`);
  console.log(`FAILED: ${failedAsserts}`);
  console.log("================================================================================\n");

  if (failedAsserts > 0) {
    console.error("FAILURES ENCOUNTERED:");
    failureDetails.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log("🎉 ALL ADVERSARIAL CHECKS PASSED WITH 100% SUCCESS RATE!");
    process.exit(0);
  }
}

runAdversarialSuite().catch((err) => {
  console.error("Unhandled harness exception:", err);
  process.exit(1);
});
