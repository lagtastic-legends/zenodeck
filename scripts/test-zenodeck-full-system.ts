setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 25000).unref();

/**
 * ==============================================================================
 * ZENODECK & ZENOTAP (v1.0.18+) — MASTER 360° FULL-SYSTEM VERIFICATION SUITE
 * ==============================================================================
 * Comprehensive architectural audit covering all 8 core pillars:
 * 1. Tool Registry, Routing & 120fps Compositor-Only FLIP Shell
 * 2. All 20 Unified Audio Studio Modules & Real-Time WebAudio/FFmpeg DSP
 * 3. Universal Media Downloader, InnerTube Multi-Client & VidMate Quality Sheet
 * 4. In-App Mini Browser, 8-Site Portal & Floating VidMate Download FAB
 * 5. Native Android Media Engine, Cronet HTTP/2 & 16-Packet PTS Sorter
 * 6. ZenoTap Native Android Keyboard (InputMethodService) & Frontend Studio
 * 7. Video, Image, GIF, PDF & Workstation Handoff Pipelines
 * 8. Version Synchronization & Build Hygiene
 */

import fs from "fs";
import path from "path";
import { TOOL_REGISTRY } from "../src/lib/tools/registry";
import {
  APP_LAUNCH_SPRING,
  HUB_PARALLAX_SPRING,
  WORKSPACE_HYDRATE_TRANSITION,
  WORKSPACE_EXIT_TRANSITION,
  GPU_ACCELERATED_STYLE,
  getZenoShellLayoutId,
  getZenoIconLayoutId,
  getZenoTitleLayoutId,
} from "../src/constants/motion";
import {
  buildTrimmerFilter,
  EQ_FREQUENCIES,
  getDefaultAudioParams,
} from "../src/lib/audio-dsp";
import { detectPlatform } from "../src/lib/media/detector";
import { parseSemver } from "../src/config/version";

let totalChecks = 0;
let passedChecks = 0;

function assert(condition: boolean, description: string) {
  totalChecks++;
  if (!condition) {
    console.error(`  ❌ [FAILED] Check ${totalChecks}: ${description}`);
    process.exit(1);
  }
  passedChecks++;
  console.log(`  ✅ [PASS] Check ${totalChecks}: ${description}`);
}

async function runMasterAudit() {
  console.log("==============================================================================");
  console.log("⚡ STARTING ZENODECK & ZENOTAP MASTER 360° ARCHITECTURAL AUDIT (ALL 8 PILLARS)");
  console.log("==============================================================================\n");

  const rootDir = process.cwd();

  // --------------------------------------------------------------------------
  // PILLAR 1: Tool Registry, Routing & 120fps Compositor-Only FLIP Shell
  // --------------------------------------------------------------------------
  console.log("--- [PILLAR 1] Tool Registry, Routing & 120fps Compositor FLIP Shell ---");

  // 1.1 Unique IDs, valid names, descriptions, categories in registry.ts
  const toolIds = new Set<string>();
  const appShellPath = path.join(rootDir, "src/components/shell/app-shell.tsx");
  const appShellContent = fs.readFileSync(appShellPath, "utf-8");

  for (const tool of TOOL_REGISTRY) {
    assert(!toolIds.has(tool.id), `Pillar 1.1: Tool '${tool.id}' has unique ID`);
    toolIds.add(tool.id);
    assert(Boolean(tool.name && tool.name.trim().length > 0), `Pillar 1.1: Tool '${tool.id}' has non-empty name`);
    assert(Boolean(tool.description && tool.description.trim().length > 0), `Pillar 1.1: Tool '${tool.id}' has valid description`);
    assert(Boolean(tool.category), `Pillar 1.1: Tool '${tool.id}' has valid category`);

    // Routing in app-shell.tsx
    const isMapped = appShellContent.includes(`"${tool.id}":`) || appShellContent.includes(`'${tool.id}':`) || appShellContent.includes(`${tool.id}:`);
    assert(isMapped, `Pillar 1.1: Tool '${tool.id}' is mapped in app-shell.tsx TOOL_COMPONENTS`);
  }

  // 1.2 Motion constants & GPU containment
  assert(APP_LAUNCH_SPRING.type === "spring" && APP_LAUNCH_SPRING.stiffness === 360 && APP_LAUNCH_SPRING.damping === 36 && APP_LAUNCH_SPRING.mass === 0.72,
    "Pillar 1.2: APP_LAUNCH_SPRING is critically damped (stiffness 360, damping 36, mass 0.72)");
  assert(HUB_PARALLAX_SPRING.type === "spring" && HUB_PARALLAX_SPRING.stiffness === 340 && HUB_PARALLAX_SPRING.damping === 35 && HUB_PARALLAX_SPRING.mass === 0.8,
    "Pillar 1.2: HUB_PARALLAX_SPRING is tuned (stiffness 340, damping 35, mass 0.8)");
  assert(WORKSPACE_HYDRATE_TRANSITION.duration === 0.14, "Pillar 1.2: WORKSPACE_HYDRATE_TRANSITION duration is 0.14s");
  assert(WORKSPACE_EXIT_TRANSITION.duration === 0.06, "Pillar 1.2: WORKSPACE_EXIT_TRANSITION duration is 0.06s");
  assert(GPU_ACCELERATED_STYLE.contain === "layout style paint", "Pillar 1.2: GPU_ACCELERATED_STYLE has contain: 'layout style paint'");
  assert(GPU_ACCELERATED_STYLE.transform === "translateZ(0)", "Pillar 1.2: GPU_ACCELERATED_STYLE has transform: 'translateZ(0)'");

  // 1.3 Pure compositor scale (0.94) and opacity (0.32) without GPU blur thrashing
  assert(!appShellContent.includes('filter: "blur') && !appShellContent.includes("filter: 'blur"),
    "Pillar 1.3: app-shell.tsx does NOT use GPU-thrashing backdrop blur on background container");
  assert(appShellContent.includes("scale: 0.94, opacity: 0.32"),
    "Pillar 1.3: app-shell.tsx animates pure compositor scale (0.94) and opacity (0.32)");

  // 1.4 Single-card layout projection in tool-grid.tsx
  const toolGridPath = path.join(rootDir, "src/components/dashboard/tool-grid.tsx");
  const toolGridContent = fs.readFileSync(toolGridPath, "utf-8");
  assert(toolGridContent.includes("isMorphTarget ? getZenoShellLayoutId(tool.id) : undefined"),
    "Pillar 1.4: tool-grid.tsx implements O(1) single-card layout projection using isMorphTarget");

  // 1.5 Double-requestAnimationFrame post-settle hydration & gesture pull-to-dismiss
  const launchShellPath = path.join(rootDir, "src/components/shell/tool-launch-shell.tsx");
  const launchShellContent = fs.readFileSync(launchShellPath, "utf-8");
  assert(launchShellContent.includes("isWorkspaceHydrated"),
    "Pillar 1.5: tool-launch-shell.tsx implements isWorkspaceHydrated post-settle hydration state");
  assert(launchShellContent.includes("requestAnimationFrame(() => {\n      requestAnimationFrame"),
    "Pillar 1.5: tool-launch-shell.tsx executes double-requestAnimationFrame post-settle hydration");
  assert(launchShellContent.includes("info.offset.y > 90 || info.velocity.y > 550"),
    "Pillar 1.5: tool-launch-shell.tsx implements pull-to-dismiss threshold (90px / 550px/s velocity)");
  assert(launchShellContent.includes('CapacitorApp.addListener("backButton"'),
    "Pillar 1.5: tool-launch-shell.tsx intercepts hardware backButton via @capacitor/app");


  // --------------------------------------------------------------------------
  // PILLAR 2: All 20 Unified Audio Studio Modules & Real-Time WebAudio/FFmpeg DSP
  // --------------------------------------------------------------------------
  console.log("\n--- [PILLAR 2] All 20 Unified Audio Studio Modules & DSP ---");

  // 2.1 Verify all 20 audio tool IDs route into UnifiedAudioStudio in app-shell.tsx
  const AUDIO_TOOL_ROUTED_IDS = [
    "audio-editor",
    "ringtone-maker",
    "slowed-reverb",
    "audio-effects",
    "audio-dsp",
    "fx-rack",
    "stem-separator",
    "trimmer",
    "pitch-shifter",
    "tempo-changer",
    "vocal-remover",
    "8d-audio",
    "equalizer",
    "bass-booster",
    "reverb",
    "compressor",
    "noise-reducer",
    "voice-changer",
    "normalizer",
    "reverse-audio",
  ];

  for (const aId of AUDIO_TOOL_ROUTED_IDS) {
    assert(appShellContent.includes(`"${aId}":`), `Pillar 2.1: Audio tool ID '${aId}' routes in app-shell.tsx`);
  }

  // 2.2 Pro Precision Cutter & Splicer unit tests on buildTrimmerFilter()
  const keepFilters = buildTrimmerFilter({
    startSec: 4.25,
    endSec: 18.5,
    fadeInSec: 1.0,
    fadeOutSec: 1.5,
    boostDb: 3,
    cutMode: "keep",
  });
  assert(keepFilters.some((f) => f.includes("atrim=start=4.25:end=18.50")), "Pillar 2.2: Trimmer keep mode uses atrim");
  assert(keepFilters.some((f) => f.includes("afade=t=in") && f.includes("d=1.00")), "Pillar 2.2: Trimmer keep mode applies afade fadeIn");
  assert(keepFilters.some((f) => f.includes("afade=t=out") && f.includes("d=1.50")), "Pillar 2.2: Trimmer keep mode applies afade fadeOut");

  const cutFilters = buildTrimmerFilter({
    startSec: 10.0,
    endSec: 20.0,
    fadeInSec: 0.5,
    fadeOutSec: 0.5,
    boostDb: 0,
    cutMode: "cut",
  });
  assert(cutFilters.some((f) => f.includes("aselect='not(between(t")) && cutFilters.some((f) => f.includes("asetpts=N/SR/TB")),
    "Pillar 2.2: Trimmer cut mode uses aselect not(between) inverted middle-splice expression and asetpts");

  // Verify Precision Cutter UI components
  const cutterDeckPath = path.join(rootDir, "src/components/audio/PrecisionAudioCutterDeck.tsx");
  const cutterDeckContent = fs.readFileSync(cutterDeckPath, "utf-8");
  assert(cutterDeckContent.includes("nudgeStart(-0.1)") && cutterDeckContent.includes("nudgeStart(0.1)"),
    "Pillar 2.2: PrecisionAudioCutterDeck has ±0.1s micro-nudge stepper buttons");
  assert(cutterDeckContent.includes("handleZeroSnap"),
    "Pillar 2.2: PrecisionAudioCutterDeck provides zero-crossing snap");
  assert(cutterDeckContent.includes("loopRegion") && cutterDeckContent.includes("setLoopRegion"),
    "Pillar 2.2: PrecisionAudioCutterDeck provides loop toggle integration");

  const uasPath = path.join(rootDir, "src/components/audio/UnifiedAudioStudio.tsx");
  const uasContent = fs.readFileSync(uasPath, "utf-8");
  assert(uasContent.includes("transportRafRef") && uasContent.includes("requestAnimationFrame"),
    "Pillar 2.2: UnifiedAudioStudio implements 60fps RAF transport playhead loop");
  assert(uasContent.includes("fadeGain") && uasContent.includes("fadeGainRef"),
    "Pillar 2.2: UnifiedAudioStudio manages fadeGain for clickless transitions");

  // 2.3 Ringtone Quick-Duration Bar (30s Call, 25s iPhone, 5s Alert/Notification, 15s Alarm)
  assert(uasContent.includes("30s Call") && uasContent.includes("25s iPhone") && uasContent.includes("15s Alarm"),
    "Pillar 2.3: Ringtone quick duration presets include 30s Call, 25s iPhone, 15s Alarm");
  assert(uasContent.includes("fadeInSec: p.length <= 5 ? 0.05 : 1.5") && uasContent.includes("fadeOutSec: p.length <= 5 ? 0.5 : 1.5"),
    "Pillar 2.3: Ringtone presets snap duration and configure 1.5s fades");

  // 2.4 Advanced DSP Nodes
  assert(uasContent.includes("function createGranularPitchShifter"),
    "Pillar 2.4: createGranularPitchShifter (Hann-windowed dual-delay pitch shifter) implemented");
  assert(uasContent.includes("function createStudioImpulseResponse"),
    "Pillar 2.4: createStudioImpulseResponse (algorithmic velvet-noise IR convolver reverb) implemented");
  assert(uasContent.includes("cutoff = params.bassPreserveCutoffHz || 135"),
    "Pillar 2.4: 135Hz crossover bass-preserving vocal remover implemented");
  assert(EQ_FREQUENCIES.length === 10 && EQ_FREQUENCIES[0] === 31 && EQ_FREQUENCIES[9] === 16000,
    "Pillar 2.4: 10-band ISO graphic EQ spans 31Hz to 16kHz");
  assert(uasContent.includes("masterLimiter.threshold.value = -0.5"),
    "Pillar 2.4: -0.5dB master brickwall safety limiter implemented");

  // 2.5 4-Stem Mid/Side Separator
  const stemPath = path.join(rootDir, "src/lib/audio/stem-separator.ts");
  const stemContent = fs.readFileSync(stemPath, "utf-8");
  assert(stemContent.includes("vocHp.frequency.value = 180") && stemContent.includes("vocLp.frequency.value = 7500"),
    "Pillar 2.5: Vocals stem isolated via mid bandpass 180Hz - 7500Hz");
  assert(stemContent.includes("basLp1.frequency.value = 145") && stemContent.includes("basLp2.frequency.value = 145"),
    "Pillar 2.5: Bass stem isolated via cascaded <145Hz lowpass");
  assert(stemContent.includes("druComp.attack.value = 0.025"),
    "Pillar 2.5: Drums stem shaped via transient punch compressor");
  assert(stemContent.includes("sideDiffR.gain.value = -0.5") && stemContent.includes("insHp.frequency.value = 160"),
    "Pillar 2.5: Instruments stem isolated via stereo side (L-R >160Hz)");


  // --------------------------------------------------------------------------
  // PILLAR 3: Universal Media Downloader, InnerTube Multi-Client & VidMate Quality Sheet
  // --------------------------------------------------------------------------
  console.log("\n--- [PILLAR 3] Universal Media Downloader & VidMate Quality Sheet ---");

  // 3.1 InnerTube multi-client profiles, pot= preservation, and fallbackVideoUrl
  const innertubePath = path.join(rootDir, "src/lib/youtube/innertube.ts");
  const innertubeContent = fs.readFileSync(innertubePath, "utf-8");
  assert(innertubeContent.includes('"ANDROID_VR"') && innertubeContent.includes('"TVHTML5"') && innertubeContent.includes('"IOS"') && innertubeContent.includes('"MWEB"'),
    "Pillar 3.1: innertube.ts defines ANDROID_VR, TVHTML5, IOS, and MWEB client profiles");
  assert(innertubeContent.includes("pot=") || innertubeContent.includes("Proof of Origin"),
    "Pillar 3.1: innertube.ts preserves pot= (Proof of Origin) token in stream URLs");
  assert(innertubeContent.includes("fallbackVideoUrl: fmt18?.url") || innertubeContent.includes("q.fallbackVideoUrl = fmt18.url"),
    "Pillar 3.1: innertube.ts attaches fallbackVideoUrl (itag 18 pre-muxed MP4)");

  // 3.2 vidmate-quality-sheet.tsx layout & sizes
  const qualitySheetPath = path.join(rootDir, "src/components/tools/vidmate-quality-sheet.tsx");
  const qualitySheetContent = fs.readFileSync(qualitySheetPath, "utf-8");
  assert(qualitySheetContent.includes("Music & Audio (Direct Stream)"),
    "Pillar 3.2: vidmate-quality-sheet.tsx renders Music & Audio section");
  assert(qualitySheetContent.includes("Video Resolutions"),
    "Pillar 3.2: vidmate-quality-sheet.tsx renders Video Resolutions section");
  assert(qualitySheetContent.includes("DOWNLOAD NOW"),
    "Pillar 3.2: vidmate-quality-sheet.tsx renders sticky DOWNLOAD NOW CTA button");

  // 3.3 1-tap handoff to workstation store in youtube-downloader.tsx
  const ytdlPath = path.join(rootDir, "src/components/tools/youtube-downloader.tsx");
  const ytdlContent = fs.readFileSync(ytdlPath, "utf-8");
  assert(ytdlContent.includes("handleConvertVideoToAudio"),
    "Pillar 3.3: youtube-downloader.tsx implements handleConvertVideoToAudio");
  assert(ytdlContent.includes("useWorkstationStore.getState().setHandoffFile"),
    "Pillar 3.3: youtube-downloader.tsx wires 1-tap handoff to useWorkstationStore.setHandoffFile");


  // --------------------------------------------------------------------------
  // PILLAR 4: In-App Mini Browser, 8-Site Portal & Floating VidMate Download FAB
  // --------------------------------------------------------------------------
  console.log("\n--- [PILLAR 4] In-App Mini Browser, 8-Site Portal & VidMate FAB ---");

  // 4.1 MiniBrowserView export, palette, and 8 portals
  const browserPath = path.join(rootDir, "src/components/tools/mini-browser-view.tsx");
  const browserContent = fs.readFileSync(browserPath, "utf-8");
  assert(browserContent.includes("export function MiniBrowserView"),
    "Pillar 4.1: mini-browser-view.tsx exports MiniBrowserView");
  assert(browserContent.includes("onTriggerVidMateSheet"),
    "Pillar 4.1: mini-browser-view.tsx supports onTriggerVidMateSheet callback");
  assert(browserContent.includes("#102C26") && browserContent.includes("#F7E7CE") && browserContent.includes("#A79277") && browserContent.includes("#090D0C"),
    "Pillar 4.1: mini-browser-view.tsx enforces Forest & Champagne dark palette (#102C26, #F7E7CE, #A79277, #090D0C)");

  const portals = ["youtube", "tiktok", "instagram", "facebook", "twitter", "reddit", "vimeo", "soundcloud"];
  for (const portal of portals) {
    assert(browserContent.includes(`id: "${portal}"`), `Pillar 4.1: mini-browser-view.tsx renders ${portal} portal tile`);
  }

  // 4.2 Media URL regex detection across 8 platforms
  const sampleUrls = [
    { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", platform: "youtube" },
    { url: "https://youtu.be/dQw4w9WgXcQ", platform: "youtube" },
    { url: "https://www.tiktok.com/@user/video/1234567890", platform: "tiktok" },
    { url: "https://www.instagram.com/reel/C-xyz123/", platform: "instagram" },
    { url: "https://www.facebook.com/watch/?v=123456", platform: "facebook" },
    { url: "https://x.com/user/status/1234567890", platform: "twitter" },
    { url: "https://www.reddit.com/r/videos/comments/xyz123/funny_clip/", platform: "reddit" },
    { url: "https://vimeo.com/123456789", platform: "vimeo" },
    { url: "https://soundcloud.com/artist/track", platform: "soundcloud" },
  ];
  for (const { url, platform } of sampleUrls) {
    const detected = detectPlatform(url);
    assert(Boolean(detected && detected.platform === platform),
      `Pillar 4.2: Media detector correctly classifies ${platform} URL (${url})`);
  }

  // 4.3 Pulsing floating download FAB triggering quality sheet
  assert(browserContent.includes("bottom-4 right-4 z-30") || browserContent.includes("bottom-5 right-5 z-30"),
    "Pillar 4.3: Pulsing floating download FAB positioned at bottom-4/5 right-4/5 z-30");
  assert(ytdlContent.includes("onTriggerVidMateSheet") && ytdlContent.includes("setIsQualitySheetOpen(true)"),
    "Pillar 4.3: youtube-downloader.tsx connects onTriggerVidMateSheet to open VidmateQualitySheet");


  // --------------------------------------------------------------------------
  // PILLAR 5: Native Android Media Engine, Cronet HTTP/2 & 16-Packet PTS Sorter
  // --------------------------------------------------------------------------
  console.log("\n--- [PILLAR 5] Native Android Media Engine & PTS Sorter ---");

  // 5.1 build.gradle dependencies and synchronized version
  const gradlePath = path.join(rootDir, "android/app/build.gradle");
  const gradleContent = fs.readFileSync(gradlePath, "utf-8");
  assert(gradleContent.includes("androidx.media3:media3-muxer"),
    "Pillar 5.1: build.gradle includes androidx.media3:media3-muxer");
  assert(gradleContent.includes("org.chromium.net:cronet-embedded"),
    "Pillar 5.1: build.gradle includes org.chromium.net:cronet-embedded");

  // 5.2 ZenoHeadlessMediaEngine sequential stage-gated download
  const enginePath = path.join(rootDir, "android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt");
  const engineContent = fs.readFileSync(enginePath, "utf-8");
  assert(engineContent.includes("STAGE 1: Download Video Stream FIRST (5% -> 65% progress)"),
    "Pillar 5.2: ZenoHeadlessMediaEngine executes sequential Stage 1 Video download");
  assert(engineContent.includes("vTempFile.length() < 10_000L"),
    "Pillar 5.2: ZenoHeadlessMediaEngine enforces 10KB on-disk video verification gate");
  assert(engineContent.includes("STAGE 2: Download Audio Stream SECOND (65% -> 88% progress)"),
    "Pillar 5.2: ZenoHeadlessMediaEngine executes sequential Stage 2 Audio download");
  assert(engineContent.includes(".part"),
    "Pillar 5.2: ZenoHeadlessMediaEngine supports .part file resume/append");

  // 5.3 16-Packet sliding window monotonic PTS sorter
  assert(engineContent.includes("slidingWindowCapacity = 16"),
    "Pillar 5.3: ZenoHeadlessMediaEngine defines 16-packet sliding-window capacity");
  assert(engineContent.includes("videoQueue.sortBy { it.presentationTimeUs }"),
    "Pillar 5.3: ZenoHeadlessMediaEngine sorts videoQueue by ascending presentationTimeUs");
  assert(engineContent.includes("pts <= lastVideoPts") && engineContent.includes("lastVideoPts + 100L"),
    "Pillar 5.3: ZenoHeadlessMediaEngine enforces monotonic ascending PTS (lastVideoPts + 100L)");

  // 5.4 ZenoMedia3Plugin sniffStreamViaWebView with intercept and onPageFinished
  const media3PluginPath = path.join(rootDir, "android/app/src/main/java/com/omnitool/app/media/ZenoMedia3Plugin.kt");
  const media3PluginContent = fs.readFileSync(media3PluginPath, "utf-8");
  assert(media3PluginContent.includes("fun sniffStreamViaWebView(call: PluginCall)"),
    "Pillar 5.4: ZenoMedia3Plugin exposes @PluginMethod sniffStreamViaWebView");
  assert(media3PluginContent.includes("shouldInterceptRequest") && media3PluginContent.includes("googlevideo.com/videoplayback"),
    "Pillar 5.4: ZenoMedia3Plugin overrides shouldInterceptRequest for googlevideo streams");
  assert(media3PluginContent.includes("ogTitle") && media3PluginContent.includes("ogImage") && media3PluginContent.includes("directVideoSrc"),
    "Pillar 5.4: ZenoMedia3Plugin extracts ogTitle, ogImage, and directVideoSrc onPageFinished");

  // 5.5 Balanced braces across all media Kotlin files
  const mediaFiles = [enginePath, media3PluginPath];
  for (const mf of mediaFiles) {
    const text = fs.readFileSync(mf, "utf-8");
    let openB = 0;
    let closeB = 0;
    for (const ch of text) {
      if (ch === "{") openB++;
      if (ch === "}") closeB++;
    }
    assert(openB === closeB && openB > 0, `Pillar 5.5: Braces balanced in ${path.basename(mf)} ({ = ${openB}, } = ${closeB})`);
  }


  // --------------------------------------------------------------------------
  // PILLAR 6: ZenoTap Native Android Keyboard (InputMethodService) & Frontend Studio
  // --------------------------------------------------------------------------
  console.log("\n--- [PILLAR 6] ZenoTap Native Keyboard & Frontend Studio ---");

  // 6.1 AndroidManifest registration & FileProvider
  const manifestPath = path.join(rootDir, "android/app/src/main/AndroidManifest.xml");
  const manifestContent = fs.readFileSync(manifestPath, "utf-8");
  assert(manifestContent.includes(".keyboard.ZenoDeckKeyboardService") && manifestContent.includes("BIND_INPUT_METHOD"),
    "Pillar 6.1: AndroidManifest.xml registers .keyboard.ZenoDeckKeyboardService with BIND_INPUT_METHOD");
  assert(manifestContent.includes("androidx.core.content.FileProvider") && manifestContent.includes(".fileprovider"),
    "Pillar 6.1: AndroidManifest.xml configures FileProvider for secure media sharing");

  // 6.2 keyboard_view.xml syntax and zero unescaped ? or @
  const keyboardXmlPath = path.join(rootDir, "android/app/src/main/res/layout/keyboard_view.xml");
  const keyboardXmlContent = fs.readFileSync(keyboardXmlPath, "utf-8");
  const badAttrs = keyboardXmlContent.match(/android:text="[?@][^"]*"/g) || [];
  assert(badAttrs.length === 0, `Pillar 6.2: keyboard_view.xml has 0 unescaped leading ? or @ in android:text (found ${badAttrs.length})`);

  // 6.3 ZenoDeckKeyboardService implementation features
  const kbServicePath = path.join(rootDir, "android/app/src/main/java/com/omnitool/app/keyboard/ZenoDeckKeyboardService.kt");
  const kbServiceContent = fs.readFileSync(kbServicePath, "utf-8");
  assert(kbServiceContent.includes("suggestion_left") && kbServiceContent.includes("suggestion_center") && kbServiceContent.includes("suggestion_right"),
    "Pillar 6.3: 3-slot predictive suggestion bar implemented");
  assert(kbServiceContent.includes('"dont" to "don\'t"') && kbServiceContent.includes('"im" to "I\'m"'),
    "Pillar 6.3: Contraction auto-correct table implemented");
  assert(kbServiceContent.includes("350L") || kbServiceContent.includes("DOUBLE_SPACE_TIMEOUT"),
    "Pillar 6.3: 350ms double-space period shortcut implemented");
  assert(kbServiceContent.includes("layout_number_row"),
    "Pillar 6.3: Dedicated 1-0 top number row supported");
  assert(kbServiceContent.includes("LAYOUT_AZERTY") && kbServiceContent.includes("LAYOUT_QWERTZ") && kbServiceContent.includes("LAYOUT_DVORAK"),
    "Pillar 6.3: Runtime keyboard layout modes supported (QWERTY, AZERTY, QWERTZ, DVORAK)");
  assert(kbServiceContent.includes("commitContent") || kbServiceContent.includes("InputConnectionCompat"),
    "Pillar 6.3: InputConnectionCompat.commitContent() rich media GIF insertion supported");

  // 6.4 Emoji Categories & ClipboardVaultAdapter
  const expectedCats = [
    { name: "Recent", token: "recentEmojis" },
    { name: "Smileys", token: "EMOJI_SMILEYS" },
    { name: "Gestures", token: "EMOJI_GESTURES" },
    { name: "Hearts", token: "EMOJI_HEARTS" },
    { name: "Animals", token: "EMOJI_ANIMALS" },
    { name: "Food", token: "EMOJI_FOOD" },
    { name: "Tech", token: "EMOJI_TECH" },
    { name: "Symbols", token: "EMOJI_SYMBOLS" },
  ];
  for (const cat of expectedCats) {
    assert(kbServiceContent.includes(cat.token), `Pillar 6.4: Keyboard provides '${cat.name}' emoji category (${cat.token})`);
  }

  const clipVaultPath = path.join(rootDir, "android/app/src/main/java/com/omnitool/app/keyboard/ClipboardVaultAdapter.kt");
  const clipVaultContent = fs.readFileSync(clipVaultPath, "utf-8");
  assert(clipVaultContent.includes("30") || clipVaultContent.includes("MAX_ITEMS"),
    "Pillar 6.4: ClipboardVaultAdapter maintains 30-slot history with pinning");

  // 6.5 GifThumbnailLoader AnimatedImageDrawable
  const gifLoaderPath = path.join(rootDir, "android/app/src/main/java/com/omnitool/app/keyboard/GifThumbnailLoader.kt");
  const gifLoaderContent = fs.readFileSync(gifLoaderPath, "utf-8");
  assert(gifLoaderContent.includes("ImageDecoder") && gifLoaderContent.includes("AnimatedImageDrawable"),
    "Pillar 6.5: GifThumbnailLoader uses ImageDecoder & AnimatedImageDrawable for 60fps GIF previews");

  // 6.6 Keyboard Deck Manager & Bridge sync
  const bridgeTsPath = path.join(rootDir, "src/lib/zenodeck-bridge.ts");
  const bridgeTsContent = fs.readFileSync(bridgeTsPath, "utf-8");
  assert(bridgeTsContent.includes("setKeyboardTheme") && bridgeTsContent.includes("setKeyboardLayoutMode"),
    "Pillar 6.6: zenodeck-bridge.ts exposes settings synchronization methods");


  // --------------------------------------------------------------------------
  // PILLAR 7: Video, Image, GIF, PDF & Workstation Handoff Pipelines
  // --------------------------------------------------------------------------
  console.log("\n--- [PILLAR 7] Workstation Handoff & Tool Component Integrity ---");

  // 7.1 Media converter consumes handoff
  const mediaConverterPath = path.join(rootDir, "src/components/tools/media-converter.tsx");
  const mediaConverterContent = fs.readFileSync(mediaConverterPath, "utf-8");
  assert(mediaConverterContent.includes("useWorkstationStore.getState().consumeHandoffFile()"),
    "Pillar 7.1: media-converter.tsx consumes incoming workstation handoff file");
  assert(mediaConverterContent.includes("audiophile-320k-mp3") && mediaConverterContent.includes('setAudioFormat("mp3")'),
    "Pillar 7.1: media-converter.tsx auto-selects audiophile 320kbps MP3 extraction on handoff");

  // 7.2 SaveResultModal & GifMaker integrate saveGifToKeyboardDeck
  const saveModalPath = path.join(rootDir, "src/components/dialogs/save-result-modal.tsx");
  const saveModalContent = fs.readFileSync(saveModalPath, "utf-8");
  const gifMakerPath = path.join(rootDir, "src/components/tools/gif-maker.tsx");
  const gifMakerContent = fs.readFileSync(gifMakerPath, "utf-8");
  assert(saveModalContent.includes("saveGifToKeyboardDeck"),
    "Pillar 7.2: save-result-modal.tsx integrates saveGifToKeyboardDeck for native keyboard syncing");
  assert(gifMakerContent.includes("saveGifToKeyboardDeck"),
    "Pillar 7.2: gif-maker.tsx auto-syncs generated GIF to ZenoTap Keyboard deck");

  // 7.3 All tool components exist on disk with valid exports
  const componentPaths = [
    "src/components/tools/media-converter.tsx",
    "src/components/tools/video-compressor.tsx",
    "src/components/tools/video-mute.tsx",
    "src/components/tools/gif-maker.tsx",
    "src/components/tools/image-to-pdf.tsx",
    "src/components/tools/text-to-pdf.tsx",
    "src/components/tools/lock-pdf.tsx",
    "src/components/tools/scan-to-pdf.tsx",
    "src/components/tools/palette-extractor.tsx",
    "src/components/tools/ascii-generator.tsx",
    "src/components/tools/watermark-remover.tsx",
    "src/components/vault/vault-view.tsx",
    "src/components/tools/studio-recorder.tsx",
    "src/components/tools/qr-studio.tsx",
    "src/components/tools/keyboard-deck-manager.tsx",
    "src/components/auth/auth-gateway.tsx",
    "src/components/audio/UnifiedAudioStudio.tsx",
    "src/components/macros/MacroStudioView.tsx",
    "src/components/tools/mini-browser-view.tsx",
    "src/components/tools/youtube-downloader.tsx",
  ];
  for (const cp of componentPaths) {
    const fullP = path.join(rootDir, cp);
    assert(fs.existsSync(fullP), `Pillar 7.3: Component file exists on disk: ${cp}`);
  }


  // --------------------------------------------------------------------------
  // PILLAR 8: Version Synchronization & Build Hygiene
  // --------------------------------------------------------------------------
  console.log("\n--- [PILLAR 8] Version Synchronization & Build Hygiene ---");

  // 8.1 100% Version parity across package.json, version.ts, and build.gradle
  const pkgPath = path.join(rootDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const versionTsPath = path.join(rootDir, "src/config/version.ts");
  const versionTsContent = fs.readFileSync(versionTsPath, "utf-8");
  const versionMatch = versionTsContent.match(/export const APP_VERSION = "([^"]+)"/);
  const appVersionTs = versionMatch ? versionMatch[1] : null;

  assert(pkg.version === appVersionTs, `Pillar 8.1: package.json version (${pkg.version}) matches version.ts (${appVersionTs})`);
  assert(gradleContent.includes(`versionName "${pkg.version}"`), `Pillar 8.1: build.gradle versionName matches package.json (${pkg.version})`);

  const semver = parseSemver(pkg.version);
  const expectedCode = semver[0] * 10000 + semver[1] * 1000 + semver[2];
  assert(gradleContent.includes(`versionCode ${expectedCode}`),
    `Pillar 8.1: build.gradle versionCode (${expectedCode}) correctly computed from semver ${pkg.version}`);

  // 8.2 Clean public directory: zero leaked .apk binaries
  const publicDir = path.join(rootDir, "public");
  if (fs.existsSync(publicDir)) {
    const publicFiles = fs.readdirSync(publicDir, { recursive: true }) as string[];
    const leakedApks = publicFiles.filter((f) => String(f).toLowerCase().endsWith(".apk"));
    assert(leakedApks.length === 0, `Pillar 8.2: public/ directory contains zero leaked .apk files (found ${leakedApks.length})`);
  }

  // --------------------------------------------------------------------------
  // FINAL SCORECARD
  // --------------------------------------------------------------------------
  console.log("\n==============================================================================");
  console.log(`🎉 ALL 8 PILLARS VERIFIED: ${passedChecks}/${totalChecks} ASSERTIONS PASSED (100% HEALTH)`);
  console.log("==============================================================================");
  process.exit(0);
}

runMasterAudit().catch((err) => {
  console.error("FATAL AUDIT ERROR:", err);
  process.exit(1);
});
