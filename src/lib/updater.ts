"use client";

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import {
  APP_VERSION,
  GITHUB_LATEST_RELEASE_API,
  GITHUB_REPO_URL,
  isNewerVersion,
} from "@/config/version";
import { universalFetch } from "@/lib/youtube/innertube";

export interface AppReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

export interface AppUpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  releaseUrl: string;
  apkUrl?: string;
  apkSize?: number;
  error?: string;
}

const UPDATE_CACHE_KEY = "zenodeck_update_cache";
const UPDATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Gets currently running app version dynamically from @capacitor/app or fallback constant
 */
export async function getCurrentAppVersion(): Promise<string> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo();
      if (info?.version) {
        return info.version;
      }
    } catch {}
  }
  return APP_VERSION;
}

/**
 * Checks GitHub Releases for newer versions of ZenoDeck
 */
export async function checkForUpdates(forceRefresh = false): Promise<AppUpdateInfo> {
  const currentVersion = await getCurrentAppVersion();

  // Check cached result if not forced
  if (!forceRefresh && typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(UPDATE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < UPDATE_CACHE_TTL_MS) {
          return {
            ...parsed.data,
            currentVersion,
            updateAvailable: isNewerVersion(parsed.data.latestVersion, currentVersion),
          };
        }
      }
    } catch {}
  }

  try {
    const res = await universalFetch(GITHUB_LATEST_RELEASE_API, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ZenoDeck-App",
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const tagName = data.tag_name || "";
    const cleanTag = tagName.replace(/^v/i, "");
    const updateAvailable = isNewerVersion(cleanTag, currentVersion);

    let apkUrl: string | undefined = undefined;
    let apkSize: number | undefined = undefined;

    if (Array.isArray(data.assets)) {
      // Find zenodeck.apk or versioned apk
      const apkAsset =
        data.assets.find((a: any) => a.name === "zenodeck.apk") ||
        data.assets.find((a: any) => a.name.endsWith(".apk"));

      if (apkAsset) {
        apkUrl = apkAsset.browser_download_url;
        apkSize = apkAsset.size;
      }
    }

    const result: AppUpdateInfo = {
      updateAvailable,
      currentVersion,
      latestVersion: cleanTag,
      releaseName: data.name || `ZenoDeck ${tagName}`,
      releaseNotes: data.body || "",
      publishedAt: data.published_at || "",
      releaseUrl: data.html_url || `${GITHUB_REPO_URL}/releases/tag/${tagName}`,
      apkUrl,
      apkSize,
    };

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          UPDATE_CACHE_KEY,
          JSON.stringify({ timestamp: Date.now(), data: result })
        );
      } catch {}
    }

    return result;
  } catch (err: any) {
    console.warn("Failed to check for updates:", err);
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseName: `ZenoDeck v${currentVersion}`,
      releaseNotes: "",
      publishedAt: "",
      releaseUrl: `${GITHUB_REPO_URL}/releases`,
      error: err?.message || "Failed to contact GitHub update servers",
    };
  }
}

/**
 * Triggers native Android APK download and package installation
 */
export async function installNativeApkUpdate(
  apkUrl: string,
  onProgress?: (progressPercent: number) => void
): Promise<{ success: boolean; status: string; message?: string }> {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    // In web browser, trigger download link
    const a = document.createElement("a");
    a.href = apkUrl;
    a.download = "zenodeck.apk";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 2000);
    return { success: true, status: "BROWSER_DOWNLOAD_STARTED" };
  }

  try {
    const OmniRecorder = (window as any).Capacitor?.Plugins?.OmniRecorder;
    if (!OmniRecorder?.installApk) {
      // Fallback: open browser download URL directly
      window.open(apkUrl, "_system");
      return { success: true, status: "OPENED_EXTERNAL_BROWSER" };
    }

    // Set up progress listener if available
    let progressListener: any = null;
    if (onProgress && OmniRecorder.addListener) {
      progressListener = await OmniRecorder.addListener(
        "apkDownloadProgress",
        (event: { progress: number }) => {
          onProgress(event.progress);
        }
      );
    }

    const res = await OmniRecorder.installApk({ apkUrl });
    if (progressListener) {
      await progressListener.remove();
    }

    return res;
  } catch (err: any) {
    console.error("Native APK installation failed:", err);
    return {
      success: false,
      status: "INSTALL_FAILED",
      message: err?.message || "Failed to trigger package installer",
    };
  }
}

/**
 * Dismisses/removes the cached update notification from storage
 */
export function dismissUpdateNotification(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(UPDATE_CACHE_KEY);
    localStorage.setItem("zenodeck_update_dismissed_at", Date.now().toString());
  } catch {}
}
