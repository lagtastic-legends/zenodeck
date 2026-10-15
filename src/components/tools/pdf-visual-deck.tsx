"use client";

import { useState } from "react";
import { RotateCw, Trash2, ArrowLeft, ArrowRight, FileText, CheckCircle2 } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { useHaptics } from "@/hooks/use-haptics";

export interface DeckPage {
  id: string;
  name: string;
  sizeBytes: number;
  widthPx?: number;
  heightPx?: number;
  dpi?: number;
  rotation: number;
  previewUrl?: string;
}

export function PdfVisualDeck({
  pages = [],
  onRotatePage,
  onRemovePage,
  onReorderPages,
}: {
  pages?: DeckPage[];
  onRotatePage?: (id: string, deg: number) => void;
  onRemovePage?: (id: string) => void;
  onReorderPages?: (pages: DeckPage[]) => void;
}) {
  const haptics = useHaptics();

  const handleRotate = (id: string, currentRot: number) => {
    haptics.light();
    onRotatePage?.(id, (currentRot + 90) % 360);
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= pages.length) return;
    haptics.light();
    const newPages = [...pages];
    const [moved] = newPages.splice(index, 1);
    newPages.splice(targetIdx, 0, moved);
    onReorderPages?.(newPages);
  };

  if (pages.length === 0) {
    return null;
  }

  return (
    <div className="panel-hud w-full max-w-full min-w-0 overflow-x-hidden box-border rounded-tactile border border-border/80 bg-card/80 p-4 text-card-foreground shadow-tactile backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <span className="font-bold uppercase tracking-wider text-foreground">
            Staged Document Pages ({pages.length})
          </span>
        </div>
        <span className="text-muted-foreground text-[11px]">
          DRAG OR SHUFFLE TO REORDER
        </span>
      </div>

      {/* Grid of Pages */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {pages.map((page, idx) => (
          <div
            key={page.id}
            className="group relative flex flex-col rounded-lg border border-border/70 bg-background/80 p-2 text-xs shadow-sm transition-all hover:border-primary/50"
          >
            {/* Page Header Bar */}
            <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground mb-1.5">
              <span className="font-bold text-foreground">PAGE {String(idx + 1).padStart(2, "0")}</span>
              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleRotate(page.id, page.rotation)}
                  className="rounded p-0.5 hover:bg-secondary hover:text-foreground"
                  title="Rotate 90 degrees"
                >
                  <RotateCw className="size-3" />
                </button>
                <button
                  onClick={() => {
                    haptics.light();
                    onRemovePage?.(page.id);
                  }}
                  className="rounded p-0.5 hover:bg-destructive/20 hover:text-destructive"
                  title="Remove page"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>

            {/* Thumbnail Canvas */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded border border-border/60 bg-secondary/30 flex items-center justify-center">
              {page.previewUrl ? (
                <img
                  src={page.previewUrl}
                  alt={page.name}
                  style={{ transform: `rotate(${page.rotation}deg)` }}
                  className="size-full object-cover transition-transform duration-200"
                />
              ) : (
                <FileText className="size-8 text-muted-foreground/40" />
              )}

              {/* Resolution Tag */}
              <span className="absolute bottom-1 right-1 rounded bg-background/90 px-1 py-0.5 font-mono text-[8px] font-semibold text-chart-5">
                {page.dpi || 300} DPI
              </span>
            </div>

            {/* Page Meta Details */}
            <div className="mt-2 font-mono text-[9px] text-muted-foreground leading-tight truncate">
              <p className="truncate font-medium text-foreground">{page.name}</p>
              <p className="flex justify-between mt-0.5 text-muted-foreground/80">
                <span>{page.widthPx && page.heightPx ? `${page.widthPx}x${page.heightPx}` : "Auto Res"}</span>
                <span>{formatBytes(page.sizeBytes)}</span>
              </p>
            </div>

            {/* Reorder Arrows on Hover */}
            <div className="mt-1.5 flex items-center justify-between border-t border-border/40 pt-1 font-mono text-[10px]">
              <button
                disabled={idx === 0}
                onClick={() => handleMove(idx, -1)}
                className="disabled:opacity-20 hover:text-primary p-0.5"
                title="Move left"
              >
                <ArrowLeft className="size-3" />
              </button>
              <span className="text-[9px] text-muted-foreground">#{idx + 1}</span>
              <button
                disabled={idx === pages.length - 1}
                onClick={() => handleMove(idx, 1)}
                className="disabled:opacity-20 hover:text-primary p-0.5"
                title="Move right"
              >
                <ArrowRight className="size-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
