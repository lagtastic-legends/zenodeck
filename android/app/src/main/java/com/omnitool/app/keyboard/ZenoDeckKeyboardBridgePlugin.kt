package com.omnitool.app.keyboard

import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.view.inputmethod.InputMethodManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.FileOutputStream

/**
 * ZenoDeckKeyboardBridgePlugin
 *
 * Capacitor bridge connecting the React / Next.js web application
 * to the native Android Keyboard (IME) storage deck.
 *
 * Provides:
 * 1. Atomic file writes to the internal app sandbox (filesDir/zenodeck_gifs)
 * 2. Real-time broadcast notification to ZenoDeckKeyboardService
 * 3. System IME settings discovery (is keyboard enabled/selected, deep linking to Settings)
 */
@CapacitorPlugin(name = "ZenoDeckKeyboardBridge")
class ZenoDeckKeyboardBridgePlugin : Plugin() {

    companion object {
        const val TAG = "ZenoDeckBridgePlugin"
        const val DECK_DIRECTORY_NAME = "zenodeck_gifs"
        const val ACTION_DECK_UPDATED = "com.omnitool.app.ACTION_GIF_DECK_UPDATED"
    }

    private fun getDeckDirectory(): File {
        val dir = File(context.filesDir, DECK_DIRECTORY_NAME)
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    /**
     * Saves a base64-encoded GIF to the shared deck directory using an atomic write pattern.
     */
    @PluginMethod
    fun saveGif(call: PluginCall) {
        val base64Data = call.getString("base64")
        var filename = call.getString("filename") ?: "zenodeck_${System.currentTimeMillis()}.gif"
        if (!filename.endsWith(".gif", ignoreCase = true)) {
            filename = "$filename.gif"
        }

        if (base64Data.isNullOrEmpty()) {
            call.reject("base64 data is required")
            return
        }

        try {
            // Strip data URL preamble if passed (e.g. "data:image/gif;base64,...")
            val cleanBase64 = if (base64Data.contains(",")) {
                base64Data.substringAfter(",")
            } else {
                base64Data
            }

            val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val deckDir = getDeckDirectory()

            // Atomic write: write to .tmp file first, then atomically rename
            val tempFile = File(deckDir, ".tmp_${System.currentTimeMillis()}_$filename")
            val targetFile = File(deckDir, filename)

            FileOutputStream(tempFile).use { it.write(bytes) }

            if (tempFile.renameTo(targetFile)) {
                // Broadcast update so active keyboard refreshes immediately
                val intent = Intent(ACTION_DECK_UPDATED).apply {
                    setPackage(context.packageName)
                }
                context.sendBroadcast(intent)

                Log.d(TAG, "Saved GIF to shared deck: ${targetFile.absolutePath} (${targetFile.length()} bytes)")

                val ret = JSObject().apply {
                    put("success", true)
                    put("filename", filename)
                    put("path", targetFile.absolutePath)
                    put("size", targetFile.length())
                }
                call.resolve(ret)
            } else {
                tempFile.delete()
                call.reject("Failed to commit atomic file rename for $filename")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error saving GIF to shared deck", e)
            call.reject("Failed to save GIF: ${e.message}", e)
        }
    }

    /**
     * Returns an array of all GIFs currently present in the shared deck directory.
     */
    @PluginMethod
    fun getDeckGifs(call: PluginCall) {
        try {
            val deckDir = getDeckDirectory()
            val files = deckDir.listFiles { file ->
                file.isFile && file.name.endsWith(".gif", ignoreCase = true) && !file.name.startsWith(".")
            } ?: emptyArray()

            val array = JSArray()
            files.sortedByDescending { it.lastModified() }.forEach { file ->
                val item = JSObject().apply {
                    put("filename", file.name)
                    put("path", file.absolutePath)
                    put("size", file.length())
                    put("modified", file.lastModified())
                }
                array.put(item)
            }

            val ret = JSObject().apply {
                put("gifs", array)
                put("count", files.size)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read deck GIFs", e)
            call.reject("Failed to read deck GIFs: ${e.message}", e)
        }
    }

    /**
     * Deletes a specific GIF from the deck directory.
     */
    @PluginMethod
    fun deleteGif(call: PluginCall) {
        val filename = call.getString("filename")
        if (filename.isNullOrEmpty()) {
            call.reject("filename is required")
            return
        }

        try {
            val deckDir = getDeckDirectory()
            val file = File(deckDir, filename)
            val deleted = file.exists() && file.delete()

            if (deleted) {
                val intent = Intent(ACTION_DECK_UPDATED).apply {
                    setPackage(context.packageName)
                }
                context.sendBroadcast(intent)
            }

            call.resolve(JSObject().put("success", deleted))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete GIF $filename", e)
            call.reject("Failed to delete GIF: ${e.message}", e)
        }
    }

    /**
     * Checks whether ZenoDeck keyboard is enabled and/or currently selected in system settings.
     */
    @PluginMethod
    fun isKeyboardEnabled(call: PluginCall) {
        try {
            val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            val enabledMethods = imm?.enabledInputMethodList ?: emptyList()

            val isEnabled = enabledMethods.any { method ->
                method.id.contains(context.packageName) && method.id.contains("ZenoDeckKeyboardService")
            }

            val selectedIme = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.DEFAULT_INPUT_METHOD
            ) ?: ""
            val isSelected = selectedIme.contains(context.packageName) && selectedIme.contains("ZenoDeckKeyboardService")

            val ret = JSObject().apply {
                put("enabled", isEnabled)
                put("selected", isSelected)
                put("defaultImeId", selectedIme)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to query keyboard status", e)
            call.reject("Failed to query keyboard status: ${e.message}", e)
        }
    }

    /**
     * Direct deep link to Android's Input Method Settings page.
     */
    @PluginMethod
    fun openKeyboardSettings(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_INPUT_METHOD_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            call.resolve(JSObject().put("success", true))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch keyboard settings", e)
            call.reject("Failed to open keyboard settings: ${e.message}", e)
        }
    }

    /**
     * Prompts the system Input Method Picker dialog.
     */
    @PluginMethod
    fun openInputMethodPicker(call: PluginCall) {
        try {
            val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            imm?.showInputMethodPicker()
            call.resolve(JSObject().put("success", true))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch IME picker", e)
            call.reject("Failed to open IME picker: ${e.message}", e)
        }
    }
}
