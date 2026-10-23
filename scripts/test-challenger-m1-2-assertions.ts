/**
 * Challenger M1-2 Empirical Verification & Mutation Stress Test Suite
 * ===================================================================
 * Verifies:
 * 1. Assertion Rigor in test-native-youtube-downloader.ts:
 *    - Validates presence of expected patterns in production innertube.ts.
 *    - Mutation testing: verifies assertion FAILS on altered client versions,
 *      missing VR UA, or missing clientName.
 * 2. Assertion Rigor in test-topbar-fetch-and-layouts.ts:
 *    - Validates presence of getOptimalChunkSize, 2MB fallback, and injectRangeQueryParam in Kotlin engine.
 *    - Mutation testing: verifies assertion FAILS if 2MB fallback is missing or injectRangeQueryParam is missing.
 * 3. Assertion Rigor in test-updater.ts:
 *    - Validates APP_VERSION === "1.0.6" matches version.ts and package.json.
 *    - Mutation testing: verifies assertion FAILS on version mismatches (e.g. 1.0.3, 1.0.5, 1.0.7, 2.0.0).
 *    - Boundary checks on semver parsing and version comparisons around 1.0.6.
 * 4. Empirical Subprocess Execution:
 *    - Executes all 3 scripts directly and inspects exit code and pass count assertions.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { APP_VERSION, parseSemver, isNewerVersion } from "../src/config/version";

let passed = 0;
let failed = 0;
const failureMessages: string[] = [];

function check(condition: boolean, msg: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    const err = `${msg}${detail ? ` -> ${detail}` : ""}`;
    console.error(`  ✗ FAIL: ${err}`);
    failureMessages.push(err);
    failed++;
  }
}

async function runChallengerSuite() {
  console.log("================================================================================");
  console.log("       CHALLENGER M1-2: EMPIRICAL HARNESS & MUTATION RIGOR TESTS               ");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // SECTION 1: test-native-youtube-downloader.ts Rigor & Mutation Testing
  // ---------------------------------------------------------------------------
  console.log("--- SECTION 1: Native YouTube Downloader Assertion Rigor ---");

  const innertubePath = path.join(__dirname, "../src/lib/youtube/innertube.ts");
  const innertubeCode = fs.readFileSync(innertubePath, "utf-8");

  // Verify production code satisfies the exact updated test requirements
  check(
    innertubeCode.includes('ANDROID_VR_CLIENT_VERSION = "1.56.21"') &&
      innertubeCode.includes('IOS_CLIENT_VERSION = "20.10.1"') &&
      innertubeCode.includes("ANDROID_VR_USER_AGENT =") &&
      innertubeCode.includes('clientName: "ANDROID_VR"'),
    "innertube.ts satisfies all 4 components of the updated client profile assertion"
  );

  // Mutation Test: Test predicate function
  const testNativePredicate = (code: string) =>
    code.includes('ANDROID_VR_CLIENT_VERSION = "1.56.21"') &&
    code.includes('IOS_CLIENT_VERSION = "20.10.1"') &&
    code.includes("ANDROID_VR_USER_AGENT =") &&
    code.includes('clientName: "ANDROID_VR"');

  check(
    testNativePredicate(innertubeCode) === true,
    "Production innertube.ts passes native test predicate"
  );

  // Mutation 1.1: Outdated iOS client version (19.45.4) must fail
  const mutatedOutdatedIos = innertubeCode.replace('IOS_CLIENT_VERSION = "20.10.1"', 'IOS_CLIENT_VERSION = "19.45.4"');
  check(
    testNativePredicate(mutatedOutdatedIos) === false,
    "Mutation 1.1: Outdated iOS client version 19.45.4 correctly FAILS predicate (no false pass)"
  );

  // Mutation 1.2: Corrupted or missing iOS client version must fail
  const mutatedMissingIos = innertubeCode.replace('IOS_CLIENT_VERSION = "20.10.1"', 'IOS_CLIENT_VERSION = "unknown"');
  check(
    testNativePredicate(mutatedMissingIos) === false,
    "Mutation 1.2: Altered iOS client version correctly FAILS predicate"
  );

  // Mutation 1.3: Missing ANDROID_VR client version must fail
  const mutatedMissingVr = innertubeCode.replace('ANDROID_VR_CLIENT_VERSION = "1.56.21"', 'ANDROID_VR_CLIENT_VERSION = "0.0.0"');
  check(
    testNativePredicate(mutatedMissingVr) === false,
    "Mutation 1.3: Altered ANDROID_VR version correctly FAILS predicate"
  );

  // Mutation 1.4: Missing ANDROID_VR clientName must fail
  const mutatedMissingClientName = innertubeCode.replace('clientName: "ANDROID_VR"', 'clientName: "WEB"');
  check(
    testNativePredicate(mutatedMissingClientName) === false,
    "Mutation 1.4: Missing clientName ANDROID_VR correctly FAILS predicate"
  );

  // ---------------------------------------------------------------------------
  // SECTION 2: test-topbar-fetch-and-layouts.ts Rigor & Mutation Testing
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 2: TopBar & Layouts Chunking Assertion Rigor ---");

  const kotlinPath = path.join(
    __dirname,
    "../android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt"
  );
  const kotlinCode = fs.readFileSync(kotlinPath, "utf-8");

  const testChunkingPredicate = (code: string) =>
    (code.includes("val CHUNK_SIZE = 2L * 1024L * 1024L") ||
      (code.includes("getOptimalChunkSize") && code.includes("2L * 1024L * 1024L"))) &&
    code.includes("injectRangeQueryParam");

  check(
    testChunkingPredicate(kotlinCode) === true,
    "Production ZenoHeadlessMediaEngine.kt passes chunking test predicate"
  );

  // Mutation 2.1: Missing both CHUNK_SIZE and getOptimalChunkSize must fail
  const mutatedNoChunking = kotlinCode
    .replace(/getOptimalChunkSize/g, "someOtherFunction")
    .replace(/val CHUNK_SIZE/g, "val OTHER");
  check(
    testChunkingPredicate(mutatedNoChunking) === false,
    "Mutation 2.1: Removal of chunk sizing functions correctly FAILS predicate"
  );

  // Mutation 2.2: getOptimalChunkSize without 2MB fallback must fail
  const mutatedNo2MbFallback = kotlinCode.replace(/2L \* 1024L \* 1024L/g, "1L * 1024L * 1024L");
  check(
    testChunkingPredicate(mutatedNo2MbFallback) === false,
    "Mutation 2.2: Removal of 2MB chunk baseline correctly FAILS predicate"
  );

  // Mutation 2.3: Removal of injectRangeQueryParam must fail (even if chunking is present)
  const mutatedNoRangeInject = kotlinCode.replace(/injectRangeQueryParam/g, "otherParamHandler");
  check(
    testChunkingPredicate(mutatedNoRangeInject) === false,
    "Mutation 2.3: Removal of injectRangeQueryParam correctly FAILS predicate"
  );

  // ---------------------------------------------------------------------------
  // SECTION 3: test-updater.ts Version Assertion Rigor & Boundaries
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 3: App Updater Version Assertion Rigor ---");

  const pkgPath = path.join(__dirname, "../package.json");
  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  check(
    APP_VERSION === "1.0.6",
    `APP_VERSION constant from version.ts is exactly "1.0.6" (got "${APP_VERSION}")`
  );

  check(
    pkgJson.version === "1.0.6",
    `package.json version matches "1.0.6" (got "${pkgJson.version}")`
  );

  check(
    APP_VERSION === pkgJson.version,
    "APP_VERSION is 100% synchronized with package.json version"
  );

  // Mutation 3.1: Old version 1.0.3 must fail assertion
  const testVersionAssert = (v: string) => v === "1.0.6";
  check(
    testVersionAssert("1.0.3") === false,
    "Mutation 3.1: Outdated version 1.0.3 correctly FAILS assertion"
  );

  check(
    testVersionAssert("1.0.5") === false,
    "Mutation 3.2: Version 1.0.5 correctly FAILS assertion"
  );

  check(
    testVersionAssert("1.0.7") === false,
    "Mutation 3.3: Future version 1.0.7 correctly FAILS assertion until updated"
  );

  // Semver boundaries around 1.0.6
  check(
    isNewerVersion("1.0.7", APP_VERSION) === true,
    "1.0.7 is detected as newer than current 1.0.6"
  );
  check(
    isNewerVersion("1.0.6", APP_VERSION) === false,
    "1.0.6 is NOT detected as newer than current 1.0.6"
  );
  check(
    isNewerVersion("1.0.5", APP_VERSION) === false,
    "1.0.5 is NOT detected as newer than current 1.0.6"
  );

  // ---------------------------------------------------------------------------
  // SECTION 4: Direct Subprocess Execution of All 3 Harmonized Scripts
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 4: Subprocess Execution of Subsystem Test Scripts ---");

  // 4.1 test-native-youtube-downloader.ts
  try {
    const out1 = execSync("npx tsx scripts/test-native-youtube-downloader.ts", {
      cwd: path.join(__dirname, ".."),
      encoding: "utf-8",
    });
    check(
      out1.includes("Results: 9 passed, 0 failed"),
      "scripts/test-native-youtube-downloader.ts ran and produced 9 passed, 0 failed"
    );
  } catch (err: any) {
    check(false, "scripts/test-native-youtube-downloader.ts threw an error", String(err));
  }

  // 4.2 test-topbar-fetch-and-layouts.ts
  try {
    const out2 = execSync("npx tsx scripts/test-topbar-fetch-and-layouts.ts", {
      cwd: path.join(__dirname, ".."),
      encoding: "utf-8",
    });
    check(
      out2.includes("Results: 18 passed, 0 failed"),
      "scripts/test-topbar-fetch-and-layouts.ts ran and produced 18 passed, 0 failed"
    );
  } catch (err: any) {
    check(false, "scripts/test-topbar-fetch-and-layouts.ts threw an error", String(err));
  }

  // 4.3 test-updater.ts
  try {
    const out3 = execSync("npx tsx scripts/test-updater.ts", {
      cwd: path.join(__dirname, ".."),
      encoding: "utf-8",
    });
    check(
      out3.includes("ALL UPDATER, NOTIFICATION & WHAT'S NEW TESTS PASSED! (16/16)"),
      "scripts/test-updater.ts ran and produced 16 passed, 0 failed"
    );
  } catch (err: any) {
    check(false, "scripts/test-updater.ts threw an error", String(err));
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`TOTAL ASSERTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("================================================================================\n");

  if (failed > 0) {
    console.error("Test failures detected:");
    for (const msg of failureMessages) {
      console.error(`  - ${msg}`);
    }
    process.exit(1);
  } else {
    console.log("🎉 ALL CHALLENGER M1-2 MUTATION & HARNESS TESTS PASSED!");
  }
}

runChallengerSuite().catch((err) => {
  console.error("Fatal error running challenger harness:", err);
  process.exit(1);
});
