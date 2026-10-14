/**
 * ZenoDeck — Off-Thread WebGL Video & ASCII Shader Worker
 *
 * Runs exclusively in a dedicated Web Worker via OffscreenCanvas to guarantee
 * that the main browser thread remains locked at 120fps during compute-heavy
 * frame scaling, color quantization, and ASCII luminance matrix generation.
 */

export interface AsciiOptions {
  columns: number;
  rampType?: "standard" | "detailed" | "blocks" | "matrix";
  invert?: boolean;
  colorSampling?: boolean;
  contrast?: number; // 0.5 to 2.0
}

export interface ScaleOptions {
  targetWidth: number;
  targetHeight: number;
  format?: "image/webp" | "image/jpeg" | "image/png";
  quality?: number; // 0.0 to 1.0
}

export interface AsciiToken {
  char: string;
  r: number;
  g: number;
  b: number;
}

export type WorkerInboundMessage =
  | { type: "INIT_CANVAS"; canvas: OffscreenCanvas; width: number; height: number }
  | { type: "RENDER_ASCII"; id: string; bitmap: ImageBitmap; options: AsciiOptions }
  | { type: "SCALE_FRAME"; id: string; bitmap: ImageBitmap; options: ScaleOptions };

export type WorkerOutboundMessage =
  | { type: "INIT_SUCCESS" }
  | { type: "PROGRESS"; id: string; progress: number }
  | {
      type: "ASCII_RESULT";
      id: string;
      asciiText: string;
      tokens?: AsciiToken[];
      width: number;
      height: number;
    }
  | {
      type: "FRAME_RESULT";
      id: string;
      blob: Blob;
      width: number;
      height: number;
    }
  | { type: "ERROR"; id?: string; error: string };

const RAMPS = {
  standard: " .:-=+*#%@",
  detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  blocks: " ░▒▓█",
  matrix: " ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ",
};

let workerCanvas: OffscreenCanvas | null = null;
let workerCtx: OffscreenCanvasRenderingContext2D | null = null;

function getContext(width: number, height: number): OffscreenCanvasRenderingContext2D {
  if (!workerCanvas) {
    workerCanvas = new OffscreenCanvas(width, height);
    workerCtx = workerCanvas.getContext("2d", { willReadFrequently: true });
  } else {
    workerCanvas.width = width;
    workerCanvas.height = height;
    if (!workerCtx) {
      workerCtx = workerCanvas.getContext("2d", { willReadFrequently: true });
    }
  }

  if (!workerCtx) {
    throw new Error("Failed to initialize OffscreenCanvasRenderingContext2D in worker.");
  }

  return workerCtx;
}

/**
 * Calculates perceived luminance according to Rec. 709 standards.
 */
function getLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Computes the ASCII matrix from a source ImageBitmap.
 */
function processAscii(id: string, bitmap: ImageBitmap, options: AsciiOptions) {
  try {
    const cols = Math.max(10, Math.min(320, options.columns || 80));
    // Character aspect ratio is roughly 0.5 (characters are taller than wide)
    const charAspect = 0.5;
    const aspect = bitmap.height / bitmap.width;
    const rows = Math.max(5, Math.round(cols * aspect * charAspect));

    const ctx = getContext(cols, rows);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, cols, rows);

    const imgData = ctx.getImageData(0, 0, cols, rows);
    const data = imgData.data;

    const rampStr = RAMPS[options.rampType || "standard"];
    const rampLen = rampStr.length;
    const contrast = Math.max(0.5, Math.min(2.0, options.contrast ?? 1.0));

    let asciiOut = "";
    const tokens: AsciiToken[] = [];
    const totalPixels = cols * rows;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = (y * cols + x) * 4;
        let r = data[idx] ?? 0;
        let g = data[idx + 1] ?? 0;
        let b = data[idx + 2] ?? 0;

        // Contrast adjustment: (channel - 128) * contrast + 128
        r = Math.min(255, Math.max(0, (r - 128) * contrast + 128));
        g = Math.min(255, Math.max(0, (g - 128) * contrast + 128));
        b = Math.min(255, Math.max(0, (b - 128) * contrast + 128));

        let lum = getLuminance(r, g, b) / 255;
        if (options.invert) {
          lum = 1.0 - lum;
        }

        const charIdx = Math.min(rampLen - 1, Math.floor(lum * rampLen));
        const char = rampStr[charIdx] ?? " ";
        asciiOut += char;

        if (options.colorSampling) {
          tokens.push({ char, r, g, b });
        }

        // Post progress every 10%
        const processed = y * cols + x;
        if (processed % Math.floor(totalPixels / 10) === 0) {
          const pct = Math.round((processed / totalPixels) * 100);
          self.postMessage({ type: "PROGRESS", id, progress: pct } as WorkerOutboundMessage);
        }
      }
      asciiOut += "\n";
    }

    self.postMessage({
      type: "ASCII_RESULT",
      id,
      asciiText: asciiOut,
      tokens: options.colorSampling ? tokens : undefined,
      width: cols,
      height: rows,
    } as WorkerOutboundMessage);
  } finally {
    bitmap.close();
  }
}

/**
 * Off-thread frame scaling and compression.
 */
async function processScale(id: string, bitmap: ImageBitmap, options: ScaleOptions) {
  try {
    const targetW = options.targetWidth;
    const targetH = options.targetHeight;
    const format = options.format || "image/webp";
    const quality = options.quality ?? 0.85;

    const ctx = getContext(targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    self.postMessage({ type: "PROGRESS", id, progress: 50 } as WorkerOutboundMessage);

    const blob = await workerCanvas!.convertToBlob({ type: format, quality });

    self.postMessage({
      type: "FRAME_RESULT",
      id,
      blob,
      width: targetW,
      height: targetH,
    } as WorkerOutboundMessage);
  } finally {
    bitmap.close();
  }
}

self.onmessage = async (e: MessageEvent<WorkerInboundMessage>) => {
  const msg = e.data;
  if (!msg) return;

  try {
    if (msg.type === "INIT_CANVAS") {
      workerCanvas = msg.canvas;
      workerCtx = workerCanvas.getContext("2d", { willReadFrequently: true });
      self.postMessage({ type: "INIT_SUCCESS" } as WorkerOutboundMessage);
      return;
    }

    if (msg.type === "RENDER_ASCII") {
      processAscii(msg.id, msg.bitmap, msg.options);
      return;
    }

    if (msg.type === "SCALE_FRAME") {
      await processScale(msg.id, msg.bitmap, msg.options);
      return;
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    self.postMessage({
      type: "ERROR",
      id: "id" in msg ? msg.id : undefined,
      error: errorMsg,
    } as WorkerOutboundMessage);
  }
};
