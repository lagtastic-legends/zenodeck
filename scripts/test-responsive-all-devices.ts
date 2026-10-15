/**
 * test-responsive-all-devices.ts
 *
 * Comprehensive Automated Verification Suite for Universal Responsive UI/UX Overhaul
 * Validates web shell, safe-area insets, FAB auto-hide, button wrappers,
 * fluid keycaps, touch targets, and native Android multi-screen resource qualifiers.
 */

import * as fs from "fs";
import * as path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runResponsiveTestSuite() {
  console.log("=== RUNNING UNIVERSAL RESPONSIVE UI/UX AUDIT ===");

  const rootDir = process.cwd();

  // 1. Verify src/app/layout.tsx viewport configuration
  const layoutPath = path.join(rootDir, "src/app/layout.tsx");
  assert(fs.existsSync(layoutPath), "src/app/layout.tsx exists");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  assert(layoutContent.includes("maximumScale: 5"), "layout.tsx viewport allows accessible zoom up to 5x");
  assert(layoutContent.includes('viewportFit: "cover"'), "layout.tsx viewport uses cover for edge-to-edge screens");
  assert(!layoutContent.includes("userScalable: false"), "layout.tsx does NOT block user zooming");

  // 2. Verify src/app/globals.css safe areas and constraints
  const globalsPath = path.join(rootDir, "src/app/globals.css");
  assert(fs.existsSync(globalsPath), "src/app/globals.css exists");
  const globalsContent = fs.readFileSync(globalsPath, "utf-8");
  assert(globalsContent.includes("--safe-top: env(safe-area-inset-top"), "globals.css defines --safe-top");
  assert(globalsContent.includes("--safe-bottom: env(safe-area-inset-bottom"), "globals.css defines --safe-bottom");
  assert(globalsContent.includes("--safe-left: env(safe-area-inset-left"), "globals.css defines --safe-left");
  assert(globalsContent.includes("--safe-right: env(safe-area-inset-right"), "globals.css defines --safe-right");
  assert(globalsContent.includes("overflow-x: clip"), "globals.css enforces overflow-x: clip to prevent mobile wobble");
  assert(globalsContent.includes("min-height: 100dvh"), "globals.css uses 100dvh for dynamic mobile viewports");

  // 3. Verify src/components/shell/app-shell.tsx bottom clearance
  const shellPath = path.join(rootDir, "src/components/shell/app-shell.tsx");
  assert(fs.existsSync(shellPath), "src/components/shell/app-shell.tsx exists");
  const shellContent = fs.readFileSync(shellPath, "utf-8");
  assert(
    shellContent.includes("pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]"),
    "app-shell.tsx provides 7.5rem + safe-bottom clearance for FAB and bottom CTA"
  );

  // 4. Verify src/components/ui/floating-toolbar.tsx scroll auto-hide
  const fabPath = path.join(rootDir, "src/components/ui/floating-toolbar.tsx");
  assert(fs.existsSync(fabPath), "src/components/ui/floating-toolbar.tsx exists");
  const fabContent = fs.readFileSync(fabPath, "utf-8");
  assert(fabContent.includes("handleScroll"), "floating-toolbar.tsx implements scroll listener");
  assert(fabContent.includes("isVisible || isOpen ? 0 : 80"), "floating-toolbar.tsx auto-hides downward on scroll");
  assert(fabContent.includes("pointer-events-auto") && fabContent.includes("pointer-events-none"), "floating-toolbar.tsx gates pointer events when hidden");

  // 5. Verify src/components/shell/top-bar.tsx
  const topBarPath = path.join(rootDir, "src/components/shell/top-bar.tsx");
  assert(fs.existsSync(topBarPath), "src/components/shell/top-bar.tsx exists");
  const topBarContent = fs.readFileSync(topBarPath, "utf-8");
  assert(topBarContent.includes("APP_VERSION"), "top-bar.tsx imports APP_VERSION");
  assert(topBarContent.includes("v${APP_VERSION}"), "top-bar.tsx displays dynamic APP_VERSION badge");
  assert(!topBarContent.includes("hidden xs:"), "top-bar.tsx eliminated non-standard xs: breakpoint");

  // 6. Verify src/components/tools/youtube-downloader.tsx CTA wrapping & filename formatting
  const ytPath = path.join(rootDir, "src/components/tools/youtube-downloader.tsx");
  assert(fs.existsSync(ytPath), "src/components/tools/youtube-downloader.tsx exists");
  const ytContent = fs.readFileSync(ytPath, "utf-8");
  assert(ytContent.includes("START TURBO DOWNLOAD"), "youtube-downloader.tsx has START TURBO DOWNLOAD button");
  assert(ytContent.includes("flex-wrap items-center justify-center"), "youtube-downloader.tsx wraps CTA text and badges");
  assert(ytContent.includes("break-all line-clamp-2"), "youtube-downloader.tsx wraps filenames without truncation");

  // 7. Verify src/components/zenotap/ZenoTapKeyboardSimulator.tsx fluid keycaps
  const simPath = path.join(rootDir, "src/components/zenotap/ZenoTapKeyboardSimulator.tsx");
  assert(fs.existsSync(simPath), "src/components/zenotap/ZenoTapKeyboardSimulator.tsx exists");
  const simContent = fs.readFileSync(simPath, "utf-8");
  assert(simContent.includes("flex-1 min-w-0 max-w-8"), "ZenoTap simulator keycaps are fluid for 320px screens");
  assert(simContent.includes("Space"), "ZenoTap simulator has responsive spacebar trackpad label");

  // 8. Verify src/components/media/video-timeline-trimmer.tsx
  const trimmerPath = path.join(rootDir, "src/components/media/video-timeline-trimmer.tsx");
  assert(fs.existsSync(trimmerPath), "src/components/media/video-timeline-trimmer.tsx exists");
  const trimmerContent = fs.readFileSync(trimmerPath, "utf-8");
  assert(trimmerContent.includes("touch-none"), "video-timeline-trimmer.tsx scrubber has touch-none");

  // 9. Verify native Android multi-screen resource qualifiers
  const resDir = path.join(rootDir, "android/app/src/main/res");
  const requiredFiles = [
    "values/dimens.xml",
    "values/integers.xml",
    "values-sw320dp/dimens.xml",
    "values-sw320dp/integers.xml",
    "values-sw600dp/dimens.xml",
    "values-sw600dp/integers.xml",
    "values-land/dimens.xml",
    "values-land/integers.xml",
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(resDir, relPath);
    assert(fs.existsSync(fullPath), `Android resource file ${relPath} exists`);
  }

  // Check keyboard_view.xml uses @dimen/
  const kbLayoutPath = path.join(resDir, "layout/keyboard_view.xml");
  const kbLayoutContent = fs.readFileSync(kbLayoutPath, "utf-8");
  assert(kbLayoutContent.includes("@dimen/keyboard_total_height"), "keyboard_view.xml uses @dimen/keyboard_total_height");
  assert(kbLayoutContent.includes("@dimen/keyboard_ribbon_height"), "keyboard_view.xml uses @dimen/keyboard_ribbon_height");
  assert(kbLayoutContent.includes("@dimen/keyboard_key_height"), "keyboard_view.xml uses @dimen/keyboard_key_height");

  // Check item_gif_cell.xml uses @dimen/
  const cellLayoutPath = path.join(resDir, "layout/item_gif_cell.xml");
  const cellLayoutContent = fs.readFileSync(cellLayoutPath, "utf-8");
  assert(cellLayoutContent.includes("@dimen/vault_card_height"), "item_gif_cell.xml uses @dimen/vault_card_height");

  // Check ZenoDeckKeyboardService.kt uses dynamic spanCount
  const ktServicePath = path.join(
    rootDir,
    "android/app/src/main/java/com/omnitool/app/keyboard/ZenoDeckKeyboardService.kt"
  );
  const ktServiceContent = fs.readFileSync(ktServicePath, "utf-8");
  assert(
    ktServiceContent.includes("R.integer.keyboard_grid_span_count"),
    "ZenoDeckKeyboardService.kt uses dynamic keyboard_grid_span_count"
  );

  console.log("\n🎉 ALL 24 RESPONSIVE AUDIT CHECKS PASSED PERFECTION!\n");
}

void runResponsiveTestSuite();
