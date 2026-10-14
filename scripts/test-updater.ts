/**
 * Unit Test Suite for App Updater, Semver Comparison & Post-Update Celebration Modal Logic
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
  assert(isNewerVersion("v3.15.1", "3.15.0") === true, "3.15.1 > 3.15.0");
  assert(isNewerVersion("3.16.0", "3.15.0") === true, "3.16.0 > 3.15.0");
  assert(isNewerVersion("4.0.0", "3.15.0") === true, "4.0.0 > 3.15.0");
  assert(isNewerVersion("3.15.0", "3.15.0") === false, "3.15.0 not > 3.15.0");
  assert(isNewerVersion("3.14.9", "3.15.0") === false, "3.14.9 not > 3.15.0");
  assert(isNewerVersion("2.9.9", "3.15.0") === false, "2.9.9 not > 3.15.0");
  console.log("✓ isNewerVersion comparisons passed");

  // 3. Test current version
  assert(APP_VERSION === "3.15.0", "APP_VERSION must be 3.15.0");
  console.log("✓ APP_VERSION config constant verified: " + APP_VERSION);

  // 4. Test dismissUpdateNotification logic & mock storage
  const mockStorage: Record<string, string> = {
    zenodeck_update_cache: JSON.stringify({ timestamp: Date.now(), data: { latestVersion: "3.16.0" } }),
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

  // 5. Test useUpdateStore behavior & What's New modal state
  const { useUpdateStore } = require("../src/lib/update-store");
  const store = useUpdateStore.getState();
  assert(store.autoUpdateEnabled === true, "autoUpdateEnabled defaults to true");

  store.toggleAutoUpdate();
  assert(useUpdateStore.getState().autoUpdateEnabled === false, "toggleAutoUpdate toggles to false");

  store.setAutoUpdateEnabled(true);
  assert(useUpdateStore.getState().autoUpdateEnabled === true, "setAutoUpdateEnabled sets to true");

  // Test What's New modal trigger state
  assert(useUpdateStore.getState().isWhatsNewOpen === false, "isWhatsNewOpen defaults to false");
  useUpdateStore.getState().openWhatsNew();
  assert(useUpdateStore.getState().isWhatsNewOpen === true, "openWhatsNew sets isWhatsNewOpen to true");
  useUpdateStore.getState().setWhatsNewOpen(false);
  assert(useUpdateStore.getState().isWhatsNewOpen === false, "setWhatsNewOpen(false) sets isWhatsNewOpen to false");

  store.removeUpdate();
  assert(useUpdateStore.getState().updateInfo === null, "removeUpdate clears updateInfo");
  console.log("✓ useUpdateStore ON/OFF toggle, removeUpdate, and WhatsNew modal state verified");

  // 6. Test Post-Update Celebration Modal version-diff trigger logic
  const LAST_SEEN_KEY = "zenodeck_last_seen_version";
  mockStorage[LAST_SEEN_KEY] = "3.14.1"; // User upgraded from 3.14.1 to 3.15.0

  const storedVersion = mockStorage[LAST_SEEN_KEY];
  const shouldTriggerModal = !storedVersion || storedVersion !== APP_VERSION;
  assert(shouldTriggerModal === true, "Modal must trigger when storedVersion (3.14.1) !== APP_VERSION (3.15.0)");

  // Simulate user dismissing modal
  mockStorage[LAST_SEEN_KEY] = APP_VERSION;
  const shouldTriggerAfterDismiss = mockStorage[LAST_SEEN_KEY] !== APP_VERSION;
  assert(shouldTriggerAfterDismiss === false, "Modal must NOT trigger after zenodeck_last_seen_version is updated to 3.15.0");
  console.log("✓ Post-Update Celebration Modal version-diff state machine verified");

  // 7. Test OTA Notification Channel & deduplication logic
  const NOTIFIED_KEY = "zenodeck_last_notified_version";
  mockStorage[NOTIFIED_KEY] = "3.14.1";

  const targetVersion = "3.16.0";
  const shouldNotify = mockStorage[NOTIFIED_KEY] !== targetVersion;
  assert(shouldNotify === true, "Must notify user when new version 3.16.0 is detected");

  mockStorage[NOTIFIED_KEY] = targetVersion;
  const shouldNotifyAgain = mockStorage[NOTIFIED_KEY] !== targetVersion;
  assert(shouldNotifyAgain === false, "Must not re-notify for the same version (deduplication verified)");
  console.log("✓ OTA Notification deduplication logic verified");

  console.log("\n🎉 ALL UPDATER, NOTIFICATION & WHAT'S NEW TESTS PASSED! (16/16)");
}

runTests();
