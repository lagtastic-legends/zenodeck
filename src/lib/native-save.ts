import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";
import { ensureStoragePermission } from "@/lib/permissions";
import { ZenoMedia3 } from "@/lib/media/native-media-muxer";

const CHUNK_SIZE = 512 * 1024; // 512 KB per slice (base64 ~680 KB, safely within Android IPC 1MB Binder limit)

async function blobSliceToBase64(slice: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const commaIdx = dataUrl.indexOf(",");
      resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(slice);
  });
}

export const nativeSave = async (blob: Blob, filename: string) => {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);

    useSaveDialogStore.getState().showSuccess({
      filename,
      directory: "Downloads",
      uri: url,
      fileSize: blob.size,
      blob,
    });
    return;
  }

  try {
    if (Capacitor.getPlatform() === "android") {
      try {
        await ensureStoragePermission();
      } catch {
        // Scoped storage handles writes if legacy permission rejected
      }
    }

    const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);
    const isMedia =
      blob.type.startsWith("video/") ||
      blob.type.startsWith("audio/") ||
      /\.(mp4|webm|mkv|mov|avi|mp3|m4a|wav|flac|aac)$/i.test(filename);

    let targetDirectory: Directory | undefined = Directory.Documents;
    let targetPath = filename;
    let savedDirectory = "Documents";
    let savedFileUri = "";

    // On Android for media files, attempt to target Movies/ZenoDeck or Download/ZenoDeck first
    if (Capacitor.getPlatform() === "android" && isMedia) {
      try {
        const dirInfo = await ZenoMedia3.getMediaStorageDirectory();
        if (dirInfo?.absolutePath) {
          targetDirectory = undefined;
          targetPath = `file://${dirInfo.absolutePath}/${filename}`;
          savedDirectory = "Movies/ZenoDeck";
        }
      } catch {
        // Fall back to standard Documents
        targetDirectory = Directory.Documents;
        targetPath = `ZenoDeck/${filename}`;
        savedDirectory = "Documents/ZenoDeck";
      }
    }

    // 1. Write the initial chunk (creates or truncates file)
    const firstSlice = blob.slice(0, Math.min(CHUNK_SIZE, blob.size));
    const firstBase64 = await blobSliceToBase64(firstSlice);

    try {
      const writeOpts: any = {
        path: targetPath,
        data: firstBase64,
        recursive: true,
      };
      if (targetDirectory) writeOpts.directory = targetDirectory;

      const res = await Filesystem.writeFile(writeOpts);
      savedFileUri = res.uri;
    } catch (primaryErr) {
      console.warn("Primary write target failed, falling back to Documents:", primaryErr);
      targetDirectory = Directory.Documents;
      targetPath = filename;
      savedDirectory = "Documents";
      try {
        const res = await Filesystem.writeFile({
          path: filename,
          data: firstBase64,
          directory: targetDirectory,
          recursive: true,
        });
        savedFileUri = res.uri;
      } catch (secErr) {
        console.warn("Direct write to Documents failed, falling back to Data sandbox:", secErr);
        targetDirectory = Directory.Data;
        targetPath = filename;
        savedDirectory = "App Storage";
        const res = await Filesystem.writeFile({
          path: filename,
          data: firstBase64,
          directory: targetDirectory,
          recursive: true,
        });
        savedFileUri = res.uri;
      }
    }

    // 2. Append remaining chunks sequentially to avoid memory bloat and Binder IPC limits
    for (let chunkIdx = 1; chunkIdx < totalChunks; chunkIdx++) {
      const start = chunkIdx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, blob.size);
      const slice = blob.slice(start, end);
      const chunkBase64 = await blobSliceToBase64(slice);

      const appendOpts: any = {
        path: targetPath,
        data: chunkBase64,
      };
      if (targetDirectory) appendOpts.directory = targetDirectory;

      await Filesystem.appendFile(appendOpts);
    }

    // 3. Trigger Android MediaScanner to immediately register into Google Photos & Gallery
    if (Capacitor.getPlatform() === "android") {
      try {
        const rawPath = savedFileUri ? savedFileUri.replace(/^file:\/\//, "") : targetPath.replace(/^file:\/\//, "");
        const mimeType = blob.type || (filename.endsWith(".mp4") ? "video/mp4" : filename.endsWith(".webm") ? "video/webm" : "application/octet-stream");
        await ZenoMedia3.scanMediaFile({
          filePath: rawPath,
          mimeType,
        });
      } catch (scanErr) {
        console.warn("MediaScanner scan failed (non-fatal):", scanErr);
      }
    }

    useSaveDialogStore.getState().showSuccess({
      filename,
      directory: savedDirectory,
      uri: savedFileUri || targetPath,
      fileSize: blob.size,
      blob,
    });
  } catch (error) {
    console.error("Native save failed completely:", error);
    useSaveDialogStore.getState().showError({
      filename,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Could not save to storage. Please check permissions.",
    });
  }
};
