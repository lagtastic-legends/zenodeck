/**
 * Unit Test Suite for App Updater & Semver Comparison
 */

import { parseSemver, isNewerVersion, APP_VERSION } from "../src/config/version";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function runTests() {
  console.log("=== Testing App Updater & Semver ===");

  // 1. Test parseSemver
  assert(JSON.stringify(parseSemver("v3.4.6")) === JSON.stringify([3, 4, 6]), "parseSemver with 'v'");
  assert(JSON.stringify(parseSemver("3.4.6")) === JSON.stringify([3, 4, 6]), "parseSemver without 'v'");
  assert(JSON.stringify(parseSemver("4.0.0")) === JSON.stringify([4, 0, 0]), "parseSemver major 4");
  console.log("✓ parseSemver passed");

  // 2. Test isNewerVersion
  assert(isNewerVersion("v3.5.1", "3.5.0") === true, "3.5.1 > 3.5.0");
  assert(isNewerVersion("3.6.0", "3.5.0") === true, "3.6.0 > 3.5.0");
  assert(isNewerVersion("4.0.0", "3.5.0") === true, "4.0.0 > 3.5.0");
  assert(isNewerVersion("3.5.0", "3.5.0") === false, "3.5.0 not > 3.5.0");
  assert(isNewerVersion("3.4.9", "3.5.0") === false, "3.4.9 not > 3.5.0");
  assert(isNewerVersion("2.9.9", "3.5.0") === false, "2.9.9 not > 3.5.0");
  console.log("✓ isNewerVersion comparisons passed");

  // 3. Test current version
  assert(APP_VERSION === "3.6.0", "APP_VERSION must be 3.6.0");
  console.log("✓ APP_VERSION config constant verified: " + APP_VERSION);

  console.log("ALL UPDATER TESTS PASSED! (8/8)");
}

runTests();
