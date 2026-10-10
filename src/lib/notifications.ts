"use client";

/**
 * ZENODECK — Unified Notification Engine (Mobile APK & Web App)
 *
 * Dispatches high-priority notifications when long background exports,
 * conversions, or media operations complete or fail.
 *
 * Supported targets:
 * - Android APK: @capacitor/local-notifications with high-priority channel
 * - Web Browser: Native HTML5 Notification API with app badge & vibration
 */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const CHANNEL_ID = "zenodeck_jobs";
let channelCreated = false;

/**
 * Initializes the Android notification channel with high priority and vibration.
 */
async function ensureAndroidChannel() {
  if (channelCreated || !Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Processing & Exports",
      description: "Alerts for completed video exports, conversions, and background jobs",
      importance: 5, // High priority (heads-up notification)
      visibility: 1, // Public
      sound: "default",
      vibration: true,
      lights: true,
      lightColor: "#06B6D4",
    });
    channelCreated = true;
  } catch {
    // Graceful fallback
  }
}

/**
 * Request notification permissions across both platforms.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      return res.display === "granted";
    } catch {
      return false;
    }
  }

  // Web Browser
  if ("Notification" in window) {
    try {
      if (Notification.permission === "granted") return true;
      if (Notification.permission !== "denied") {
        const res = await Notification.requestPermission();
        return res === "granted";
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Notify user that a media processing job completed successfully.
 */
export async function notifyJobSuccess(
  title: string,
  body: string,
  extra?: Record<string, any>
): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Android APK Native Local Notification
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureAndroidChannel();
      const notifId = Math.floor(Date.now() % 100000);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: `✓ ${title}`,
            body,
            channelId: CHANNEL_ID,
            schedule: { at: new Date(Date.now() + 100) },
            extra,
            smallIcon: "ic_stat_name",
            iconColor: "#06B6D4",
          },
        ],
      });
      return;
    } catch (e) {
      console.warn("Native notification dispatch error:", e);
    }
  }

  // 2. Web Browser Notification API
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notif = new Notification(`ZenoDeck: ${title}`, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "zenodeck-job-complete",
        silent: false,
      });

      // Auto-dismiss after 6 seconds on desktop
      setTimeout(() => notif.close(), 6000);
    } catch (e) {
      console.warn("Web notification error:", e);
    }
  }
}

/**
 * Notify user that a media processing job encountered an error.
 */
export async function notifyJobError(
  title: string,
  errorMessage: string
): Promise<void> {
  if (typeof window === "undefined") return;

  if (Capacitor.isNativePlatform()) {
    try {
      await ensureAndroidChannel();
      const notifId = Math.floor(Date.now() % 100000);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: `⚠ ${title}`,
            body: errorMessage,
            channelId: CHANNEL_ID,
            schedule: { at: new Date(Date.now() + 100) },
            iconColor: "#EF4444",
          },
        ],
      });
      return;
    } catch {}
  }

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notif = new Notification(`ZenoDeck Error: ${title}`, {
        body: errorMessage,
        icon: "/favicon.ico",
        tag: "zenodeck-job-error",
      });
      setTimeout(() => notif.close(), 8000);
    } catch {}
  }
}

export interface DownloadNotificationParams {
  id?: number;
  title: string;
  itemTitle?: string;
  progress: number;
  speedMbps?: number;
  isComplete?: boolean;
}

/**
 * Download notification updater (silenced to prevent intrusive vibrations & status bar spam)
 */
export async function updateDownloadNotification(
  _params?: DownloadNotificationParams
): Promise<void> {
  // Intentionally silent no-op: in-app telemetry UI provides real-time progress,
  // preventing unwanted system alerts and device vibrations.
  return;
}
