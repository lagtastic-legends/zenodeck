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
  assert(APP_VERSION === "3.9.2", "APP_VERSION must be 3.9.2");
  console.log("✓ APP_VERSION config constant verified: " + APP_VERSION);

  // 4. Test dismissUpdateNotification logic
  const mockStorage: Record<string, string> = {
    zenodeck_update_cache: JSON.stringify({ timestamp: Date.now(), data: { latestVersion: "3.6.8" } }),
  };

  (global as any).window = {};
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
  };

  const { dismissUpdateNotification } = require("../src/lib/updater");
  dismissUpdateNotification();
  assert(mockStorage["zenodeck_update_cache"] === undefined, "Update cache must be deleted on dismiss");
  assert(typeof mockStorage["zenodeck_update_dismissed_at"] === "string", "Dismiss timestamp must be recorded");
  console.log("✓ dismissUpdateNotification successfully cleans update cache");

  // 5. Test useUpdateStore behavior
  const { useUpdateStore } = require("../src/lib/update-store");
  const store = useUpdateStore.getState();
  assert(store.autoUpdateEnabled === true, "autoUpdateEnabled defaults to true");

  store.toggleAutoUpdate();
  assert(useUpdateStore.getState().autoUpdateEnabled === false, "toggleAutoUpdate toggles to false");

  store.setAutoUpdateEnabled(true);
  assert(useUpdateStore.getState().autoUpdateEnabled === true, "setAutoUpdateEnabled sets to true");

  store.removeUpdate();
  assert(useUpdateStore.getState().updateInfo === null, "removeUpdate clears updateInfo");
  console.log("✓ useUpdateStore ON/OFF toggle and removeUpdate verified");

  console.log("ALL UPDATER & AUTO-UPDATE TESTS PASSED! (12/12)");
}

runTests();

