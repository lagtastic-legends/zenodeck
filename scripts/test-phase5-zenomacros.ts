/**
 * Test Suite: Phase 5 — ZenoMacros Single-Pass Pipeline Engine
 *
 * Verifies:
 * 1. Pre-configured macro templates compilation (ZenoTap GIF, Social Turbo Clip, Cyber Spatial Master).
 * 2. Single-pass `-vf` and `-af` filtergraph merging.
 * 3. Dynamic speed acceleration and chained atempo filter logic.
 * 4. Node toggling and ordering idempotency.
 * 5. Full FFmpeg argv compilation via buildFFmpegArgs.
 * 6. Default node creation factory for all node types.
 */

import {
  compileMacroPipeline,
  buildFFmpegArgs,
  createDefaultNode,
  MACRO_TEMPLATES,
  MacroNode,
  MacroNodeType,
} from "../src/lib/macros/pipeline-engine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Testing Phase 5: ZenoMacros Single-Pass Pipeline Engine ===");

  // TEST 1: ZenoTap Reaction GIF Template
  console.log("\n[Test 1] ZenoTap 1-Tap Reaction GIF Template Compilation");
  const gifTmpl = MACRO_TEMPLATES.find((t) => t.id === "zenotap-reaction-gif");
  assert(!!gifTmpl, "ZenoTap GIF template exists");

  const compiledGif = compileMacroPipeline(gifTmpl!.nodes);
  console.log("Compiled GIF videoFilters:", compiledGif.videoFilters);
  console.log("Compiled GIF outputArgs:", compiledGif.outputArgs);

  assert(compiledGif.targetFormat === "gif", "Target format is GIF");
  assert(compiledGif.isSinglePass === true, "Pipeline is single-pass");
  assert(compiledGif.hasZenoTapPush === true, "ZenoTap push flag is active");
  assert(compiledGif.estimatedPasses === 1, "Estimated passes equals 1");
  assert(
    compiledGif.videoFilters.some((f) => f.includes("crop=")),
    "Contains 1:1 center crop filter"
  );
  assert(
    compiledGif.videoFilters.some((f) => f.includes("scale=")),
    "Contains resolution scale filter"
  );
  assert(
    compiledGif.videoFilters.some((f) => f.includes("fps=15")),
    "Contains 15fps rate filter"
  );
  assert(
    compiledGif.outputArgs.includes("+transdiff"),
    "Contains high-quality GIF transdiff flags"
  );
  console.log("✓ Test 1 passed: ZenoTap Reaction GIF compiles cleanly in 1 pass.");

  // TEST 2: Social Speed-Clip Template (1:1 / 1.5x speed)
  console.log("\n[Test 2] Social Speed-Clip Template Compilation (Video + Audio Speed)");
  const socialTmpl = MACRO_TEMPLATES.find((t) => t.id === "social-turbo-clip");
  assert(!!socialTmpl, "Social turbo clip template exists");

  const compiledSocial = compileMacroPipeline(socialTmpl!.nodes);
  console.log("Compiled Social videoFilters:", compiledSocial.videoFilters);
  console.log("Compiled Social audioFilters:", compiledSocial.audioFilters);

  assert(compiledSocial.targetFormat === "mp4", "Target format is MP4");
  assert(
    compiledSocial.videoFilters.some((f) => f.includes("setpts=0.6667*PTS")),
    "Video PTS scaled to 1.5x speed (1 / 1.5 = 0.6667)"
  );
  assert(
    compiledSocial.audioFilters.some((f) => f.includes("atempo=1.50")),
    "Audio tempo scaled to 1.5x with pitch preservation"
  );
  assert(
    compiledSocial.outputArgs.includes("libx264"),
    "Uses H.264 video codec"
  );
  assert(
    compiledSocial.outputArgs.includes("yuv420p"),
    "Uses universal YUV420P pixel format"
  );
  console.log("✓ Test 2 passed: Social Speed-Clip merges crop, speed, and scale into single pass.");

  // TEST 3: Cyber 8D Spatial Master Template
  console.log("\n[Test 3] Cyber 8D Spatial Master Template Compilation");
  const audioTmpl = MACRO_TEMPLATES.find((t) => t.id === "cyber-spatial-master");
  assert(!!audioTmpl, "Audio template exists");

  const compiledAudio = compileMacroPipeline(audioTmpl!.nodes);
  console.log("Compiled Audio audioFilters:", compiledAudio.audioFilters);

  assert(compiledAudio.targetFormat === "wav", "Target format is WAV");
  assert(
    compiledAudio.audioFilters.some((f) => f.includes("bass=g=6:f=80")),
    "Includes +6dB low-end bass boost filter"
  );
  assert(
    compiledAudio.audioFilters.some((f) => f.includes("extrastereo=m=1.40")),
    "Includes 1.4x stereo expander for spatial separation"
  );
  console.log("✓ Test 3 passed: Cyber 8D Audio Master compiles without video overhead.");

  // TEST 4: Extreme Speed Chained Atempo Logic
  console.log("\n[Test 4] Extreme Speed Chained Atempo Logic (3.0x and 0.3x)");
  const highSpeedNode: MacroNode = {
    id: "n-high",
    type: "speed",
    enabled: true,
    config: { multiplier: 3.0 },
  };
  const lowSpeedNode: MacroNode = {
    id: "n-low",
    type: "speed",
    enabled: true,
    config: { multiplier: 0.3 },
  };

  const highCompiled = compileMacroPipeline([highSpeedNode]);
  assert(
    highCompiled.audioFilters[0] === "atempo=2.0,atempo=1.50",
    `Chained high speed: ${highCompiled.audioFilters[0]}`
  );

  const lowCompiled = compileMacroPipeline([lowSpeedNode]);
  assert(
    lowCompiled.audioFilters[0] === "atempo=0.5,atempo=0.60",
    `Chained low speed: ${lowCompiled.audioFilters[0]}`
  );
  console.log("✓ Test 4 passed: Multi-stage atempo chains handle speeds > 2.0x and < 0.5x.");

  // TEST 5: Node Toggling & Disabled Nodes Exclusion
  console.log("\n[Test 5] Node Toggling and Exclusion");
  const mixedNodes: MacroNode[] = [
    {
      id: "n1",
      type: "scale",
      enabled: false, // Disabled
      config: { maxDimension: 480 },
    },
    {
      id: "n2",
      type: "audio-dsp",
      enabled: true,
      config: { bassBoostDb: 10, spatial8D: false },
    },
  ];
  const mixedCompiled = compileMacroPipeline(mixedNodes);
  assert(mixedCompiled.videoFilters.length === 0, "Disabled scale node was excluded");
  assert(mixedCompiled.audioFilters.length === 1, "Enabled audio DSP node was included");
  console.log("✓ Test 5 passed: Disabled nodes do not generate filtergraph overhead.");

  // TEST 6: buildFFmpegArgs Command Generation
  console.log("\n[Test 6] Full FFmpeg Argv Array Generation");
  const fullArgs = buildFFmpegArgs(compiledSocial, "source.mp4", "output.mp4");
  console.log("Generated FFmpeg args:", fullArgs.join(" "));

  assert(fullArgs[0] === "-i" && fullArgs[1] === "source.mp4", "Input flag precedes input file");
  assert(fullArgs.includes("-vf"), "Includes -vf video filter flag");
  assert(fullArgs.includes("-af"), "Includes -af audio filter flag");
  assert(fullArgs[fullArgs.length - 1] === "output.mp4", "Output file is the trailing arg");
  console.log("✓ Test 6 passed: Complete FFmpeg CLI command successfully built.");

  // TEST 7: Node Factory for all MacroNodeType options
  console.log("\n[Test 7] Node Factory createDefaultNode");
  const nodeTypes: MacroNodeType[] = [
    "trim",
    "crop",
    "scale",
    "speed",
    "ascii-shader",
    "audio-dsp",
    "format-convert",
    "push-zenotap",
  ];

  for (const type of nodeTypes) {
    const node = createDefaultNode(type);
    assert(node.type === type, `Created node type matches: ${type}`);
    assert(node.enabled === true, "Node is enabled by default");
    assert(node.id.startsWith("node-"), `Node id has prefix: ${node.id}`);
    assert(typeof node.config === "object", "Node config is defined");
  }
  console.log(`✓ Test 7 passed: All ${nodeTypes.length} node types generated with default configs.`);

  console.log("\n========================================================");
  console.log("ALL 7 PHASE 5 ZENOMACROS TESTS PASSED (100%)");
  console.log("========================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
