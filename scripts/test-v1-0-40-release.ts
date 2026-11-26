setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 20000).unref();

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalizeYouTubeUrl,
  isAllowedStreamHost,
  ALLOWED_STREAM_DOMAINS,
} from "../src/lib/media/stream-security";

console.log("=== ZENODECK & ZENOTAP v1.0.40 RELEASE VERIFICATION ===");

const root = path.resolve(__dirname, "..");

// 1. Version Synchronization
console.log("\n[1/4] Checking v1.0.40 version synchronization...");
const versionTs = fs.readFileSync(path.join(root, "src/config/version.ts"), "utf-8");
assert(versionTs.includes('APP_VERSION = "1.0.40"'), 'src/config/version.ts APP_VERSION === "1.0.40"');

const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
assert.equal(pkgJson.version, "1.0.40", 'package.json version === "1.0.40"');
assert(pkgJson.scripts["test:ci"].includes("test-youtu-be-cdn-allowlist.ts"), "package.json test:ci includes test-youtu-be-cdn-allowlist.ts");
assert(pkgJson.scripts["test:ci"].includes("test-v1-0-40-release.ts"), "package.json test:ci includes test-v1-0-40-release.ts");

const gradle = fs.readFileSync(path.join(root, "android/app/build.gradle"), "utf-8");
assert(gradle.includes('versionName "1.0.40"'), 'build.gradle versionName === "1.0.40"');
assert(gradle.includes("versionCode 10040"), "build.gradle versionCode === 10040");

const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf-8");
assert(changelog.includes("## [1.0.40] — 2026-11-26"), "CHANGELOG.md documents [1.0.40]");

const releaseNotes = fs.readFileSync(path.join(root, "RELEASE_NOTES_v1.0.40.md"), "utf-8");
assert(releaseNotes.includes("v1.0.40") && releaseNotes.includes("10040"), "RELEASE_NOTES_v1.0.40.md valid");

const readme = fs.readFileSync(path.join(root, "README.md"), "utf-8");
assert(readme.includes("v1.0.40"), "README.md highlights v1.0.40");

const whatsNew = fs.readFileSync(path.join(root, "src/components/shell/whats-new-modal.tsx"), "utf-8");
assert(whatsNew.includes("YouTube Short-Link &amp; Cloud Fix"), "whats-new-modal.tsx includes v1.0.40 card");
console.log("✅ Version parity, changelog, release notes, README & What's New verified.");

// 2. Canonicalization & SSRF Allowlist Parity
console.log("\n[2/4] Checking youtu.be canonicalization & SSRF allowlist...");
assert.equal(
  canonicalizeYouTubeUrl("https://youtu.be/rxwTkp_xHSE"),
  "https://www.youtube.com/watch?v=rxwTkp_xHSE"
);
assert(ALLOWED_STREAM_DOMAINS.includes("youtube-nocookie.com"));
assert(ALLOWED_STREAM_DOMAINS.includes("ytimg.com"));
assert(isAllowedStreamHost("https://youtu.be/rxwTkp_xHSE"));
assert(isAllowedStreamHost("https://www.youtube-nocookie.com/embed/rxwTkp_xHSE"));
assert(!isAllowedStreamHost("http://127.0.0.1/admin"));
assert(!isAllowedStreamHost("http://169.254.169.254/latest/meta-data/"));
console.log("✅ Canonicalization & SSRF allowlist verified.");

// 3. Downloader UI Error Banner & Embed Fallback Guards
console.log("\n[3/4] Checking youtube-downloader.tsx fallback & error clearing...");
const ytDownloader = fs.readFileSync(path.join(root, "src/components/tools/youtube-downloader.tsx"), "utf-8");
assert(ytDownloader.includes("canonicalizeYouTubeUrl"), "youtube-downloader.tsx uses canonicalizeYouTubeUrl");
assert(ytDownloader.includes("setResolveError(null);"), "youtube-downloader.tsx clears stale resolveError");
assert(ytDownloader.includes("isCloudEmbedFallback"), "youtube-downloader.tsx handles cloud-restricted embed fallback gracefully");
console.log("✅ Downloader UI error suppression & cloud fallback guards verified.");

// 4. Android Build Hygiene
console.log("\n[4/4] Checking Android build invariants...");
function hasApkInDir(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && hasApkInDir(full)) return true;
    if (entry.isFile() && /\.(apk|aab)$/i.test(entry.name)) return true;
  }
  return false;
}
assert(!hasApkInDir(path.join(root, "public")), "public/ contains zero leaked .apk/.aab binaries");
console.log("✅ Android build hygiene verified.");

console.log("\n🎉 ALL v1.0.40 RELEASE CHECKS PASSED (100% GREEN)!");
process.exit(0);
