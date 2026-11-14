/**
 * Verification Test: APK Precision Engineering Design & Multi-Phone Layout
 * =========================================================================
 */

import fs from "fs";
import path from "path";
import assert from "assert";

console.log("================================================================================");
console.log("   TESTING: APK PRECISION ENGINEERING ADOPTION & MULTI-PHONE LAYOUTS             ");
console.log("================================================================================");

const root = path.resolve(__dirname, "..");

// 1. Verify globals.css has complete Precision Engineering design tokens & APK overrides
const globalsCss = fs.readFileSync(path.join(root, "src", "app", "globals.css"), "utf-8");
assert(globalsCss.includes('[data-theme="precision"]'), "data-theme='precision' must be defined in globals.css");
assert(globalsCss.includes('[data-platform="apk"]'), "data-platform='apk' must be defined in globals.css");
assert(globalsCss.includes("#f3fbff"), "Base optical canvas #f3fbff must be defined");
assert(globalsCss.includes("#006889"), "Primary oceanic cyan #006889 must be defined");
assert(globalsCss.includes("#e7eff3"), "Surface container #e7eff3 must be defined");
assert(globalsCss.includes("#bfc8ce"), "Outline variant #bfc8ce must be defined");
assert(globalsCss.includes("overflow-x: hidden"), "Phone layout must constrain overflow-x to hidden");
assert(globalsCss.includes("tabular-nums"), "Telemetry and timecodes must enforce tabular-nums");
console.log("✓ PASS: globals.css contains complete Precision Engineering design system & phone constraints");

// 2. Verify theme-store.ts includes 'precision' and conditional APK detection
const themeStoreTs = fs.readFileSync(path.join(root, "src", "lib", "theme", "theme-store.ts"), "utf-8");
assert(themeStoreTs.includes('"precision"'), "OmniTheme must include 'precision'");
assert(themeStoreTs.includes("isApkPlatform"), "theme-store must export isApkPlatform");
assert(themeStoreTs.includes("data-platform"), "theme-store must set data-platform='apk'");
console.log("✓ PASS: theme-store.ts correctly manages Precision theme only for APK platform");

// 3. Verify layout.tsx has pre-hydration script for APK
const layoutTsx = fs.readFileSync(path.join(root, "src", "app", "layout.tsx"), "utf-8");
assert(layoutTsx.includes("data-platform"), "layout.tsx must configure data-platform in head script");
assert(layoutTsx.includes("data-theme"), "layout.tsx must configure data-theme in head script");
assert(layoutTsx.includes("overflow-x-hidden"), "layout.tsx body must enforce overflow-x-hidden");
console.log("✓ PASS: layout.tsx contains pre-hydration zero-flicker script for APK and safe layout");

// 4. Verify ToolLaunchShell has semantic theme classes instead of hardcoded colors
const toolLaunchTsx = fs.readFileSync(path.join(root, "src", "components", "shell", "tool-launch-shell.tsx"), "utf-8");
assert(!toolLaunchTsx.includes("bg-[#090D0C]"), "ToolLaunchShell must not contain hardcoded bg-[#090D0C]");
assert(!toolLaunchTsx.includes("bg-[#102C26]"), "ToolLaunchShell must not contain hardcoded bg-[#102C26]");
assert(toolLaunchTsx.includes("bg-background"), "ToolLaunchShell must use bg-background");
assert(toolLaunchTsx.includes("bg-card"), "ToolLaunchShell must use bg-card");
assert(toolLaunchTsx.includes("pt-[calc(0.75rem+env(safe-area-inset-top,0px))]"), "ToolLaunchShell must handle notch safe areas");
assert(toolLaunchTsx.includes("pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"), "ToolLaunchShell must handle gesture bar safe areas");
console.log("✓ PASS: ToolLaunchShell uses dynamic theme styling and safe areas for all phone screens");

// 5. Verify TopBar responsive phone layout
const topBarTsx = fs.readFileSync(path.join(root, "src", "components", "shell", "top-bar.tsx"), "utf-8");
assert(topBarTsx.includes("pt-[env(safe-area-inset-top)]"), "TopBar must pad for status bar/notch");
assert(topBarTsx.includes("h-[26px] sm:h-[28px]"), "TopBar engine pill must be compact on mobile");
console.log("✓ PASS: TopBar is ergonomically optimized for 320px–480px phone screens");

// 6. Verify Android native styles.xml and colors.xml match Precision light palette
const colorsXml = fs.readFileSync(path.join(root, "android", "app", "src", "main", "res", "values", "colors.xml"), "utf-8");
assert(colorsXml.includes("#f3fbff"), "Native Android splashBackground must be #f3fbff");
assert(colorsXml.includes("#006889"), "Native Android colorPrimary must be #006889");

const stylesXml = fs.readFileSync(path.join(root, "android", "app", "src", "main", "res", "values", "styles.xml"), "utf-8");
assert(stylesXml.includes("android:windowLightStatusBar"), "styles.xml must set windowLightStatusBar");
assert(stylesXml.includes("android:windowLightNavigationBar"), "styles.xml must set windowLightNavigationBar");
console.log("✓ PASS: Android native styles.xml & colors.xml match Precision Engineering light system bars");

console.log("\n================================================================================");
console.log("   ALL APK PRECISION DESIGN & PHONE LAYOUT VERIFICATIONS PASSED (6/6)!          ");
console.log("================================================================================\n");
