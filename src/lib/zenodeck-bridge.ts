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
  setKeyboardTheme(options: { theme: string }): Promise<{ success: boolean; theme: string }>;
  getKeyboardTheme(): Promise<{ theme: string }>;
  setLayoutMode(options: { layout: string }): Promise<{ success: boolean; layout: string }>;
  getLayoutMode(): Promise<{ layout: string }>;
  setShowNumberRow(options: { enabled: boolean }): Promise<{ success: boolean; enabled: boolean }>;
  getShowNumberRow(): Promise<{ enabled: boolean }>;
  setAutoCorrect(options: { enabled: boolean }): Promise<{ success: boolean; enabled: boolean }>;
  getAutoCorrect(): Promise<{ enabled: boolean }>;
  getClipboardHistory(): Promise<{ items: ClipboardVaultItemBridge[]; count: number }>;
  clearClipboardHistory(options?: { clearPinned?: boolean }): Promise<{ success: boolean }>;
}

export interface ClipboardVaultItemBridge {
  id: string;
  text: string;
  timestamp: number;
  isPinned: boolean;
}

const NativeBridge = registerPlugin<ZenoDeckNativePlugin>("ZenoDeckKeyboardBridge");

const DECK_SUBDIR = "zenodeck_gifs";

const memoryStore: Record<string, string> = {};

function getFallbackItem(key: string): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem(key);
  }
  return memoryStore[key] || null;
}

function setFallbackItem(key: string, value: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(key, value);
  }
  memoryStore[key] = value;
}

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

export type KeyboardTheme = "glacier" | "obsidian" | "terracotta" | "forest_champagne";
export type KeyboardLayoutMode = "QWERTY" | "AZERTY" | "QWERTZ" | "DVORAK";

/**
 * Updates the native Android keyboard theme ('glacier', 'obsidian', 'terracotta', or 'forest_champagne').
 * Syncs seamlessly across the Capacitor bridge and persists in SharedPreferences.
 */
export async function setKeyboardTheme(theme: KeyboardTheme): Promise<boolean> {
  setFallbackItem("zenotap_keyboard_theme", theme);
  if (!Capacitor.isNativePlatform()) {
    return true;
  }
  try {
    const res = await NativeBridge.setKeyboardTheme({ theme });
    return res.success;
  } catch {
    return false;
  }
}

/**
 * Retrieves the currently persisted native Android keyboard theme.
 */
export async function getKeyboardTheme(): Promise<KeyboardTheme> {
  if (!Capacitor.isNativePlatform()) {
    const stored = getFallbackItem("zenotap_keyboard_theme");
    if (stored === "glacier" || stored === "terracotta" || stored === "obsidian" || stored === "forest_champagne") {
      return stored;
    }
    return "glacier";
  }
  try {
    const res = await NativeBridge.getKeyboardTheme();
    if (res.theme === "glacier" || res.theme === "terracotta" || res.theme === "obsidian" || res.theme === "forest_champagne") {
      return res.theme;
    }
    return "glacier";
  } catch {
    return "glacier";
  }
}

/**
 * Sets and persists the keyboard layout mode ('QWERTY', 'AZERTY', 'QWERTZ', 'DVORAK').
 */
export async function setKeyboardLayoutMode(layout: KeyboardLayoutMode): Promise<boolean> {
  setFallbackItem("zenotap_keyboard_layout", layout);
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const res = await NativeBridge.setLayoutMode({ layout });
    return res.success;
  } catch {
    return false;
  }
}

/**
 * Retrieves the current keyboard layout mode.
 */
export async function getKeyboardLayoutMode(): Promise<KeyboardLayoutMode> {
  if (!Capacitor.isNativePlatform()) {
    const stored = getFallbackItem("zenotap_keyboard_layout");
    if (stored === "QWERTY" || stored === "AZERTY" || stored === "QWERTZ" || stored === "DVORAK") {
      return stored;
    }
    return "QWERTY";
  }
  try {
    const res = await NativeBridge.getLayoutMode();
    const l = res.layout?.toUpperCase();
    if (l === "AZERTY" || l === "QWERTZ" || l === "DVORAK") return l;
    return "QWERTY";
  } catch {
    return "QWERTY";
  }
}

/**
 * Sets whether the top number row is visible on the keyboard.
 */
export async function setShowNumberRow(enabled: boolean): Promise<boolean> {
  setFallbackItem("zenotap_show_number_row", enabled ? "1" : "0");
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const res = await NativeBridge.setShowNumberRow({ enabled });
    return res.success;
  } catch {
    return false;
  }
}

/**
 * Retrieves whether the top number row is enabled.
 */
export async function getShowNumberRow(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const stored = getFallbackItem("zenotap_show_number_row");
    if (stored !== null) return stored === "1";
    return true;
  }
  try {
    const res = await NativeBridge.getShowNumberRow();
    return res.enabled;
  } catch {
    return true;
  }
}

/**
 * Sets whether predictive auto-correct is enabled.
 */
export async function setAutoCorrect(enabled: boolean): Promise<boolean> {
  setFallbackItem("zenotap_auto_correct", enabled ? "1" : "0");
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const res = await NativeBridge.setAutoCorrect({ enabled });
    return res.success;
  } catch {
    return false;
  }
}

/**
 * Retrieves whether auto-correct is enabled.
 */
export async function getAutoCorrect(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const stored = getFallbackItem("zenotap_auto_correct");
    if (stored !== null) return stored === "1";
    return true;
  }
  try {
    const res = await NativeBridge.getAutoCorrect();
    return res.enabled;
  } catch {
    return true;
  }
}

/**
 * Retrieves persistent clipboard vault items.
 */
export async function getClipboardHistory(): Promise<ClipboardVaultItemBridge[]> {
  if (!Capacitor.isNativePlatform()) {
    return [];
  }
  try {
    const res = await NativeBridge.getClipboardHistory();
    return res.items || [];
  } catch {
    return [];
  }
}

/**
 * Clears unpinned or all items from the clipboard vault.
 */
export async function clearClipboardHistory(clearPinned = false): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const res = await NativeBridge.clearClipboardHistory({ clearPinned });
    return res.success;
  } catch {
    return false;
  }
}

