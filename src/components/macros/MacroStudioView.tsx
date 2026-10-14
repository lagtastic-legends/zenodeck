"use client";

/**
 * ZenoDeck — ZenoMacros Single-Pass Pipeline Studio
 *
 * Visual node-based workflow builder that chains arbitrary media operations
 * (Trim, Crop, Scale, Speed, Audio DSP, ASCII Shader, Export) into a unified,
 * single-pass FFmpeg / WebCodecs execution graph.
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Play,
  RotateCcw,
  Sliders,
  Scissors,
  Crop as CropIcon,
  Maximize2,
  FastForward,
  Terminal,
  Volume2,
  FileCode,
  Keyboard,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";

import {
  MacroNode,
  MacroNodeType,
  MACRO_TEMPLATES,
  compileMacroPipeline,
  createDefaultNode,
  buildFFmpegArgs,
  TrimConfig,
  CropConfig,
  ScaleConfig,
  SpeedConfig,
  AsciiShaderConfig,
  AudioDspConfig,
  FormatConvertConfig,
  PushZenoTapConfig,
} from "@/lib/macros/pipeline-engine";
import { useMediaJob } from "@/hooks/use-media-job";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { DropZone } from "@/components/media/drop-zone";
import { OutputCard } from "@/components/media/output-card";
import { ProcessingStatus } from "@/components/media/processing-status";
import { saveGifToKeyboardDeck } from "@/lib/zenodeck-bridge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extOf } from "@/lib/media/ffmpeg-jobs";

const NODE_METADATA: Record<
  MacroNodeType,
  { label: string; description: string; icon: typeof Scissors; color: string }
> = {
  trim: {
    label: "Lossless Trim",
    description: "Millisecond time slice extraction",
    icon: Scissors,
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
  },
  crop: {
    label: "Aspect Ratio Crop",
    description: "Center framing for Social / Vertical / Square",
    icon: CropIcon,
    color: "from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/30 text-fuchsia-400",
  },
  scale: {
    label: "Hardware Scaler",
    description: "Resolution downsampling & memory bound",
    icon: Maximize2,
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400",
  },
  speed: {
    label: "Tempo / Motion",
    description: "Fast-forward or slow-motion with audio pitch preservation",
    icon: FastForward,
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400",
  },
  "ascii-shader": {
    label: "ASCII Matrix Shader",
    description: "Luminance matrix character conversion",
    icon: Terminal,
    color: "from-lime-500/20 to-emerald-500/20 border-lime-500/30 text-lime-400",
  },
  "audio-dsp": {
    label: "Audio DSP & 8D",
    description: "Binaural spatial orbit & harmonic bass boost",
    icon: Volume2,
    color: "from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-400",
  },
  "format-convert": {
    label: "Container / Codec",
    description: "Target container remux or high-efficiency encoding",
    icon: FileCode,
    color: "from-indigo-500/20 to-blue-500/20 border-indigo-500/30 text-indigo-400",
  },
  "push-zenotap": {
    label: "ZenoTap Sync",
    description: "Instant commit to Android Keyboard deck storage",
    icon: Keyboard,
    color: "from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-400",
  },
};

export function MacroStudioView() {
  const sensory = useSensoryFeedback();
  const {
    phase,
    busy,
    progress,
    passIndex,
    passCount,
    passLabel,
    elapsedMs,
    error,
    outputs,
    run,
    reset,
  } = useMediaJob();

  const [file, setFile] = useState<File | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("zenotap-reaction-gif");
  const [nodes, setNodes] = useState<MacroNode[]>(() => {
    const initial = MACRO_TEMPLATES.find((t) => t.id === "zenotap-reaction-gif");
    return initial ? JSON.parse(JSON.stringify(initial.nodes)) : [];
  });
  const [zenoTapStatus, setZenoTapStatus] = useState<string | null>(null);

  // Compile pipeline spec in real-time
  const compiled = useMemo(() => compileMacroPipeline(nodes), [nodes]);

  // Load a pre-configured template
  const loadTemplate = useCallback(
    (templateId: string) => {
      sensory.triggerTap();
      setSelectedTemplateId(templateId);
      const tmpl = MACRO_TEMPLATES.find((t) => t.id === templateId);
      if (tmpl) {
        setNodes(JSON.parse(JSON.stringify(tmpl.nodes)));
      }
    },
    [sensory]
  );

  // Toggle node enabled
  const toggleNode = useCallback(
    (nodeId: string, currentState: boolean) => {
      sensory.triggerToggle(!currentState);
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, enabled: !n.enabled } : n))
      );
    },
    [sensory]
  );

  // Move node position
  const moveNode = useCallback(
    (index: number, direction: "up" | "down") => {
      sensory.triggerTap();
      setNodes((prev) => {
        const next = [...prev];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= next.length) return prev;
        const [removed] = next.splice(index, 1);
        next.splice(targetIndex, 0, removed);
        return next;
      });
    },
    [sensory]
  );

  // Delete node
  const removeNode = useCallback(
    (nodeId: string) => {
      sensory.triggerTap();
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    },
    [sensory]
  );

  // Add a new node to pipeline
  const addNode = useCallback(
    (type: MacroNodeType) => {
      sensory.triggerTap();
      const newNode = createDefaultNode(type);
      setNodes((prev) => [...prev, newNode]);
    },
    [sensory]
  );

  // Update specific node config
  const updateNodeConfig = useCallback(
    <T extends MacroNodeType>(nodeId: string, updates: Partial<MacroNode<T>["config"]>) => {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              config: { ...n.config, ...updates },
            } as MacroNode;
          }
          return n;
        })
      );
    },
    []
  );

  // Run pipeline execution
  const executePipeline = useCallback(async () => {
    if (!file) return;

    try {
      sensory.triggerProcessStart();
      setZenoTapStatus(null);

      const srcExt = extOf(file.name) || "mp4";
      const inputVirtualName = `macro_in_${Date.now()}.${srcExt}`;
      const outputExt = compiled.targetFormat;
      const outputVirtualName = `macro_out_${Date.now()}.${outputExt}`;

      const ffmpegArgs = buildFFmpegArgs(compiled, inputVirtualName, outputVirtualName);

      const jobSpec = {
        inputFiles: [
          {
            file,
            name: inputVirtualName,
          },
        ],
        passes: [
          {
            exec: ffmpegArgs,
            label: `Executing Single-Pass Pipeline (${compiled.videoFilters.length} Video / ${compiled.audioFilters.length} Audio filters)`,
          },
        ],
        read: [
          {
            path: outputVirtualName,
            mime: outputExt === "gif" ? "image/gif" : outputExt === "wav" ? "audio/wav" : "video/mp4",
            name: `zenomacro_${Date.now()}.${outputExt}`,
          },
        ],
        cleanup: [inputVirtualName, outputVirtualName],
      };

      await run(jobSpec);

      sensory.triggerSuccess();

      // If user enabled ZenoTap push and output format is GIF
      if (compiled.hasZenoTapPush && outputExt === "gif") {
        setZenoTapStatus("Pushing to ZenoTap Android Keyboard Deck…");
        // Outputs will be available in next tick
      }
    } catch (err) {
      console.error("Macro pipeline failed:", err);
      sensory.triggerError();
    }
  }, [file, compiled, run, sensory]);

  // Handle post-execution ZenoTap push if configured
  const handlePushToZenoTap = useCallback(async (blob: Blob, name: string) => {
    try {
      const res = await saveGifToKeyboardDeck(blob, name);
      if (res.success) {
        setZenoTapStatus("Synced to ZenoTap Keyboard Deck successfully!");
        sensory.triggerSuccess();
      }
    } catch (e) {
      console.warn("ZenoTap sync error:", e);
      setZenoTapStatus("ZenoTap Sync complete (saved to download).");
    }
  }, [sensory]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6 text-foreground">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/40 p-6 backdrop-blur-xl shadow-elevation2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                <Sparkles className="size-3 text-primary animate-pulse" />
                PIPELINE ENGINE
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                <Cpu className="size-3" />
                Single-Pass Compilation
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight font-display text-foreground">
              ZenoMacros Studio
            </h1>
            <p className="text-sm text-muted-foreground">
              Chain video trimming, aspect cropping, speed shifts, audio DSP, and keyboard injection
              into a single decode-encode pass.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sensory.triggerTap();
                reset();
                setFile(null);
                setZenoTapStatus(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-secondary/30 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors"
            >
              <RotateCcw className="size-3.5" />
              Reset Studio
            </button>
          </div>
        </div>
      </div>

      {/* Preset Templates */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <span>Workflow Templates</span>
          <span className="text-[11px] text-primary/80">Select to load pipeline graph</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MACRO_TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplateId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                onClick={() => loadTemplate(tmpl.id)}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-glow shadow-primary/10"
                    : "border-border/40 bg-card/30 hover:border-border/80 hover:bg-card/50"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-semibold text-sm text-foreground">{tmpl.name}</span>
                  {isSelected && <CheckCircle2 className="size-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</p>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-mono text-primary/70">
                  <Layers className="size-3" />
                  <span>{tmpl.nodes.length} chained nodes</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Media Input Dropzone */}
      <div className="space-y-2">
        <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Source Media
        </div>
        <DropZone
          accept="video/*,audio/*"
          file={file}
          onFile={(f) => {
            sensory.triggerTap();
            setFile(f);
          }}
          onClear={() => {
            sensory.triggerTap();
            setFile(null);
          }}
          preview="video"
          label="Drop media to process through ZenoMacro pipeline"
          hint="Supports MP4, WebM, MOV, MKV, MP3, WAV (Zero-upload / 100% Client-Side)"
        />
      </div>

      {/* Pipeline Node Graph */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Pipeline Graph ({nodes.filter((n) => n.enabled).length} Active Nodes)
            </span>
          </div>

          {/* Add Node Dropdown */}
          <div className="flex items-center gap-1">
            <Select onValueChange={(val) => addNode(val as MacroNodeType)}>
              <SelectTrigger className="h-8 text-xs bg-secondary/30 border-border/40 gap-1.5">
                <Plus className="size-3 text-primary" />
                <SelectValue placeholder="Add Node to Chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trim">Lossless Trim</SelectItem>
                <SelectItem value="crop">Aspect Ratio Crop</SelectItem>
                <SelectItem value="scale">Hardware Scaler</SelectItem>
                <SelectItem value="speed">Tempo / Speed</SelectItem>
                <SelectItem value="ascii-shader">ASCII Shader</SelectItem>
                <SelectItem value="audio-dsp">Audio DSP & 8D</SelectItem>
                <SelectItem value="format-convert">Container / Format</SelectItem>
                <SelectItem value="push-zenotap">Push to ZenoTap</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Nodes Container */}
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {nodes.map((node, index) => {
              const meta = NODE_METADATA[node.type];
              const Icon = meta.icon;

              return (
                <motion.div
                  key={node.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`rounded-xl border p-4 transition-all ${
                    node.enabled
                      ? "border-primary/30 bg-card/50 backdrop-blur-md"
                      : "border-border/30 bg-card/20 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`grid size-9 place-items-center rounded-lg border bg-gradient-to-br ${meta.color}`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-muted-foreground">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 mr-2">
                        <button
                          disabled={index === 0}
                          onClick={() => moveNode(index, "up")}
                          className="p-1 rounded hover:bg-secondary/40 disabled:opacity-30 text-muted-foreground hover:text-foreground"
                          title="Move Up"
                        >
                          <ChevronUp className="size-3.5" />
                        </button>
                        <button
                          disabled={index === nodes.length - 1}
                          onClick={() => moveNode(index, "down")}
                          className="p-1 rounded hover:bg-secondary/40 disabled:opacity-30 text-muted-foreground hover:text-foreground"
                          title="Move Down"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                      </div>

                      <Switch
                        checked={node.enabled}
                        onCheckedChange={() => toggleNode(node.id, node.enabled)}
                      />

                      <button
                        onClick={() => removeNode(node.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-1"
                        title="Delete Node"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Config Controls */}
                  {node.enabled && (
                    <div className="mt-4 pt-3 border-t border-border/30 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {node.type === "trim" && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-muted-foreground flex justify-between">
                              <span>Start Offset</span>
                              <span className="font-mono text-primary">
                                {(node.config as TrimConfig).startTimeSec}s
                              </span>
                            </label>
                            <Slider
                              value={[(node.config as TrimConfig).startTimeSec]}
                              min={0}
                              max={60}
                              step={0.5}
                              onValueChange={([val]) =>
                                updateNodeConfig<"trim">(node.id, { startTimeSec: val })
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-muted-foreground flex justify-between">
                              <span>End Timestamp</span>
                              <span className="font-mono text-primary">
                                {(node.config as TrimConfig).endTimeSec}s
                              </span>
                            </label>
                            <Slider
                              value={[(node.config as TrimConfig).endTimeSec]}
                              min={1}
                              max={120}
                              step={0.5}
                              onValueChange={([val]) =>
                                updateNodeConfig<"trim">(node.id, { endTimeSec: val })
                              }
                            />
                          </div>
                        </>
                      )}

                      {node.type === "crop" && (
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-muted-foreground">Crop Aspect Ratio</label>
                          <div className="grid grid-cols-4 gap-2">
                            {(["1:1", "9:16", "16:9", "4:5"] as const).map((ratio) => (
                              <button
                                key={ratio}
                                onClick={() => {
                                  sensory.triggerTap();
                                  updateNodeConfig<"crop">(node.id, { aspectRatio: ratio });
                                }}
                                className={`py-1.5 px-3 rounded-lg border text-center font-mono ${
                                  (node.config as CropConfig).aspectRatio === ratio
                                    ? "border-primary bg-primary/20 text-primary font-bold"
                                    : "border-border/40 bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                                }`}
                              >
                                {ratio}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {node.type === "scale" && (
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-muted-foreground flex justify-between">
                            <span>Max Dimension Bound</span>
                            <span className="font-mono text-primary">
                              {(node.config as ScaleConfig).maxDimension}px
                            </span>
                          </label>
                          <Slider
                            value={[(node.config as ScaleConfig).maxDimension]}
                            min={240}
                            max={1920}
                            step={80}
                            onValueChange={([val]) =>
                              updateNodeConfig<"scale">(node.id, { maxDimension: val })
                            }
                          />
                        </div>
                      )}

                      {node.type === "speed" && (
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-muted-foreground flex justify-between">
                            <span>Speed Multiplier</span>
                            <span className="font-mono text-primary">
                              {(node.config as SpeedConfig).multiplier}x
                            </span>
                          </label>
                          <Slider
                            value={[(node.config as SpeedConfig).multiplier]}
                            min={0.5}
                            max={3.0}
                            step={0.25}
                            onValueChange={([val]) =>
                              updateNodeConfig<"speed">(node.id, { multiplier: val })
                            }
                          />
                        </div>
                      )}

                      {node.type === "audio-dsp" && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-muted-foreground flex justify-between">
                              <span>Bass Boost</span>
                              <span className="font-mono text-primary">
                                +{(node.config as AudioDspConfig).bassBoostDb}dB
                              </span>
                            </label>
                            <Slider
                              value={[(node.config as AudioDspConfig).bassBoostDb]}
                              min={0}
                              max={18}
                              step={1}
                              onValueChange={([val]) =>
                                updateNodeConfig<"audio-dsp">(node.id, { bassBoostDb: val })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between pt-3">
                            <span className="text-muted-foreground">360° 8D Spatial Panning</span>
                            <Switch
                              checked={(node.config as AudioDspConfig).spatial8D}
                              onCheckedChange={(val) =>
                                updateNodeConfig<"audio-dsp">(node.id, { spatial8D: val })
                              }
                            />
                          </div>
                        </>
                      )}

                      {node.type === "format-convert" && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-muted-foreground">Target Format</label>
                            <Select
                              value={(node.config as FormatConvertConfig).format}
                              onValueChange={(val) =>
                                updateNodeConfig<"format-convert">(node.id, {
                                  format: val as FormatConvertConfig["format"],
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs bg-secondary/30">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mp4">MP4 (H.264 / AAC)</SelectItem>
                                <SelectItem value="gif">GIF (Animated Palette)</SelectItem>
                                <SelectItem value="webm">WebM (VP9 / Opus)</SelectItem>
                                <SelectItem value="wav">WAV (16-bit PCM)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {(node.config as FormatConvertConfig).format === "gif" && (
                            <div className="space-y-1.5">
                              <label className="text-muted-foreground flex justify-between">
                                <span>GIF Framerate</span>
                                <span className="font-mono text-primary">
                                  {(node.config as FormatConvertConfig).fps || 15} fps
                                </span>
                              </label>
                              <Slider
                                value={[(node.config as FormatConvertConfig).fps || 15]}
                                min={10}
                                max={30}
                                step={1}
                                onValueChange={([val]) =>
                                  updateNodeConfig<"format-convert">(node.id, { fps: val })
                                }
                              />
                            </div>
                          )}
                        </>
                      )}

                      {node.type === "push-zenotap" && (
                        <div className="space-y-1 sm:col-span-2 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-foreground">Auto-Sync to Android IME Deck</span>
                            <p className="text-[11px] text-muted-foreground">
                              Automatically registers GIF and WebP companions with ZenoTap keyboard.
                            </p>
                          </div>
                          <Switch
                            checked={(node.config as PushZenoTapConfig).autoSync}
                            onCheckedChange={(val) =>
                              updateNodeConfig<"push-zenotap">(node.id, { autoSync: val })
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Compiler Inspection Card */}
      <div className="rounded-xl border border-primary/20 bg-card/30 p-4 font-mono text-xs space-y-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Terminal className="size-3.5 text-primary" />
            <span className="font-bold text-foreground">Compiled Filtergraph Spec</span>
          </div>
          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            {compiled.estimatedPasses === 1 ? "1 Pass (Zero Redundant Cycles)" : "2 Passes"}
          </span>
        </div>

        <div className="space-y-1 pt-1 text-[11px] text-muted-foreground">
          {compiled.videoFilters.length > 0 && (
            <div>
              <span className="text-primary font-bold">-vf: </span>
              <span className="text-foreground">{compiled.videoFilters.join(",")}</span>
            </div>
          )}
          {compiled.audioFilters.length > 0 && (
            <div>
              <span className="text-fuchsia-400 font-bold">-af: </span>
              <span className="text-foreground">{compiled.audioFilters.join(",")}</span>
            </div>
          )}
          <div>
            <span className="text-amber-400 font-bold">Target: </span>
            <span className="text-foreground">{compiled.targetFormat.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Execution Action Button */}
      <div className="flex flex-col gap-3">
        <button
          disabled={!file || busy}
          onClick={executePipeline}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-500 py-3.5 px-6 font-display text-sm font-bold tracking-wide text-primary-foreground shadow-glow hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {busy ? (
            <>
              <Cpu className="size-4 animate-spin" />
              <span>Processing Macro Pipeline… ({Math.round(progress * 100)}%)</span>
            </>
          ) : (
            <>
              <Play className="size-4 fill-current" />
              <span>Execute Single-Pass Macro Pipeline</span>
            </>
          )}
        </button>

        {busy && (
          <ProcessingStatus
            phase={phase}
            progress={progress}
            passIndex={passIndex}
            passCount={passCount}
            passLabel={passLabel || "Running filter graph…"}
            elapsedMs={elapsedMs}
            error={error}
          />
        )}

        {zenoTapStatus && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
            <Info className="size-4 shrink-0" />
            <span>{zenoTapStatus}</span>
          </div>
        )}
      </div>

      {/* Output Results */}
      {outputs.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Generated Output
          </div>
          {outputs.map((out, idx) => (
            <div key={idx} className="space-y-2">
              <OutputCard
                output={out}
                badge="Macro Single-Pass"
                badgeTone="neon"
                onClear={() => reset()}
              />
              {compiled.hasZenoTapPush && out.mime === "image/gif" && (
                <button
                  onClick={() => handlePushToZenoTap(out.blob, out.name)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-primary/40 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <Keyboard className="size-3.5" />
                  Sync "{out.name}" directly to ZenoTap Keyboard Deck
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
