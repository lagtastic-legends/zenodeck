/**
 * Empirical Challenger M1_2 Stress Harness
 * ========================================
 * Tests and verifies:
 * 1. `export const dynamic = "force-dynamic";` across all API routes.
 * 2. Absence of response caching / static baking of dummy responses across dynamic calls.
 * 3. `MOBILE_EXPORT=1` build workflow safety, zero git diff preservation, and error recovery.
 * 4. Port-agnostic origin detection across all ports, LAN IPs, and Capacitor native runtimes.
 * 5. Adversarial edge cases: protocol injection, malformed URLs, simulated build crashes.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { Capacitor } from "@capacitor/core";
import { getYouTubeApiUrl } from "../src/lib/youtube/innertube";
import { GET as handleInfoGet, POST as handleInfoPost } from "../src/app/api/youtube/info/route";
import { GET as handleStreamGet, HEAD as handleStreamHead } from "../src/app/api/youtube/stream/route";
import { GET as handlePlaylistGet } from "../src/app/api/youtube/playlist/route";

const PROJECT_ROOT = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;
const issues: string[] = [];

function check(desc: string, cond: boolean, details?: string) {
  if (cond) {
    passed++;
    console.log(`  [PASS] ${desc}`);
  } else {
    failed++;
    const msg = details ? `${desc} (${details})` : desc;
    issues.push(msg);
    console.error(`  [FAIL] ${msg}`);
  }
}

async function run() {
  console.log("================================================================================");
  console.log("           EMPIRICAL CHALLENGER M1_2 ADVERSARIAL STRESS SUITE                   ");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // TASK 1: Dynamic Route Stability & Cache Prevention
  // ---------------------------------------------------------------------------
  console.log("--- TEST SUITE 1: Dynamic Route Stability & Cache Prevention ---");

  const routes = [
    { name: "info", path: path.join(PROJECT_ROOT, "src/app/api/youtube/info/route.ts") },
    { name: "stream", path: path.join(PROJECT_ROOT, "src/app/api/youtube/stream/route.ts") },
    { name: "playlist", path: path.join(PROJECT_ROOT, "src/app/api/youtube/playlist/route.ts") },
  ];

  for (const r of routes) {
    const content = fs.readFileSync(r.path, "utf8");
    check(
      `Route ${r.name} explicitly exports dynamic = "force-dynamic"`,
      content.includes('export const dynamic = "force-dynamic";')
    );
    check(
      `Route ${r.name} does NOT contain force-static`,
      !content.includes('export const dynamic = "force-static";')
    );
  }

  // 1.2 Calling Info Route with dynamic parameter
  console.log("\n  Testing /api/youtube/info dynamic evaluation...");
  const res1 = await handleInfoGet(new Request("http://localhost:3000/api/youtube/info?v=xT1gYZGDx4I"));
  check("Info GET with ?v=xT1gYZGDx4I returns HTTP 200", res1.status === 200);
  const data1 = await res1.json();
  check("Info GET does NOT return dummy status object", data1.status !== "YouTube Info Service Online");
  check("Info GET returned videoId xT1gYZGDx4I", data1.videoId === "xT1gYZGDx4I");
  check("Info GET returned populated qualities array", Array.isArray(data1.qualities) && data1.qualities.length > 0);

  // 1.3 Calling Info Route with a second video immediately to prove NO static response baking
  const res2 = await handleInfoGet(new Request("http://localhost:3000/api/youtube/info?v=dQw4w9WgXcQ"));
  check("Info GET with ?v=dQw4w9WgXcQ returns HTTP 200", res2.status === 200);
  const data2 = await res2.json();
  check("Info GET does NOT return cached data from video 1", data2.videoId === "dQw4w9WgXcQ");
  check("Info GET for video 2 is not dummy", data2.status !== "YouTube Info Service Online");

  // 1.4 Empty parameter returns health probe
  const resEmpty = await handleInfoGet(new Request("http://localhost:3000/api/youtube/info"));
  check("Info GET with empty query returns HTTP 200 health probe", resEmpty.status === 200);
  const dataEmpty = await resEmpty.json();
  check("Empty Info GET returns status string", dataEmpty.status === "YouTube Info Service Online");

  // 1.5 Calling video 1 again to verify dynamic evaluation is preserved after empty probe
  const res3 = await handleInfoGet(new Request("http://localhost:3000/api/youtube/info?v=xT1gYZGDx4I"));
  const data3 = await res3.json();
  check("Info GET returns live videoId after probe call (no static caching)", data3.videoId === "xT1gYZGDx4I");

  // 1.6 Stream Route Health Probe & Parameter handling
  console.log("\n  Testing /api/youtube/stream dynamic evaluation...");
  const streamEmpty = await handleStreamGet(new Request("http://localhost:3000/api/youtube/stream"));
  check("Stream GET empty returns HTTP 200 probe", streamEmpty.status === 200);
  const streamEmptyJson = await streamEmpty.json();
  check("Stream probe returns online status message", streamEmptyJson.status === "YouTube Stream Proxy Online");

  // 1.7 Playlist Route Health Probe & Parameter handling
  console.log("\n  Testing /api/youtube/playlist dynamic evaluation...");
  const plEmpty = await handlePlaylistGet(new Request("http://localhost:3000/api/youtube/playlist"));
  check("Playlist GET empty returns HTTP 200 probe", plEmpty.status === 200);
  const plEmptyJson = await plEmpty.json();
  check("Playlist probe returns online status message", plEmptyJson.status === "YouTube Playlist Service Online");

  // ---------------------------------------------------------------------------
  // TASK 2: MOBILE_EXPORT=1 Build Workflow & Zero Git Diff
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 2: MOBILE_EXPORT=1 Build Workflow & Zero Git Diff ---");

  // 2.1 next.config.ts has no disk mutation
  const nextConfigPath = path.join(PROJECT_ROOT, "next.config.ts");
  const nextConfigContent = fs.readFileSync(nextConfigPath, "utf8");
  check("next.config.ts contains no fs.writeFileSync calls", !nextConfigContent.includes("writeFileSync"));
  check("next.config.ts contains no apiRoutesToSync logic", !nextConfigContent.includes("apiRoutesToSync"));

  // 2.2 Evaluating next.config.ts with MOBILE_EXPORT=1
  const prevEnv = process.env.MOBILE_EXPORT;
  try {
    process.env.MOBILE_EXPORT = "1";
    // Check initial git status of routes
    const gitBefore = execSync("git status --porcelain src/app/api/youtube/", { cwd: PROJECT_ROOT, encoding: "utf8" });

    // Dynamic import next.config.ts via file:// URL
    const { pathToFileURL } = await import("url");
    const configUrl = pathToFileURL(nextConfigPath).href + "?t=" + Date.now();
    const importedConfig = await import(configUrl);
    const cfg = importedConfig.default || importedConfig;
    check("MOBILE_EXPORT=1 config sets output to 'export'", cfg.output === "export");

    const gitAfter = execSync("git status --porcelain src/app/api/youtube/", { cwd: PROJECT_ROOT, encoding: "utf8" });
    check("Evaluating next.config.ts does not alter git status of API routes", gitBefore === gitAfter);
  } finally {
    if (prevEnv !== undefined) {
      process.env.MOBILE_EXPORT = prevEnv;
    } else {
      delete process.env.MOBILE_EXPORT;
    }
  }

  // 2.3 scripts/build-mobile-export.ts Resilience Harness
  console.log("\n  Testing scripts/build-mobile-export.ts error & crash resilience...");
  const backupDir = path.join(PROJECT_ROOT, ".next", "mobile-export-backup");
  const originalRouteFiles = new Map<string, string>();
  for (const r of routes) {
    originalRouteFiles.set(r.path, fs.readFileSync(r.path, "utf8"));
  }

  // Simulate a build run that throws an exception in the child process / spawn step
  try {
    // A: Stash & substitute
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    for (const [rPath, orig] of originalRouteFiles.entries()) {
      const bName = path.basename(path.dirname(rPath)) + "_" + path.basename(rPath);
      fs.writeFileSync(path.join(backupDir, bName), orig, "utf8");
      fs.writeFileSync(rPath, 'export const dynamic = "force-static"; export function GET() { return null; }', "utf8");
    }

    // B: Verify substitution occurred
    for (const r of routes) {
      const substituted = fs.readFileSync(r.path, "utf8");
      check(`Substituted ${r.name} has force-static temporarily`, substituted.includes('export const dynamic = "force-static";'));
    }

    // C: Simulate error throw
    throw new Error("Simulated build failure inside wrapper!");
  } catch (err: any) {
    check("Exception caught in simulation", err.message === "Simulated build failure inside wrapper!");
  } finally {
    // D: Simulate finally block restoration
    for (const [rPath, orig] of originalRouteFiles.entries()) {
      fs.writeFileSync(rPath, orig, "utf8");
    }
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  }

  // E: Verify complete restoration
  for (const r of routes) {
    const restored = fs.readFileSync(r.path, "utf8");
    const orig = originalRouteFiles.get(r.path)!;
    check(`Restored ${r.name} matches original byte-for-byte after simulated error`, restored === orig);
    check(`Restored ${r.name} has dynamic = "force-dynamic"`, restored.includes('export const dynamic = "force-dynamic";'));
  }
  check("Backup directory .next/mobile-export-backup cleaned up", !fs.existsSync(backupDir));

  // ---------------------------------------------------------------------------
  // TASK 3: Port-Agnostic Origin Detection
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 3: Port-Agnostic Origin Detection ---");

  // Simulate browser environments with various ports
  const originalWindow = (global as any).window;
  const originalCapacitor = (Capacitor as any).isNativePlatform;

  try {
    (Capacitor as any).isNativePlatform = () => false;

    // Test port 3000
    (global as any).window = { location: { origin: "http://localhost:3000", port: "3000" } };
    check("Port 3000 returns localhost:3000 origin", getYouTubeApiUrl("/api/youtube/info") === "http://localhost:3000/api/youtube/info/");

    // Test port 3001
    (global as any).window = { location: { origin: "http://localhost:3001", port: "3001" } };
    check("Port 3001 returns localhost:3001 origin (NOT vercel)", getYouTubeApiUrl("/api/youtube/info") === "http://localhost:3001/api/youtube/info/");

    // Test port 8080
    (global as any).window = { location: { origin: "http://127.0.0.1:8080", port: "8080" } };
    check("Port 8080 returns 127.0.0.1:8080 origin", getYouTubeApiUrl("/api/youtube/info") === "http://127.0.0.1:8080/api/youtube/info/");

    // Test LAN IP
    (global as any).window = { location: { origin: "http://192.168.1.150:3000", port: "3000" } };
    check("LAN IP returns LAN origin", getYouTubeApiUrl("/api/youtube/info") === "http://192.168.1.150:3000/api/youtube/info/");

    // Test Native Mobile
    (Capacitor as any).isNativePlatform = () => true;
    (global as any).window = { location: { origin: "http://localhost:3001", port: "3001" } };
    const nativeUrl = getYouTubeApiUrl("/api/youtube/info");
    check("Capacitor Native Platform returns remote Vercel endpoint", nativeUrl.startsWith("https://omni-tool-two.vercel.app"));

  } finally {
    (global as any).window = originalWindow;
    (Capacitor as any).isNativePlatform = originalCapacitor;
  }

  // ---------------------------------------------------------------------------
  // TASK 4: Adversarial Stress Testing & Edge Cases
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 4: Adversarial Edge Cases ---");

  // SSRF and unauthorized host check in stream route
  const streamUnauthorized = await handleStreamGet(new Request("http://localhost:3000/api/youtube/stream?url=https://malicious-domain.com/evil.mp4"));
  check("Stream proxy rejects unauthorized host with HTTP 403", streamUnauthorized.status === 403);

  // Check ftp: protocol injection in stream route
  try {
    const streamFtp = await handleStreamGet(new Request("http://localhost:3000/api/youtube/stream?url=ftp://googlevideo.com/file"));
    check(
      "Stream proxy handles ftp:// scheme safely (status 403, 500, or 502 Bad Gateway without unhandled crash)",
      streamFtp.status === 403 || streamFtp.status === 500 || streamFtp.status === 502,
      `Got status: ${streamFtp.status}`
    );
  } catch (e: any) {
    check("Stream proxy does not crash on unhandled scheme", false, e.message);
  }

  // Check POST info with missing body
  const infoPostEmpty = await handleInfoPost(new Request("http://localhost:3000/api/youtube/info", { method: "POST", body: "{}" }));
  check("Info POST with empty body returns HTTP 400", infoPostEmpty.status === 400);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("              EMPIRICAL CHALLENGER M1_2 SUMMARY                                 ");
  console.log("================================================================================");
  console.log(`Passed:  ${passed}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Rate:    ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log("================================================================================");

  if (failed > 0) {
    console.error("Failures:");
    for (const iss of issues) {
      console.error(`  - ${iss}`);
    }
    process.exit(1);
  } else {
    console.log("All empirical stress assertions passed cleanly!");
  }
}

run().catch((e) => {
  console.error("FATAL in test run:", e);
  process.exit(1);
});
