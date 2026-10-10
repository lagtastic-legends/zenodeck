"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { Upload, Copy, Download, Image as ImageIcon, Library, ArrowLeft, TerminalSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavStore } from "@/lib/navigation/nav-store";
import { cn } from "@/lib/utils";
import { ASCII_ARCHIVE, type AsciiCategory, type AsciiArt } from "@/lib/ascii/data";

const ASCII_CHARS = ["@", "%", "#", "*", "+", "=", "-", ":", ".", " "];

export function AsciiGenerator() {
  const [activeTab, setActiveTab] = useState<"generator" | "archive">("generator");
  const [activeCategory, setActiveCategory] = useState<AsciiCategory | null>(null);
  
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [removeBgEnabled, setRemoveBgEnabled] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  
  const [asciiArt, setAsciiArt] = useState<string>("");
  const [resolution, setResolution] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeWorkerRef = useRef<Worker | null>(null);
  const bgRemovedUrlRef = useRef<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (activeWorkerRef.current) {
        activeWorkerRef.current.terminate();
        activeWorkerRef.current = null;
      }
      if (bgRemovedUrlRef.current) {
        try { URL.revokeObjectURL(bgRemovedUrlRef.current); } catch {}
        bgRemovedUrlRef.current = null;
      }
    };
  }, []);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setOriginalImageSrc(src);
      if (!removeBgEnabled) setImageSrc(src);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!originalImageSrc) return;

    if (removeBgEnabled) {
      queueMicrotask(() => setIsRemovingBg(true));
      import("@imgly/background-removal").then(({ removeBackground }) => {
        removeBackground(originalImageSrc).then((blob) => {
          if (bgRemovedUrlRef.current) {
            try { URL.revokeObjectURL(bgRemovedUrlRef.current); } catch {}
          }
          const url = URL.createObjectURL(blob);
          bgRemovedUrlRef.current = url;
          setImageSrc(url);
          setIsRemovingBg(false);
        }).catch((err) => {
          console.error(err);
          toast({ title: "AI Error", description: "Failed to remove background.", variant: "destructive" });
          setImageSrc(originalImageSrc);
          setIsRemovingBg(false);
        });
      });
    } else {
      if (bgRemovedUrlRef.current) {
        try { URL.revokeObjectURL(bgRemovedUrlRef.current); } catch {}
        bgRemovedUrlRef.current = null;
      }
      setImageSrc(originalImageSrc);
    }
  }, [originalImageSrc, removeBgEnabled, toast]);

  const generateAscii = (img: HTMLImageElement, res: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const width = res;
    const aspectRatio = img.height / img.width;
    const height = Math.floor(width * aspectRatio * 0.55);

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    // Create inline web worker
    const workerCode = `
      self.onmessage = function(e) {
        const { imageData, width, height, chars } = e.data;
        const data = imageData.data;
        let ascii = "";
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const offset = (y * width + x) * 4;
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            const a = data[offset + 3];
            
            if (a < 128) {
              ascii += " ";
            } else {
              const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
              const charIndex = Math.floor((luminance / 255) * (chars.length - 1));
              ascii += chars[charIndex];
            }
          }
          ascii += "\\n";
        }
        self.postMessage(ascii);
      }
    `;

    if (activeWorkerRef.current) {
      activeWorkerRef.current.terminate();
      activeWorkerRef.current = null;
    }

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    URL.revokeObjectURL(workerUrl);
    activeWorkerRef.current = worker;

    worker.onmessage = (e) => {
      setAsciiArt(e.data);
      setIsProcessing(false);
      worker.terminate();
      if (activeWorkerRef.current === worker) {
        activeWorkerRef.current = null;
      }
    };

    worker.onerror = () => {
      setIsProcessing(false);
      worker.terminate();
      if (activeWorkerRef.current === worker) {
        activeWorkerRef.current = null;
      }
    };

    worker.postMessage({
      imageData,
      width,
      height,
      chars: ASCII_CHARS
    });
  };

  useEffect(() => {
    if (!imageSrc) return;
    queueMicrotask(() => setIsProcessing(true));
    const img = new Image();
    img.onload = () => generateAscii(img, resolution);
    img.src = imageSrc;
  }, [imageSrc, resolution]);

  /* Step back: Return from category view in archive or clear result */
  useEffect(() => {
    if (activeCategory) {
      return useNavStore.getState().registerStepHandler(() => {
        setActiveCategory(null);
        return true;
      });
    }
  }, [activeCategory]);

  /* Guard loaded image from accidental discard */
  useEffect(() => {
    if (imageSrc) {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message: "You have an image loaded for ASCII generation. Going back will discard your progress. Are you sure you want to proceed?",
      }));
    }
  }, [imageSrc]);

  const handleCopy = async () => {
    if (!asciiArt) return;
    try {
      await navigator.clipboard.writeText(asciiArt);
      toast({ title: "Copied!", description: "ASCII art copied to clipboard." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to copy.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!asciiArt) return;
    const blob = new Blob([asciiArt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "omni-ascii.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Tabs */}
      <div className="flex w-full items-center gap-2 border-b border-border/60 bg-card/60 px-4 py-3 sm:px-8">
        <button
          onClick={() => setActiveTab("generator")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 font-display text-sm font-semibold tracking-wide transition-colors",
            activeTab === "generator" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary/60"
          )}
        >
          <ImageIcon className="size-4" /> GENERATOR
        </button>
        <button
          onClick={() => {
            setActiveTab("archive");
            setActiveCategory(null);
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 font-display text-sm font-semibold tracking-wide transition-colors",
            activeTab === "archive" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary/60"
          )}
        >
          <Library className="size-4" /> ARCHIVE
        </button>
      </div>

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        {activeTab === "generator" && (
          <div className="flex h-full flex-col gap-6">
            <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/60 p-6 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <ImageIcon className="size-5 text-primary" /> Image to ASCII
              </h2>
              <p className="font-sans text-sm text-muted-foreground">
                Convert any image into pure text art. Runs entirely on-device using Canvas APIs.
              </p>

              <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-display text-sm font-semibold tracking-wide text-primary-foreground transition-transform hover:scale-[1.02]"
                >
                  <Upload className="size-4" /> UPLOAD IMAGE
                </button>
                
                <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-secondary/40 p-3 sm:max-w-[200px]">
                  <label className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>AI Subject Only</span>
                    <span className="font-bold text-primary">{removeBgEnabled ? "ON" : "OFF"}</span>
                  </label>
                  <button
                    onClick={() => setRemoveBgEnabled(!removeBgEnabled)}
                    disabled={!originalImageSrc || isRemovingBg}
                    className={cn(
                      "flex h-7 items-center justify-center rounded-md border font-mono text-[10px] font-bold tracking-widest transition-colors",
                      removeBgEnabled 
                        ? "border-primary bg-primary/20 text-primary hover:bg-primary/30" 
                        : "border-border/50 bg-transparent text-foreground hover:bg-secondary/60"
                    )}
                  >
                    {isRemovingBg ? "PROCESSING..." : "TOGGLE BG"}
                  </button>
                </div>

                <div className="flex flex-1 flex-col gap-2 rounded-xl border border-border/40 bg-secondary/40 p-3 sm:max-w-[200px]">
                  <label className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>Resolution</span>
                    <span className="font-bold text-primary">{resolution}</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={resolution}
                    onChange={(e) => setResolution(Number(e.target.value))}
                    disabled={!imageSrc || isProcessing || isRemovingBg}
                    className="accent-primary"
                  />
                </div>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {asciiArt && (
              <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-display text-sm font-semibold tracking-wide text-foreground">OUTPUT PREVIEW</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/60 px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest text-foreground transition-colors hover:bg-secondary"
                    >
                      <Copy className="size-3.5" /> COPY
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/60 px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest text-foreground transition-colors hover:bg-secondary"
                    >
                      <Download className="size-3.5" /> SAVE
                    </button>
                  </div>
                </div>

                <div className="relative flex-1 overflow-auto rounded-xl border border-border/60 bg-black p-4 shadow-inner">
                  <pre className={cn(
                    "font-mono text-[8px] leading-[8px] text-white/90",
                    (isProcessing || isRemovingBg) && "opacity-50"
                  )}>
                    {asciiArt}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "archive" && (
          <div className="flex h-full flex-col gap-6">
            {!activeCategory ? (
              <>
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                  <Library className="size-5 text-primary" /> ASCII Art Gallery
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {ASCII_ARCHIVE.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat)}
                      className="group flex flex-col items-center justify-between rounded-xl border border-border/40 bg-card/60 p-4 transition-colors hover:border-primary/50 hover:bg-secondary/60"
                    >
                      <div className="flex h-24 w-full items-center justify-center overflow-hidden">
                        <pre className="font-mono text-[8px] leading-[8px] text-muted-foreground transition-colors group-hover:text-primary">
                          {cat.thumbnail}
                        </pre>
                      </div>
                      <span className="mt-4 font-display text-xs font-semibold tracking-wide text-foreground">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4 border-b border-border/40 pb-4">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="flex items-center gap-2 rounded-lg bg-secondary/60 p-2 text-foreground hover:bg-secondary"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    {activeCategory.name}
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {activeCategory.items.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-border/40 bg-card/60 p-5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                          <TerminalSquare className="size-4 text-primary" />
                          {item.name}
                        </h4>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.art);
                            toast({ title: "Copied!", description: "ASCII art copied to clipboard." });
                          }}
                          className="rounded-lg bg-secondary/60 p-1.5 text-foreground hover:bg-secondary"
                          title="Copy to clipboard"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-1 items-center justify-center overflow-auto rounded-lg bg-black p-4">
                        <pre className="font-mono text-[10px] leading-[10px] text-white/90">
                          {item.art}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
