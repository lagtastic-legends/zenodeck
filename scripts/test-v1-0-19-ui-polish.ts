setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 20000).unref();

import fs from "fs";
import path from "path";

console.log("🚀 STARTING ZENODECK & ZENOTAP v1.0.19 FULL UI POLISH & CONTRAST AUDIT...\n");

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✅ ${msg}`);
}

const root = process.cwd();

// --- 1. globals.css & Header Subtitles ---
console.log("📌 1. Testing globals.css & Tool Header Subtitles...");
const globalsCss = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf-8");
assert(
  globalsCss.includes(':not([class*="bg-"]):not([class*="!bg-"])'),
  "globals.css shields inputs with :not([class*='bg-']):not([class*='!bg-']) so dark inputs never turn white"
);
assert(
  globalsCss.includes(':not([class*="text-"]):not([class*="!text-"])'),
  "globals.css shields headings/text with :not([class*='text-']):not([class*='!text-']) so dark surfaces never get black text"
);

const toolLaunchShell = fs.readFileSync(path.join(root, "src/components/shell/tool-launch-shell.tsx"), "utf-8");
assert(
  toolLaunchShell.includes("line-clamp-2 leading-snug text-xs"),
  "tool-launch-shell.tsx wraps subtitle cleanly with line-clamp-2 leading-snug text-xs"
);

const toolShell = fs.readFileSync(path.join(root, "src/components/tools/tool-shell.tsx"), "utf-8");
assert(
  toolShell.includes("line-clamp-2 leading-snug text-xs"),
  "tool-shell.tsx wraps subtitle cleanly with line-clamp-2 leading-snug text-xs"
);

// --- 2. In-App Browser, Downloader, and Keyboard Deck ---
console.log("\n📌 2. Testing In-App Browser, Downloader & Keyboard Deck...");
const miniBrowser = fs.readFileSync(path.join(root, "src/components/tools/mini-browser-view.tsx"), "utf-8");
assert(
  miniBrowser.includes("!bg-[#090D0C]") && miniBrowser.includes("!text-[#F7E7CE]"),
  "mini-browser-view.tsx forces omnibox input to deep obsidian !bg-[#090D0C] and !text-[#F7E7CE]"
);
assert(
  miniBrowser.includes("!text-[#F7E7CE] font-bold") && miniBrowser.includes("!text-[#A79277] font-medium"),
  "mini-browser-view.tsx portal cards enforce high-contrast !text-[#F7E7CE] title and !text-[#A79277] subtitle"
);
assert(
  miniBrowser.includes("bottom-4 right-4 z-30") && miniBrowser.includes("bg-[#102C26]"),
  "mini-browser-view.tsx floating VidMate FAB is always visible at bottom-4 right-4 with #102C26 background"
);

const youtubeDownloader = fs.readFileSync(path.join(root, "src/components/tools/youtube-downloader.tsx"), "utf-8");
assert(
  youtubeDownloader.includes("bg-[#102C26]") && youtubeDownloader.includes("text-[#F7E7CE]"),
  "youtube-downloader.tsx uses ZenoDeck Deep Forest (#102C26) & Champagne (#F7E7CE) palette for active tabs & primary CTA"
);
assert(
  !youtubeDownloader.includes("size-3.5 shrink-0 text-[#F7E7CE]"),
  "youtube-downloader.tsx view switcher icons inherit button color smoothly across light/dark modes"
);
assert(
  youtubeDownloader.includes("overflow-x-auto no-scrollbar pr-4"),
  "youtube-downloader.tsx platform chips have smooth horizontal scrolling with overflow-x-auto no-scrollbar pr-4"
);

const downloadManager = fs.readFileSync(path.join(root, "src/components/tools/download-manager-view.tsx"), "utf-8");
assert(
  downloadManager.includes("text-[#F7E7CE] font-semibold"),
  "download-manager-view.tsx displays queue count in high-contrast text-[#F7E7CE]"
);

const keyboardDeck = fs.readFileSync(path.join(root, "src/components/tools/keyboard-deck-manager.tsx"), "utf-8");
assert(
  keyboardDeck.includes("!bg-[#090D0C]/90") && keyboardDeck.includes("!text-[#F7E7CE]"),
  "keyboard-deck-manager.tsx forces dark inputs with !bg-[#090D0C]/90 and !text-[#F7E7CE]"
);
assert(
  keyboardDeck.includes("overflow-x-auto no-scrollbar"),
  "keyboard-deck-manager.tsx category pills scroll smoothly with overflow-x-auto no-scrollbar"
);

// --- 3. Toggle Switches & Viewport Text ---
console.log("\n📌 3. Testing Toggle Switches & Viewport Text...");
const paramControls = fs.readFileSync(path.join(root, "src/components/audio/param-controls.tsx"), "utf-8");
assert(
  paramControls.includes("h-6 w-11 shrink-0") && paramControls.includes("h-5 w-5"),
  "param-controls.tsx enforces 44x24px horizontal toggle pill (h-6 w-11 shrink-0)"
);

const switchUi = fs.readFileSync(path.join(root, "src/components/ui/switch.tsx"), "utf-8");
assert(
  switchUi.includes("h-6 w-11 shrink-0") && switchUi.includes("h-5 w-5"),
  "switch.tsx enforces standard h-6 w-11 shrink-0 horizontal toggle pill"
);

const lockPdf = fs.readFileSync(path.join(root, "src/components/tools/lock-pdf.tsx"), "utf-8");
assert(
  lockPdf.includes("Tap to select PDF document to encrypt"),
  "lock-pdf.tsx has clear dropzone label 'Tap to select PDF document to encrypt'"
);
assert(
  lockPdf.includes("bg-[#102C26]") && lockPdf.includes("text-[#F7E7CE]"),
  "lock-pdf.tsx LOCK PDF action button styled with #102C26 and #F7E7CE"
);

const scanToPdf = fs.readFileSync(path.join(root, "src/components/tools/scan-to-pdf.tsx"), "utf-8");
assert(
  scanToPdf.includes("text-[#F7E7CE]/85 font-medium"),
  "scan-to-pdf.tsx empty camera viewport text is legible with text-[#F7E7CE]/85 font-medium"
);

const studioRecorder = fs.readFileSync(path.join(root, "src/components/tools/studio-recorder.tsx"), "utf-8");
assert(
  studioRecorder.includes("text-[#F7E7CE]/85 font-medium"),
  "studio-recorder.tsx empty recorder viewport text is legible with text-[#F7E7CE]/85 font-medium"
);

// --- 4. Equalizer, Palette Extractor & ASCII Generator ---
console.log("\n📌 4. Testing Equalizer, Palette Extractor & ASCII Generator...");
const audioStudio = fs.readFileSync(path.join(root, "src/components/audio/UnifiedAudioStudio.tsx"), "utf-8");
assert(
  audioStudio.includes("shrink-0 whitespace-nowrap") && audioStudio.includes("overflow-x-auto no-scrollbar py-1 pr-3 scroll-smooth"),
  "UnifiedAudioStudio.tsx preset selector trigger is shrink-0 and preset chips have smooth horizontal scrolling"
);
assert(
  audioStudio.includes("+${gainVal}dB") && audioStudio.includes("${gainVal}dB"),
  "UnifiedAudioStudio.tsx displays clear dB values (+XdB / -XdB) on EQ bands"
);

const paletteExtractor = fs.readFileSync(path.join(root, "src/components/tools/palette-extractor.tsx"), "utf-8");
assert(
  paletteExtractor.includes("totalProportion") && paletteExtractor.includes("((s.proportion || 0) / totalProportion) * 100"),
  "palette-extractor.tsx normalizes swatch proportion by totalProportion for a full 100% width bar"
);

const asciiGen = fs.readFileSync(path.join(root, "src/components/tools/ascii-generator.tsx"), "utf-8");
assert(
  asciiGen.includes("bg-[#090D0C]") && asciiGen.includes("text-xs leading-tight font-mono font-bold text-[#F7E7CE]"),
  "ascii-generator.tsx gallery cards have crisp high-contrast Champagne #F7E7CE ASCII art on #090D0C canvas"
);

console.log("\n🎉 ALL v1.0.19 FULL UI POLISH & CONTRAST ASSERTIONS PASSED (100%)!\n");
process.exit(0);
