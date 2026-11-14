setTimeout(() => process.exit(1), 15000).unref();

import fs from "fs";
import path from "path";
import { APP_VERSION } from "../src/config/version";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log("=== ZENODECK & ZENOTAP v1.0.24 RELEASE VERIFICATION ===");

// 1. Version Parity across sources
assert(APP_VERSION >= "1.0.24", `src/config/version.ts has APP_VERSION >= "1.0.24" (got "${APP_VERSION}")`);

const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
assert(pkg.version >= "1.0.24", `package.json has version >= "1.0.24" (got "${pkg.version}")`);

const gradlePath = path.resolve(__dirname, "../android/app/build.gradle");
const gradle = fs.readFileSync(gradlePath, "utf-8");
assert(/versionName "1\.0\.\d+"/.test(gradle), 'android/app/build.gradle contains valid versionName');
assert(/versionCode 100\d{2}/.test(gradle), "android/app/build.gradle contains valid versionCode");

// 2. CHANGELOG Verification
const changelogPath = path.resolve(__dirname, "../CHANGELOG.md");
const changelog = fs.readFileSync(changelogPath, "utf-8");
assert(changelog.includes("## [1.0.24] — 2026-11-14"), "CHANGELOG.md contains [1.0.24]");
assert(changelog.includes("Precision Engineering M3 Workstation Design"), "CHANGELOG.md documents Precision Engineering M3 design");
assert(changelog.includes("Universal Smartphone & Multi-Phone Form-Factor Perfection"), "CHANGELOG.md documents Multi-Phone Form-Factor Perfection");
assert(changelog.includes("## [1.0.23] — 2026-11-14"), "CHANGELOG.md preserves [1.0.23]");

// 3. Release Notes Verification
const releaseNotesPath = path.resolve(__dirname, "../RELEASE_NOTES_v1.0.24.md");
assert(fs.existsSync(releaseNotesPath), "RELEASE_NOTES_v1.0.24.md exists");
const releaseNotes = fs.readFileSync(releaseNotesPath, "utf-8");
assert(releaseNotes.includes("ZenoDeck & ZenoTap v1.0.24 Release Notes"), "Release notes document v1.0.24");
assert(releaseNotes.includes("Precision Engineering M3 Design System"), "Release notes document Precision Engineering M3");
assert(releaseNotes.includes("Universal Smartphone & Multi-Phone Form-Factor Perfection"), "Release notes document Multi-Phone Form-Factor");

// 4. Precision Engineering M3 Design System Tokens
const globalsCssPath = path.resolve(__dirname, "../src/app/globals.css");
const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");
assert(globalsCss.includes('[data-theme="precision"]'), "globals.css defines [data-theme='precision']");
assert(globalsCss.includes('[data-platform="apk"]'), "globals.css defines [data-platform='apk']");
assert(globalsCss.includes("#f3fbff"), "globals.css defines base canvas #f3fbff");
assert(globalsCss.includes("#006889"), "globals.css defines primary #006889");
assert(globalsCss.includes("#e7eff3"), "globals.css defines surface container #e7eff3");
assert(globalsCss.includes("#bfc8ce"), "globals.css defines outline variant #bfc8ce");
assert(globalsCss.includes("tabular-nums"), "globals.css enforces tabular-nums");
assert(globalsCss.includes("overflow-x: hidden"), "globals.css enforces overflow-x: hidden");

// 5. Theme Store & Layout Pre-Hydration Verification
const themeStorePath = path.resolve(__dirname, "../src/lib/theme/theme-store.ts");
const themeStore = fs.readFileSync(themeStorePath, "utf-8");
assert(themeStore.includes('"precision"'), "theme-store.ts supports 'precision' theme");
assert(themeStore.includes("isApkPlatform"), "theme-store.ts exports isApkPlatform");

const layoutPath = path.resolve(__dirname, "../src/app/layout.tsx");
const layoutContent = fs.readFileSync(layoutPath, "utf-8");
assert(layoutContent.includes("data-platform"), "layout.tsx pre-hydration script configures data-platform");
assert(layoutContent.includes("data-theme"), "layout.tsx pre-hydration script configures data-theme");
assert(layoutContent.includes("overflow-x-hidden"), "layout.tsx body enforces overflow-x-hidden");

// 6. ToolLaunchShell Semantic Modernization
const toolLaunchPath = path.resolve(__dirname, "../src/components/shell/tool-launch-shell.tsx");
const toolLaunch = fs.readFileSync(toolLaunchPath, "utf-8");
assert(!toolLaunch.includes("bg-[#090D0C]"), "tool-launch-shell does not contain hardcoded bg-[#090D0C]");
assert(!toolLaunch.includes("bg-[#102C26]"), "tool-launch-shell does not contain hardcoded bg-[#102C26]");
assert(toolLaunch.includes("bg-background"), "tool-launch-shell uses bg-background");
assert(toolLaunch.includes("bg-card"), "tool-launch-shell uses bg-card");
assert(toolLaunch.includes("pt-[calc(0.75rem+env(safe-area-inset-top,0px))]"), "tool-launch-shell handles safe area top insets");
assert(toolLaunch.includes("pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"), "tool-launch-shell handles safe area bottom insets");

// 7. Android Native System Bars
const colorsXmlPath = path.resolve(__dirname, "../android/app/src/main/res/values/colors.xml");
const colorsXml = fs.readFileSync(colorsXmlPath, "utf-8");
assert(colorsXml.includes("#f3fbff"), "colors.xml defines splashBackground as #f3fbff");
assert(colorsXml.includes("#006889"), "colors.xml defines colorPrimary as #006889");

const stylesXmlPath = path.resolve(__dirname, "../android/app/src/main/res/values/styles.xml");
const stylesXml = fs.readFileSync(stylesXmlPath, "utf-8");
assert(stylesXml.includes("android:windowLightStatusBar"), "styles.xml configures windowLightStatusBar");
assert(stylesXml.includes("android:windowLightNavigationBar"), "styles.xml configures windowLightNavigationBar");

console.log("🎉 ALL v1.0.24 RELEASE VERIFICATION CHECKS PASSED!");
process.exit(0);
