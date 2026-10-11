import { Capacitor } from "@capacitor/core";
import { getKeyboardDeckGifs, saveGifToKeyboardDeck } from "@/lib/zenodeck-bridge";

/**
 * ZenoTap Client SDK
 * 
 * Secure client-side library for interacting with the ZenoTap Cloud API.
 * Enforces the two-phase HMAC upload ticket protocol, cross-device pairing,
 * and delta synchronization into the native Android keyboard deck.
 */

export interface CloudDeckItem {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  width?: number | null;
  height?: number | null;
  mimeType: string;
  createdAt: number;
  updatedAt: number;
}

export interface UploadTicketResponse {
  success: boolean;
  ticket: string;
  expiresInSeconds: number;
  maxSizeBytes: number;
}

export interface PairCodeResponse {
  success: boolean;
  linkId?: string;
  pairCode: string;
  expiresAt: number;
  expiresInSeconds: number;
}

export interface PairStatusResponse {
  success: boolean;
  confirmed: boolean;
  deviceName?: string | null;
  expired?: boolean;
}

export interface PairDeviceResponse {
  success: boolean;
  syncToken: string;
  deviceName: string;
  message: string;
}

export interface SyncedDeckItem {
  id: string;
  filename: string;
  originalName: string;
  downloadUrl: string;
  size: number;
  width?: number | null;
  height?: number | null;
  updatedAt: number;
}

export interface DeviceSyncResponse {
  success: boolean;
  deviceId: string;
  deviceName: string;
  count: number;
  deck: SyncedDeckItem[];
  syncedAt: number;
}

export interface DeckSyncResult {
  total: number;
  downloaded: number;
  skipped: number;
  errors: number;
  items: string[];
}

const SYNC_TOKEN_KEY = "zenotap_sync_token";
const DEVICE_NAME_KEY = "zenotap_device_name";
const AUTO_SYNC_KEY = "zenotap_auto_sync";
const LAST_SYNCED_KEY = "zenotap_last_synced";

export function getStoredSyncToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SYNC_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredSyncToken(token: string, deviceName?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SYNC_TOKEN_KEY, token);
    if (deviceName) {
      localStorage.setItem(DEVICE_NAME_KEY, deviceName);
    }
  } catch {
    // ignore
  }
}

export function getStoredDeviceName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(DEVICE_NAME_KEY);
  } catch {
    return null;
  }
}

export function clearStoredSyncToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SYNC_TOKEN_KEY);
    localStorage.removeItem(DEVICE_NAME_KEY);
  } catch {
    // ignore
  }
}

export function getStoredAutoSync(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem(AUTO_SYNC_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

export function setStoredAutoSync(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTO_SYNC_KEY, String(enabled));
  } catch {}
}

export function getStoredLastSynced(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const val = localStorage.getItem(LAST_SYNCED_KEY);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

export function setStoredLastSynced(timestamp = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_SYNCED_KEY, String(timestamp));
  } catch {}
}

/**
 * Extracts a 6-digit pairing code from raw text, deep-links, or magic URLs.
 * Examples handled: "123456", "123 456", "zenodeck://pair?code=123456", "https://.../?pair=123456"
 */
export function extractPairCode(input: string): string | null {
  if (!input) return null;
  const str = input.trim();

  // 1. URL search parameter
  if (str.includes("pair=") || str.includes("code=") || str.includes("zenotap_pair=")) {
    try {
      const url = new URL(str, "https://zenodeck.app");
      const code =
        url.searchParams.get("pair") ||
        url.searchParams.get("code") ||
        url.searchParams.get("zenotap_pair");
      if (code) {
        const cleaned = code.replace(/\D/g, "");
        if (cleaned.length === 6) return cleaned;
      }
    } catch {}
  }

  // 2. JSON payload
  if (str.startsWith("{") && str.endsWith("}")) {
    try {
      const parsed = JSON.parse(str);
      const code = parsed.pairCode || parsed.code || parsed.pair;
      if (code) {
        const cleaned = String(code).replace(/\D/g, "");
        if (cleaned.length === 6) return cleaned;
      }
    } catch {}
  }

  // 3. Exact 6 digits when non-digits stripped (e.g. "847 291", "847-291")
  const digitsOnly = str.replace(/\D/g, "");
  if (digitsOnly.length === 6) {
    return digitsOnly;
  }

  // 4. Isolated 6-digit sequence in text/clipboard (e.g. "CODE: 847291 (use within 10 min)")
  const match = str.match(/(?<!\d)(\d{6})(?!\d)/);
  if (match) {
    return match[1];
  }

  return null;
}

export function getZenoTapApiUrl(path: string): string {
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  // Normalize path without trailing slashes
  const [pathname, search] = cleanPath.split("?");
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  cleanPath = search ? `${normalizedPathname}?${search}` : normalizedPathname;

  if (typeof window !== "undefined") {
    // In native mobile APK (Capacitor Android / iOS), route to remote API fallback
    if (Capacitor.isNativePlatform()) {
      const fallback = process.env.NEXT_PUBLIC_APP_URL || "https://omni-tool-two.vercel.app";
      return `${fallback.replace(/\/+$/, "")}${cleanPath}`;
    }

    // In web browser environment
    const origin = window.location.origin;
    if (origin && !origin.startsWith("file:")) {
      return `${origin}${cleanPath}`;
    }
  }

  // SSR / Node fallback
  const fallback = process.env.NEXT_PUBLIC_APP_URL || "https://omni-tool-two.vercel.app";
  return `${fallback.replace(/\/+$/, "")}${cleanPath}`;
}

function getStoredUserId(): string {
  if (typeof window === "undefined") return "web_user";
  try {
    const raw = localStorage.getItem("zenodeck_active_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.uid) return parsed.uid;
    }
  } catch {
    // fallback
  }
  return "web_user";
}

export const zenoTapClient = {
  /**
   * Request a short-lived (60s) single-use signed ticket before uploading.
   */
  async requestUploadTicket(): Promise<UploadTicketResponse> {
    const userId = getStoredUserId();
    const url = getZenoTapApiUrl("/api/zenotap/v1/deck/upload-ticket");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-zenotap-user-id": userId,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to request upload ticket" }));
      throw new Error(err.error || `Ticket request failed (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Uploads a GIF file to the user's ZenoTap cloud deck using a single-use ticket.
   */
  async uploadGifToDeck(file: File | Blob, originalName?: string): Promise<CloudDeckItem> {
    // 1. Request short-lived single-use HMAC ticket
    const ticketData = await this.requestUploadTicket();

    // 2. Prepare multipart payload
    const formData = new FormData();
    formData.append("ticket", ticketData.ticket);
    formData.append("file", file, originalName || "animation.gif");
    if (originalName) {
      formData.append("originalName", originalName);
    }

    // 3. Post to upload route
    const userId = getStoredUserId();
    const url = getZenoTapApiUrl("/api/zenotap/v1/deck/upload");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-zenotap-user-id": userId,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(err.error || `Upload failed with status ${res.status}`);
    }

    const data = await res.json();
    return data.item;
  },

  /**
   * Fetches the user's active cloud GIF deck.
   */
  async fetchCloudDeck(): Promise<CloudDeckItem[]> {
    const userId = getStoredUserId();
    const url = getZenoTapApiUrl("/api/zenotap/v1/deck");
    const res = await fetch(url, {
      headers: {
        "x-zenotap-user-id": userId,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch cloud deck (${res.status})`);
    }

    const data = await res.json();
    return data.deck || [];
  },

  /**
   * Deletes a GIF from the user's cloud deck.
   */
  async deleteCloudGif(id: string): Promise<boolean> {
    const userId = getStoredUserId();
    const url = getZenoTapApiUrl(`/api/zenotap/v1/deck?id=${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "x-zenotap-user-id": userId,
      },
    });

    return res.ok;
  },

  /**
   * Generates a 6-digit device pairing code to link a ZenoTap Android keyboard.
   */
  async createDevicePairCode(): Promise<PairCodeResponse> {
    const userId = getStoredUserId();
    const url = getZenoTapApiUrl("/api/zenotap/v1/device/pair");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-zenotap-user-id": userId,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to generate pair code");
    }

    return await res.json();
  },

  /**
   * Confirms a 6-digit device pairing code and stores the permanent sync token.
   */
  async confirmPairCode(pairCode: string, deviceName?: string): Promise<PairDeviceResponse> {
    const name = deviceName || (Capacitor.isNativePlatform() ? "Android Keyboard" : "ZenoDeck Companion");
    const url = getZenoTapApiUrl("/api/zenotap/v1/device/pair");
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pairCode: pairCode.trim(), deviceName: name }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Pairing code is invalid or has expired." }));
      throw new Error(err.error || `Pairing failed (${res.status})`);
    }

    const data = (await res.json()) as PairDeviceResponse;
    setStoredSyncToken(data.syncToken, data.deviceName);
    return data;
  },

  /**
   * Polls pairing status by linkId or pairCode (used by desktop session).
   */
  async checkPairCodeStatus(linkIdOrCode: string): Promise<PairStatusResponse> {
    const url = getZenoTapApiUrl(
      `/api/zenotap/v1/device/pair?linkId=${encodeURIComponent(linkIdOrCode)}&pairCode=${encodeURIComponent(linkIdOrCode)}`
    );
    const res = await fetch(url);
    if (!res.ok) {
      return { success: false, confirmed: false, expired: true };
    }
    return (await res.json()) as PairStatusResponse;
  },

  /**
   * Queries the device sync endpoint via Bearer sync token.
   */
  async fetchDeviceSync(token?: string): Promise<DeviceSyncResponse> {
    const syncToken = token || getStoredSyncToken();
    if (!syncToken) {
      throw new Error("No sync token found for this device");
    }

    const url = getZenoTapApiUrl("/api/zenotap/v1/sync");
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${syncToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Sync query failed" }));
      throw new Error(err.error || `Sync failed (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Full delta sync: downloads cloud deck items directly into local Android keyboard storage.
   * Enables the Android IME keyboard to render and inject all cloud GIFs instantly.
   */
  async syncCloudDeckToLocal(): Promise<DeckSyncResult> {
    let itemsToSync: { filename: string; downloadUrl: string; size: number }[] = [];
    const syncToken = getStoredSyncToken();

    // 1. Try syncing via device token
    if (syncToken) {
      try {
        const syncData = await this.fetchDeviceSync(syncToken);
        itemsToSync = syncData.deck.map((d) => ({
          filename: d.filename,
          downloadUrl: d.downloadUrl,
          size: d.size,
        }));
      } catch (tokenErr) {
        console.warn("Device token sync failed, falling back to active user deck:", tokenErr);
      }
    }

    // 2. Fallback to active logged-in user cloud deck
    if (itemsToSync.length === 0) {
      try {
        const cloudItems = await this.fetchCloudDeck();
        itemsToSync = cloudItems.map((c) => ({
          filename: c.filename,
          downloadUrl: c.url.startsWith("http") ? c.url : getZenoTapApiUrl(c.url),
          size: c.size,
        }));
      } catch (cloudErr) {
        console.warn("Failed fetching cloud deck for local sync:", cloudErr);
      }
    }

    if (itemsToSync.length === 0) {
      return { total: 0, downloaded: 0, skipped: 0, errors: 0, items: [] };
    }

    // 3. Inspect existing local keyboard GIFs
    const localFiles = await getKeyboardDeckGifs();
    const localMap = new Map(localFiles.map((f) => [f.filename, f.size]));

    let downloaded = 0;
    let skipped = 0;
    let errors = 0;
    const syncedFilenames: string[] = [];

    // 4. Download and persist any missing GIFs
    for (const item of itemsToSync) {
      const existingSize = localMap.get(item.filename);
      if (existingSize && existingSize > 0) {
        skipped++;
        syncedFilenames.push(item.filename);
        continue;
      }

      try {
        const res = await fetch(item.downloadUrl);
        if (!res.ok) {
          throw new Error(`Failed to download ${item.filename} (status ${res.status})`);
        }
        const blob = await res.blob();
        await saveGifToKeyboardDeck(blob, item.filename);
        downloaded++;
        syncedFilenames.push(item.filename);
      } catch (err) {
        console.error(`Error syncing GIF ${item.filename} to local deck:`, err);
        errors++;
      }
    }

    setStoredLastSynced();

    return {
      total: itemsToSync.length,
      downloaded,
      skipped,
      errors,
      items: syncedFilenames,
    };
  },
};
