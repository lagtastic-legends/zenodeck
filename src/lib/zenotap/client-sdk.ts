/**
 * ZenoTap Client SDK
 * 
 * Secure client-side library for interacting with the ZenoTap Cloud API.
 * Enforces the two-phase HMAC upload ticket protocol and handles authentication.
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
  pairCode: string;
  expiresAt: number;
  expiresInSeconds: number;
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
    const res = await fetch("/api/zenotap/v1/deck/upload-ticket/", {
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
    const res = await fetch("/api/zenotap/v1/deck/upload/", {
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
    const res = await fetch("/api/zenotap/v1/deck/", {
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
    const res = await fetch(`/api/zenotap/v1/deck/?id=${encodeURIComponent(id)}`, {
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
    const res = await fetch("/api/zenotap/v1/device/pair/", {
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
};
