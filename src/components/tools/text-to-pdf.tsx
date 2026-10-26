"use client";

/**
 * TEXT → PDF — typesets raw text with wrapping, font/size control, an
 * optional title block and page numbers. Standard-font safe (WinAnsi).
 */

import { motion } from "framer-motion";
import { FileText, Sparkles } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";
import { PresetSelectorModal, type PresetItem } from "@/components/ui/preset-selector-modal";
import { ParamPanel, ParamSelect, ParamSlider } from "@/components/audio/param-controls";
import { PageOptions } from "@/components/documents/page-options";
import { OutputCard } from "@/components/media/output-card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { JobOutput } from "@/hooks/use-media-job";
import {
  buildPdfOutput,
  buildTextPdf,
  type Margin,
  type PageSize,
  type TextFont,
} from "@/lib/documents/pdf";

const TEXT_DOCUMENT_PRESETS: PresetItem[] = [
  {
    id: "formal-report",
    title: "Executive Report (A4)",
    subtitle: "Helvetica 11pt with normal margins and professional leading",
    category: "Corporate",
    badge: "EXECUTIVE",
    badgeColor: "emerald",
    engineTier: "turbo",
    params: { font: "helvetica", fontSize: 11, pageSize: "a4", margin: "normal" },
    config: { font: "helvetica", fontSize: 11, pageSize: "a4", margin: "normal" },
  },
  {
    id: "academic-manuscript",
    title: "Academic Manuscript (Serif)",
    subtitle: "Times 12pt with wide margins suitable for print markup",
    category: "Academic",
    badge: "MANUSCRIPT",
    badgeColor: "amber",
    engineTier: "high",
    params: { font: "times", fontSize: 12, pageSize: "a4", margin: "wide" },
    config: { font: "times", fontSize: 12, pageSize: "a4", margin: "wide" },
  },
  {
    id: "terminal-code-spec",
    title: "Terminal Code Spec (Mono)",
    subtitle: "Courier 10pt with narrow margins for code blocks and logs",
    category: "Technical",
    badge: "DEV SPEC",
    badgeColor: "cyan",
    engineTier: "ultra",
    params: { font: "courier", fontSize: 10, pageSize: "a4", margin: "narrow" },
    config: { font: "courier", fontSize: 10, pageSize: "a4", margin: "narrow" },
  },
  {
    id: "compact-memo",
    title: "Pocket Memo & Notes",
    subtitle: "Helvetica 9pt compact format for quick reading",
    category: "Compact",
    badge: "POCKET",
    badgeColor: "violet",
    engineTier: "standard",
    params: { font: "helvetica", fontSize: 9, pageSize: "a4", margin: "narrow" },
    config: { font: "helvetica", fontSize: 9, pageSize: "a4", margin: "narrow" },
  },
];

type Status = "idle" | "working" | "done" | "error";

export function TextToPdf() {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [font, setFont] = useState<TextFont>("helvetica");
  const [fontSize, setFontSize] = useState(11);
  const [pageSize, setPageSize] = useState<Exclude<PageSize, "fit">>("a4");
  const [margin, setMargin] = useState<Margin>("normal");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<JobOutput | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  const handleApplyPreset = (p: PresetItem) => {
    if (p.config) {
      if (p.config.font) setFont(p.config.font as TextFont);
      if (p.config.fontSize) setFontSize(Number(p.config.fontSize));
      if (p.config.pageSize) setPageSize(p.config.pageSize as Exclude<PageSize, "fit">);
      if (p.config.margin) setMargin(p.config.margin as Margin);
    }
  };

  const busy = status === "working";
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);

  /* Guard against losing typed draft on back */
  useEffect(() => {
    if (text.trim().length > 0) {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message: "You have typed text for a PDF. Going back will discard your draft. Are you sure you want to proceed?",
      }));
    }
  }, [text]);

  const reset = () => {
    if (output) URL.revokeObjectURL(output.url);
    setOutput(null);
    setStatus("idle");
    setPageCount(0);
    setError(null);
  };

  const compile = async () => {
    if (!text.trim()) return;
    setStatus("working");
    setError(null);
    try {
      const { blob, pageCount: pages } = await buildTextPdf(text, {
        font,
        fontSize,
        pageSize,
        margin,
        title: title.trim() || undefined,
      });
      const pdfName = title.trim() ? `${title.trim().slice(0, 40)}.pdf` : "omni-document.pdf";
      if (output) URL.revokeObjectURL(output.url);
      setOutput(buildPdfOutput(pdfName, blob));
      setPageCount(pages);
      setStatus("done");
      useSaveDialogStore.getState().showSuccess({
        filename: pdfName,
        directory: "Documents",
        fileSize: blob.size,
        blob,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err ?? "typeset failed");
      setError(message);
      setStatus("error");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
      {/* ------------------------------------------------------- input column */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Document title <span className="text-muted-foreground/50">(optional)</span>
          </p>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Q3 Field Report"
            disabled={busy}
            className="min-h-11 font-mono text-sm"
            aria-label="Document title"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Body text
            </p>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {words} words · {text.length} chars
            </span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type the document body…"
            disabled={busy}
            className="scroll-hud min-h-56 font-mono text-[13px] leading-relaxed"
            aria-label="Document body text"
          />
        </div>

        <ParamPanel title="typography">
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <span className="font-mono text-[10px] uppercase text-muted-foreground">Layout Presets</span>
            <button
              type="button"
              onClick={() => setIsPresetModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer"
            >
              <Sparkles className="size-3" />
              <span>PRESETS</span>
            </button>
          </div>
          <ParamSelect
            label="Font"
            value={font}
            onChange={(v) => setFont(v as TextFont)}
            disabled={busy}
            options={[
              { value: "helvetica", label: "Helvetica · clean sans" },
              { value: "times", label: "Times · classic serif" },
              { value: "courier", label: "Courier · monospace" },
            ]}
          />
          <ParamSlider
            label="Size"
            value={fontSize}
            min={8}
            max={18}
            step={1}
            onChange={setFontSize}
            disabled={busy}
            display={(v) => `${v} pt`}
          />
          <PageOptions
            pageSize={pageSize}
            onPageSize={(v) => setPageSize(v === "fit" ? "a4" : v)}
            margin={margin}
            onMargin={setMargin}
            disabled={busy}
            fixedPageSize
          />
        </ParamPanel>

        <motion.button
          onClick={() => void compile()}
          disabled={!text.trim() || busy}
          whileHover={!text.trim() || busy ? undefined : { scale: 1.02 }}
          whileTap={!text.trim() || busy ? undefined : { scale: 0.97 }}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          <FileText className="size-4" />
          {busy ? "TYPESETTING…" : "TYPESET → PDF"}
        </motion.button>
      </div>

      {/* ------------------------------------------------------ output column */}
      <div className="space-y-4">
        {status === "working" && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 font-mono text-[11px] text-primary">
            measuring glyphs · wrapping · paginating…
          </div>
        )}
        {status === "error" && error && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-300" role="alert">
            {error}
          </p>
        )}
        {output && (
          <OutputCard
            output={output}
            onClear={reset}
            badge={`${pageCount} page${pageCount === 1 ? "" : "s"} · ${words} words`}
            badgeTone="neon"
            extra={
              <object
                data={output.url}
                type="application/pdf"
                aria-label="PDF preview"
                className="h-64 w-full rounded-lg border border-border/50 bg-white"
              >
                <p className="p-3 font-mono text-[10px] text-muted-foreground">
                  inline preview unavailable — use the save button
                </p>
              </object>
            }
          />
        )}
        {!output && status === "idle" && (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border/60">
            <p className="font-mono text-[11px] text-muted-foreground/70">
              output lands here
            </p>
          </div>
        )}
      </div>

      <PresetSelectorModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        toolId="text-to-pdf"
        toolTitle="Typography & Document Presets"
        subtitle="Curated page styling, font, and margin layouts"
        presets={TEXT_DOCUMENT_PRESETS}
        selectedPresetId={TEXT_DOCUMENT_PRESETS.find(p => p.config?.font === font && p.config?.fontSize === fontSize && p.config?.pageSize === pageSize)?.id}
        onSelectPreset={handleApplyPreset}
        currentConfig={{ font, fontSize, pageSize, margin }}
      />
    </div>
  );
}
