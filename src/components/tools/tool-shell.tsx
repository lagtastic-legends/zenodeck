"use client";

/**
 * ToolShell — shared chrome for every tool module: back navigation,
 * identity header and the engine gate (tools refuse to run cold).
 */

import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Power } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { useNavStore } from "@/lib/navigation/nav-store";
import { ACCENT_STYLES } from "@/lib/tools/accents";
import { TOOL_REGISTRY } from "@/lib/tools/registry";

interface ToolShellProps {
  toolId: string;
  children: ReactNode;
}

export function ToolShell({ toolId, children }: ToolShellProps) {
  const tool = TOOL_REGISTRY.find((t) => t.id === toolId);
  const handleBack = useNavStore((s) => s.handleBack);
  const { state, boot, engine, appendLog } = useFFmpegEngine();

  const requiresEngine = tool?.requiresEngine !== false;

  useEffect(() => {
    if (requiresEngine && state === "loading") {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message: "The WebAssembly engine is currently initializing. Leaving now will interrupt setup. Are you sure you want to go back?",
      }));
    }
  }, [requiresEngine, state]);

  if (!tool) {
    return (
      <div className="panel-hud rounded-2xl p-8 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          Unknown module — return to the dashboard.
        </p>
      </div>
    );
  }

  const accent = (tool.accent && ACCENT_STYLES[tool.accent]) || ACCENT_STYLES.violet;
  const Icon = tool.icon;

  return (
    <div className="space-y-6">
      {/* header ---------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <motion.button
          type="button"
          onClick={() => void handleBack()}
          whileHover={{ x: -3, transition: { type: "spring", stiffness: 380, damping: 28, mass: 0.7 } }}
          whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 380, damping: 28, mass: 0.7 } }}
          aria-label="Back to dashboard"
          className="flex w-fit min-h-[44px] items-center gap-1.5 sm:gap-2 rounded-tactile border border-border/80 bg-card/60 px-3.5 sm:px-4 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-muted-foreground shadow-tactile transition-all hover:border-primary/40 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          back
        </motion.button>

        <div className="flex flex-1 items-center gap-3 sm:gap-4">
          <motion.div
            layoutId={`tool-icon-${tool.id}`}
            className={`grid size-10 sm:size-12 shrink-0 place-items-center rounded-tactile border shadow-subtle ${accent.tile}`}
          >
            <Icon className="size-5 sm:size-6" strokeWidth={1.75} />
          </motion.div>
          <div className="min-w-0">
            <motion.h1
              layoutId={`tool-title-${tool.id}`}
              className="font-display text-fluid-base sm:text-fluid-lg font-bold tracking-wide text-foreground"
            >
              {tool.name}
            </motion.h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm line-clamp-2 sm:line-clamp-none">
              {tool.description}
            </p>
          </div>
        </div>
      </div>

      {/* engine gate ------------------------------------------------------ */}
      {requiresEngine && state !== "ready" ? (
        <div className="panel-hud scanlines flex flex-col items-center gap-4 rounded-tactile border border-border/80 p-10 text-center shadow-tactile">
          {state === "loading" ? (
            <>
              <Loader2 className="size-8 animate-spin text-primary" />
              <div>
                <p className="font-display text-sm font-bold tracking-wide text-foreground">
                  ENGINE BOOTING…
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  This module unlocks the moment the WASM core is online.
                </p>
              </div>
            </>
          ) : (
            <>
              <Power className="size-8 text-muted-foreground" />
              <div>
                <p className="font-display text-sm font-bold tracking-wide text-foreground">
                  ENGINE REQUIRED
                </p>
                <p className="mt-1 max-w-sm font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {tool.name} runs entirely on the local FFmpeg WebAssembly
                  engine. Bring it online first — one click, ~30 MB, cached
                  afterwards.
                </p>
              </div>
              <motion.button
                onClick={() => void boot()}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.965, y: 1 }}
                transition={{ type: "spring", stiffness: 450, damping: 22 }}
                className="min-h-[44px] rounded-tactile border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 px-7 font-display text-xs font-bold tracking-[0.2em] text-white shadow-tactile glow-box-violet transition-all hover:shadow-elevation1"
              >
                INITIALIZE ENGINE
              </motion.button>
              {state === "error" && (
                <p className="font-mono text-[11px] text-red-300">
                  Last boot failed — retry when ready.{" "}
                  {!engine && (
                    <button
                      className="underline"
                      onClick={() =>
                        appendLog("system", "info", "Retry requested from tool gate.")
                      }
                    >
                      details in log
                    </button>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
}




