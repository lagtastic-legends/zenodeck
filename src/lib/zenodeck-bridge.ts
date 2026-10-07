import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";

export interface DeckGifItem {
  filename: string;
  path: string;
  size: number;
  modified: number;
}

export interface KeyboardStatus {
  enabled: boolean;
  selected: boolean;
  defaultImeId?: string;
}

export interface SaveGifResult {
  success: boolean;
  filename: string;
  path: string;
  size: number;
}

interface ZenoDeckNativePlugin {
  saveGif(options: { base64: string; filename?: string }): Promise<SaveGifResult>;
  getDeckGifs(): Promise<{ gifs: DeckGifItem[]; count: number }>;
  deleteGif(options: { filename: string }): Promise<{ success: boolean }>;
  isKeyboardEnabled(): Promise<KeyboardStatus>;
  openKeyboardSettings(): Promise<{ success: boolean }>;
  openInputMethodPicker(): Promise<{ success: boolean }>;
}

const NativeBridge = registerPlugin<ZenoDeckNativePlugin>("ZenoDeckKeyboardBridge");

const DECK_SUBDIR = "zenodeck_gifs";

/**
 * Converts a Blob or File into a pure base64 string (stripping data URLs).
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const commaIdx = dataUrl.indexOf(",");
      resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Saves a generated GIF directly into the shared ZenoDeck keyboard storage deck.
 *
 * Execution details:
 * - Uses native ZenoDeckKeyboardBridgePlugin for atomic file writes and instant IME refresh broadcasts.
 * - Falls back to @capacitor/filesystem (Directory.Data) on legacy environments.
 * - Falls back to browser download if run outside native Android.
 */
export async function saveGifToKeyboardDeck(
  data: Blob | string,
  filename?: string
): Promise<SaveGifResult> {
  const safeFilename = (filename || `zenodeck_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .concat(".gif")
    .replace(/\.gif\.gif$/i, ".gif");

  const base64Data = typeof data === "string" ? data : await blobToBase64(data);

  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Primary: Native Capacitor Plugin with atomic write & broadcast
      return await NativeBridge.saveGif({
        base64: base64Data,
        filename: safeFilename,
      });
    } catch (pluginErr) {
      console.warn("ZenoDeckKeyboardBridgePlugin call failed, falling back to Filesystem plugin:", pluginErr);

      // 2. Fallback: Standard Capacitor Filesystem (Directory.Data points to app filesDir)
      const path = `${DECK_SUBDIR}/${safeFilename}`;
      const res = await Filesystem.writeFile({
        path,
        data: base64Data,
        directory: Directory.Data,
        recursive: true,
      });

      return {
        success: true,
        filename: safeFilename,
        path: res.uri,
        size: Math.round((base64Data.length * 3) / 4),
      };
    }
  }

  // Web Browser Fallback (development mode)
  if (typeof window !== "undefined") {
    const byteCharacters = atob(base64Data.replace(/^data:image\/gif;base64,/, ""));
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/gif" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    success: true,
    filename: safeFilename,
    path: `web://${safeFilename}`,
    size: 0,
  };
}

/**
 * Retrieves the list of all GIFs currently present in the keyboard storage deck.
 */
export async function getKeyboardDeckGifs(): Promise<DeckGifItem[]> {
  if (!Capacitor.isNativePlatform()) {
    return [];
  }

  try {
    const res = await NativeBridge.getDeckGifs();
    return res.gifs || [];
  } catch (err) {
    console.warn("NativeBridge.getDeckGifs failed, falling back to Filesystem.readdir:", err);
    try {
      const dirRes = await Filesystem.readdir({
        path: DECK_SUBDIR,
        directory: Directory.Data,
      });

      return dirRes.files
        .filter((f) => f.name.endsWith(".gif"))
        .map((f) => ({
          filename: f.name,
          path: `${DECK_SUBDIR}/${f.name}`,
          size: f.size || 0,
          modified: f.mtime || Date.now(),
        }));
    } catch {
      return [];
    }
  }
}

/**
 * Deletes a GIF from the keyboard storage deck.
 */
export async function deleteGifFromKeyboardDeck(filename: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  try {
    const res = await NativeBridge.deleteGif({ filename });
    return res.success;
  } catch (err) {
    console.warn("NativeBridge.deleteGif failed, trying Filesystem.deleteFile:", err);
    try {
      await Filesystem.deleteFile({
        path: `${DECK_SUBDIR}/${filename}`,
        directory: Directory.Data,
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Checks if ZenoDeck keyboard is enabled in Android System Settings and if it is the active default IME.
 */
export async function getKeyboardStatus(): Promise<KeyboardStatus> {
  if (!Capacitor.isNativePlatform()) {
    return { enabled: false, selected: false };
  }

  try {
    return await NativeBridge.isKeyboardEnabled();
  } catch (e) {
    console.warn("Failed to check keyboard status:", e);
    return { enabled: false, selected: false };
  }
}

/**
 * Opens Android's system Input Method Settings page.
 */
export async function openKeyboardSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  try {
    const res = await NativeBridge.openKeyboardSettings();
    return res.success;
  } catch {
    return false;
  }
}

/**
 * Opens Android's system IME picker dialog to switch to ZenoDeck.
 */
export async function openKeyboardPicker(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  try {
    const res = await NativeBridge.openInputMethodPicker();
    return res.success;
  } catch {
    return false;
  }
}
