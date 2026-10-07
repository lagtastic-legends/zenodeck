package com.omnitool.app.keyboard

import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.inputmethodservice.InputMethodService
import android.net.Uri
import android.os.Build
import android.util.Log
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.inputmethod.EditorInfoCompat
import androidx.core.view.inputmethod.InputConnectionCompat
import androidx.core.view.inputmethod.InputContentInfoCompat
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.omnitool.app.MainActivity
import com.omnitool.app.R
import java.io.File
import java.io.FileOutputStream

/**
 * ZenoDeckKeyboardService
 *
 * Custom Android InputMethodService (IME) architected for Rich Content Insertion
 * (injecting GIFs and custom media) into messaging applications (WhatsApp, Google Messages,
 * Telegram, Discord, Slack, etc.) via Android's CommitContent API (InputConnectionCompat).
 *
 * Integrates an asynchronous thumbnail RecyclerView grid and the shared storage bridge
 * (ZenoDeckKeyboardBridgePlugin) to receive, observe, and inject user-generated GIFs on the fly.
 */
class ZenoDeckKeyboardService : InputMethodService() {

    companion object {
        const val TAG = "ZenoDeckIME"
        const val MIME_TYPE_GIF = "image/gif"
        const val MIME_TYPE_IMAGE_ANY = "image/*"
        const val DECK_DIRECTORY_NAME = "zenodeck_gifs"

        // 1x1 Transparent GIF89a valid binary stream for testing and fallback verification
        private val MINIMAL_GIF_BYTES = byteArrayOf(
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // "GIF89a"
            0x01, 0x00, 0x01, 0x00,             // 1 x 1 px width/height
            0x80.toByte(), 0x00, 0x00,          // Global Color Table flag
            0x00, 0x00, 0x00,                   // Color 0: RGB(0,0,0)
            0xFF.toByte(), 0xFF.toByte(), 0xFF.toByte(), // Color 1: RGB(255,255,255)
            0x21, 0xF9.toByte(), 0x04,          // Graphic Control Extension
            0x01, 0x00, 0x00, 0x00, 0x00,       // Transparent index 0
            0x2C, 0x00, 0x00, 0x00, 0x00,       // Image Descriptor
            0x01, 0x00, 0x01, 0x00, 0x00,       // 1x1
            0x02, 0x02, 0x44, 0x01, 0x00,       // LZW Raster Data
            0x3B                                // GIF Trailer
        )
    }

    /**
     * Listener interface to monitor rich content commit outcomes
     */
    interface OnCommitContentListener {
        fun onCommitSuccess(contentUri: Uri, mimeType: String, targetPackage: String)
        fun onCommitFailure(reason: String, fallbackUsed: Boolean)
    }

    // UI View References
    private var keyboardRootView: View? = null
    private var statusTextView: TextView? = null
    private var richContentBadge: TextView? = null
    private var commitResultTextView: TextView? = null
    private var deckTitleTextView: TextView? = null
    private var rvGifDeck: RecyclerView? = null
    private var layoutEmptyDeck: View? = null
    private var gifAdapter: GifDeckAdapter? = null

    // Target host editor state
    private var currentEditorInfo: EditorInfo? = null
    private var isRichContentSupportedByHost: Boolean = false

    // Registered commit listener
    private var commitContentListener: OnCommitContentListener? = null

    // Shared storage GIF cache
    private val deckGifs = mutableListOf<File>()

    // Broadcast receiver for live deck updates from React/Capacitor
    private val deckUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "Received ACTION_GIF_DECK_UPDATED broadcast. Refreshing media deck.")
            refreshDeckFiles()
        }
    }
    private var isReceiverRegistered = false

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "ZenoDeckKeyboardService initialized.")

        // Register broadcast receiver for shared storage synchronization
        val filter = IntentFilter(ZenoDeckKeyboardBridgePlugin.ACTION_DECK_UPDATED)
        try {
            ContextCompat.registerReceiver(
                this,
                deckUpdateReceiver,
                filter,
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
            isReceiverRegistered = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register deckUpdateReceiver", e)
        }

        // Default listener for logging and UI telemetry
        commitContentListener = object : OnCommitContentListener {
            override fun onCommitSuccess(contentUri: Uri, mimeType: String, targetPackage: String) {
                Log.i(TAG, "CommitContent SUCCESS -> URI: $contentUri to $targetPackage")
                updateCommitResultDisplay("✓ Injected GIF into $targetPackage", isSuccess = true)
            }

            override fun onCommitFailure(reason: String, fallbackUsed: Boolean) {
                Log.w(TAG, "CommitContent FAILURE -> $reason (Fallback: $fallbackUsed)")
                val msg = if (fallbackUsed) "⚠ Incompatible: Copied to clipboard" else "✗ Failed: $reason"
                updateCommitResultDisplay(msg, isSuccess = false)
            }
        }
    }

    override fun onCreateInputView(): View {
        val view = layoutInflater.inflate(R.layout.keyboard_view, null)
        keyboardRootView = view
        bindKeyboardViews(view)
        refreshDeckFiles()
        return view
    }

    private fun bindKeyboardViews(root: View) {
        statusTextView = root.findViewById(R.id.tv_keyboard_status)
        richContentBadge = root.findViewById(R.id.tv_rich_content_badge)
        commitResultTextView = root.findViewById(R.id.tv_commit_result)
        deckTitleTextView = root.findViewById(R.id.tv_deck_title)
        rvGifDeck = root.findViewById(R.id.rv_gif_deck)
        layoutEmptyDeck = root.findViewById(R.id.layout_empty_deck)

        val btnSwitchIme = root.findViewById<ImageButton>(R.id.btn_switch_ime)
        val btnSwitchInput = root.findViewById<Button>(R.id.btn_switch_input)
        val btnClose = root.findViewById<ImageButton>(R.id.btn_close_keyboard)
        val btnOpenApp = root.findViewById<Button>(R.id.btn_open_app)
        val btnInjectGif = root.findViewById<Button>(R.id.btn_inject_gif)
        val btnCopyFallback = root.findViewById<Button>(R.id.btn_copy_fallback)

        // Setup RecyclerView Adapter and LayoutManager (3 columns for compact vertical grid)
        gifAdapter = GifDeckAdapter(
            onItemClick = { file ->
                commitGif(file, description = file.nameWithoutExtension)
            },
            onItemLongClick = { file ->
                Toast.makeText(this@ZenoDeckKeyboardService, "Selected: ${file.name}", Toast.LENGTH_SHORT).show()
            }
        )

        rvGifDeck?.apply {
            layoutManager = GridLayoutManager(this@ZenoDeckKeyboardService, 3)
            adapter = gifAdapter
            setHasFixedSize(true)
        }

        val switchAction = View.OnClickListener {
            switchToNextOrPicker()
        }

        btnSwitchIme?.setOnClickListener(switchAction)
        btnSwitchInput?.setOnClickListener(switchAction)

        btnClose?.setOnClickListener {
            requestHideSelf(0)
        }

        btnOpenApp?.setOnClickListener {
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            }
            startActivity(intent)
        }

        // Empty state action: Create a sample GIF in shared storage
        btnInjectGif?.setOnClickListener {
            val sample = ensureSampleGif()
            refreshDeckFiles()
            commitGif(sample, description = "ZenoDeck Sample")
        }

        // Explicitly test fallback mechanism (clipboard injection)
        btnCopyFallback?.setOnClickListener {
            val targetGif = deckGifs.firstOrNull() ?: ensureSampleGif()
            val contentUri = FileProvider.getUriForFile(
                this@ZenoDeckKeyboardService,
                "$packageName.fileprovider",
                targetGif
            )
            executeFallback(targetGif, contentUri, null, "Manual fallback test")
        }
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        currentEditorInfo = info

        refreshDeckFiles()

        if (info == null) {
            updateHostCapabilitiesDisplay("Unknown Host", supported = false, emptyMime = true)
            return
        }

        val targetPackage = info.packageName ?: "Host App"
        val supportedMimes = EditorInfoCompat.getContentMimeTypes(info)
        isRichContentSupportedByHost = isMimeSupported(supportedMimes, MIME_TYPE_GIF)

        Log.d(
            TAG,
            "onStartInputView | package: $targetPackage | richContentSupported: $isRichContentSupportedByHost | mimes: ${supportedMimes.joinToString()}"
        )

        updateHostCapabilitiesDisplay(targetPackage, isRichContentSupportedByHost, supportedMimes.isEmpty())
        updateCommitResultDisplay("Ready for media injection", isSuccess = null)
    }

    /**
     * Reads all GIFs from the shared storage directory (/data/user/0/.../files/zenodeck_gifs)
     * and refreshes the keyboard RecyclerView grid.
     */
    fun refreshDeckFiles(): List<File> {
        val deckDir = File(filesDir, DECK_DIRECTORY_NAME)
        if (!deckDir.exists()) {
            deckDir.mkdirs()
        }

        val files = deckDir.listFiles { file ->
            file.isFile && file.name.endsWith(".gif", ignoreCase = true) && !file.name.startsWith(".")
        } ?: emptyArray()

        deckGifs.clear()
        deckGifs.addAll(files.sortedByDescending { it.lastModified() })

        val count = deckGifs.size
        deckTitleTextView?.text = "⚡ ZenoDeck GIF Deck ($count)"

        if (count == 0) {
            rvGifDeck?.visibility = View.GONE
            layoutEmptyDeck?.visibility = View.VISIBLE
        } else {
            rvGifDeck?.visibility = View.VISIBLE
            layoutEmptyDeck?.visibility = View.GONE
            gifAdapter?.submitList(deckGifs.toList())
        }

        return deckGifs.toList()
    }

    /**
     * Checks if the host application's EditorInfo advertises support for the requested MIME type.
     */
    fun isMimeSupported(supportedMimes: Array<String>, targetMime: String): Boolean {
        return supportedMimes.any { mime ->
            mime.equals(targetMime, ignoreCase = true) ||
            mime.equals(MIME_TYPE_IMAGE_ANY, ignoreCase = true) ||
            (targetMime.startsWith("image/") && mime.startsWith("image/*", ignoreCase = true))
        }
    }

    /**
     * Core Rich Content API implementation:
     * Injects a local .gif file directly into the active InputConnection via InputConnectionCompat.commitContent().
     */
    fun commitGif(
        gifFile: File,
        linkUri: Uri? = null,
        description: String = "ZenoDeck GIF"
    ): Boolean {
        if (!gifFile.exists() || !gifFile.canRead()) {
            val reason = "GIF file does not exist or cannot be read: ${gifFile.absolutePath}"
            Log.e(TAG, reason)
            commitContentListener?.onCommitFailure(reason, fallbackUsed = false)
            return false
        }

        val inputConnection: InputConnection? = currentInputConnection
        val editorInfo: EditorInfo? = currentEditorInfo ?: currentInputEditorInfo

        if (inputConnection == null || editorInfo == null) {
            val reason = "InputConnection or EditorInfo is null (no active input target)"
            Log.e(TAG, reason)
            commitContentListener?.onCommitFailure(reason, fallbackUsed = false)
            return false
        }

        val targetPackage = editorInfo.packageName ?: "Host App"
        val supportedMimes = EditorInfoCompat.getContentMimeTypes(editorInfo)

        // 1. Verify if the target application supports rich content insertion for GIFs
        if (!isMimeSupported(supportedMimes, MIME_TYPE_GIF)) {
            Log.w(TAG, "Host application ($targetPackage) does NOT support GIF MIME insertion. Engaging fallback.")
            executeFallback(gifFile, null, linkUri, "Host app lacks image/gif support")
            return false
        }

        // 2. Resolve content URI via FileProvider
        val contentUri: Uri = try {
            FileProvider.getUriForFile(
                this,
                "$packageName.fileprovider",
                gifFile
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to resolve FileProvider URI for ${gifFile.absolutePath}", e)
            executeFallback(gifFile, null, linkUri, "FileProvider URI resolution failed")
            return false
        }

        // 3. Build InputContentInfoCompat with ClipDescription and optional linkUri
        val clipDescription = ClipDescription(description, arrayOf(MIME_TYPE_GIF))
        val inputContentInfo = InputContentInfoCompat(contentUri, clipDescription, linkUri)

        // 4. Grant temporary read permission to the recipient messaging app
        var flags = 0
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
            flags = flags or InputConnectionCompat.INPUT_CONTENT_GRANT_READ_URI_PERMISSION
        }

        // 5. Commit the content to the active InputConnection
        return try {
            val commitSucceeded = InputConnectionCompat.commitContent(
                inputConnection,
                editorInfo,
                inputContentInfo,
                flags,
                null
            )

            if (commitSucceeded) {
                commitContentListener?.onCommitSuccess(contentUri, MIME_TYPE_GIF, targetPackage)
                true
            } else {
                Log.w(TAG, "InputConnectionCompat.commitContent returned false (rejected by $targetPackage).")
                executeFallback(gifFile, contentUri, linkUri, "Host app rejected media commit")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception during InputConnectionCompat.commitContent", e)
            executeFallback(gifFile, contentUri, linkUri, "Exception: ${e.message}")
            false
        }
    }

    /**
     * Fallback mechanism when the target application does not support Rich Content Insertion:
     * 1. Copies the GIF content URI to the Android system clipboard.
     * 2. If a web/media URL exists, commits the text link into the host input field.
     * 3. Displays user-facing feedback informing them to paste the media.
     */
    private fun executeFallback(
        gifFile: File,
        resolvedUri: Uri?,
        linkUri: Uri?,
        reason: String
    ) {
        try {
            val contentUri = resolvedUri ?: FileProvider.getUriForFile(
                this,
                "$packageName.fileprovider",
                gifFile
            )

            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
            if (clipboard != null) {
                val clipData = ClipData.newUri(
                    contentResolver,
                    "ZenoDeck GIF",
                    contentUri
                )
                clipboard.setPrimaryClip(clipData)
            }

            if (linkUri != null) {
                currentInputConnection?.commitText(linkUri.toString(), 1)
            }

            Toast.makeText(
                this,
                "App doesn't support direct GIFs. Copied to clipboard — ready to paste!",
                Toast.LENGTH_SHORT
            ).show()

            commitContentListener?.onCommitFailure(reason, fallbackUsed = true)
        } catch (e: Exception) {
            Log.e(TAG, "Error executing fallback clipboard insertion", e)
            commitContentListener?.onCommitFailure("Fallback failed: ${e.message}", fallbackUsed = false)
        }
    }

    /**
     * Creates or returns a verified minimal 1x1 GIF89a file in internal filesDir
     * for deterministic local testing.
     */
    fun ensureSampleGif(): File {
        val sampleDir = File(filesDir, DECK_DIRECTORY_NAME).apply { if (!exists()) mkdirs() }
        val sampleFile = File(sampleDir, "sample_zenodeck.gif")
        if (!sampleFile.exists() || sampleFile.length() == 0L) {
            FileOutputStream(sampleFile).use { it.write(MINIMAL_GIF_BYTES) }
        }
        return sampleFile
    }

    fun setOnCommitContentListener(listener: OnCommitContentListener?) {
        this.commitContentListener = listener
    }

    private fun updateHostCapabilitiesDisplay(hostPackage: String, supported: Boolean, emptyMime: Boolean) {
        statusTextView?.text = when {
            supported -> "Target: $hostPackage (GIF Insertion Active)"
            emptyMime -> "Target: $hostPackage (Standard Text Input)"
            else -> "Target: $hostPackage (Rich Content Restricted)"
        }

        richContentBadge?.apply {
            if (supported) {
                text = "⚡ CommitContent"
                setTextColor(0xFF10B981.toInt()) // Emerald Green
            } else {
                text = "⚠️ Fallback"
                setTextColor(0xFFF59E0B.toInt()) // Amber Yellow
            }
        }
    }

    private fun updateCommitResultDisplay(text: String, isSuccess: Boolean?) {
        commitResultTextView?.apply {
            this.text = text
            when (isSuccess) {
                true -> setTextColor(0xFF10B981.toInt()) // Green
                false -> setTextColor(0xFFF87171.toInt()) // Red/Coral
                null -> setTextColor(0xFF9CA3AF.toInt()) // Gray
            }
        }
    }

    private fun switchToNextOrPicker() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            if (!switchToPreviousInputMethod()) {
                val imm = getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager
                imm?.showInputMethodPicker()
            }
        } else {
            val imm = getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager
            imm?.showInputMethodPicker()
        }
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        if (level >= TRIM_MEMORY_MODERATE) {
            GifThumbnailLoader.clearCache()
        }
    }

    override fun onFinishInputView(finishingInput: Boolean) {
        super.onFinishInputView(finishingInput)
        currentEditorInfo = null
        Log.d(TAG, "onFinishInputView: finishingInput=$finishingInput")
    }

    override fun onDestroy() {
        if (isReceiverRegistered) {
            try {
                unregisterReceiver(deckUpdateReceiver)
            } catch (ignored: Exception) {}
            isReceiverRegistered = false
        }
        GifThumbnailLoader.clearCache()
        keyboardRootView = null
        statusTextView = null
        richContentBadge = null
        commitResultTextView = null
        deckTitleTextView = null
        rvGifDeck = null
        layoutEmptyDeck = null
        gifAdapter = null
        currentEditorInfo = null
        commitContentListener = null
        deckGifs.clear()
        super.onDestroy()
        Log.i(TAG, "ZenoDeckKeyboardService destroyed.")
    }
}
