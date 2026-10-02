"use client";

/**
 * FILE VAULT — IndexedDB-backed manager for everything the suite produced.
 * Search, kind filters, sorting, lazy inline previews, download, delete,
 * clear-all with confirmation, and live storage quota telemetry.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownUp,
  Database,
  Eye,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Files,
  HardDrive,
  Search,
  Trash2,
  Upload,
  Sparkles,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/format";
import { useVault } from "@/lib/vault/vault-context";
import type { VaultItem, VaultKind } from "@/lib/vault/vault-db";
import { StorageQuotaMatrix } from "@/components/vault/storage-quota-matrix";
import { VaultPreviewModal } from "@/components/vault/vault-preview-modal";
import { emitTelemetry } from "@/hooks/useStdoutTelemetry";

type KindFilter = "all" | VaultKind;
type SortMode = "recent" | "oldest" | "largest" | "smallest";

const KIND_ICON: Record<VaultKind, typeof FileVideo> = {
  video: FileVideo,
  audio: FileAudio,
  image: FileImage,
  pdf: FileText,
  file: Files,
};

const KIND_TONE: Record<VaultKind, string> = {
  video: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  audio: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
  image: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  pdf: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  file: "border-border/60 bg-muted text-muted-foreground",
};

const VaultRow = memo(function VaultRow({
  item,
  onDelete,
  onOpenModal,
}: {
  item: VaultItem;
  onDelete: (id: string) => void;
  onOpenModal: (item: VaultItem) => void;
}) {
  const Icon = KIND_ICON[item.kind];

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-xl border border-border/60 bg-card/50 p-3 sm:p-3.5 hover:border-primary/40 transition-colors shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Info & Thumbnail Trigger */}
        <div
          onClick={() => onOpenModal(item)}
          className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 cursor-pointer group select-none"
        >
          <div
            className={`grid size-9 sm:size-10 shrink-0 place-items-center rounded-lg border ${KIND_TONE[item.kind]} transition-transform duration-200 group-hover:scale-105`}
          >
            <Icon className="size-4.5 sm:size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              {item.name}
            </p>
            <p className="mt-0.5 font-mono text-[9px] sm:text-[10px] text-muted-foreground truncate">
              {formatBytes(item.size)} · {item.mime} ·{" "}
              {new Date(item.createdAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Action Button Strip — Fits all phone viewports without clipping */}
        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end pt-1.5 sm:pt-0 border-t sm:border-t-0 border-border/40">
          <button
            type="button"
            onClick={() => onOpenModal(item)}
            aria-label={`Preview ${item.name}`}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:bg-primary/20 active:scale-95 transition-all shadow-sm"
          >
            <Eye className="size-3.5" />
            <span>preview</span>
          </button>

          <button
            type="button"
            onClick={() => void import("@/lib/native-save").then((m) => m.nativeSave(item.blob, item.name))}
            aria-label={`Download ${item.name}`}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-8 sm:size-8 px-2.5 sm:px-0 rounded-lg border border-pulse/40 bg-pulse/10 text-pulse transition-colors hover:bg-pulse/20 active:scale-95"
            title="Save to device"
          >
            <HardDrive className="size-3.5" />
            <span className="sm:hidden font-mono text-[10px] uppercase font-semibold">save</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label={`Delete ${item.name}`}
            className="size-8 grid place-items-center shrink-0 rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-red-400/50 hover:text-red-300 active:scale-95"
            title="Delete from vault"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </motion.li>
  );
});

export function VaultView() {
  const { items, ready, totalBytes, estimate, save, remove, clearAll } = useVault();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sort, setSort] = useState<SortMode>("recent");
  const [previewItem, setPreviewItem] = useState<VaultItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const res = await save({
        name: file.name,
        blob: file,
        mime: file.type || "application/octet-stream",
        size: file.size,
      });
      if (res) {
        emitTelemetry(`[VAULT] Ingested ${file.name} (${formatBytes(file.size)}) into IndexedDB`, "ok");
        toast({ title: "Vaulted", description: `${file.name} saved to local device IndexedDB.` });
      }
    }
  };

  const handleGenerateSampleMedia = async () => {
    // Generate a real WebAudio synthesizer WAV sample
    const sampleRate = 44100;
    const duration = 2; // 2 seconds
    const numSamples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, "RIFF");
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, numSamples * 2, true);

    // Generate 440Hz A tone with exponential decay
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-2.5 * t);
      const sample = Math.sin(2 * Math.PI * 440 * t) * decay * 0.75;
      view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)), true);
    }

    const wavBlob = new Blob([buffer], { type: "audio/wav" });
    const fileName = `omni_audio_sample_${Date.now().toString().slice(-4)}.wav`;
    await save({
      name: fileName,
      blob: wavBlob,
      mime: "audio/wav",
      size: wavBlob.size,
    });
    emitTelemetry(`[VAULT] Ingested ${fileName} (${formatBytes(wavBlob.size)}) test audio`, "ok");
    toast({ title: "Sample Ingested", description: `Synthesized & vaulted ${fileName}.` });
  };

  const filtered = useMemo(() => {
    let list = items;
    if (kind !== "all") list = list.filter((i) => i.kind === kind);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    const sorted = [...list];
    switch (sort) {
      case "recent":
        sorted.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        sorted.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "largest":
        sorted.sort((a, b) => b.size - a.size);
        break;
      case "smallest":
        sorted.sort((a, b) => a.size - b.size);
        break;
    }
    return sorted;
  }, [items, kind, query, sort]);

  const handleClosePreview = useCallback(() => {
    setPreviewItem(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id);
    await remove(id);
    if (item) {
      emitTelemetry(`[VAULT] Deleted ${item.name} (${formatBytes(item.size)}) from IndexedDB`, "warn");
    }
    toast({ title: "Removed from vault" });
  }, [items, remove, toast]);

  const handleClear = async () => {
    const count = items.length;
    await clearAll();
    emitTelemetry(`[VAULT] Cleared entire vault (${count} files erased)`, "error");
    toast({ title: "Vault cleared", description: "All stored files were erased from this device." });
  };

  const kindCounts = useMemo(() => {
    const map = new Map<KindFilter, number>([["all", items.length]]);
    for (const i of items) map.set(i.kind, (map.get(i.kind) ?? 0) + 1);
    return map;
  }, [items]);

  const filters: { id: KindFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "video", label: "Video" },
    { id: "audio", label: "Audio" },
    { id: "image", label: "Images" },
    { id: "pdf", label: "PDFs" },
    { id: "file", label: "Files" },
  ];

  const sortLabel: Record<SortMode, string> = {
    recent: "newest",
    oldest: "oldest",
    largest: "largest",
    smallest: "smallest",
  };
  const nextSort: Record<SortMode, SortMode> = {
    recent: "oldest",
    oldest: "largest",
    largest: "smallest",
    smallest: "recent",
  };

  return (
    <div className="space-y-5">
      {/* Hidden native file input for direct file ingestion */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => void handleFileUpload(e.target.files)}
      />

      <StorageQuotaMatrix />

      {/* Direct Ingest & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border/70 bg-card/60 p-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-primary/50 bg-primary px-3 py-1.5 font-bold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
          >
            <Upload className="size-3.5" />
            <span>Ingest Media / Files</span>
          </button>

          <button
            onClick={() => void handleGenerateSampleMedia()}
            className="flex items-center gap-1.5 rounded-md border border-border/70 bg-secondary px-3 py-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            title="Synthesize and vault a real WebAudio test track"
          >
            <Sparkles className="size-3.5 text-chart-2" />
            <span>Add Test Audio Sample</span>
          </button>
        </div>

        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          Files persist locally in IndexedDB · Zero network egress
        </span>
      </div>

      {/* storage telemetry ------------------------------------------------ */}
      <div className="panel-hud grid gap-4 rounded-xl p-4 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-primary/30 bg-primary/10">
            <Database className="size-5 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">stored files</p>
            <p className="font-mono text-sm font-semibold text-foreground">{items.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-neon/30 bg-neon/10">
            <HardDrive className="size-5 text-neon" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">vault size</p>
            <p className="font-mono text-sm font-semibold text-foreground">{formatBytes(totalBytes)}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>origin storage</span>
            {estimate && estimate.quota > 0 && (
              <span className="text-neon">{(estimate.percent * 100).toFixed(2)}%</span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full w-full rounded-full bg-gradient-to-r from-primary to-neon origin-left"
              style={{ transformOrigin: "0% 50%" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: Math.min(Math.max(estimate?.percent ?? (items.length > 0 ? 0.015 : 0), 0), 1) }}
              transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.7 }}
            />
          </div>
          {estimate && estimate.quota > 0 && (
            <p className="font-mono text-[9px] text-muted-foreground/70">
              {formatBytes(estimate.usage)} of {formatBytes(estimate.quota)}
            </p>
          )}
        </div>
      </div>

      {/* controls ---------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search the vault…"
            aria-label="Search vault files"
            className="min-h-11 pl-9 font-mono text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="scroll-hud flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter by kind">
            {filters.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={kind === f.id}
                onClick={() => setKind(f.id)}
                className={`relative shrink-0 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                  kind === f.id
                    ? "bg-gradient-to-r from-primary to-plasma text-white"
                    : "border border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                <span className="ml-1 text-[8px] opacity-70">{kindCounts.get(f.id) ?? 0}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setSort(nextSort[sort])}
            aria-label={`Sort by ${sortLabel[nextSort[sort]]}`}
            className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border/60 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ArrowDownUp className="size-3" />
            {sortLabel[sort]}
          </button>
        </div>
      </div>

      {/* list --------------------------------------------------------------- */}
      {filtered.length > 0 ? (
        <>
          <ul className="scroll-hud grid max-h-[38rem] sm:max-h-[44rem] gap-2.5 overflow-y-auto pr-1" aria-label="Vault files">
            <AnimatePresence initial={false}>
              {filtered.map((item) => (
                <VaultRow
                  key={item.id}
                  item={item}
                  onDelete={(id) => void handleDelete(id)}
                  onOpenModal={(it) => setPreviewItem(it)}
                />
              ))}
            </AnimatePresence>
          </ul>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] text-muted-foreground">
              {filtered.length} of {items.length} shown · persists in this browser
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  disabled={items.length === 0}
                  className="flex min-h-9 items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" />
                  clear vault
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Erase the entire vault?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All {items.length} file{items.length === 1 ? "" : "s"} ({formatBytes(totalBytes)}) will be
                    permanently deleted from this browser. Downloads you already saved to your device are untouched.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep files</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleClear()}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Erase everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      ) : ready ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            void handleFileUpload(e.dataTransfer.files);
          }}
          className={`flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-all ${
            isDragging ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40"
          }`}
        >
          <Database className="size-8 text-muted-foreground/50" />
          <div>
            <p className="font-display text-sm font-bold text-foreground">vault is empty</p>
            <p className="mt-1 max-w-sm font-mono text-[11px] leading-relaxed text-muted-foreground">
              Drop any video, audio, image, or PDF here to save directly into local IndexedDB, or generate a test sample.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-3 py-1.5 font-mono text-xs font-semibold text-primary hover:bg-primary/25 active:scale-95 transition-all"
            >
              <Upload className="size-3.5" />
              <span>Browse & Ingest Files</span>
            </button>
            <button
              onClick={() => void handleGenerateSampleMedia()}
              className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            >
              <Sparkles className="size-3.5 text-chart-2" />
              <span>Synthesize Test Audio</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid min-h-52 place-items-center rounded-xl border border-border/60">
          <p className="animate-pulse font-mono text-[11px] text-muted-foreground">opening vault…</p>
        </div>
      )}

      {/* Phone-Fitted Full Screen / Dialog Preview Modal */}
      <VaultPreviewModal
        item={previewItem}
        onClose={handleClosePreview}
        onDelete={handleDelete}
      />
    </div>
  );
}
