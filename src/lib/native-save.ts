import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";
import { ensureStoragePermission } from "@/lib/permissions";

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
    let targetDirectory = Directory.Documents;
    let savedDirectory = "Documents";
    let savedFileUri = "";

    // 1. Write the initial chunk (creates or truncates file)
    const firstSlice = blob.slice(0, Math.min(CHUNK_SIZE, blob.size));
    const firstBase64 = await blobSliceToBase64(firstSlice);

    try {
      const res = await Filesystem.writeFile({
        path: filename,
        data: firstBase64,
        directory: targetDirectory,
        recursive: true,
      });
      savedFileUri = res.uri;
    } catch (primaryErr) {
      console.warn("Direct write to Documents failed, falling back to Data sandbox:", primaryErr);
      targetDirectory = Directory.Data;
      savedDirectory = "App Storage";
      const res = await Filesystem.writeFile({
        path: filename,
        data: firstBase64,
        directory: targetDirectory,
        recursive: true,
      });
      savedFileUri = res.uri;
    }

    // 2. Append remaining chunks sequentially to avoid memory bloat and Binder IPC limits
    for (let chunkIdx = 1; chunkIdx < totalChunks; chunkIdx++) {
      const start = chunkIdx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, blob.size);
      const slice = blob.slice(start, end);
      const chunkBase64 = await blobSliceToBase64(slice);

      await Filesystem.appendFile({
        path: filename,
        data: chunkBase64,
        directory: targetDirectory,
      });
    }

    useSaveDialogStore.getState().showSuccess({
      filename,
      directory: savedDirectory,
      uri: savedFileUri,
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
