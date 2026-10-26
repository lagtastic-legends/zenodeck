"use client";

/**
 * LOCK PDF — password-protects a PDF with RC4/AES encryption via the
 * @cantoo/pdf-lib fork. Optionally verify the produced file carries an
 * /Encrypt dictionary (byte-level check) before presenting it.
 */

import { motion } from "framer-motion";
import { Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { ParamPanel, ParamToggle } from "@/components/audio/param-controls";
import { DropZone } from "@/components/media/drop-zone";
import { OutputCard } from "@/components/media/output-card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useWorkstationStore } from "@/hooks/useWorkstationStore";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";
import { PresetSelectorModal, type PresetItem } from "@/components/ui/preset-selector-modal";
import type { JobOutput } from "@/hooks/use-media-job";
import {
  buildPdfOutput,
  lockPdf,
  pdfHasEncrypt,
} from "@/lib/documents/pdf";

const PDF_SECURITY_PRESETS: PresetItem[] = [
  {
    id: "read-only-confidential",
    title: "Read-Only Confidential",
    subtitle: "Printing & text copying disabled; strict password protected",
    category: "High Security",
    badge: "READ-ONLY",
    badgeColor: "rose",
    engineTier: "turbo",
    params: { allowPrinting: false, allowCopying: false },
    config: { allowPrinting: false, allowCopying: false },
  },
  {
    id: "printable-protected",
    title: "Printable Protected",
    subtitle: "High-res printing allowed, text copying prohibited",
    category: "Distribution",
    badge: "PRINT ONLY",
    badgeColor: "amber",
    engineTier: "high",
    params: { allowPrinting: true, allowCopying: false },
    config: { allowPrinting: true, allowCopying: false },
  },
  {
    id: "collaborative-encrypted",
    title: "Collaborative Encrypted",
    subtitle: "Both printing and copying enabled with authenticated password",
    category: "Team",
    badge: "COLLAB",
    badgeColor: "emerald",
    engineTier: "standard",
    params: { allowPrinting: true, allowCopying: true },
    config: { allowPrinting: true, allowCopying: true },
  },
];

type Status = "idle" | "working" | "done" | "error";

export function LockPdf() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<JobOutput | null>(null);
  const [verified, setVerified] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  useEffect(() => {
    const handoff = useWorkstationStore.getState().consumeHandoffFile();
    if (handoff?.file) {
      const f = handoff.file instanceof File
        ? handoff.file
        : new File([handoff.file], handoff.filename, { type: handoff.mimeType });
      if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") {
        setFile(f);
      }
    }
  }, []);

  const handleApplyPreset = (p: PresetItem) => {
    if (p.config) {
      if (typeof p.config.allowPrinting === "boolean") setAllowPrinting(p.config.allowPrinting);
      if (typeof p.config.allowCopying === "boolean") setAllowCopying(p.config.allowCopying);
    }
  };

  const busy = status === "working";
  const strong = userPassword.length >= 6;

  const reset = () => {
    if (output) URL.revokeObjectURL(output.url);
    setOutput(null);
    setStatus("idle");
    setPageCount(0);
    setError(null);
  };

  const acceptFile = (f: File) => {
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") {
      toast({
        title: "PDFs only",
        description: "This module encrypts existing PDF documents.",
        variant: "destructive",
      });
      return;
    }
    setFile(f);
    setStatus("idle");
    setOutput(null);
  };

  const encrypt = async () => {
    if (!file || !strong) return;
    setStatus("working");
    setError(null);
    try {
      const { blob, pageCount } = await lockPdf(file, {
        userPassword,
        ownerPassword: ownerPassword || userPassword,
        allowPrinting,
        allowCopying,
      });
      const hasEncrypt = await pdfHasEncrypt(blob);
      const lockedName = file.name.replace(/\.pdf$/i, "") + "-locked.pdf";
      if (output) URL.revokeObjectURL(output.url);
      setOutput(buildPdfOutput(lockedName, blob));
      setVerified(hasEncrypt);
      setPageCount(pageCount);
      setStatus("done");
      useSaveDialogStore.getState().showSuccess({
        filename: lockedName,
        directory: "Documents",
        fileSize: blob.size,
        blob,
      });
      toast({
        title: hasEncrypt ? "PDF encrypted" : "Encryption uncertain",
        description: hasEncrypt
          ? `Password set · ${pageCount} page${pageCount === 1 ? "" : "s"} protected`
          : "The stream lacks an /Encrypt marker — treat with caution.",
        variant: hasEncrypt ? undefined : "destructive",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err ?? "encryption failed");
      setError(
        /password|encrypt/i.test(message)
          ? "This PDF is already encrypted — unlock it first."
          : message,
      );
      setStatus("error");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
      {/* ------------------------------------------------------- input column */}
      <div className="space-y-5">
        <DropZone
          accept="application/pdf"
          file={file}
          onFile={acceptFile}
          onClear={() => {
            setFile(null);
            setStatus("idle");
            setOutput(null);
          }}
          preview="none"
          label="Drop a PDF to protect"
          hint="stays on device · encrypted locally"
          disabled={busy}
        />

        <ParamPanel title="credentials">
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Open password <span className="text-neon">*</span>
            </p>
            <div className="flex gap-2">
              <Input
                type={showPasswords ? "text" : "password"}
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="min 6 characters"
                disabled={busy}
                className="min-h-11 font-mono text-sm"
                aria-label="Open password"
              />
              <button
                onClick={() => setShowPasswords((v) => !v)}
                aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                className="grid size-11 shrink-0 place-items-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className={`font-mono text-[9px] ${userPassword.length === 0 || strong ? "text-muted-foreground/60" : "text-amber-300"}`}>
              {strong ? "strength: acceptable" : userPassword.length === 0 ? "required to open the document" : "too short — min 6 characters"}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Owner password <span className="text-muted-foreground/50">(defaults to open password)</span>
            </p>
            <Input
              type={showPasswords ? "text" : "password"}
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              placeholder="controls permissions"
              disabled={busy}
              className="min-h-11 font-mono text-sm"
              aria-label="Owner password"
            />
          </div>
        </ParamPanel>

        <ParamPanel title="reader permissions">
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <span className="font-mono text-[10px] uppercase text-muted-foreground">Access Rights</span>
            <button
              type="button"
              onClick={() => setIsPresetModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer"
            >
              <Sparkles className="size-3" />
              <span>PRESETS</span>
            </button>
          </div>
          <ParamToggle
            label="Allow printing"
            checked={allowPrinting}
            onChange={setAllowPrinting}
            disabled={busy}
            hint="high-resolution printing from any reader"
          />
          <ParamToggle
            label="Allow copying text"
            checked={allowCopying}
            onChange={setAllowCopying}
            disabled={busy}
            hint="text & image extraction from the document"
          />
        </ParamPanel>

        <motion.button
          onClick={() => void encrypt()}
          disabled={!file || !strong || busy}
          whileHover={!file || !strong || busy ? undefined : { scale: 1.02 }}
          whileTap={!file || !strong || busy ? undefined : { scale: 0.97 }}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          <LockKeyhole className="size-4" />
          {busy ? "ENCRYPTING…" : "LOCK PDF"}
        </motion.button>
      </div>

      {/* ------------------------------------------------------ output column */}
      <div className="space-y-4">
        {status === "working" && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 font-mono text-[11px] text-primary">
            applying encryption dictionary · rewriting xref…
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
            badge={verified ? "encrypted ✓" : "unverified"}
            badgeTone={verified ? "pulse" : "plasma"}
            extra={
              <div className="flex items-center gap-2.5 rounded-lg border border-pulse/30 bg-pulse/5 px-3 py-2.5">
                <ShieldCheck className={`size-4 shrink-0 ${verified ? "text-pulse" : "text-muted-foreground"}`} />
                <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                  {verified
                    ? `/Encrypt dictionary verified in the output stream · ${pageCount} page${pageCount === 1 ? "" : "s"}. Readers will demand the open password.`
                    : "Byte-scan could not confirm encryption — verify manually before sharing."}
                </p>
              </div>
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
        toolId="lock-pdf"
        toolTitle="PDF Security Profiles"
        subtitle="Reader permission locks and encryption policies"
        presets={PDF_SECURITY_PRESETS}
        selectedPresetId={PDF_SECURITY_PRESETS.find(p => p.config?.allowPrinting === allowPrinting && p.config?.allowCopying === allowCopying)?.id}
        onSelectPreset={handleApplyPreset}
        currentConfig={{ allowPrinting, allowCopying }}
      />
    </div>
  );
}
