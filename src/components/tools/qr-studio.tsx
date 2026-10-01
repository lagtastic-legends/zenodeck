"use client";

/**
 * QR STUDIO — scanner + generator, fully client-side.
 *
 * Scan sources:
 *  - Camera: html5-qrcode driving getUserMedia (environment camera);
 *    on Android under Capacitor this uses the manifest CAMERA grant.
 *  - Image file: decode a QR from any picture (drops, screenshots, photos).
 *
 * Generator: `qrcode` renders onto a canvas (size / ECC / colors), then
 * hands the PNG to OutputCard for download + vault persistence.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  CameraOff,
  Check,
  Copy,
  ExternalLink,
  FileUp,
  QrCode,
  ScanLine,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "qrcode";
import { OutputCard } from "@/components/media/output-card";
import { ParamPanel, ParamSelect, ParamSlider } from "@/components/audio/param-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { JobOutput } from "@/hooks/use-media-job";
import { formatClock } from "@/lib/format";
import { Capacitor } from "@capacitor/core";
import { ensureCameraPermission, openAppSettings } from "@/lib/permissions";

type Mode = "scan" | "generate";
type ScanSource = "camera" | "file";

interface ScanEntry {
  id: number;
  text: string;
  ts: number;
}

let scanId = 0;

function isProbablyUrl(text: string): boolean {
  return /^(https?:\/\/|www\.)\S+$/i.test(text.trim());
}

/* ================================================================== */
/* Scanner                                                             */
/* ================================================================== */

function QrScanner() {
  const { toast } = useToast();
  const [source, setSource] = useState<ScanSource>("camera");
  const [cameraState, setCameraState] = useState<"off" | "starting" | "live" | "denied">("off");
  const [scanning, setScanning] = useState(false);
  const [busyFile, setBusyFile] = useState(false);
  const [lastResult, setLastResult] = useState<ScanEntry | null>(null);
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const [copied, setCopied] = useState(false);

  const rawId = useId();
  const viewfinderId = `omni-qr-viewfinder-${rawId.replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* teardown on unmount ------------------------------------------------ */
  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch {
        /* already stopped */
      }
      try {
        scanner.clear();
      } catch {
        /* element gone */
      }
    }
    scannerRef.current = null;
    setCameraState("off");
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  const recordResult = useCallback(
    (text: string) => {
      const entry: ScanEntry = { id: ++scanId, text, ts: Date.now() };
      setLastResult(entry);
      setHistory((prev) => [entry, ...prev].slice(0, 8));
      toast({ title: "QR decoded", description: text.slice(0, 80) });
    },
    [toast],
  );

  /* camera ------------------------------------------------------------ */
  const startCamera = async () => {
    setCameraState("starting");
    try {
      const granted = await ensureCameraPermission();
      if (!granted) {
        setCameraState("denied");
        return;
      }
      // Fresh instance each run — html5-qrcode dislikes reusing elements.
      await stopCamera();
      scannerRef.current = new Html5Qrcode(viewfinderId);
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => recordResult(decodedText),
        () => {
          /* per-frame decode misses — noise, ignore */
        },
      );
      setCameraState("live");
      setScanning(true);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      void name;
      await stopCamera();
      setCameraState("denied");
    }
  };

  /* file -------------------------------------------------------------- */
  const scanFile = async (file: File | undefined) => {
    if (!file) return;
    setBusyFile(true);
    try {
      await stopCamera();
      const scanner = new Html5Qrcode(viewfinderId, {
        formatsToSupport: undefined,
        verbose: false,
      });
      const decoded = await scanner.scanFile(file, true);
      recordResult(decoded);
      try {
        scanner.clear();
      } catch {
        /* element cleanup best-effort */
      }
    } catch {
      toast({
        title: "No QR found",
        description: "That image doesn't contain a decodable QR code.",
        variant: "destructive",
      });
    } finally {
      setBusyFile(false);
    }
  };

  const copyResult = async () => {
    if (!lastResult) return;
    try {
      await navigator.clipboard.writeText(lastResult.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast({ title: "Clipboard blocked", description: lastResult.text.slice(0, 60) });
    }
  };

  return (
    <div className="space-y-5">
      {/* source toggle */}
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Scan source">
        {(
          [
            { id: "camera", label: "Camera", icon: Camera },
            { id: "file", label: "Image file", icon: FileUp },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={source === id}
            onClick={() => {
              void stopCamera();
              setSource(id);
            }}
            disabled={busyFile}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-all ${
              source === id
                ? "border-primary/50 bg-primary/10 text-primary glow-box-violet"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/30"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* viewfinder */}
      <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-neon/90">
            <ScanLine className="size-3.5" />
            viewfinder
          </p>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${
              cameraState === "live"
                ? "bg-pulse/10 text-pulse"
                : cameraState === "denied"
                  ? "bg-red-500/10 text-red-300"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {cameraState === "live" ? (scanning ? "scanning" : "live") : cameraState}
          </span>
        </div>

        <div
          id={viewfinderId}
          className="relative overflow-hidden rounded-lg border border-border/50 bg-black min-h-56 [&_video]:w-full"
          aria-label="QR viewfinder"
        />

        {source === "camera" ? (
          <div className="flex gap-2">
            {cameraState !== "live" ? (
              <button
                onClick={() => void startCamera()}
                disabled={cameraState === "starting" || busyFile}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.18em] text-white transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-50"
              >
                <Camera className="size-4" />
                {cameraState === "starting" ? "STARTING…" : "START CAMERA"}
              </button>
            ) : (
              <button
                onClick={() => void stopCamera()}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-500/15 font-display text-xs font-bold tracking-[0.18em] text-red-200 hover:bg-red-500/25"
              >
                <CameraOff className="size-4" />
                STOP
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busyFile}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.18em] text-white transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-50"
            >
              <FileUp className="size-4" />
              {busyFile ? "DECODING…" : "PICK A QR IMAGE"}
            </button>
            <p className="text-center font-mono text-[10px] text-muted-foreground">
              screenshots, saved photos, downloaded QR codes — decoded locally
            </p>
          </div>
        )}

        {cameraState === "denied" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
            <p className="font-mono text-[11px] leading-relaxed text-amber-300">
              Camera access was denied. Enable camera access to scan QR codes with your device camera.
            </p>
            {Capacitor.isNativePlatform() && (
              <button
                type="button"
                onClick={() => void openAppSettings()}
                className="shrink-0 rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 font-mono text-[10px] uppercase font-bold tracking-wider text-amber-200 hover:bg-amber-500/30 cursor-pointer"
              >
                Open Settings
              </button>
            )}
          </div>
        )}
      </div>

      {/* last result */}
      <AnimatePresence mode="wait">
        {lastResult && (
          <motion.div
            key={lastResult.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel-hud space-y-3 rounded-xl p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon">
                decoded · {formatClock(lastResult.ts)}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => void copyResult()}
                  aria-label="Copy decoded text"
                  className="flex min-h-9 items-center gap-1.5 rounded-lg border border-border/60 px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  {copied ? <Check className="size-3.5 text-pulse" /> : <Copy className="size-3.5" />}
                  {copied ? "copied" : "copy"}
                </button>
                {isProbablyUrl(lastResult.text) && (
                  <a
                    href={lastResult.text.startsWith("http") ? lastResult.text : `https://${lastResult.text}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-9 items-center gap-1.5 rounded-lg border border-neon/40 bg-neon/10 px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-neon hover:bg-neon/20"
                  >
                    <ExternalLink className="size-3.5" />
                    open
                  </a>
                )}
              </div>
            </div>
            <p className="break-all font-mono text-sm leading-relaxed text-foreground">
              {lastResult.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* history */}
      {history.length > 1 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              scan history
            </p>
            <button
              onClick={() => {
                setHistory(lastResult ? [lastResult] : []);
              }}
              className="flex min-h-9 items-center gap-1.5 rounded-lg border border-border/60 px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:border-red-400/40 hover:text-red-300"
            >
              <Trash2 className="size-3" />
              clear
            </button>
          </div>
          <ul className="scroll-hud grid max-h-40 gap-1.5 overflow-y-auto pr-1" aria-label="Scan history">
            {history.slice(1).map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2"
              >
                <span className="shrink-0 font-mono text-[9px] text-muted-foreground/60">
                  {formatClock(h.ts)}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/85">
                  {h.text}
                </span>
                <button
                  onClick={() => setLastResult(h)}
                  className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-primary hover:underline"
                >
                  inspect
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Upload QR image"
        onChange={(e) => {
          void scanFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ================================================================== */
/* Generator                                                           */
/* ================================================================== */

function QrGenerator() {
  const [text, setText] = useState("");
  const [size, setSize] = useState(360);
  const [ecc, setEcc] = useState("M");
  const [dark, setDark] = useState("#0a0813");
  const [light, setLight] = useState("#ffffff");
  const [output, setOutput] = useState<JobOutput | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputRef = useRef<JobOutput | null>(null);

  useEffect(() => {
    outputRef.current = output;
  }, [output]);

  useEffect(() => {
    return () => {
      if (outputRef.current) {
        try { URL.revokeObjectURL(outputRef.current.url); } catch {}
      }
    };
  }, []);

  const generate = useCallback(async () => {
    const value = text.trim();
    if (!value || !canvasRef.current) return;
    try {
      await QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        errorCorrectionLevel: ecc as "L" | "M" | "Q" | "H",
        color: { dark, light },
      });
      const blob = await new Promise<Blob | null>((res) =>
        canvasRef.current?.toBlob((b) => res(b), "image/png"),
      );
      if (!blob) return;
      if (outputRef.current) {
        try { URL.revokeObjectURL(outputRef.current.url); } catch {}
      }
      const newOutput: JobOutput = {
        name: `omni-qr-${Date.now().toString(36)}.png`,
        blob,
        url: URL.createObjectURL(blob),
        size: blob.size,
        mime: "image/png",
      };
      outputRef.current = newOutput;
      setOutput(newOutput);
    } catch {
      /* value too long for the chosen ECC/size — canvas stays as-is */
    }
  }, [text, size, ecc, dark, light]);

  useEffect(() => {
    if (!text.trim()) {
      if (outputRef.current) {
        try { URL.revokeObjectURL(outputRef.current.url); } catch {}
        outputRef.current = null;
        setOutput(null);
      }
      return;
    }

    const timer = setTimeout(() => {
      void generate();
    }, 250);

    return () => clearTimeout(timer);
  }, [text, size, ecc, dark, light, generate]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Payload
            </p>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {text.length} chars
            </span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://example.com — or any text, wifi string, vcard…"
            className="scroll-hud min-h-24 font-mono text-[13px]"
            aria-label="QR payload"
          />
        </div>

        <ParamPanel title="render settings">
          <ParamSlider
            label="Size"
            value={size}
            min={160}
            max={640}
            step={40}
            onChange={setSize}
            display={(v) => `${v}px`}
            hintLeft="compact"
            hintRight="poster"
          />
          <ParamSelect
            label="Error correction"
            value={ecc}
            onChange={setEcc}
            options={[
              { value: "L", label: "L · 7% — densest" },
              { value: "M", label: "M · 15% — balanced" },
              { value: "Q", label: "Q · 25% — hardy" },
              { value: "H", label: "H · 30% — survives damage" },
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Modules
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={dark}
                  onChange={(e) => setDark(e.target.value)}
                  aria-label="QR dark color"
                  className="size-11 cursor-pointer rounded-lg border border-border/60 bg-transparent"
                />
                <span className="font-mono text-[11px] text-foreground/80">{dark}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Background
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={light}
                  onChange={(e) => setLight(e.target.value)}
                  aria-label="QR light color"
                  className="size-11 cursor-pointer rounded-lg border border-border/60 bg-transparent"
                />
                <span className="font-mono text-[11px] text-foreground/80">{light}</span>
              </div>
            </div>
          </div>
        </ParamPanel>

        <motion.button
          onClick={() => void generate()}
          disabled={!text.trim()}
          whileHover={text.trim() ? { scale: 1.02 } : undefined}
          whileTap={text.trim() ? { scale: 0.97 } : undefined}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          <QrCode className="size-4" />
          GENERATE QR
        </motion.button>
      </div>

      <div className="space-y-4">
        <div className="panel-hud grid place-items-center rounded-xl p-6">
          {output ? (
            <canvas
              ref={canvasRef}
              aria-label="Generated QR code"
              className="max-w-full rounded-lg border border-border/50 bg-white"
            />
          ) : (
            <canvas ref={canvasRef} className="hidden" aria-hidden />
          )}
          {!output && (
            <div className="grid min-h-40 place-items-center py-10 text-center">
              <p className="max-w-48 font-mono text-[11px] leading-relaxed text-muted-foreground/70">
                enter a payload and hit generate — the QR renders on a canvas,
                entirely in this tab
              </p>
            </div>
          )}
        </div>
        {output && (
          <OutputCard
            output={output}
            onClear={() => {
              if (outputRef.current) {
                try { URL.revokeObjectURL(outputRef.current.url); } catch {}
                outputRef.current = null;
              }
              setOutput(null);
            }}
            badge={`${size}px · ECC ${ecc}`}
            badgeTone="neon"
            extra={
              <div className="grid place-items-center rounded-lg border border-border/50 bg-white p-3">
                { }
                <img src={output.url} alt="QR code preview" className="max-h-40" />
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Studio shell                                                        */
/* ================================================================== */

export function QrStudio() {
  const [mode, setMode] = useState<Mode>("scan");

  return (
    <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
      <TabsList className="grid w-full grid-cols-2 sm:max-w-md">
        <TabsTrigger value="scan" className="gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <ScanLine className="size-3.5" />
          Scanner
        </TabsTrigger>
        <TabsTrigger value="generate" className="gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <QrCode className="size-3.5" />
          Generator
        </TabsTrigger>
      </TabsList>
      <TabsContent value="scan" className="mt-5">
        <QrScanner />
      </TabsContent>
      <TabsContent value="generate" className="mt-5">
        <QrGenerator />
      </TabsContent>
    </Tabs>
  );
}
