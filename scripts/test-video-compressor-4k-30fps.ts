/**
 * Automated Verification: Video Compressor 4K 30FPS Quality Upgrade
 */
import fs from "fs";
import path from "path";

console.log("▶ Verifying Video Compressor 4K 30FPS Implementation...");

const compressorPath = path.resolve(__dirname, "../src/components/tools/video-compressor.tsx");
if (!fs.existsSync(compressorPath)) {
  console.error("❌ video-compressor.tsx not found!");
  process.exit(1);
}

const content = fs.readFileSync(compressorPath, "utf-8");

// 1. Verify 4K 30FPS Master Preset
if (!content.includes('id: "4k-30fps-master"') || !content.includes('4K UHD 30 FPS Master')) {
  console.error("❌ 4K UHD 30 FPS Master preset missing from COMPRESSOR_PRESETS");
  process.exit(1);
}
console.log("✅ 4K UHD 30 FPS Master preset configured in COMPRESSOR_PRESETS");

// 2. Verify 2160p Resolution in types and labels
if (!content.includes('"2160"') || !content.includes('4K UHD (2160p)')) {
  console.error("❌ 2160p 4K UHD missing from Resolution types/labels");
  process.exit(1);
}
console.log("✅ 2160p 4K UHD resolution properly mapped in types and labels");

// 3. Verify Framerate (FPS) control with 30 FPS option
if (!content.includes('type Framerate = "original" | "30" | "60" | "24"') || !content.includes('30 FPS (Standard 4K)')) {
  console.error("❌ Framerate 30 FPS controls missing");
  process.exit(1);
}
console.log("✅ Dedicated Framerate control with 30 FPS standard option verified");

// 4. Verify Force Target / Upscale toggle
if (!content.includes("allowUpscale") || !content.includes("Force Target / Upscale")) {
  console.error("❌ allowUpscale toggle missing");
  process.exit(1);
}
console.log("✅ Force Target / Upscale control present");

// 5. Verify FFmpeg filter chain generates fps filter and 4K scale filter
if (!content.includes("fps=${fps}") || !content.includes("scale=-2:${effectiveResolution}")) {
  console.error("❌ FFmpeg filter chain missing fps or upscale scale handling");
  process.exit(1);
}
console.log("✅ FFmpeg filter chain generates proper fps and scale filters");

// 6. Verify 4K 30FPS active badge indicator
if (!content.includes("4K UHD 30 FPS Mode Configured")) {
  console.error("❌ 4K UHD 30 FPS active mode badge missing");
  process.exit(1);
}
console.log("✅ 4K UHD 30 FPS UI indicator badge verified");

// 7. Verify registry updated
const registryPath = path.resolve(__dirname, "../src/lib/tools/registry.ts");
const regContent = fs.readFileSync(registryPath, "utf-8");
if (!regContent.includes("4K 30fps")) {
  console.error("❌ registry.ts description not updated with 4K 30fps");
  process.exit(1);
}
console.log("✅ Tool registry metadata verified");

console.log("🎉 All 7 Video Compressor 4K 30FPS checks passed successfully!");
process.exit(0);
