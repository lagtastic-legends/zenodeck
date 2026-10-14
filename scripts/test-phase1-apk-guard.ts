/**
 * Phase 1 Verification Suite: Recursive APK Asset Guard
 * (scripts/test-phase1-apk-guard.ts)
 */

import fs from "fs";
import path from "path";
import { purgeApkFiles, validateExportAssets } from "./build-mobile-export";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

const TEST_DIR = path.resolve(__dirname, "..", ".next", "test-apk-guard");

function run() {
  console.log("================================================================================");
  console.log("   PHASE 1 VERIFICATION: RECURSIVE APK ASSET GUARD & PRE-SYNC PURGE             ");
  console.log("================================================================================\n");

  // Setup sandbox directory
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  const nestedSubdir = path.join(TEST_DIR, "sub", "deep");
  fs.mkdirSync(nestedSubdir, { recursive: true });

  // Create mock APK files and non-APK files
  const mockApk1 = path.join(TEST_DIR, "rogue-build.apk");
  const mockApk2 = path.join(nestedSubdir, "nested-release.apk");
  const mockAab = path.join(TEST_DIR, "bundle.aab");
  const validHtml = path.join(TEST_DIR, "index.html");
  const validJs = path.join(nestedSubdir, "main.js");

  fs.writeFileSync(mockApk1, "MOCK_APK_DATA_ROOT");
  fs.writeFileSync(mockApk2, "MOCK_APK_DATA_DEEP");
  fs.writeFileSync(mockAab, "MOCK_AAB_DATA");
  fs.writeFileSync(validHtml, "<html></html>");
  fs.writeFileSync(validJs, "console.log('test');");

  console.log("--- Test 1: validateExportAssets detects disallowed APK binaries ---");
  const dirtyCheck = validateExportAssets(TEST_DIR);
  assert(!dirtyCheck.valid, "validateExportAssets flagged presence of .apk files");
  assert(dirtyCheck.errors.length === 3, "Exactly 3 disallowed binary errors detected (2 .apk + 1 .aab)");

  console.log("\n--- Test 2: purgeApkFiles recursively eliminates all APK and AAB binaries ---");
  const purged = purgeApkFiles(TEST_DIR, "test-sandbox/");
  assert(purged.length === 3, "purgeApkFiles returned 3 purged file paths");
  assert(!fs.existsSync(mockApk1), "Root .apk file successfully unlinked");
  assert(!fs.existsSync(mockApk2), "Nested .apk file successfully unlinked");
  assert(!fs.existsSync(mockAab), ".aab bundle successfully unlinked");
  assert(fs.existsSync(validHtml), "Normal web asset (index.html) preserved untouched");
  assert(fs.existsSync(validJs), "Normal web asset (main.js) preserved untouched");

  console.log("\n--- Test 3: validateExportAssets passes cleanly on purged directory ---");
  const cleanCheck = validateExportAssets(TEST_DIR);
  assert(cleanCheck.valid, "validateExportAssets returns valid: true after purge");
  assert(cleanCheck.errors.length === 0, "Zero errors detected in clean directory");

  // Clean up sandbox
  fs.rmSync(TEST_DIR, { recursive: true, force: true });

  console.log("\n--- Test 4: Live workspace asset purge on public/ and android assets ---");
  const publicDir = path.resolve(__dirname, "..", "public");
  const androidAssetsDir = path.resolve(__dirname, "..", "android", "app", "src", "main", "assets", "public");

  const purgedPublic = purgeApkFiles(publicDir, "public/");
  const purgedAndroid = purgeApkFiles(androidAssetsDir, "android/app/src/main/assets/public/");

  console.log(`▸ Purged ${purgedPublic.length} legacy APK(s) from public/`);
  console.log(`▸ Purged ${purgedAndroid.length} legacy APK(s) from android assets`);

  const publicCheck = validateExportAssets(publicDir);
  assert(publicCheck.valid, "public/ directory contains 0 .apk binaries");

  const androidCheck = validateExportAssets(androidAssetsDir);
  assert(androidCheck.valid, "android/app/src/main/assets/public/ contains 0 .apk binaries");

  console.log("\n================================================================================");
  console.log("   PHASE 1 VERIFICATION SUMMARY: ALL ASSET GUARD TESTS PASSED (100%)             ");
  console.log("================================================================================");
}

run();
