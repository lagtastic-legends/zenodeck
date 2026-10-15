"use client";

/**
 * TOOL MATRIX — registry-driven dashboard grid.
 * Every tool across all 7 phases is declared once in TOOL_REGISTRY;
 * online tools navigate into their module, locked ones tease their phase.
 */

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, LayoutGrid, List, Lock } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { useToast } from "@/hooks/use-toast";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { useNavStore } from "@/lib/navigation/nav-store";
import { ACCENT_STYLES } from "@/lib/tools/accents";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  TOOL_REGISTRY,
  getOnlineTools,
  getVisibleTools,
} from "@/lib/tools/registry";
import type { ToolCategory, ToolMeta } from "@/types/omni";

type Filter = "all" | ToolCategory;

const ToolCard = memo(function ToolCard({
  tool,
  index,
  engineState,
  isMatrixView = true,
}: {
  tool: ToolMeta;
  index: number;
  engineState: "idle" | "loading" | "ready" | "error";
  isMatrixView?: boolean;
}) {
  const { toast } = useToast();
  const haptics = useHaptics();
  const navigate = useNavStore((s) => s.navigate);
  const accent = (tool.accent && ACCENT_STYLES[tool.accent]) || ACCENT_STYLES.violet;
  const locked = tool.status !== "online";
  const requiresEngine = tool.requiresEngine !== false;
  const isEngineReady = !requiresEngine || engineState === "ready";

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, transition: { type: "spring", stiffness: 420, damping: 26, mass: 0.6 } }}
      whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 480, damping: 24, mass: 0.5 } }}
      onClick={() => {
        if (locked) {
          void haptics.warning();
          toast({
            title: `${tool.name} is sealed`,
            description: `This module unlocks in Phase ${tool.phase} of the build sequence.`,
          });
        } else {
          void haptics.medium();
          navigate(tool.id);
        }
      }}
      className={`panel-hud group relative flex min-h-11 flex-col justify-between text-left shadow-tactile transition-all duration-200 min-w-0 ${
        isMatrixView
          ? "rounded-xl sm:rounded-tactile p-2 sm:p-3.5 md:p-4 gap-1.5 sm:gap-2.5 min-h-[96px] sm:min-h-11"
          : "rounded-tactile p-3.5 sm:p-4 gap-3"
      } ${
        locked
          ? "cursor-pointer hover:border-primary/35 hover:shadow-elevation1"
          : isEngineReady
          ? "cursor-pointer border-primary/40 glow-box-violet hover:shadow-elevation2"
          : "cursor-pointer hover:border-primary/40 hover:shadow-elevation1"
      }`}
      aria-label={`${tool.name} — ${locked ? `locked, phase ${tool.phase}` : isEngineReady ? "online, open module" : "standby, requires engine"}`}
    >
      <div className="flex items-start justify-between gap-1 sm:gap-2">
        <div
          className={`grid shrink-0 place-items-center border ${accent.tile} transition-transform duration-300 group-hover:scale-110 ${
            isMatrixView
              ? "size-7 sm:size-10 rounded-md sm:rounded-lg"
              : "size-9 sm:size-10 rounded-lg"
          }`}
        >
          <tool.icon
            className={isMatrixView ? "size-3.5 sm:size-5" : "size-4 sm:size-5"}
            strokeWidth={1.75}
          />
        </div>

        {locked ? (
          <>
            {isMatrixView && (
              <span
                className="sm:hidden grid size-4 place-items-center rounded bg-background/80 border border-border/80 text-muted-foreground"
                title={`Locked (Phase ${tool.phase})`}
              >
                <Lock className="size-2.5" />
              </span>
            )}
            <span
              className={`${
                isMatrixView ? "hidden sm:flex" : "flex"
              } items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground`}
            >
              <Lock className="size-2.5" />
              phase {tool.phase}
            </span>
          </>
        ) : requiresEngine && engineState !== "ready" ? (
          engineState === "loading" ? (
            <>
              {isMatrixView && (
                <span
                  className="sm:hidden size-2 rounded-full bg-cyan-400 animate-ping mt-1"
                  title="Booting engine…"
                />
              )}
              <span
                className={`${
                  isMatrixView ? "hidden sm:flex" : "flex"
                } items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-300`}
              >
                <span className="size-1.5 animate-ping rounded-full bg-cyan-400" />
                booting…
              </span>
            </>
          ) : engineState === "error" ? (
            <>
              {isMatrixView && (
                <span
                  className="sm:hidden size-2 rounded-full bg-destructive mt-1"
                  title="Engine error"
                />
              )}
              <span
                className={`${
                  isMatrixView ? "hidden sm:flex" : "flex"
                } items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-destructive`}
              >
                <span className="size-1.5 rounded-full bg-destructive" />
                error
              </span>
            </>
          ) : (
            <>
              {isMatrixView && (
                <span
                  className="sm:hidden size-2 rounded-full bg-muted-foreground/60 mt-1"
                  title="Engine standby"
                />
              )}
              <span
                className={`${
                  isMatrixView ? "hidden sm:flex" : "flex"
                } items-center gap-1 rounded-full border border-border/70 bg-card/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground`}
                title="WASM Engine Standby — Boots automatically on demand when tapped"
              >
                <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                standby
              </span>
            </>
          )
        ) : (
          <>
            {isMatrixView && (
              <span
                className="sm:hidden size-2 rounded-full bg-pulse shadow-[0_0_6px_var(--pulse)] animate-pulse mt-1"
                title="Instant WebAudio DSP — 0ms Latency"
              />
            )}
            <span
              className={`${
                isMatrixView ? "hidden sm:flex" : "flex"
              } items-center gap-1 rounded-full border border-pulse/30 bg-pulse/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-pulse`}
              title="Instant WebAudio DSP — Zero latency execution"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-pulse" />
              online
            </span>
          </>
        )}
      </div>

      <div>
        <p
          className={`flex items-center gap-1 font-display font-bold text-foreground leading-[1.25] break-words ${
            isMatrixView
              ? "text-[9px] xs:text-[10px] sm:text-xs md:text-[13px] tracking-tight sm:tracking-wide line-clamp-2 min-h-[25px] sm:min-h-0"
              : "text-xs sm:text-[13px] tracking-wide"
          }`}
        >
          {tool.name}
          {!locked && (
            <ArrowUpRight className="hidden sm:inline size-3.5 text-primary opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 shrink-0" />
          )}
        </p>
        <p
          className={`mt-0.5 sm:mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2 ${
            isMatrixView ? "hidden sm:block" : "block"
          }`}
        >
          {tool.description}
        </p>
      </div>

      <span
        className={`mt-auto inline-flex w-fit items-center rounded border font-mono uppercase truncate max-w-full ${
          isMatrixView
            ? "px-1 sm:px-1.5 py-0.2 sm:py-0.5 text-[7px] sm:text-[8.5px] tracking-[0.08em] sm:tracking-[0.14em]"
            : "px-1.5 py-0.5 text-[8.5px] tracking-[0.14em]"
        } ${accent.phaseChip}`}
      >
        {CATEGORY_LABELS[tool.category]}
      </span>
    </motion.button>
  );
});

export function ToolGrid() {
  const { state } = useFFmpegEngine();
  const [filter, setFilter] = useState<Filter>("all");
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
  const haptics = useHaptics();

  const availableTools = useMemo(() => getVisibleTools(), []);

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([["all", availableTools.length]]);
    for (const tool of availableTools) {
      map.set(tool.category, (map.get(tool.category) ?? 0) + 1);
    }
    return map;
  }, [availableTools]);

  const visible = useMemo(
    () =>
      filter === "all"
        ? availableTools
        : availableTools.filter((t) => t.category === filter),
    [filter, availableTools],
  );

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All Modules" },
    ...CATEGORY_ORDER.map((c) => ({ id: c, label: CATEGORY_LABELS[c] })),
  ];

  const onlineCount = useMemo(
    () =>
      availableTools.filter(
        (t) => t.status === "online" && (t.requiresEngine === false || state === "ready")
      ).length,
    [state, availableTools]
  );

  return (
    <section aria-labelledby="matrix-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <h3
            id="matrix-heading"
            className="flex items-center gap-2 font-display text-xs sm:text-sm font-bold uppercase tracking-[0.24em] sm:tracking-[0.28em] text-foreground/90"
          >
            <LayoutGrid className="size-4 text-primary" />
            Tool Matrix
          </h3>

          {/* 4x8 Matrix vs Detailed view toggle */}
          <div className="flex items-center rounded-full border border-border/70 bg-card/60 p-0.5 font-mono text-[9px] sm:text-[10px]">
            <button
              type="button"
              onClick={() => {
                void haptics.selectionChanged();
                setLayoutMode("grid");
              }}
              className={`flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-0.5 transition-all ${
                layoutMode === "grid"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="4×8 Matrix View (4 horizontal, 8 vertical)"
            >
              <LayoutGrid className="size-2.5 sm:size-3" />
              <span>4×8 Grid</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void haptics.selectionChanged();
                setLayoutMode("list");
              }}
              className={`flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-0.5 transition-all ${
                layoutMode === "list"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Detailed List View"
            >
              <List className="size-2.5 sm:size-3" />
              <span>Detailed</span>
            </button>
          </div>
        </div>

        <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.2em] text-muted-foreground">
          <span className="text-pulse">{onlineCount} live</span> ·{" "}
          {TOOL_REGISTRY.length} modules · engine{" "}
          <span className={state === "ready" ? "text-pulse" : "text-amber-300"}>
            {state}
          </span>
        </p>
      </div>

      {/* filter rail */}
      <div className="scroll-hud flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter tools by category">
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <motion.button
              key={f.id}
              role="tab"
              aria-selected={active}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                void haptics.selectionChanged();
                setFilter(f.id);
              }}
              className={`relative shrink-0 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="matrix-filter-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-plasma"
                  transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.6 }}
                  style={{ willChange: "transform", transform: "translate3d(0, 0, 0)" }}
                />
              )}
              <span className="relative z-10">
                {f.label}
                <span
                  className={`ml-1.5 text-[9px] ${active ? "text-white/70" : "text-muted-foreground/60"}`}
                >
                  {counts.get(f.id) ?? 0}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* grid: 4 columns horizontally (4x8 matrix across all 32 tools) */}
      <div
        className={
          layoutMode === "grid"
            ? "grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-3 lg:gap-3.5"
            : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }
      >
        <AnimatePresence>
          {visible.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="col-span-full panel-hud rounded-tactile p-10 sm:p-14 text-center space-y-4 border border-border/80 shadow-tactile"
            >
              <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-border/80 bg-card/70 text-muted-foreground shadow-subtle">
                <LayoutGrid className="size-5 opacity-70" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-base font-bold tracking-wide text-foreground">
                  No modules in this sector
                </p>
                <p className="font-mono text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  There are no tools registered under this category yet. Explore other sectors or return to all modules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="mt-2 inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-xs font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all"
              >
                Show All Modules
              </button>
            </motion.div>
          ) : (
            visible.map((tool, i) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                index={i}
                engineState={state}
                isMatrixView={layoutMode === "grid"}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
