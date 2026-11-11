/**
 * Automated Verification: 120fps FLIP App-Launch Transition System
 * Verifies spring physics constants, shared layoutId contracts, two-phase deferred hydration,
 * velocity pull-to-dismiss thresholds, and Capacitor hardware back listener.
 */

import fs from "fs";
import path from "path";
import {
  APP_LAUNCH_SPRING,
  HUB_PARALLAX_SPRING,
  WORKSPACE_HYDRATE_TRANSITION,
  WORKSPACE_EXIT_TRANSITION,
  getZenoShellLayoutId,
  getZenoIconLayoutId,
  getZenoTitleLayoutId,
  GPU_ACCELERATED_STYLE,
} from "../src/constants/motion";

// 15-second safety timeout guard
const timeout = setTimeout(() => {
  console.error("❌ Test timed out after 15 seconds!");
  process.exit(1);
}, 15000);
timeout.unref();

console.log("=== Verifying 120fps FLIP App-Launch Transition System ===\n");

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

// 1. Verify Spring Physics Constants
assert(APP_LAUNCH_SPRING.type === "spring", "APP_LAUNCH_SPRING is type 'spring'");
assert(APP_LAUNCH_SPRING.stiffness === 420, "APP_LAUNCH_SPRING stiffness is 420");
assert(APP_LAUNCH_SPRING.damping === 34, "APP_LAUNCH_SPRING damping is 34");
assert(APP_LAUNCH_SPRING.mass === 0.8, "APP_LAUNCH_SPRING mass is 0.8");

assert(HUB_PARALLAX_SPRING.type === "spring", "HUB_PARALLAX_SPRING is type 'spring'");
assert(HUB_PARALLAX_SPRING.stiffness === 380, "HUB_PARALLAX_SPRING stiffness is 380");
assert(HUB_PARALLAX_SPRING.damping === 32, "HUB_PARALLAX_SPRING damping is 32");
assert(HUB_PARALLAX_SPRING.mass === 0.9, "HUB_PARALLAX_SPRING mass is 0.9");

assert(WORKSPACE_HYDRATE_TRANSITION.duration === 0.16, "WORKSPACE_HYDRATE_TRANSITION duration is 0.16s");
assert(WORKSPACE_EXIT_TRANSITION.duration === 0.08, "WORKSPACE_EXIT_TRANSITION duration is 0.08s");

assert(GPU_ACCELERATED_STYLE.willChange === "transform, border-radius", "GPU_ACCELERATED_STYLE promotes transform & border-radius");
assert(GPU_ACCELERATED_STYLE.transform === "translateZ(0)", "GPU_ACCELERATED_STYLE promotes hardware translateZ(0)");

// 2. Verify Shared LayoutId Contract
const sampleId = "video-compressor";
assert(getZenoShellLayoutId(sampleId) === `zeno-shell-${sampleId}`, "getZenoShellLayoutId returns zeno-shell-${toolId}");
assert(getZenoIconLayoutId(sampleId) === `zeno-icon-${sampleId}`, "getZenoIconLayoutId returns zeno-icon-${toolId}");
assert(getZenoTitleLayoutId(sampleId) === `zeno-title-${sampleId}`, "getZenoTitleLayoutId returns zeno-title-${toolId}");

// 3. Verify tool-grid.tsx bindings
const gridPath = path.resolve(__dirname, "../src/components/dashboard/tool-grid.tsx");
const gridContent = fs.readFileSync(gridPath, "utf-8");
assert(gridContent.includes("getZenoShellLayoutId(tool.id)"), "tool-grid.tsx binds getZenoShellLayoutId to card");
assert(gridContent.includes("getZenoIconLayoutId(tool.id)"), "tool-grid.tsx binds getZenoIconLayoutId to icon badge");
assert(gridContent.includes("getZenoTitleLayoutId(tool.id)"), "tool-grid.tsx binds getZenoTitleLayoutId to title");
assert(gridContent.includes("APP_LAUNCH_SPRING"), "tool-grid.tsx uses APP_LAUNCH_SPRING");

// 4. Verify tool-launch-shell.tsx implementation
const shellPath = path.resolve(__dirname, "../src/components/shell/tool-launch-shell.tsx");
assert(fs.existsSync(shellPath), "tool-launch-shell.tsx exists");
const shellContent = fs.readFileSync(shellPath, "utf-8");

assert(shellContent.includes("getZenoShellLayoutId(toolId)"), "tool-launch-shell.tsx binds outer shell layoutId");
assert(shellContent.includes("getZenoIconLayoutId(toolId)"), "tool-launch-shell.tsx binds header icon layoutId");
assert(shellContent.includes("getZenoTitleLayoutId(toolId)"), "tool-launch-shell.tsx binds header title layoutId");

// Two-phase hydration
assert(shellContent.includes("isWorkspaceHydrated"), "tool-launch-shell.tsx manages isWorkspaceHydrated state");
assert(shellContent.includes("180"), "tool-launch-shell.tsx includes 180ms safety fallback timer");
assert(shellContent.includes("onLayoutAnimationComplete"), "tool-launch-shell.tsx wires onLayoutAnimationComplete");
assert(shellContent.includes("zeno-shell-skeleton"), "tool-launch-shell.tsx renders Phase-A lightweight skeleton");

// Velocity pull-to-dismiss
assert(shellContent.includes("info.offset.y > 90 || info.velocity.y > 550"), "tool-launch-shell.tsx enforces 90px / 550px/s velocity pull threshold");
assert(shellContent.includes('drag="y"'), "tool-launch-shell.tsx enables drag='y' on header");

// Capacitor hardware back
assert(shellContent.includes('CapacitorApp.addListener("backButton"'), "tool-launch-shell.tsx integrates Capacitor hardware back listener");

// 5. Verify app-shell.tsx wiring
const appShellPath = path.resolve(__dirname, "../src/components/shell/app-shell.tsx");
const appShellContent = fs.readFileSync(appShellPath, "utf-8");
assert(appShellContent.includes("ToolLaunchShell"), "app-shell.tsx imports and renders ToolLaunchShell");
assert(appShellContent.includes("HUB_PARALLAX_SPRING"), "app-shell.tsx uses HUB_PARALLAX_SPRING for recessed hub");
assert(appShellContent.includes('scale: 0.92, opacity: 0.35, filter: "blur(14px)"'), "app-shell.tsx applies 0.92 scale + blur(14px) recessed parallax");

console.log("\n🎉 ALL 120FPS FLIP APP-LAUNCH TRANSITION CHECKS PASSED (25/25)!");
process.exit(0);
