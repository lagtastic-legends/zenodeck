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
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

/**
 * ZenoDeckKeyboardBridgePlugin
 *
 * Capacitor bridge connecting the React / Next.js web application
 * to the native Android Keyboard (IME) storage deck and configuration settings.
 *
 * Provides:
 * 1. Atomic file writes to the internal app sandbox (filesDir/zenodeck_gifs)
 * 2. Real-time broadcast notifications to ZenoDeckKeyboardService
 * 3. System IME settings discovery (is keyboard enabled/selected, deep linking to Settings)
 * 4. Settings synchronization (Themes, Layout Modes, Number Row, Auto-Correct, Clipboard History)
 */
@CapacitorPlugin(name = "ZenoDeckKeyboardBridge")
class ZenoDeckKeyboardBridgePlugin : Plugin() {

    companion object {
        const val TAG = "ZenoDeckBridgePlugin"
        const val DECK_DIRECTORY_NAME = "zenodeck_gifs"
        const val ACTION_DECK_UPDATED = "com.omnitool.app.ACTION_GIF_DECK_UPDATED"
        const val ACTION_THEME_UPDATED = "com.omnitool.app.ACTION_KEYBOARD_THEME_UPDATED"
        const val ACTION_SETTINGS_UPDATED = "com.omnitool.app.ACTION_KEYBOARD_SETTINGS_UPDATED"
        const val PREFS_NAME = "zenodeck_prefs"
        const val PREF_KEY_THEME = "keyboard_theme"
        const val PREF_KEY_LAYOUT_MODE = "keyboard_layout_mode"
        const val PREF_KEY_SHOW_NUMBER_ROW = "keyboard_show_number_row"
        const val PREF_KEY_AUTO_CORRECT = "keyboard_auto_correct"
        const val PREF_KEY_GESTURE_TYPING = "keyboard_gesture_typing"
        const val PREF_KEY_DOUBLE_SPACE_PERIOD = "keyboard_double_space_period"
        const val PREF_KEY_CLIPBOARD_VAULT = "zenotap_clipboard_vault"

        const val THEME_OBSIDIAN = "obsidian"
        const val THEME_TERRACOTTA = "terracotta"
        const val THEME_GLACIER = "glacier"
        const val THEME_FOREST_CHAMPAGNE = "forest_champagne"
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
        val thumbnailBase64 = call.getString("thumbnailBase64")
        var filename = call.getString("filename") ?: "zenodeck_${System.currentTimeMillis()}.gif"
        if (!filename.endsWith(".gif", ignoreCase = true)) {
            filename = "$filename.gif"
        }

        if (base64Data.isNullOrEmpty()) {
            call.reject("base64 data is required")
            return
        }

        try {
            val cleanBase64 = if (base64Data.contains(",")) {
                base64Data.substringAfter(",")
            } else {
                base64Data
            }

            val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val deckDir = getDeckDirectory()

            val tempFile = File(deckDir, ".tmp_${System.currentTimeMillis()}_$filename")
            val targetFile = File(deckDir, filename)

            FileOutputStream(tempFile).use { it.write(bytes) }

            if (tempFile.renameTo(targetFile)) {
                val thumbFile = File(deckDir, "$filename.thumb.webp")
                if (!thumbnailBase64.isNullOrEmpty()) {
                    val cleanThumb = if (thumbnailBase64.contains(",")) {
                        thumbnailBase64.substringAfter(",")
                    } else {
                        thumbnailBase64
                    }
                    val thumbBytes = Base64.decode(cleanThumb, Base64.DEFAULT)
                    FileOutputStream(thumbFile).use { it.write(thumbBytes) }
                }

                val intent = Intent(ACTION_DECK_UPDATED).apply {
                    setPackage(context.packageName)
                }
                context.sendBroadcast(intent)
                Log.d(TAG, "Saved GIF $filename (${targetFile.length()} bytes) and broadcast sent")

                val ret = JSObject().apply {
                    put("success", true)
                    put("filename", filename)
                    put("path", targetFile.absolutePath)
                    put("size", targetFile.length())
                }
                call.resolve(ret)
            } else {
                call.reject("Failed to commit file to shared deck")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save GIF", e)
            call.reject("Failed to save GIF: ${e.message}", e)
        }
    }

    /**
     * Lists all saved GIFs and Stickers in the shared deck directory.
     */
    @PluginMethod
    fun getDeckGifs(call: PluginCall) {
        try {
            val deckDir = getDeckDirectory()
            val files = deckDir.listFiles { file ->
                file.isFile && (file.extension.equals("gif", ignoreCase = true) ||
                        file.extension.equals("webp", ignoreCase = true) ||
                        file.extension.equals("png", ignoreCase = true)) &&
                        !file.name.contains(".thumb.")
            } ?: emptyArray()

            val sortedFiles = files.sortedWith(
                compareByDescending<File> { it.name.startsWith("pinned_", ignoreCase = true) }
                    .thenByDescending { it.lastModified() }
            )

            val gifsArray = JSArray()
            for (file in sortedFiles) {
                val obj = JSObject().apply {
                    put("filename", file.name)
                    put("path", file.absolutePath)
                    put("size", file.length())
                    put("modified", file.lastModified())
                }
                gifsArray.put(obj)
            }

            val ret = JSObject().apply {
                put("gifs", gifsArray)
                put("count", gifsArray.length())
            }
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to query deck GIFs", e)
            call.reject("Failed to list deck GIFs: ${e.message}", e)
        }
    }

    /**
     * Deletes a GIF from the shared deck directory.
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
            val targetFile = File(deckDir, filename)
            val thumbFile = File(deckDir, "$filename.thumb.webp")

            val deleted = targetFile.delete()
            if (thumbFile.exists()) {
                thumbFile.delete()
            }

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

    /**
     * Sets and persists the native keyboard theme ('glacier', 'obsidian', 'terracotta', or 'forest_champagne').
     */
    @PluginMethod
    fun setKeyboardTheme(call: PluginCall) {
        val theme = call.getString("theme") ?: THEME_GLACIER
        if (theme != THEME_OBSIDIAN && theme != THEME_TERRACOTTA && theme != THEME_GLACIER && theme != THEME_FOREST_CHAMPAGNE) {
            call.reject("Invalid theme: $theme. Supported values: '$THEME_GLACIER', '$THEME_OBSIDIAN', '$THEME_TERRACOTTA', '$THEME_FOREST_CHAMPAGNE'")
            return
        }

        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(PREF_KEY_THEME, theme).apply()

            val intent = Intent(ACTION_THEME_UPDATED).apply {
                setPackage(context.packageName)
                putExtra("theme", theme)
            }
            context.sendBroadcast(intent)
            Log.d(TAG, "Keyboard theme updated to $theme and broadcast sent")

            val ret = JSObject().apply {
                put("success", true)
                put("theme", theme)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update keyboard theme", e)
            call.reject("Failed to set keyboard theme: ${e.message}", e)
        }
    }

    /**
     * Gets the currently saved native keyboard theme.
     */
    @PluginMethod
    fun getKeyboardTheme(call: PluginCall) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val theme = prefs.getString(PREF_KEY_THEME, THEME_GLACIER) ?: THEME_GLACIER
            call.resolve(JSObject().put("theme", theme))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get keyboard theme", e)
            call.reject("Failed to get keyboard theme: ${e.message}", e)
        }
    }

    /**
     * Sets and persists the keyboard layout mode ('QWERTY', 'AZERTY', 'QWERTZ', 'DVORAK').
     */
    @PluginMethod
    fun setLayoutMode(call: PluginCall) {
        val layout = call.getString("layout")?.uppercase() ?: "QWERTY"
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(PREF_KEY_LAYOUT_MODE, layout).apply()

            val intent = Intent(ACTION_SETTINGS_UPDATED).apply {
                setPackage(context.packageName)
                putExtra("setting", "layout")
                putExtra("value", layout)
            }
            context.sendBroadcast(intent)

            call.resolve(JSObject().put("success", true).put("layout", layout))
        } catch (e: Exception) {
            call.reject("Failed to set layout mode: ${e.message}", e)
        }
    }

    /**
     * Gets the currently saved keyboard layout mode.
     */
    @PluginMethod
    fun getLayoutMode(call: PluginCall) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val layout = prefs.getString(PREF_KEY_LAYOUT_MODE, "QWERTY") ?: "QWERTY"
            call.resolve(JSObject().put("layout", layout))
        } catch (e: Exception) {
            call.reject("Failed to get layout mode: ${e.message}", e)
        }
    }

    /**
     * Sets whether the dedicated top number row is visible.
     */
    @PluginMethod
    fun setShowNumberRow(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(PREF_KEY_SHOW_NUMBER_ROW, enabled).apply()

            val intent = Intent(ACTION_SETTINGS_UPDATED).apply {
                setPackage(context.packageName)
                putExtra("setting", "number_row")
                putExtra("value", enabled)
            }
            context.sendBroadcast(intent)

            call.resolve(JSObject().put("success", true).put("enabled", enabled))
        } catch (e: Exception) {
            call.reject("Failed to set show number row: ${e.message}", e)
        }
    }

    /**
     * Gets whether the dedicated top number row is enabled.
     */
    @PluginMethod
    fun getShowNumberRow(call: PluginCall) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val enabled = prefs.getBoolean(PREF_KEY_SHOW_NUMBER_ROW, true)
            call.resolve(JSObject().put("enabled", enabled))
        } catch (e: Exception) {
            call.reject("Failed to get show number row: ${e.message}", e)
        }
    }

    /**
     * Sets whether auto-correct and predictive word completion is enabled.
     */
    @PluginMethod
    fun setAutoCorrect(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(PREF_KEY_AUTO_CORRECT, enabled).apply()

            val intent = Intent(ACTION_SETTINGS_UPDATED).apply {
                setPackage(context.packageName)
                putExtra("setting", "auto_correct")
                putExtra("value", enabled)
            }
            context.sendBroadcast(intent)

            call.resolve(JSObject().put("success", true).put("enabled", enabled))
        } catch (e: Exception) {
            call.reject("Failed to set auto-correct: ${e.message}", e)
        }
    }

    /**
     * Gets whether auto-correct is enabled.
     */
    @PluginMethod
    fun getAutoCorrect(call: PluginCall) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val enabled = prefs.getBoolean(PREF_KEY_AUTO_CORRECT, true)
            call.resolve(JSObject().put("enabled", enabled))
        } catch (e: Exception) {
            call.reject("Failed to get auto-correct: ${e.message}", e)
        }
    }

    /**
     * Sets whether gesture / glide swipe typing is enabled.
     */
    @PluginMethod
    fun setGestureTyping(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(PREF_KEY_GESTURE_TYPING, enabled).apply()

            val intent = Intent(ACTION_SETTINGS_UPDATED).apply {
                setPackage(context.packageName)
                putExtra("setting", "gesture_typing")
                putExtra("value", enabled)
            }
            context.sendBroadcast(intent)

            call.resolve(JSObject().put("success", true).put("enabled", enabled))
        } catch (e: Exception) {
            call.reject("Failed to set gesture typing: ${e.message}", e)
        }
    }

    /**
     * Gets whether gesture / glide typing is enabled.
     */
    @PluginMethod
    fun getGestureTyping(call: PluginCall) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val enabled = prefs.getBoolean(PREF_KEY_GESTURE_TYPING, true)
            call.resolve(JSObject().put("enabled", enabled))
        } catch (e: Exception) {
            call.reject("Failed to get gesture typing: ${e.message}", e)
        }
    }

    /**
     * Retrieves up to 30 stored clips from the persistent clipboard vault.
     */
    @PluginMethod
    fun getClipboardHistory(call: PluginCall) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val rawJson = prefs.getString(PREF_KEY_CLIPBOARD_VAULT, "[]") ?: "[]"
            val jsonArray = JSONArray(rawJson)

            val itemsArray = JSArray()
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val jsObj = JSObject().apply {
                    put("id", obj.optString("id", ""))
                    put("text", obj.optString("text", ""))
                    put("timestamp", obj.optLong("timestamp", 0L))
                    put("isPinned", obj.optBoolean("isPinned", false))
                }
                itemsArray.put(jsObj)
            }

            val ret = JSObject().apply {
                put("items", itemsArray)
                put("count", itemsArray.length())
            }
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to load clipboard history: ${e.message}", e)
        }
    }

    /**
     * Clears unpinned clips (or all clips if clearPinned is true) from the clipboard vault.
     */
    @PluginMethod
    fun clearClipboardHistory(call: PluginCall) {
        val clearPinned = call.getBoolean("clearPinned", false) ?: false
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            if (clearPinned) {
                prefs.edit().putString(PREF_KEY_CLIPBOARD_VAULT, "[]").apply()
            } else {
                val rawJson = prefs.getString(PREF_KEY_CLIPBOARD_VAULT, "[]") ?: "[]"
                val jsonArray = JSONArray(rawJson)
                val newArray = JSONArray()
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    if (obj.optBoolean("isPinned", false)) {
                        newArray.put(obj)
                    }
                }
                prefs.edit().putString(PREF_KEY_CLIPBOARD_VAULT, newArray.toString()).apply()
            }

            val intent = Intent(ACTION_SETTINGS_UPDATED).apply {
                setPackage(context.packageName)
                putExtra("setting", "clipboard")
            }
            context.sendBroadcast(intent)

            call.resolve(JSObject().put("success", true))
        } catch (e: Exception) {
            call.reject("Failed to clear clipboard history: ${e.message}", e)
        }
    }
}
