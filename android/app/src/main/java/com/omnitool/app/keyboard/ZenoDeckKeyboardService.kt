package com.omnitool.app.keyboard

import android.app.AlertDialog
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
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.util.Log
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.ImageButton
import android.widget.ProgressBar
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
import com.omnitool.app.media.ZenoHeadlessMediaEngine
import java.io.File
import java.io.FileOutputStream

/**
 * ZenoDeckKeyboardService
 *
 * Custom Android InputMethodService (IME) architected for Rich Content Insertion
 * (injecting GIFs and custom media) into messaging applications (WhatsApp, Google Messages,
 * Telegram, Discord, Slack, etc.) via Android's CommitContent API (InputConnectionCompat).
 *
 * Upgrades:
 * - 50% Spacebar Horizontal Cursor Trackpad Scrubbing with EFFECT_TICK haptics
 * - Tactile Backspace with Accelerate-on-hold and Swipe-Left Word Deletion
 * - Pre-inflated zero-lag floating key echo indicator (tv_key_echo_preview)
 * - 12dp glassmorphic vault media cards with micro badges (GIF vs STICKER)
 * - Long-press direct vault card actions (Pin/Unpin, Delete, Clipboard Copy)
 * - Live cross-boundary theme engine (Obsidian vs Terracotta)
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

    // Ribbon & Mode View References
    private var viewMimeDot: View? = null
    private var btnModeVault: Button? = null
    private var btnModeKeys: Button? = null
    private var tvKeyEchoPreview: TextView? = null

    // Smart Clipboard References
    private var layoutClipboardPill: View? = null
    private var pbClipboardProcessing: ProgressBar? = null

    // Inline Popup Overlay References (Avoids BadTokenException)
    private var imePopupOverlay: View? = null
    private var tvPopupTitle: TextView? = null
    private var tvPopupDesc: TextView? = null
    private var btnPopupInject: Button? = null
    private var btnPopupPin: Button? = null
    private var btnPopupDelete: Button? = null
    private var btnPopupClose: Button? = null

    // Category Filter References
    private var btnCatAll: Button? = null
    private var btnCatGifs: Button? = null
    private var btnCatStickers: Button? = null
    private var btnCatPinned: Button? = null
    private var selectedCategory: String = "all"

    // Active Theme State
    private var currentTheme: String = ZenoDeckKeyboardBridgePlugin.THEME_OBSIDIAN

    // Target host editor state
    private var currentEditorInfo: EditorInfo? = null
    private var isRichContentSupportedByHost: Boolean = false

    // Registered commit listener
    private var commitContentListener: OnCommitContentListener? = null

    private val clipboardManager by lazy { getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager }

    // Shared storage GIF cache
    private val deckGifs = mutableListOf<File>()

    // Handler for zero-lag floating key echo auto-dismiss
    private val echoHandler = Handler(Looper.getMainLooper())
    private val hideEchoRunnable = Runnable {
        tvKeyEchoPreview?.visibility = View.GONE
    }

    // Broadcast receiver for live deck updates from React/Capacitor
    private val deckUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "Received ACTION_GIF_DECK_UPDATED broadcast. Refreshing media deck.")
            refreshDeckFiles()
        }
    }
    private var isReceiverRegistered = false

    // Broadcast receiver for theme synchronization from React/Capacitor
    private val themeUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val newTheme = intent?.getStringExtra("theme") ?: loadSavedTheme()
            Log.d(TAG, "Received ACTION_THEME_UPDATED broadcast. Applying theme: $newTheme")
            applyKeyboardTheme(newTheme)
        }
    }
    private var isThemeReceiverRegistered = false

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "ZenoDeckKeyboardService initialized.")

        currentTheme = loadSavedTheme()

        // Register broadcast receiver for shared storage synchronization
        val deckFilter = IntentFilter(ZenoDeckKeyboardBridgePlugin.ACTION_DECK_UPDATED)
        try {
            ContextCompat.registerReceiver(
                this,
                deckUpdateReceiver,
                deckFilter,
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
            isReceiverRegistered = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register deckUpdateReceiver", e)
        }

        // Register broadcast receiver for live theme switching
        val themeFilter = IntentFilter(ZenoDeckKeyboardBridgePlugin.ACTION_THEME_UPDATED)
        try {
            ContextCompat.registerReceiver(
                this,
                themeUpdateReceiver,
                themeFilter,
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
            isThemeReceiverRegistered = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register themeUpdateReceiver", e)
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
        applyKeyboardTheme(currentTheme)
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

        viewMimeDot = root.findViewById(R.id.view_mime_dot)
        btnModeVault = root.findViewById(R.id.btn_mode_vault)
        btnModeKeys = root.findViewById(R.id.btn_mode_keys)
        tvKeyEchoPreview = root.findViewById(R.id.tv_key_echo_preview)

        // Bind Inline Popup Overlay
        imePopupOverlay = root.findViewById(R.id.ime_popup_overlay)
        tvPopupTitle = root.findViewById(R.id.tv_popup_title)
        tvPopupDesc = root.findViewById(R.id.tv_popup_desc)
        btnPopupInject = root.findViewById(R.id.btn_popup_inject)
        btnPopupPin = root.findViewById(R.id.btn_popup_pin)
        btnPopupDelete = root.findViewById(R.id.btn_popup_delete)
        btnPopupClose = root.findViewById(R.id.btn_popup_close)

        btnPopupClose?.setOnClickListener {
            vibrateTick()
            hidePopupOverlay()
        }
        imePopupOverlay?.setOnClickListener {
            hidePopupOverlay()
        }

        btnModeVault?.setOnClickListener {
            btnModeVault?.isSelected = true
            btnModeKeys?.isSelected = false
            root.findViewById<View>(R.id.media_container)?.visibility = View.VISIBLE
            showKeyEcho("⚡ VAULT ACTIVE", 600)
        }

        btnModeKeys?.setOnClickListener {
            btnModeKeys?.isSelected = true
            btnModeVault?.isSelected = false
            showKeyEcho("⌨️ FAST KEYS", 600)
            Toast.makeText(this@ZenoDeckKeyboardService, "ZenoTap Fast QWERTY active", Toast.LENGTH_SHORT).show()
        }

        val btnSwitchIme = root.findViewById<ImageButton>(R.id.btn_switch_ime)
        val btnSwitchInput = root.findViewById<Button>(R.id.btn_switch_input)
        val btnClose = root.findViewById<ImageButton>(R.id.btn_close_keyboard)
        val btnOpenApp = root.findViewById<Button>(R.id.btn_open_app)
        val btnInjectGif = root.findViewById<Button>(R.id.btn_inject_gif)
        val btnCopyFallback = root.findViewById<Button>(R.id.btn_copy_fallback)

        // Spacebar action (50% ergonomic width button) with Cursor Trackpad Gesture
        val btnSpacebar = root.findViewById<Button>(R.id.btn_spacebar)
        if (btnSpacebar != null) {
            setupSpacebarTrackpadGesture(btnSpacebar)
        }

        // Backspace action with Accelerate-on-Hold & Swipe-Left Word Deletion
        val btnBackspace = root.findViewById<Button>(R.id.btn_backspace)
        if (btnBackspace != null) {
            setupBackspaceGesture(btnBackspace)
        }

        // Setup Clipboard Listener Pill Actions (Direct Headless Native Processing)
        layoutClipboardPill = root.findViewById(R.id.layout_clipboard_pill)
        pbClipboardProcessing = root.findViewById(R.id.pb_clipboard_processing)
        val btnClipCompress = root.findViewById<Button>(R.id.btn_clip_compress)
        val btnClipToGif = root.findViewById<Button>(R.id.btn_clip_to_gif)
        val btnClipToSticker = root.findViewById<Button>(R.id.btn_clip_to_sticker)

        btnClipCompress?.setOnClickListener { processClipboardMedia("compress") }
        btnClipToGif?.setOnClickListener { processClipboardMedia("to_gif") }
        btnClipToSticker?.setOnClickListener { processClipboardMedia("to_sticker") }

        // Category Filter Strip Wiring
        btnCatAll = root.findViewById(R.id.btn_cat_all)
        btnCatGifs = root.findViewById(R.id.btn_cat_gifs)
        btnCatStickers = root.findViewById(R.id.btn_cat_stickers)
        btnCatPinned = root.findViewById(R.id.btn_cat_pinned)

        btnCatAll?.setOnClickListener { filterDeckByCategory("all") }
        btnCatGifs?.setOnClickListener { filterDeckByCategory("gifs") }
        btnCatStickers?.setOnClickListener { filterDeckByCategory("stickers") }
        btnCatPinned?.setOnClickListener { filterDeckByCategory("pinned") }

        // Setup RecyclerView Adapter and LayoutManager (3 columns for compact vertical grid)
        gifAdapter = GifDeckAdapter(
            onItemClick = { file ->
                commitGif(file, description = file.nameWithoutExtension)
            },
            onItemLongClick = { file ->
                showVaultCardOptionsDialog(file)
            }
        )

        rvGifDeck?.apply {
            val spanCount = try {
                resources.getInteger(R.integer.keyboard_grid_span_count)
            } catch (_: Exception) {
                3
            }
            layoutManager = GridLayoutManager(this@ZenoDeckKeyboardService, spanCount)
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

    /**
     * 50% Spacebar Cursor Trackpad:
     * When horizontal delta exceeds 12dp, moves cursor left or right via DPAD events,
     * fires crisp EFFECT_TICK haptics, and suppresses space insertion on release.
     */
    private fun setupSpacebarTrackpadGesture(spacebar: Button) {
        var downX = 0f
        var lastScrubX = 0f
        var isScrubbing = false
        val scrubThreshold = 12 * resources.displayMetrics.density

        spacebar.setOnTouchListener { v, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downX = event.x
                    lastScrubX = event.x
                    isScrubbing = false
                    v.isPressed = true
                    false
                }
                MotionEvent.ACTION_MOVE -> {
                    val totalDelta = event.x - downX
                    if (!isScrubbing && Math.abs(totalDelta) >= scrubThreshold) {
                        isScrubbing = true
                    }
                    if (isScrubbing) {
                        val deltaSinceLast = event.x - lastScrubX
                        if (Math.abs(deltaSinceLast) >= scrubThreshold) {
                            if (deltaSinceLast > 0) {
                                sendDownUpKeyEvents(KeyEvent.KEYCODE_DPAD_RIGHT)
                                showKeyEcho("CURSOR ▶", 800)
                            } else {
                                sendDownUpKeyEvents(KeyEvent.KEYCODE_DPAD_LEFT)
                                showKeyEcho("◀ CURSOR", 800)
                            }
                            vibrateTick()
                            lastScrubX = event.x
                        }
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    v.isPressed = false
                    if (isScrubbing) {
                        hideKeyEcho()
                    } else {
                        currentInputConnection?.commitText(" ", 1)
                        vibrateTactileClick()
                    }
                    isScrubbing = false
                    true
                }
                MotionEvent.ACTION_CANCEL -> {
                    v.isPressed = false
                    isScrubbing = false
                    hideKeyEcho()
                    true
                }
                else -> false
            }
        }
    }

    /**
     * Tactile Backspace Key:
     * - Swipe left (>24dp) deletes previous word with EFFECT_HEAVY_CLICK haptics.
     * - Long press hold accelerates deletion repeat (starts at 350ms, ramps to 50ms).
     * - Tap deletes single character.
     */
    private fun setupBackspaceGesture(backspace: Button) {
        var downX = 0f
        var isSwipeDeleting = false
        var isLongPressed = false
        val swipeThreshold = 24 * resources.displayMetrics.density

        val repeatHandler = Handler(Looper.getMainLooper())
        var currentInterval = 350L

        val repeatRunnable = object : Runnable {
            override fun run() {
                isLongPressed = true
                sendDownUpKeyEvents(KeyEvent.KEYCODE_DEL)
                vibrateTactileClick()
                showKeyEcho("⌫ DELETING", 500)
                currentInterval = (currentInterval * 0.82).toLong().coerceAtLeast(45L)
                repeatHandler.postDelayed(this, currentInterval)
            }
        }

        backspace.setOnTouchListener { v, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downX = event.x
                    isSwipeDeleting = false
                    isLongPressed = false
                    currentInterval = 350L
                    v.isPressed = true
                    repeatHandler.postDelayed(repeatRunnable, currentInterval)
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val deltaX = event.x - downX
                    if (!isSwipeDeleting && deltaX <= -swipeThreshold) {
                        isSwipeDeleting = true
                        repeatHandler.removeCallbacks(repeatRunnable)
                        deletePreviousWord()
                        vibrateHeavy()
                        showKeyEcho("⌫ WORD DELETED", 1000)
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    v.isPressed = false
                    repeatHandler.removeCallbacks(repeatRunnable)
                    if (!isSwipeDeleting && !isLongPressed) {
                        sendDownUpKeyEvents(KeyEvent.KEYCODE_DEL)
                        vibrateTactileClick()
                    }
                    hideKeyEcho()
                    true
                }
                MotionEvent.ACTION_CANCEL -> {
                    v.isPressed = false
                    repeatHandler.removeCallbacks(repeatRunnable)
                    hideKeyEcho()
                    true
                }
                else -> false
            }
        }
    }

    private fun deletePreviousWord() {
        val ic = currentInputConnection ?: return
        val textBefore = ic.getTextBeforeCursor(60, 0)?.toString() ?: ""
        if (textBefore.isEmpty()) {
            sendDownUpKeyEvents(KeyEvent.KEYCODE_DEL)
            return
        }

        var charsToDelete = 0
        var inWhitespace = true
        for (i in textBefore.length - 1 downTo 0) {
            val ch = textBefore[i]
            if (Character.isWhitespace(ch)) {
                if (!inWhitespace) break
                charsToDelete++
            } else {
                inWhitespace = false
                charsToDelete++
            }
        }

        if (charsToDelete > 0) {
            ic.deleteSurroundingText(charsToDelete, 0)
        } else {
            sendDownUpKeyEvents(KeyEvent.KEYCODE_DEL)
        }
    }

    /**
     * Floating key echo preview indicator (zero layout-inflation lag)
     */
    fun showKeyEcho(text: String, autoDismissMs: Long = 1000L) {
        echoHandler.removeCallbacks(hideEchoRunnable)
        tvKeyEchoPreview?.apply {
            this.text = text
            visibility = View.VISIBLE
        }
        if (autoDismissMs > 0) {
            echoHandler.postDelayed(hideEchoRunnable, autoDismissMs)
        }
    }

    fun hideKeyEcho() {
        echoHandler.removeCallbacks(hideEchoRunnable)
        tvKeyEchoPreview?.visibility = View.GONE
    }

    /**
     * Long-press management options on vault cards:
     * Inline glassmorphic popup overlay preventing BadTokenException
     */
    private fun showVaultCardOptionsDialog(file: File) {
        vibrateHeavy()
        val isPinned = file.name.startsWith("pinned_", ignoreCase = true)
        val cleanName = file.nameWithoutExtension.removePrefix("pinned_")

        if (imePopupOverlay != null) {
            tvPopupTitle?.text = cleanName
            tvPopupDesc?.text = if (isPinned) "Pinned item • Choose action" else "Vault item • Choose action"
            btnPopupPin?.text = if (isPinned) "Unpin" else "Pin 📌"

            btnPopupInject?.setOnClickListener {
                vibrateTactileClick()
                hidePopupOverlay()
                commitGif(file, description = file.nameWithoutExtension)
            }

            btnPopupPin?.setOnClickListener {
                vibrateTick()
                hidePopupOverlay()
                togglePinFile(file)
            }

            btnPopupDelete?.setOnClickListener {
                vibrateTick()
                hidePopupOverlay()
                deleteVaultFile(file)
            }

            imePopupOverlay?.visibility = View.VISIBLE
        } else {
            val contentUri = FileProvider.getUriForFile(
                this@ZenoDeckKeyboardService,
                "$packageName.fileprovider",
                file
            )
            executeFallback(file, contentUri, null, "User long-pressed item")
        }
    }

    private fun hidePopupOverlay() {
        imePopupOverlay?.visibility = View.GONE
    }

    private fun togglePinFile(file: File) {
        val parent = file.parentFile ?: return
        val isPinned = file.name.startsWith("pinned_", ignoreCase = true)
        val newName = if (isPinned) {
            file.name.removePrefix("pinned_")
        } else {
            "pinned_${file.name}"
        }
        val target = File(parent, newName)
        if (file.renameTo(target)) {
            // Also rename companion thumbnail if exists
            val thumb = File(parent, "${file.name}.thumb.webp")
            if (thumb.exists()) {
                val targetThumb = File(parent, "${newName}.thumb.webp")
                thumb.renameTo(targetThumb)
            }
            refreshDeckFiles()
            showKeyEcho(if (isPinned) "UNPINNED" else "PINNED 📌", 800)
        }
    }

    private fun deleteVaultFile(file: File) {
        val parent = file.parentFile
        val thumb = if (parent != null) File(parent, "${file.name}.thumb.webp") else null
        thumb?.delete()
        if (file.delete()) {
            refreshDeckFiles()
            showKeyEcho("DELETED 🗑️", 800)
            Toast.makeText(this, "Deleted ${file.nameWithoutExtension}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadSavedTheme(): String {
        return try {
            val prefs = getSharedPreferences(ZenoDeckKeyboardBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.getString(ZenoDeckKeyboardBridgePlugin.PREF_KEY_THEME, ZenoDeckKeyboardBridgePlugin.THEME_OBSIDIAN)
                ?: ZenoDeckKeyboardBridgePlugin.THEME_OBSIDIAN
        } catch (e: Exception) {
            ZenoDeckKeyboardBridgePlugin.THEME_OBSIDIAN
        }
    }

    /**
     * Dynamically skins the native keyboard view hierarchy based on the active theme:
     * - "obsidian": OKLCH dark cyber-violet/cyan (#0E0F14 base, #22D3EE accent)
     * - "terracotta": 60/30/10 rule (#FAF5EE 60% warm clay paper, #342A24 30% structural, #C2652A 10% baked clay accent)
     */
    fun applyKeyboardTheme(theme: String) {
        currentTheme = theme
        val isTerracotta = theme.equals(ZenoDeckKeyboardBridgePlugin.THEME_TERRACOTTA, ignoreCase = true)

        keyboardRootView?.let { root ->
            if (isTerracotta) {
                root.setBackgroundColor(0xFFFAF5EE.toInt())
                root.findViewById<View>(R.id.media_container)?.setBackgroundColor(0xFFF3ECE2.toInt())
                deckTitleTextView?.setTextColor(0xFF342A24.toInt())
                statusTextView?.setTextColor(0xFF79695F.toInt())
                root.findViewById<TextView>(R.id.tv_deck_subtitle)?.setTextColor(0xFF79695F.toInt())
                root.findViewById<Button>(R.id.btn_open_app)?.setTextColor(0xFF342A24.toInt())
                root.findViewById<Button>(R.id.btn_spacebar)?.setTextColor(0xFF342A24.toInt())
                root.findViewById<Button>(R.id.btn_switch_input)?.setTextColor(0xFF79695F.toInt())
                root.findViewById<Button>(R.id.btn_backspace)?.setTextColor(0xFFC2652A.toInt())
            } else {
                root.setBackgroundColor(0xFF0E0F14.toInt())
                root.findViewById<View>(R.id.media_container)?.setBackgroundColor(0xFF12131A.toInt())
                deckTitleTextView?.setTextColor(0xFFF1F5F9.toInt())
                statusTextView?.setTextColor(0xFF64748B.toInt())
                root.findViewById<TextView>(R.id.tv_deck_subtitle)?.setTextColor(0xFF64748B.toInt())
                root.findViewById<Button>(R.id.btn_open_app)?.setTextColor(0xFFE2E8F0.toInt())
                root.findViewById<Button>(R.id.btn_spacebar)?.setTextColor(0xFFF1F5F9.toInt())
                root.findViewById<Button>(R.id.btn_switch_input)?.setTextColor(0xFF94A3B8.toInt())
                root.findViewById<Button>(R.id.btn_backspace)?.setTextColor(0xFFF87171.toInt())
            }
            filterDeckByCategory(selectedCategory)
        }
    }

    private fun filterDeckByCategory(category: String) {
        selectedCategory = category
        val isTerracotta = currentTheme.equals(ZenoDeckKeyboardBridgePlugin.THEME_TERRACOTTA, ignoreCase = true)
        val activeColor = if (isTerracotta) 0xFFC2652A.toInt() else 0xFF22D3EE.toInt()
        val inactiveColor = if (isTerracotta) 0xFF79695F.toInt() else 0xFF94A3B8.toInt()

        btnCatAll?.setTextColor(if (category == "all") activeColor else inactiveColor)
        btnCatGifs?.setTextColor(if (category == "gifs") activeColor else inactiveColor)
        btnCatStickers?.setTextColor(if (category == "stickers") activeColor else inactiveColor)
        btnCatPinned?.setTextColor(if (category == "pinned") activeColor else inactiveColor)

        val filtered = when (category) {
            "stickers" -> deckGifs.filter { it.name.contains("sticker", ignoreCase = true) }
            "gifs" -> deckGifs.filter { !it.name.contains("sticker", ignoreCase = true) }
            "pinned" -> deckGifs.filter { it.name.startsWith("pinned_", ignoreCase = true) }
                .ifEmpty { deckGifs.take(4) }
            else -> deckGifs
        }

        gifAdapter?.submitList(filtered.toList())
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        currentEditorInfo = info

        currentTheme = loadSavedTheme()
        applyKeyboardTheme(currentTheme)
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

        // Inspect clipboard for copied images or URLs to surface 1-tap clipboard pill
        val layoutClipboardPill = keyboardRootView?.findViewById<View>(R.id.layout_clipboard_pill)
        val tvClipboardPreview = keyboardRootView?.findViewById<TextView>(R.id.tv_clipboard_preview)

        try {
            val clipData = clipboardManager.primaryClip
            if (clipData != null && clipData.itemCount > 0) {
                val item = clipData.getItemAt(0)
                val uri = item.uri
                val text = item.text?.toString()

                if (uri != null || (text != null && (text.startsWith("http://") || text.startsWith("https://")))) {
                    val label = if (uri != null) "📋 Copied image in clipboard" else "🔗 Copied media URL"
                    tvClipboardPreview?.text = label
                    layoutClipboardPill?.visibility = View.VISIBLE
                } else {
                    layoutClipboardPill?.visibility = View.GONE
                }
            } else {
                layoutClipboardPill?.visibility = View.GONE
            }
        } catch (e: Exception) {
            layoutClipboardPill?.visibility = View.GONE
        }
    }

    /**
     * Reads all GIFs from the shared storage directory (/data/user/0/.../files/zenodeck_gifs)
     * and refreshes the keyboard RecyclerView grid.
     * Excludes .thumb.webp companion files from grid entries.
     */
    fun refreshDeckFiles(): List<File> {
        val deckDir = File(filesDir, DECK_DIRECTORY_NAME)
        if (!deckDir.exists()) {
            deckDir.mkdirs()
        }

        val files = deckDir.listFiles { file ->
            file.isFile &&
            file.name.endsWith(".gif", ignoreCase = true) &&
            !file.name.endsWith(".thumb.webp", ignoreCase = true) &&
            !file.name.startsWith(".")
        } ?: emptyArray()

        deckGifs.clear()
        // Sort with pinned items first, then by last modified descending
        deckGifs.addAll(
            files.sortedWith(
                compareByDescending<File> { it.name.startsWith("pinned_", ignoreCase = true) }
                    .thenByDescending { it.lastModified() }
            )
        )

        val count = deckGifs.size
        deckTitleTextView?.text = "ZenoTap ($count)"

        if (count == 0) {
            rvGifDeck?.visibility = View.GONE
            layoutEmptyDeck?.visibility = View.VISIBLE
        } else {
            rvGifDeck?.visibility = View.VISIBLE
            layoutEmptyDeck?.visibility = View.GONE
            filterDeckByCategory(selectedCategory)
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
            supported -> "Target: $hostPackage (GIF • WebP Ready)"
            emptyMime -> "Target: $hostPackage (Standard Text Input)"
            else -> "Target: $hostPackage (Rich Content Restricted)"
        }

        viewMimeDot?.setBackgroundColor(
            when {
                supported -> 0xFF10B981.toInt() // Emerald Green dot
                emptyMime -> 0xFF64748B.toInt() // Slate Gray dot
                else -> 0xFFF59E0B.toInt()      // Amber dot
            }
        )

        richContentBadge?.apply {
            if (supported) {
                text = "GIF • WebP Ready"
                setTextColor(0xFF10B981.toInt()) // Emerald Green
            } else {
                text = "Text Only"
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

    private fun processClipboardMedia(action: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        val clipData = clipboard?.primaryClip

        var clipUri: Uri? = null
        var clipText: String? = null

        if (clipData != null && clipData.itemCount > 0) {
            val item = clipData.getItemAt(0)
            clipUri = item.uri
            clipText = item.text?.toString()
        }

        pbClipboardProcessing?.visibility = View.VISIBLE
        updateCommitResultDisplay("⚡ Processing $action headlessly…", isSuccess = null)

        ZenoHeadlessMediaEngine.getInstance(applicationContext).processClipboardActionAsync(
            action = action,
            clipUri = clipUri,
            clipText = clipText
        ) { result ->
            pbClipboardProcessing?.visibility = View.GONE
            if (result.isSuccess) {
                val outputFile = result.getOrNull()
                if (outputFile != null && outputFile.exists()) {
                    refreshDeckFiles()
                    vibrateTactileClick()
                    currentInputConnection?.finishComposingText()
                    commitGif(outputFile, description = "ZenoTap $action")
                    updateCommitResultDisplay("✓ Injected $action into active chat", isSuccess = true)
                    layoutClipboardPill?.visibility = View.GONE
                } else {
                    updateCommitResultDisplay("✗ Failed: output file not found", isSuccess = false)
                }
            } else {
                val err = result.exceptionOrNull()?.message ?: "Processing failed"
                Log.e(TAG, "Headless media processing failed: $err")
                updateCommitResultDisplay("✗ $err", isSuccess = false)
            }
        }
    }

    private fun vibrateTick() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
                vibrator?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK))
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
                vibrator?.vibrate(VibrationEffect.createOneShot(10, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
                vibrator?.vibrate(10)
            }
        } catch (ignored: Exception) {}
    }

    private fun vibrateHeavy() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
                vibrator?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK))
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
                vibrator?.vibrate(VibrationEffect.createOneShot(35, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
                vibrator?.vibrate(35)
            }
        } catch (ignored: Exception) {}
    }

    private fun vibrateTactileClick() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
                vibrator?.vibrate(VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
                vibrator?.vibrate(20)
            }
        } catch (ignored: Exception) {}
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
        hideKeyEcho()
        hidePopupOverlay()
        Log.d(TAG, "onFinishInputView: finishingInput=$finishingInput")
    }

    override fun onDestroy() {
        if (isReceiverRegistered) {
            try {
                unregisterReceiver(deckUpdateReceiver)
            } catch (ignored: Exception) {}
            isReceiverRegistered = false
        }
        if (isThemeReceiverRegistered) {
            try {
                unregisterReceiver(themeUpdateReceiver)
            } catch (ignored: Exception) {}
            isThemeReceiverRegistered = false
        }
        echoHandler.removeCallbacks(hideEchoRunnable)
        GifThumbnailLoader.clearCache()
        keyboardRootView = null
        statusTextView = null
        richContentBadge = null
        commitResultTextView = null
        deckTitleTextView = null
        rvGifDeck = null
        layoutEmptyDeck = null
        gifAdapter = null
        viewMimeDot = null
        btnModeVault = null
        btnModeKeys = null
        tvKeyEchoPreview = null
        pbClipboardProcessing = null
        btnCatAll = null
        btnCatGifs = null
        btnCatStickers = null
        btnCatPinned = null
        currentEditorInfo = null
        commitContentListener = null
        deckGifs.clear()
        super.onDestroy()
        Log.i(TAG, "ZenoDeckKeyboardService destroyed.")
    }
}
