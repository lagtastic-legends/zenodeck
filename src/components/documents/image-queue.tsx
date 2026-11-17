"use client";

/**
 * ImageQueue — multi-image intake with thumbnails, drag-and-drop, reorder
 * (move up/down), remove, and add-more. Used by Image→PDF and Scan→PDF.
 */

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/format";

export interface QueuedImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface ImageQueueProps {
  images: QueuedImage[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  disabled?: boolean;
  label?: string;
}

export function ImageQueue({
  images,
  onAdd,
  onRemove,
  onMove,
  disabled,
  label = "Drop pages here",
}: ImageQueueProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const totalBytes = useMemo(
    () => images.reduce((acc, i) => acc + i.file.size, 0),
    [images],
  );

  const acceptFiles = (list: FileList | File[] | undefined) => {
    if (!list) return;
    const valid = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const rejected = Array.from(list).length - valid.length;
    if (rejected > 0) {
      toast({
        title: "Images only",
        description: `${rejected} file${rejected === 1 ? "" : "s"} skipped — this module accepts images.`,
        variant: "destructive",
      });
    }
    if (valid.length) onAdd(valid);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    acceptFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* drop surface / add-more */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current = Math.max(dragDepth.current - 1, 0);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label={`${label} — click or drag images`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-all ${
          dragging
            ? "border-primary bg-primary/10 glow-box-violet"
            : "border-border/80 bg-card/40 hover:border-primary/50"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <motion.div
          animate={dragging ? { scale: 1.12, y: -3 } : { scale: 1, y: 0 }}
          className="grid size-11 place-items-center rounded-xl border border-primary/30 bg-primary/10"
        >
          {images.length > 0 ? (
            <ImagePlus className="size-5 text-primary" strokeWidth={1.75} />
          ) : (
            <UploadCloud className="size-5 text-primary" strokeWidth={1.75} />
          )}
        </motion.div>
        <p className="font-display text-sm font-bold tracking-wide text-foreground">
          {images.length > 0 ? "Add more pages" : label}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {images.length > 0
            ? `${images.length} page${images.length === 1 ? "" : "s"} · ${formatBytes(totalBytes)}`
            : "JPG / PNG — Tap to select files or drag & drop"}
        </p>
      </div>

      {/* thumbnails */}
      <AnimatePresence initial={false}>
        {images.length > 0 && (
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="scroll-hud grid max-h-80 gap-2 overflow-y-auto pr-1"
            aria-label="Page queue"
          >
            {images.map((img, idx) => (
              <motion.li
                key={img.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/50 p-2"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-md border border-primary/40 bg-primary/10 font-mono text-[10px] font-bold text-primary">
                  {idx + 1}
                </span>
                { }
                <img
                  src={img.previewUrl}
                  alt={`Page ${idx + 1}: ${img.file.name}`}
                  className="h-12 w-16 rounded border border-border/50 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px] text-foreground/90">
                    {img.file.name}
                  </p>
                  <p className="font-mono text-[9px] text-muted-foreground">
                    {formatBytes(img.file.size)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => onMove(img.id, -1)}
                    disabled={disabled || idx === 0}
                    aria-label={`Move ${img.file.name} earlier`}
                    className="grid size-8 place-items-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    onClick={() => onMove(img.id, 1)}
                    disabled={disabled || idx === images.length - 1}
                    aria-label={`Move ${img.file.name} later`}
                    className="grid size-8 place-items-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    onClick={() => onRemove(img.id)}
                    disabled={disabled}
                    aria-label={`Remove ${img.file.name}`}
                    className="grid size-8 place-items-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-red-400/50 hover:text-red-300 disabled:opacity-30"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Add image files"
        onChange={(e) => {
          acceptFiles(e.target.files ?? undefined);
          e.target.value = "";
        }}
      />
    </div>
  );
}
