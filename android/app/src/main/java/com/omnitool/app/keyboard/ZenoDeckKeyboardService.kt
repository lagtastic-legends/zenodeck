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
import android.os.Vibrator
import android.os.VibratorManager
import android.content.res.Configuration
import android.graphics.Rect
import android.speech.RecognizerIntent
import android.util.Log
import android.view.HapticFeedbackConstants
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.inputmethod.EditorInfoCompat
import androidx.core.view.inputmethod.InputConnectionCompat
import androidx.core.view.inputmethod.InputContentInfoCompat
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.omnitool.app.MainActivity
import com.omnitool.app.R
import com.omnitool.app.media.ZenoHeadlessMediaEngine
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.Locale

/**
 * ZenoDeckKeyboardService
 *
 * Gboard-Grade Native Android InputMethodService (IME) featuring:
 * 1. 3-Candidate Offline Predictive Suggestion Engine & Contraction/Typo Auto-Correct
 * 2. Dedicated Toggleable Number Row (1-0) & Multi-Layout Key Remapping (QWERTY, AZERTY, QWERTZ, Dvorak)
 * 3. Double-Space Period Shortcut (350ms) & Context-Aware Auto-Capitalization
 * 4. 8-Category Unicode Emoji Deck with 24-Slot Recent Memory
 * 5. 30-Slot Persistent Clipboard History Vault with Pinning, Deletion, and ZenoDeck Media Sniffer
 * 6. Live 60FPS Animated GIF Drawables & Rich Content Insertion (InputConnectionCompat)
 * 7. Live 4-Theme Dynamic Skinning: Glacier, Obsidian, Terracotta, and Forest & Champagne
 * 8. Voice Dictation Bridge (Android Speech Recognizer)
 */
class ZenoDeckKeyboardService : InputMethodService() {

    companion object {
        const val TAG = "ZenoDeckIME"
        const val MIME_TYPE_GIF = "image/gif"
        const val MIME_TYPE_IMAGE_ANY = "image/*"
        const val DECK_DIRECTORY_NAME = "zenodeck_gifs"

        // Common Contraction & Typo Auto-Replacement Table
        private val AUTO_REPLACE_DICT = mapOf(
            "dont" to "don't",
            "cant" to "can't",
            "wont" to "won't",
            "im" to "I'm",
            "ive" to "I've",
            "id" to "I'd",
            "ill" to "I'll",
            "teh" to "the",
            "recieve" to "receive",
            "u" to "you",
            "r" to "are",
            "didnt" to "didn't",
            "isnt" to "isn't",
            "arent" to "aren't",
            "wasnt" to "wasn't",
            "werent" to "weren't",
            "couldnt" to "couldn't",
            "shouldnt" to "shouldn't",
            "wouldnt" to "wouldn't",
            "hasnt" to "hasn't",
            "havent" to "haven't",
            "hadnt" to "hadn't",
            "youre" to "you're",
            "theyre" to "they're",
            "weve" to "we've",
            "thats" to "that's",
            "whats" to "what's",
            "theres" to "there's",
            "hows" to "how's",
            "lets" to "let's"
        )

        // Core High-Frequency English Vocabulary for Suggestions
        private val CORE_VOCABULARY = listOf(
            "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with",
            "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her",
            "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up",
            "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time",
            "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could",
            "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think",
            "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
            "new", "want", "because", "any", "these", "give", "day", "most", "us", "great", "cool", "awesome",
            "thanks", "please", "yes", "hello", "hi", "hey", "sure", "ok", "okay", "tomorrow", "today", "tonight"
        )

        // Multilingual Dictionaries (French for AZERTY, German for QWERTZ, Spanish)
        private val FRENCH_VOCABULARY = listOf(
            "bonjour", "merci", "salut", "avec", "pour", "dans", "faire", "comme", "mais", "nous",
            "vous", "bien", "dire", "elle", "leur", "aussi", "autre", "temps", "oui", "non", "tout", "monde"
        )
        private val GERMAN_VOCABULARY = listOf(
            "hallo", "danke", "bitte", "nicht", "eine", "haben", "werden", "sein", "kann", "nach",
            "auch", "wenn", "aber", "fuer", "wieder", "diese", "immer", "alles", "jetzt", "etwas"
        )
        private val SPANISH_VOCABULARY = listOf(
            "hola", "gracias", "bueno", "amigo", "para", "con", "por", "como", "pero", "este",
            "todo", "esta", "hacer", "tiempo", "ahora", "bien", "donde", "siempre", "mucho"
        )

        // Layout Definitions
        val LAYOUT_QWERTY = listOf(
            listOf("Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"),
            listOf("A", "S", "D", "F", "G", "H", "J", "K", "L"),
            listOf("Z", "X", "C", "V", "B", "N", "M")
        )
        val LAYOUT_AZERTY = listOf(
            listOf("A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"),
            listOf("Q", "S", "D", "F", "G", "H", "J", "K", "L"),
            listOf("W", "X", "C", "V", "B", "N", "M")
        )
        val LAYOUT_QWERTZ = listOf(
            listOf("Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P"),
            listOf("A", "S", "D", "F", "G", "H", "J", "K", "L"),
            listOf("Y", "X", "C", "V", "B", "N", "M")
        )
        val LAYOUT_DVORAK = listOf(
            listOf("P", "Y", "F", "G", "C", "R", "L", "Q", "J", "K"),
            listOf("A", "O", "E", "U", "I", "D", "H", "T", "N"),
            listOf("S", "X", "B", "M", "W", "V", "Z")
        )

        val LAYOUT_SYMBOLS = listOf(
            listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0"),
            listOf("@", "#", "$", "%", "&", "-", "+", "(", ")"),
            listOf("*", "\"", "'", ":", ";", "!", "?")
        )
        val LAYOUT_SYMBOLS_SHIFT = listOf(
            listOf("~", "`", "|", "•", "√", "π", "÷", "×", "¶", "∆"),
            listOf("£", "¢", "€", "¥", "^", "°", "=", "{", "}"),
            listOf("\\", "%", "©", "®", "™", "[", "]")
        )

        const val DEFAULT_KEYBOARD_HEIGHT_SCALE = 1.18f
        const val MIN_KEYBOARD_HEIGHT_SCALE = 0.85f
        const val MAX_KEYBOARD_HEIGHT_SCALE = 1.30f
        const val TARGET_CHAR_ROW_HEIGHT_DP = 54f
        const val TARGET_TOOLBAR_HEIGHT_DP = 44f
        const val TARGET_ROW_SPACING_DP = 6f
        const val TARGET_BOTTOM_STRIP_HEIGHT_DP = 54f
        const val TARGET_NUMBER_ROW_HEIGHT_DP = 36f

        // 8 Emoji Categories
        val EMOJI_SMILEYS = listOf(
            "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗",
            "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕",
            "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😮‍💨", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨"
        )
        val EMOJI_GESTURES = listOf(
            "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🤜", "🤛", "✊", "👊", "✌️", "🤞", "🫰", "🤟", "🤘", "👌", "🤌", "🤏", "👈",
            "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙", "💪", "🦾", "🖕", "✍️", "🙏", "💅"
        )
        val EMOJI_HEARTS = listOf(
            "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
            "💟", "💌", "💋"
        )
        val EMOJI_ANIMALS = listOf(
            "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐒", "🐔", "🐧", "🐦", "🐤",
            "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🐢", "🐍", "🐙", "🐬", "🐳", "🦈"
        )
        val EMOJI_FOOD = listOf(
            "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🥦", "🌽", "🌶️",
            "🥐", "🍞", "🧀", "🍳", "🥞", "🧇", "🥓", "🥩", "🍗", "🍔", "🍟", "🍕", "🌮", "🌯", "🥗", "🍝", "🍜", "🍣", "🍦", "🎂"
        )
        val EMOJI_TECH = listOf(
            "💻", "🖥️", "🖨️", "🖱️", "🕹️", "💾", "💿", "📀", "📷", "📸", "📹", "🎥", "📞", "☎️", "📺", "📻", "🎙️", "⏰", "⏱️", "📡",
            "🔋", "🔌", "💡", "🔦", "📱", "📲", "⚡", "⚙️", "🔧", "🔨", "🛠️", "🪛", "⛏️", "🔩"
        )
        val EMOJI_SYMBOLS = listOf(
            "✨", "⭐", "🌟", "💫", "💥", "🔥", "⚡", "🌈", "☀️", "🌤️", "⛅", "🌧️", "❄️", "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈",
            "🥉", "🎯", "🎲", "🎮", "🎵", "🎶", "🎸", "🎹", "💯", "💢", "💬", "💭", "💤"
        )
    }

    interface OnCommitContentListener {
        fun onCommitSuccess(contentUri: Uri, mimeType: String, targetPackage: String)
        fun onCommitFailure(reason: String, fallbackUsed: Boolean)
    }

    // Root and Ribbon Views
    private var keyboardRootView: View? = null
    private var statusTextView: TextView? = null
    private var richContentBadge: TextView? = null
    private var commitResultTextView: TextView? = null
    private var deckTitleTextView: TextView? = null
    private var viewMimeDot: View? = null
    private var tvKeyEchoPreview: TextView? = null
    private var tvFloatingKeyPopup: TextView? = null
    private var btnVoiceInput: Button? = null

    // Mode Buttons
    private var btnModeKeys: Button? = null
    private var btnModeVault: Button? = null
    private var btnModeEmoji: Button? = null
    private var btnModeClipboard: Button? = null

    // Containers
    private var layoutKeysView: View? = null
    private var layoutVaultView: View? = null
    private var layoutEmojiView: View? = null
    private var layoutClipboardView: View? = null
    private var layoutPredictiveBar: View? = null
    private var layoutNumberRow: View? = null

    // Predictive Candidate Chips
    private var tvSuggestionLeft: Button? = null
    private var tvSuggestionCenter: Button? = null
    private var tvSuggestionRight: Button? = null

    // Key Buttons
    private val keyButtons = mutableListOf<Button>()
    private var btnShift: Button? = null
    private var btnEnter: Button? = null
    private var btnComma: Button? = null
    private var btnPeriod: Button? = null
    private var btnSpacebar: Button? = null
    private var btnBackspace: Button? = null
    private var btnOpenApp: Button? = null

    // Adapters & Media Decks
    private var rvGifDeck: RecyclerView? = null
    private var layoutEmptyDeck: View? = null
    private var gifAdapter: GifDeckAdapter? = null
    private val deckGifs = mutableListOf<File>()

    private var rvEmojiDeck: RecyclerView? = null
    private var emojiAdapter: EmojiDeckAdapter? = null
    private val recentEmojis = mutableListOf<String>()

    private var rvClipboardVault: RecyclerView? = null
    private var clipboardAdapter: ClipboardVaultAdapter? = null
    private val clipboardVaultItems = mutableListOf<ClipboardVaultItem>()
    private var tvClipboardEmpty: TextView? = null
    private var btnClipSniffZenodeck: Button? = null
    private var layoutClipboardPill: View? = null

    // State Variables
    private var currentTheme: String = ZenoDeckKeyboardBridgePlugin.THEME_GLACIER
    private var currentLayout: String = "QWERTY"
    var keyboardHeightScale: Float = DEFAULT_KEYBOARD_HEIGHT_SCALE
    var isSymbolsMode: Boolean = false
    private var isShowNumberRow: Boolean = true
    private var isAutoCorrectEnabled: Boolean = true
    private var isGestureTypingEnabled: Boolean = true
    private var isDoubleSpacePeriodEnabled: Boolean = true
    private var isShifted: Boolean = false
    private var isCapsLock: Boolean = false
    private var lastSpaceTimestamp: Long = 0L

    // Fast Zero-Allocation Multi-Touch Rollover Tracking
    class PointerTouchState {
        var active: Boolean = false
        var pointerId: Int = -1
        var keyChar: String = ""
        var button: Button? = null
        var downX: Float = 0f
        var downY: Float = 0f
        var downTime: Long = 0L
        var isGlide: Boolean = false
        var characterCommitted: Boolean = false
    }

    private val pointerStates = Array(10) { PointerTouchState() }
    private val tempLocArray = IntArray(2)
    private val tempRootLocArray = IntArray(2)

    // Accelerated Backspace & Spacebar Timers
    private val backspaceHandler = Handler(Looper.getMainLooper())
    private var backspacePressStartTime = 0L
    private var isBackspaceLongPressed = false
    private var isBackspaceSwipeDeleting = false

    // In-memory composing word buffer & Gesture Glide trajectory
    private val composingWord = StringBuilder()
    private val userWordFreq = mutableMapOf<String, Int>()
    private val glideTrajectory = mutableListOf<String>()

    // Inline Popup Overlay
    private var imePopupOverlay: View? = null
    private var tvPopupTitle: TextView? = null
    private var tvPopupDesc: TextView? = null
    private var btnPopupInject: Button? = null
    private var btnPopupPin: Button? = null
    private var btnPopupDelete: Button? = null
    private var btnPopupClose: Button? = null

    // Category Filter in Vault
    private var btnCatAll: Button? = null
    private var btnCatGifs: Button? = null
    private var btnCatStickers: Button? = null
    private var btnCatPinned: Button? = null
    private var selectedCategory: String = "all"

    // Target host editor state
    private var currentEditorInfo: EditorInfo? = null
    private var isRichContentSupportedByHost: Boolean = false
    private var commitContentListener: OnCommitContentListener? = null

    private val clipboardManager by lazy { getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager }
    private val echoHandler = Handler(Looper.getMainLooper())
    private val hideEchoRunnable = Runnable { tvKeyEchoPreview?.visibility = View.GONE }

    // Clipboard listener to capture items into the 30-slot vault
    private val clipChangedListener = ClipboardManager.OnPrimaryClipChangedListener {
        onClipboardChanged()
    }

    // Broadcast receiver for live deck updates
    private val deckUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            refreshDeckFiles()
        }
    }
    private var isReceiverRegistered = false

    // Broadcast receiver for theme updates
    private val themeUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val newTheme = intent?.getStringExtra("theme") ?: loadSavedTheme()
            applyKeyboardTheme(newTheme)
        }
    }
    private var isThemeReceiverRegistered = false

    // Broadcast receiver for configuration settings updates
    private val settingsUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            loadSavedSettings()
            applyKeyboardSettings()
        }
    }
    private var isSettingsReceiverRegistered = false

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "ZenoDeckKeyboardService initialized.")

        loadSavedTheme()
        loadSavedSettings()
        loadUserDictionary()
        loadRecentEmojis()
        loadClipboardVault()

        // Register deck receiver
        val deckFilter = IntentFilter(ZenoDeckKeyboardBridgePlugin.ACTION_DECK_UPDATED)
        try {
            ContextCompat.registerReceiver(this, deckUpdateReceiver, deckFilter, ContextCompat.RECEIVER_NOT_EXPORTED)
            isReceiverRegistered = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register deckUpdateReceiver", e)
        }

        // Register theme receiver
        val themeFilter = IntentFilter(ZenoDeckKeyboardBridgePlugin.ACTION_THEME_UPDATED)
        try {
            ContextCompat.registerReceiver(this, themeUpdateReceiver, themeFilter, ContextCompat.RECEIVER_NOT_EXPORTED)
            isThemeReceiverRegistered = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register themeUpdateReceiver", e)
        }

        // Register settings receiver
        val settingsFilter = IntentFilter(ZenoDeckKeyboardBridgePlugin.ACTION_SETTINGS_UPDATED)
        try {
            ContextCompat.registerReceiver(this, settingsUpdateReceiver, settingsFilter, ContextCompat.RECEIVER_NOT_EXPORTED)
            isSettingsReceiverRegistered = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register settingsUpdateReceiver", e)
        }

        try {
            clipboardManager.addPrimaryClipChangedListener(clipChangedListener)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to register clipboard listener", e)
        }

        commitContentListener = object : OnCommitContentListener {
            override fun onCommitSuccess(contentUri: Uri, mimeType: String, targetPackage: String) {
                updateCommitResultDisplay("✓ Injected into $targetPackage", isSuccess = true)
            }
            override fun onCommitFailure(reason: String, fallbackUsed: Boolean) {
                val msg = if (fallbackUsed) "⚠ Copied to clipboard" else "✗ Failed: $reason"
                updateCommitResultDisplay(msg, isSuccess = false)
            }
        }
    }

    override fun onCreateInputView(): View {
        val view = layoutInflater.inflate(R.layout.keyboard_view, null)
        keyboardRootView = view
        bindKeyboardViews(view)
        setupMultiLayoutKeys(view)
        setupEmojiDeck(view)
        setupClipboardVault(view)
        applyKeyboardDimensions(view)
        applyKeyboardTheme(currentTheme)
        applyKeyboardSettings()
        refreshDeckFiles()
        switchUIMode("keys")
        return view
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        applyKeyboardDimensions(keyboardRootView)
    }

    private fun bindKeyboardViews(root: View) {
        statusTextView = root.findViewById(R.id.tv_keyboard_status)
        richContentBadge = root.findViewById(R.id.tv_rich_content_badge)
        commitResultTextView = root.findViewById(R.id.tv_commit_result)
        deckTitleTextView = root.findViewById(R.id.tv_deck_title)
        viewMimeDot = root.findViewById(R.id.view_mime_dot)
        tvKeyEchoPreview = root.findViewById(R.id.tv_key_echo_preview)
        tvFloatingKeyPopup = root.findViewById(R.id.tv_floating_key_popup)
        btnVoiceInput = root.findViewById(R.id.btn_voice_input)

        // WindowInsets setup on outer container for gesture nav bars
        val outerContainer = root.findViewById<FrameLayout>(R.id.keyboard_outer_container) ?: root
        ViewCompat.setOnApplyWindowInsetsListener(outerContainer) { v, insets ->
            val navBars = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val cutouts = insets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val bottomInset = maxOf(navBars.bottom, cutouts.bottom)
            v.setPadding(0, 0, 0, bottomInset)
            insets
        }

        // Mode Switchers
        btnModeKeys = root.findViewById(R.id.btn_mode_keys)
        btnModeVault = root.findViewById(R.id.btn_mode_vault)
        btnModeEmoji = root.findViewById(R.id.btn_mode_emoji)
        btnModeClipboard = root.findViewById(R.id.btn_mode_clipboard)

        // Containers
        layoutKeysView = root.findViewById(R.id.layout_keys_view)
        layoutVaultView = root.findViewById(R.id.layout_vault_view)
        layoutEmojiView = root.findViewById(R.id.layout_emoji_view)
        layoutClipboardView = root.findViewById(R.id.layout_clipboard_view)
        layoutPredictiveBar = root.findViewById(R.id.layout_predictive_bar)
        layoutNumberRow = root.findViewById(R.id.layout_number_row)

        // Predictive Suggestions
        tvSuggestionLeft = root.findViewById(R.id.tv_suggestion_left)
        tvSuggestionCenter = root.findViewById(R.id.tv_suggestion_center)
        tvSuggestionRight = root.findViewById(R.id.tv_suggestion_right)

        tvSuggestionLeft?.setOnClickListener { commitCandidate(tvSuggestionLeft?.text?.toString()) }
        tvSuggestionCenter?.setOnClickListener { commitCandidate(tvSuggestionCenter?.text?.toString()) }
        tvSuggestionRight?.setOnClickListener { commitCandidate(tvSuggestionRight?.text?.toString()) }

        // Mode Switching Actions
        btnModeKeys?.setOnClickListener { switchUIMode("keys") }
        btnModeVault?.setOnClickListener { switchUIMode("vault") }
        btnModeEmoji?.setOnClickListener { switchUIMode("emoji") }
        btnModeClipboard?.setOnClickListener { switchUIMode("clipboard") }

        // Number row buttons (1-0)
        val numIds = listOf(
            R.id.btn_num_1 to "1", R.id.btn_num_2 to "2", R.id.btn_num_3 to "3",
            R.id.btn_num_4 to "4", R.id.btn_num_5 to "5", R.id.btn_num_6 to "6",
            R.id.btn_num_7 to "7", R.id.btn_num_8 to "8", R.id.btn_num_9 to "9",
            R.id.btn_num_0 to "0"
        )
        for ((id, char) in numIds) {
            root.findViewById<Button>(id)?.let { btn ->
                btn.setOnClickListener {
                    currentInputConnection?.commitText(char, 1)
                    performKeyHaptic(btn)
                    showKeyEcho(char, 400)
                }
            }
        }

        // Voice Input Action
        btnVoiceInput?.setOnClickListener {
            launchVoiceDictation()
        }

        // System IME & Close Buttons
        root.findViewById<ImageButton>(R.id.btn_switch_ime)?.setOnClickListener { switchToNextOrPicker() }
        root.findViewById<ImageButton>(R.id.btn_close_keyboard)?.setOnClickListener { requestHideSelf(0) }

        // Bottom Strip Keys
        btnOpenApp = root.findViewById(R.id.btn_open_app)
        btnComma = root.findViewById(R.id.btn_comma)
        btnSpacebar = root.findViewById(R.id.btn_spacebar)
        btnPeriod = root.findViewById(R.id.btn_period)
        btnBackspace = root.findViewById(R.id.btn_backspace)

        btnComma?.setOnClickListener {
            finalizeComposingWord()
            currentInputConnection?.commitText(",", 1)
            btnComma?.let { performKeyHaptic(it) }
        }
        btnPeriod?.setOnClickListener {
            finalizeComposingWord()
            currentInputConnection?.commitText(".", 1)
            btnPeriod?.let { performKeyHaptic(it) }
            checkAutoCapitalization()
        }
        btnOpenApp?.setOnClickListener {
            // Toggles between letters and symbols deck
            isSymbolsMode = !isSymbolsMode
            btnOpenApp?.text = if (isSymbolsMode) "ABC" else "?123"
            applyKeyLayout(if (isSymbolsMode) "SYMBOLS" else currentLayout)
            btnOpenApp?.let { performKeyHaptic(it) }
        }

        btnSpacebar?.let { setupSpacebarTrackpadGesture(it) }
        btnBackspace?.let { setupBackspaceGesture(it) }

        // Vault Media Deck Binding
        rvGifDeck = root.findViewById(R.id.rv_gif_deck)
        layoutEmptyDeck = root.findViewById(R.id.layout_empty_deck)
        gifAdapter = GifDeckAdapter(
            onItemClick = { file -> commitGif(file, description = file.nameWithoutExtension) },
            onItemLongClick = { file -> showVaultCardOptionsDialog(file) }
        )
        val spanCount = resources.getInteger(R.integer.keyboard_grid_span_count)
        rvGifDeck?.apply {
            layoutManager = GridLayoutManager(this@ZenoDeckKeyboardService, spanCount)
            adapter = gifAdapter
            setHasFixedSize(true)
        }

        // Setup Clipboard Listener Pill Actions (Direct Headless Native Processing)
        layoutClipboardPill = root.findViewById(R.id.layout_clipboard_pill)
        val btnClipCompress = root.findViewById<Button>(R.id.btn_clip_compress)
        val btnClipToGif = root.findViewById<Button>(R.id.btn_clip_to_gif)
        val btnClipToSticker = root.findViewById<Button>(R.id.btn_clip_to_sticker)

        btnClipCompress?.setOnClickListener { processClipboardMedia("compress") }
        btnClipToGif?.setOnClickListener { processClipboardMedia("to_gif") }
        btnClipToSticker?.setOnClickListener { processClipboardMedia("to_sticker") }

        // Category Filter Strip
        btnCatAll = root.findViewById(R.id.btn_cat_all)
        btnCatGifs = root.findViewById(R.id.btn_cat_gifs)
        btnCatStickers = root.findViewById(R.id.btn_cat_stickers)
        btnCatPinned = root.findViewById(R.id.btn_cat_pinned)

        btnCatAll?.setOnClickListener { filterDeckByCategory("all") }
        btnCatGifs?.setOnClickListener { filterDeckByCategory("gifs") }
        btnCatStickers?.setOnClickListener { filterDeckByCategory("stickers") }
        btnCatPinned?.setOnClickListener { filterDeckByCategory("pinned") }

        // Inline Popup Overlay
        imePopupOverlay = root.findViewById(R.id.ime_popup_overlay)
        tvPopupTitle = root.findViewById(R.id.tv_popup_title)
        tvPopupDesc = root.findViewById(R.id.tv_popup_desc)
        btnPopupInject = root.findViewById(R.id.btn_popup_inject)
        btnPopupPin = root.findViewById(R.id.btn_popup_pin)
        btnPopupDelete = root.findViewById(R.id.btn_popup_delete)
        btnPopupClose = root.findViewById(R.id.btn_popup_close)

        btnPopupClose?.setOnClickListener { hidePopupOverlay() }
        imePopupOverlay?.setOnClickListener { hidePopupOverlay() }

        root.findViewById<Button>(R.id.btn_inject_gif)?.setOnClickListener {
            ensureSampleGif()
            refreshDeckFiles()
        }
    }

    private fun switchUIMode(mode: String) {
        btnModeKeys?.isSelected = (mode == "keys")
        btnModeVault?.isSelected = (mode == "vault")
        btnModeEmoji?.isSelected = (mode == "emoji")
        btnModeClipboard?.isSelected = (mode == "clipboard")

        val activeColor = if (currentTheme == ZenoDeckKeyboardBridgePlugin.THEME_FOREST_CHAMPAGNE) 0xFFF7E7CE.toInt() else 0xFF22D3EE.toInt()
        val inactiveColor = 0xFF94A3B8.toInt()

        btnModeKeys?.setTextColor(if (mode == "keys") activeColor else inactiveColor)
        btnModeVault?.setTextColor(if (mode == "vault") activeColor else inactiveColor)
        btnModeEmoji?.setTextColor(if (mode == "emoji") activeColor else inactiveColor)
        btnModeClipboard?.setTextColor(if (mode == "clipboard") activeColor else inactiveColor)

        layoutKeysView?.visibility = if (mode == "keys") View.VISIBLE else View.GONE
        layoutVaultView?.visibility = if (mode == "vault") View.VISIBLE else View.GONE
        layoutEmojiView?.visibility = if (mode == "emoji") View.VISIBLE else View.GONE
        layoutClipboardView?.visibility = if (mode == "clipboard") View.VISIBLE else View.GONE

        // Predictive bar & number row are only visible during typing mode
        layoutPredictiveBar?.visibility = if (mode == "keys") View.VISIBLE else View.GONE
        layoutNumberRow?.visibility = if (mode == "keys" && isShowNumberRow) View.VISIBLE else View.GONE

        showKeyEcho(when (mode) {
            "keys" -> "⌨️ TYPING"
            "vault" -> "⚡ VAULT"
            "emoji" -> "😊 EMOJI"
            "clipboard" -> "📋 CLIPS"
            else -> ""
        }, 500)
    }

    /**
     * Binds the 26 letter keys, shift, and enter actions based on active layout.
     */
    private fun setupMultiLayoutKeys(root: View) {
        val letterKeyIds = listOf(
            R.id.btn_key_q, R.id.btn_key_w, R.id.btn_key_e, R.id.btn_key_r, R.id.btn_key_t,
            R.id.btn_key_y, R.id.btn_key_u, R.id.btn_key_i, R.id.btn_key_o, R.id.btn_key_p,
            R.id.btn_key_a, R.id.btn_key_s, R.id.btn_key_d, R.id.btn_key_f, R.id.btn_key_g,
            R.id.btn_key_h, R.id.btn_key_j, R.id.btn_key_k, R.id.btn_key_l,
            R.id.btn_key_z, R.id.btn_key_x, R.id.btn_key_c, R.id.btn_key_v, R.id.btn_key_b,
            R.id.btn_key_n, R.id.btn_key_m
        )

        keyButtons.clear()
        for (id in letterKeyIds) {
            root.findViewById<Button>(id)?.let { keyButtons.add(it) }
        }

        btnShift = root.findViewById(R.id.btn_shift)
        btnEnter = root.findViewById(R.id.btn_enter)

        btnShift?.setOnClickListener {
            if (isSymbolsMode) {
                isShifted = !isShifted
                btnShift?.setTextColor(if (isShifted) 0xFF38BDF8.toInt() else 0xFF94A3B8.toInt())
                applyKeyLayout("SYMBOLS")
                btnShift?.let { performKeyHaptic(it) }
                return@setOnClickListener
            }
            if (isShifted && !isCapsLock) {
                isCapsLock = true
                btnShift?.setTextColor(0xFF38BDF8.toInt())
                showKeyEcho("CAPS LOCK", 600)
            } else if (isCapsLock) {
                isCapsLock = false
                isShifted = false
                btnShift?.setTextColor(0xFF94A3B8.toInt())
            } else {
                isShifted = true
                btnShift?.setTextColor(0xFFF1F5F9.toInt())
            }
            updateKeyCapsText()
            btnShift?.let { performKeyHaptic(it) }
        }

        btnEnter?.setOnClickListener {
            finalizeComposingWord()
            val ic = currentInputConnection ?: return@setOnClickListener
            val action = currentEditorInfo?.imeOptions ?: 0
            val actionId = action and EditorInfo.IME_MASK_ACTION
            if (actionId != EditorInfo.IME_ACTION_NONE && actionId != EditorInfo.IME_ACTION_UNSPECIFIED) {
                ic.performEditorAction(actionId)
            } else {
                ic.commitText("\n", 1)
            }
            vibrateTactileClick()
        }

        setupGutterTouchInterception(root)
        applyKeyLayout(currentLayout)
    }

    private fun setupGutterTouchInterception(root: View) {
        val row1 = root.findViewById<View>(R.id.row_keys_1)
        val row2 = root.findViewById<View>(R.id.row_keys_2)
        val row3 = root.findViewById<View>(R.id.row_keys_3)
        val rows = listOfNotNull(row1, row2, row3)

        for (row in rows) {
            row.setOnTouchListener { _, event ->
                if (event.actionMasked == MotionEvent.ACTION_DOWN || event.actionMasked == MotionEvent.ACTION_POINTER_DOWN) {
                    val pIdx = event.actionIndex
                    val targetKey = findKeyAtLocation(event.getRawX(pIdx), event.getRawY(pIdx))
                    if (targetKey != null) {
                        targetKey.dispatchTouchEvent(event)
                        return@setOnTouchListener true
                    }
                }
                false
            }
        }
    }

    fun findKeyAtLocation(rawX: Float, rawY: Float): Button? {
        var closestBtn: Button? = null
        var minDistanceSq = Float.MAX_VALUE
        val gutterPaddingX = 4 * resources.displayMetrics.density
        val gutterPaddingY = 6 * resources.displayMetrics.density

        for (btn in keyButtons) {
            if (!btn.isShown) continue
            btn.getLocationOnScreen(tempLocArray)
            val left = tempLocArray[0] - gutterPaddingX
            val top = tempLocArray[1] - gutterPaddingY
            val right = tempLocArray[0] + btn.width + gutterPaddingX
            val bottom = tempLocArray[1] + btn.height + gutterPaddingY

            if (rawX in left..right && rawY in top..bottom) {
                val centerX = tempLocArray[0] + btn.width / 2f
                val centerY = tempLocArray[1] + btn.height / 2f
                val dx = rawX - centerX
                val dy = rawY - centerY
                val distSq = dx * dx + dy * dy
                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq
                    closestBtn = btn
                }
            }
        }
        return closestBtn
    }

    fun performKeyHaptic(view: View) {
        try {
            val flags = HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
            val feedbackConstant = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                HapticFeedbackConstants.KEYBOARD_PRESS
            } else {
                HapticFeedbackConstants.KEYBOARD_TAP
            }
            val performed = view.performHapticFeedback(feedbackConstant, flags)
            if (!performed) {
                vibrateTick()
            }
        } catch (_: Exception) {
            vibrateTick()
        }
    }

    private fun showKeyHighlight(btn: Button) {
        btn.scaleX = 0.94f
        btn.scaleY = 0.94f
        btn.alpha = 0.85f
    }

    private fun hideKeyHighlight(btn: Button) {
        btn.scaleX = 1.0f
        btn.scaleY = 1.0f
        btn.alpha = 1.0f
    }

    private fun showFloatingPopup(btn: Button, char: String) {
        if (isPasswordInputType()) return
        val popup = tvFloatingKeyPopup ?: return
        val outer = keyboardRootView?.findViewById<View>(R.id.keyboard_outer_container) ?: keyboardRootView ?: return

        btn.getLocationInWindow(tempLocArray)
        outer.getLocationInWindow(tempRootLocArray)

        val density = resources.displayMetrics.density
        val btnLeftInOuter = tempLocArray[0] - tempRootLocArray[0]
        val btnTopInOuter = tempLocArray[1] - tempRootLocArray[1]

        val popupWidth = popup.width.takeIf { it > 0 } ?: (54 * density).toInt()
        val popupHeight = popup.height.takeIf { it > 0 } ?: (62 * density).toInt()

        popup.translationX = btnLeftInOuter + (btn.width - popupWidth) / 2f
        popup.translationY = btnTopInOuter - popupHeight - (6 * density)
        popup.text = char
        popup.alpha = 1.0f
        popup.scaleX = 1.12f
        popup.scaleY = 1.12f
        popup.visibility = View.VISIBLE
    }

    private fun hideFloatingPopup() {
        tvFloatingKeyPopup?.visibility = View.GONE
    }

    private fun isPasswordInputType(): Boolean {
        val info = currentEditorInfo ?: return false
        val variation = info.inputType and EditorInfo.TYPE_MASK_VARIATION
        val clazz = info.inputType and EditorInfo.TYPE_MASK_CLASS
        return clazz == EditorInfo.TYPE_CLASS_TEXT &&
                (variation == EditorInfo.TYPE_TEXT_VARIATION_PASSWORD ||
                 variation == EditorInfo.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
                 variation == EditorInfo.TYPE_TEXT_VARIATION_WEB_PASSWORD)
    }

    fun applyKeyboardDimensions(root: View? = keyboardRootView) {
        val r = root ?: return
        val dm = resources.displayMetrics
        val density = dm.density
        val isLandscape = resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
        val scale = keyboardHeightScale.coerceIn(MIN_KEYBOARD_HEIGHT_SCALE, MAX_KEYBOARD_HEIGHT_SCALE)

        val outerContainer = r.findViewById<View>(R.id.keyboard_outer_container) ?: r
        val ribbon = r.findViewById<View>(R.id.layout_utility_ribbon)
        val numberRow = r.findViewById<View>(R.id.layout_number_row)
        val row1 = r.findViewById<View>(R.id.row_keys_1)
        val row2 = r.findViewById<View>(R.id.row_keys_2)
        val row3 = r.findViewById<View>(R.id.row_keys_3)
        val bottomStrip = r.findViewById<View>(R.id.btn_spacebar)?.parent as? View

        if (isLandscape) {
            val maxLandscapePx = (dm.heightPixels * 0.45f).toInt()
            val landscapeTargetPx = (175f * scale * density).toInt().coerceAtMost(maxLandscapePx)
            outerContainer.layoutParams?.let { lp ->
                lp.height = landscapeTargetPx
                outerContainer.layoutParams = lp
            }
            val landCharRowPx = (34f * scale * density).toInt().coerceAtMost((maxLandscapePx / 4.5f).toInt())
            val landSpacingPx = (2f * density).toInt()
            val landToolbarPx = (30f * scale * density).toInt()

            ribbon?.layoutParams?.let { lp -> lp.height = landToolbarPx; ribbon.layoutParams = lp }
            bottomStrip?.layoutParams?.let { lp -> lp.height = landCharRowPx; bottomStrip.layoutParams = lp }
            row1?.let { v -> (v.layoutParams as? ViewGroup.MarginLayoutParams)?.let { lp -> lp.bottomMargin = landSpacingPx; v.layoutParams = lp } }
            row2?.let { v -> (v.layoutParams as? ViewGroup.MarginLayoutParams)?.let { lp -> lp.bottomMargin = landSpacingPx; v.layoutParams = lp } }
        } else {
            // Portrait: Target 285dp - 315dp total (base 258dp * 1.18f = ~305dp)
            val totalPortraitPx = (258f * scale * density).toInt()
            outerContainer.layoutParams?.let { lp ->
                lp.height = totalPortraitPx
                outerContainer.layoutParams = lp
            }

            val toolbarPx = (TARGET_TOOLBAR_HEIGHT_DP * scale * density).toInt()
            val spacingPx = (TARGET_ROW_SPACING_DP * scale * density).toInt()
            val bottomStripPx = (TARGET_BOTTOM_STRIP_HEIGHT_DP * scale * density).toInt()
            val numberRowPx = (TARGET_NUMBER_ROW_HEIGHT_DP * scale * density).toInt()

            ribbon?.layoutParams?.let { lp -> lp.height = toolbarPx; ribbon.layoutParams = lp }
            numberRow?.layoutParams?.let { lp -> lp.height = numberRowPx; numberRow.layoutParams = lp }
            bottomStrip?.layoutParams?.let { lp -> lp.height = bottomStripPx; bottomStrip.layoutParams = lp }

            row1?.let { v -> (v.layoutParams as? ViewGroup.MarginLayoutParams)?.let { lp -> lp.bottomMargin = spacingPx; v.layoutParams = lp } }
            row2?.let { v -> (v.layoutParams as? ViewGroup.MarginLayoutParams)?.let { lp -> lp.bottomMargin = spacingPx; v.layoutParams = lp } }
        }
    }

    private fun applyKeyLayout(layoutName: String) {
        if (!isSymbolsMode) {
            currentLayout = layoutName
        }
        val matrix = when {
            isSymbolsMode && isShifted -> LAYOUT_SYMBOLS_SHIFT
            isSymbolsMode -> LAYOUT_SYMBOLS
            layoutName.uppercase() == "AZERTY" -> LAYOUT_AZERTY
            layoutName.uppercase() == "QWERTZ" -> LAYOUT_QWERTZ
            layoutName.uppercase() == "DVORAK" -> LAYOUT_DVORAK
            else -> LAYOUT_QWERTY
        }

        val allChars = matrix.flatten()
        val gestureThreshold = 22 * resources.displayMetrics.density

        for (i in 0 until minOf(allChars.size, keyButtons.size)) {
            val char = allChars[i]
            val btn = keyButtons[i]
            btn.tag = char

            btn.setOnTouchListener { v, event ->
                val pointerIndex = event.actionIndex
                val pointerId = event.getPointerId(pointerIndex)
                val targetBtn = (v as? Button) ?: btn

                when (event.actionMasked) {
                    MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                        val rawChar = (targetBtn.tag as? String) ?: ""
                        if (rawChar.isNotEmpty()) {
                            val typedChar = if (!isSymbolsMode && (isShifted || isCapsLock)) rawChar.uppercase() else rawChar.lowercase()

                            // Zero-Latency Direct Commit on Pointer Down
                            currentInputConnection?.commitText(typedChar, 1)
                            composingWord.append(typedChar)

                            // 120fps Key Highlight & Floating Popup
                            showKeyHighlight(targetBtn)
                            showFloatingPopup(targetBtn, typedChar)
                            performKeyHaptic(targetBtn)

                            // Multi-touch Rollover State Tracking
                            val state = pointerStates[pointerId.coerceIn(0, 9)]
                            state.active = true
                            state.pointerId = pointerId
                            state.keyChar = typedChar
                            state.button = targetBtn
                            state.downX = event.getRawX(pointerIndex)
                            state.downY = event.getRawY(pointerIndex)
                            state.downTime = System.currentTimeMillis()
                            state.isGlide = false
                            state.characterCommitted = true

                            // Gesture glide trajectory tracking (primary pointer only)
                            if (pointerId == 0) {
                                glideTrajectory.clear()
                                glideTrajectory.add(rawChar)
                            }

                            // Single-character auto-unshift
                            if (!isSymbolsMode && isShifted && !isCapsLock) {
                                isShifted = false
                                btnShift?.setTextColor(0xFF94A3B8.toInt())
                                updateKeyCapsText()
                            }

                            if (!isPasswordInputType()) {
                                updatePredictiveCandidates()
                            }
                        }
                        true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val state = pointerStates[pointerId.coerceIn(0, 9)]
                        if (isGestureTypingEnabled && state.active && pointerId == 0 && !isSymbolsMode) {
                            val dist = Math.hypot(
                                (event.getRawX(pointerIndex) - state.downX).toDouble(),
                                (event.getRawY(pointerIndex) - state.downY).toDouble()
                            )
                            if (!state.isGlide && dist >= gestureThreshold) {
                                state.isGlide = true
                                if (state.characterCommitted) {
                                    currentInputConnection?.deleteSurroundingText(1, 0)
                                    if (composingWord.isNotEmpty()) composingWord.deleteCharAt(composingWord.length - 1)
                                    state.characterCommitted = false
                                }
                            }
                            if (state.isGlide) {
                                val currentKey = findKeyAtLocation(event.getRawX(pointerIndex), event.getRawY(pointerIndex))
                                if (currentKey != null) {
                                    val c = currentKey.tag as? String
                                    if (c != null && (glideTrajectory.isEmpty() || glideTrajectory.last() != c)) {
                                        glideTrajectory.add(c)
                                        vibrateTick()
                                        val preview = resolveGlideWord(glideTrajectory) ?: glideTrajectory.joinToString("").lowercase()
                                        showKeyEcho("~ $preview", 600)
                                    }
                                }
                            }
                        }
                        true
                    }
                    MotionEvent.ACTION_POINTER_UP -> {
                        val state = pointerStates[pointerId.coerceIn(0, 9)]
                        if (state.active) {
                            state.button?.let { hideKeyHighlight(it) }
                            state.active = false
                            state.characterCommitted = false
                            state.button = null
                        }
                        hideFloatingPopup()
                        true
                    }
                    MotionEvent.ACTION_UP -> {
                        val state = pointerStates[pointerId.coerceIn(0, 9)]
                        if (state.isGlide && glideTrajectory.size >= 2 && !isSymbolsMode) {
                            // Retract any initial character if not already retracted during ACTION_MOVE
                            if (state.characterCommitted) {
                                currentInputConnection?.deleteSurroundingText(1, 0)
                                if (composingWord.isNotEmpty()) composingWord.deleteCharAt(composingWord.length - 1)
                                state.characterCommitted = false
                            }

                            val word = resolveGlideWord(glideTrajectory) ?: glideTrajectory.joinToString("").lowercase()
                            val formatted = if (isShifted || isCapsLock) word.replaceFirstChar { it.uppercase() } else word
                            currentInputConnection?.commitText("$formatted ", 1)
                            vibrateTactileClick()
                            showKeyEcho("✓ $formatted", 800)
                            if (!isPasswordInputType()) {
                                userWordFreq[word.lowercase()] = (userWordFreq[word.lowercase()] ?: 0) + 1
                                saveUserDictionary()
                            }
                            composingWord.clear()
                            updatePredictiveCandidates()
                            checkAutoCapitalization()
                        } else if (state.isGlide && !state.characterCommitted && state.keyChar.isNotEmpty()) {
                            // Short swipe aborted without reaching a valid word: restore original tapped character
                            currentInputConnection?.commitText(state.keyChar, 1)
                            composingWord.append(state.keyChar)
                        }
                        // Clean up all pointer states and visual feedback
                        hideFloatingPopup()
                        for (s in pointerStates) {
                            s.button?.let { hideKeyHighlight(it) }
                            s.active = false
                            s.characterCommitted = false
                            s.button = null
                        }
                        glideTrajectory.clear()
                        true
                    }
                    MotionEvent.ACTION_CANCEL -> {
                        hideFloatingPopup()
                        for (s in pointerStates) {
                            s.button?.let { hideKeyHighlight(it) }
                            s.active = false
                            s.characterCommitted = false
                            s.button = null
                        }
                        glideTrajectory.clear()
                        hideKeyEcho()
                        true
                    }
                    else -> false
                }
            }
        }
        updateKeyCapsText()
    }

    /**
     * Resolves a glide trajectory (sequence of touched keycaps) to the most likely word.
     * Selects from multilingual vocabularies (English, French, German, Spanish) and user frequency.
     */
    fun resolveGlideWord(trajectory: List<String>): String? {
        if (trajectory.size < 2) return null
        val startChar = trajectory.first().lowercase()
        val endChar = trajectory.last().lowercase()

        val candidateVocab = when (currentLayout.uppercase()) {
            "AZERTY" -> FRENCH_VOCABULARY + CORE_VOCABULARY
            "QWERTZ" -> GERMAN_VOCABULARY + CORE_VOCABULARY
            else -> CORE_VOCABULARY + SPANISH_VOCABULARY
        } + userWordFreq.keys

        val startEndMatches = candidateVocab.filter { word ->
            val w = word.lowercase()
            w.startsWith(startChar) && w.endsWith(endChar)
        }

        if (startEndMatches.isEmpty()) {
            return candidateVocab.find { it.startsWith(startChar) && it.length >= trajectory.size }
        }

        val scored = startEndMatches.map { word ->
            var trajIdx = 0
            val w = word.lowercase()
            for (ch in w) {
                if (trajIdx < trajectory.size && ch.toString().equals(trajectory[trajIdx], ignoreCase = true)) {
                    trajIdx++
                }
            }
            val matchScore = trajIdx.toFloat() / trajectory.size.toFloat()
            val lenDiff = Math.abs(w.length - trajectory.size)
            val freqBonus = (userWordFreq[w] ?: 0) * 0.1f
            val totalScore = matchScore * 10 - lenDiff + freqBonus
            word to totalScore
        }

        return scored.maxByOrNull { it.second }?.first
    }

    private fun updateKeyCapsText() {
        for (btn in keyButtons) {
            val rawChar = (btn.tag as? String) ?: btn.text.toString()
            btn.text = if (isShifted || isCapsLock) rawChar.uppercase() else rawChar.lowercase()
        }
    }

    private fun onLetterKeyTapped(rawChar: String) {
        val typedChar = if (isShifted || isCapsLock) rawChar.uppercase() else rawChar.lowercase()
        composingWord.append(typedChar)
        currentInputConnection?.commitText(typedChar, 1)

        vibrateTick()
        showKeyEcho(typedChar, 350)

        // Clear temporary shift after 1 character if not in caps lock
        if (isShifted && !isCapsLock) {
            isShifted = false
            btnShift?.setTextColor(0xFF94A3B8.toInt())
            updateKeyCapsText()
        }

        updatePredictiveCandidates()
    }

    /**
     * Offline 3-Candidate Predictive Engine:
     * Suggests contractions, typos auto-corrects, and high-frequency English completions.
     */
    private fun updatePredictiveCandidates() {
        if (composingWord.isEmpty()) {
            tvSuggestionLeft?.text = ""
            tvSuggestionCenter?.text = ""
            tvSuggestionRight?.text = ""
            return
        }

        val currentPrefix = composingWord.toString().lowercase()

        // 1. Check exact contraction or typo replacement
        val exactCorrection = AUTO_REPLACE_DICT[currentPrefix]

        // 2. Query user frequency dictionary + core vocabulary
        val matches = mutableListOf<String>()
        if (exactCorrection != null) {
            matches.add(exactCorrection)
        }

        // Add user words matching prefix
        val userMatches = userWordFreq.filter { it.key.startsWith(currentPrefix) }
            .toList()
            .sortedByDescending { it.second }
            .map { it.first }
        matches.addAll(userMatches)

        // Add core vocabulary words matching prefix
        val coreMatches = CORE_VOCABULARY.filter { it.startsWith(currentPrefix) && !matches.contains(it) }
        matches.addAll(coreMatches)

        // Fill candidate slots
        val center = if (matches.isNotEmpty()) matches[0] else currentPrefix
        val left = if (matches.size > 1) matches[1] else ""
        val right = if (matches.size > 2) matches[2] else ""

        tvSuggestionCenter?.text = center
        tvSuggestionLeft?.text = left
        tvSuggestionRight?.text = right
    }

    private fun commitCandidate(word: String?) {
        if (word.isNullOrEmpty()) return
        val ic = currentInputConnection ?: return

        // Delete currently typed partial word
        if (composingWord.isNotEmpty()) {
            ic.deleteSurroundingText(composingWord.length, 0)
        }

        // Commit candidate word followed by space
        ic.commitText("$word ", 1)
        vibrateTactileClick()
        showKeyEcho(word, 500)

        // Learn user frequency
        val clean = word.trim().lowercase()
        userWordFreq[clean] = (userWordFreq[clean] ?: 0) + 1
        saveUserDictionary()

        composingWord.clear()
        updatePredictiveCandidates()
        checkAutoCapitalization()
    }

    private fun finalizeComposingWord() {
        if (composingWord.isNotEmpty()) {
            val word = composingWord.toString().lowercase()
            userWordFreq[word] = (userWordFreq[word] ?: 0) + 1
            composingWord.clear()
            updatePredictiveCandidates()
        }
    }

    /**
     * 50% Hardware Spacebar with Horizontal Cursor Scrubbing & 350ms Double-Space Period
     */
    private fun setupSpacebarTrackpadGesture(spacebar: Button) {
        setupSpacebarGesture(spacebar)
    }

    private fun setupSpacebarGesture(spacebar: Button) {
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
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                spacebar.performHapticFeedback(HapticFeedbackConstants.TEXT_HANDLE_MOVE)
                            } else {
                                vibrateTick()
                            }
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
                        handleSpacebarTap()
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

    private fun handleSpacebarTap() {
        val ic = currentInputConnection ?: return
        val now = System.currentTimeMillis()

        // Auto-correct active composing word before committing space
        if (isAutoCorrectEnabled && composingWord.isNotEmpty() && !isPasswordInputType()) {
            val current = composingWord.toString().lowercase()
            val replacement = AUTO_REPLACE_DICT[current]
            if (replacement != null) {
                ic.deleteSurroundingText(composingWord.length, 0)
                ic.commitText(replacement, 1)
            }
        }
        finalizeComposingWord()

        // Double-Space Period Shortcut (350ms)
        if (isDoubleSpacePeriodEnabled && (now - lastSpaceTimestamp < 350L)) {
            ic.deleteSurroundingText(1, 0)
            ic.commitText(". ", 1)
            lastSpaceTimestamp = 0L
            setShiftState(true)
            showKeyEcho(". (Period)", 400)
        } else {
            ic.commitText(" ", 1)
            lastSpaceTimestamp = now
            checkAutoCapitalization()
        }
        vibrateTactileClick()
    }

    /**
     * Tactile Backspace Key with Accelerate-on-hold and Swipe-Left Word Deletion
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
                isBackspaceLongPressed = true
                val holdDuration = System.currentTimeMillis() - backspacePressStartTime

                if (holdDuration >= 1200L) {
                    deletePreviousWord()
                    vibrateHeavy()
                    showKeyEcho("⌫ WORD", 300)
                    backspaceHandler.postDelayed(this, 100L)
                } else {
                    performSafeBackspace()
                    vibrateTick()
                    showKeyEcho("⌫", 300)
                    backspaceHandler.postDelayed(this, 50L)
                }
            }
        }

        backspace.setOnTouchListener { v, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downX = event.x
                    backspacePressStartTime = System.currentTimeMillis()
                    isBackspaceLongPressed = false
                    isBackspaceSwipeDeleting = false
                    v.isPressed = true
                    performKeyHaptic(v)
                    backspaceHandler.removeCallbacksAndMessages(null)
                    backspaceHandler.postDelayed(repeatRunnable, 350L)
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val deltaX = event.x - downX
                    if (!isBackspaceSwipeDeleting && deltaX <= -swipeThreshold) {
                        isBackspaceSwipeDeleting = true
                        backspaceHandler.removeCallbacksAndMessages(null)
                        deletePreviousWord()
                        vibrateHeavy()
                        showKeyEcho("⌫ WORD DELETED", 800)
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    v.isPressed = false
                    backspaceHandler.removeCallbacksAndMessages(null)
                    if (!isBackspaceSwipeDeleting && !isBackspaceLongPressed) {
                        performSafeBackspace()
                        vibrateTactileClick()
                    }
                    hideKeyEcho()
                    true
                }
                MotionEvent.ACTION_CANCEL -> {
                    v.isPressed = false
                    backspaceHandler.removeCallbacksAndMessages(null)
                    hideKeyEcho()
                    true
                }
                else -> false
            }
        }
    }

    private fun performSafeBackspace() {
        if (composingWord.isNotEmpty()) {
            composingWord.deleteCharAt(composingWord.length - 1)
            updatePredictiveCandidates()
            currentInputConnection?.deleteSurroundingText(1, 0)
            return
        }
        val ic = currentInputConnection ?: return
        val textBefore = ic.getTextBeforeCursor(4, 0)?.toString() ?: ""
        if (textBefore.isNotEmpty()) {
            val lastChar = textBefore.last()
            // Safely delete multi-codepoint surrogate pair (emoji / astral plane characters)
            if (Character.isLowSurrogate(lastChar) && textBefore.length >= 2 && Character.isHighSurrogate(textBefore[textBefore.length - 2])) {
                ic.deleteSurroundingText(2, 0)
            } else {
                ic.deleteSurroundingText(1, 0)
            }
        } else {
            sendDownUpKeyEvents(KeyEvent.KEYCODE_DEL)
        }
    }

    private fun performBackspace() {
        performSafeBackspace()
    }

    private fun deletePreviousWord() {
        composingWord.clear()
        updatePredictiveCandidates()
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

    private fun checkAutoCapitalization() {
        val ic = currentInputConnection ?: return
        val before = ic.getTextBeforeCursor(3, 0)?.toString() ?: ""
        if (before.isEmpty() || before.endsWith(". ") || before.endsWith("! ") || before.endsWith("? ") || before.endsWith("\n")) {
            setShiftState(true)
        }
    }

    private fun setShiftState(shifted: Boolean) {
        if (!isCapsLock) {
            isShifted = shifted
            btnShift?.setTextColor(if (shifted) 0xFFF1F5F9.toInt() else 0xFF94A3B8.toInt())
            updateKeyCapsText()
        }
    }

    /**
     * Categorized 8-Deck Emoji Panel
     */
    private fun setupEmojiDeck(root: View) {
        rvEmojiDeck = root.findViewById(R.id.rv_emoji_deck)
        emojiAdapter = EmojiDeckAdapter { emoji ->
            currentInputConnection?.commitText(emoji, 1)
            vibrateTick()
            showKeyEcho(emoji, 400)
            addRecentEmoji(emoji)
        }

        rvEmojiDeck?.apply {
            layoutManager = GridLayoutManager(this@ZenoDeckKeyboardService, 7)
            adapter = emojiAdapter
            setHasFixedSize(true)
        }

        val catMap = listOf(
            R.id.btn_emoji_cat_recent to recentEmojis,
            R.id.btn_emoji_cat_smileys to EMOJI_SMILEYS,
            R.id.btn_emoji_cat_gestures to EMOJI_GESTURES,
            R.id.btn_emoji_cat_hearts to EMOJI_HEARTS,
            R.id.btn_emoji_cat_animals to EMOJI_ANIMALS,
            R.id.btn_emoji_cat_food to EMOJI_FOOD,
            R.id.btn_emoji_cat_tech to EMOJI_TECH,
            R.id.btn_emoji_cat_symbols to EMOJI_SYMBOLS
        )

        for ((id, list) in catMap) {
            root.findViewById<Button>(id)?.setOnClickListener {
                emojiAdapter?.submitList(list)
            }
        }
        emojiAdapter?.submitList(if (recentEmojis.isNotEmpty()) recentEmojis else EMOJI_SMILEYS)
    }

    private fun addRecentEmoji(emoji: String) {
        recentEmojis.remove(emoji)
        recentEmojis.add(0, emoji)
        if (recentEmojis.size > 24) {
            recentEmojis.removeAt(recentEmojis.size - 1)
        }
        saveRecentEmojis()
    }

    /**
     * 30-Slot Persistent Clipboard History Vault
     */
    private fun setupClipboardVault(root: View) {
        rvClipboardVault = root.findViewById(R.id.rv_clipboard_vault)
        tvClipboardEmpty = root.findViewById(R.id.tv_clipboard_empty)
        btnClipSniffZenodeck = root.findViewById(R.id.btn_clip_sniff_zenodeck)

        clipboardAdapter = ClipboardVaultAdapter(
            onClipClick = { item ->
                currentInputConnection?.commitText(item.text, 1)
                vibrateTactileClick()
                showKeyEcho("PASTED CLIP", 500)
            },
            onPinToggle = { item ->
                item.isPinned = !item.isPinned
                saveClipboardVault()
                clipboardAdapter?.notifyDataSetChanged()
                showKeyEcho(if (item.isPinned) "PINNED 📌" else "UNPINNED", 500)
            },
            onDeleteClick = { item ->
                clipboardVaultItems.remove(item)
                saveClipboardVault()
                clipboardAdapter?.submitList(clipboardVaultItems.toList())
                updateClipboardEmptyState()
            }
        )

        rvClipboardVault?.apply {
            layoutManager = LinearLayoutManager(this@ZenoDeckKeyboardService)
            adapter = clipboardAdapter
        }

        root.findViewById<Button>(R.id.btn_clipboard_clear_unpinned)?.setOnClickListener {
            clipboardVaultItems.removeAll { !it.isPinned }
            saveClipboardVault()
            clipboardAdapter?.submitList(clipboardVaultItems.toList())
            updateClipboardEmptyState()
            showKeyEcho("CLEARED UNPINNED", 600)
        }

        btnClipSniffZenodeck?.setOnClickListener {
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            }
            startActivity(intent)
        }

        clipboardAdapter?.submitList(clipboardVaultItems.toList())
        updateClipboardEmptyState()
    }

    private fun onClipboardChanged() {
        try {
            val clip = clipboardManager.primaryClip ?: return
            if (clip.itemCount == 0) return
            val text = clip.getItemAt(0).text?.toString()?.trim() ?: return
            if (text.isEmpty()) return

            // Check if already in vault
            val existing = clipboardVaultItems.find { it.text == text }
            if (existing != null) {
                clipboardVaultItems.remove(existing)
                clipboardVaultItems.add(0, existing)
            } else {
                val newItem = ClipboardVaultItem(
                    id = "clip_${System.currentTimeMillis()}",
                    text = text,
                    timestamp = System.currentTimeMillis()
                )
                clipboardVaultItems.add(0, newItem)
            }

            // Enforce max 30 slots (purge oldest unpinned)
            while (clipboardVaultItems.size > 30) {
                val lastUnpinnedIdx = clipboardVaultItems.indexOfLast { !it.isPinned }
                if (lastUnpinnedIdx >= 0) {
                    clipboardVaultItems.removeAt(lastUnpinnedIdx)
                } else {
                    break
                }
            }

            saveClipboardVault()
            clipboardAdapter?.submitList(clipboardVaultItems.toList())
            updateClipboardEmptyState()

            // Sniff media download URLs (YouTube, Instagram, TikTok, etc.)
            if (text.startsWith("http://") || text.startsWith("https://")) {
                btnClipSniffZenodeck?.visibility = View.VISIBLE
                btnClipSniffZenodeck?.text = "⚡ Open In ZenoDeck: ${text.take(24)}..."
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error processing clipboard change", e)
        }
    }

    private fun updateClipboardEmptyState() {
        tvClipboardEmpty?.visibility = if (clipboardVaultItems.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun launchVoiceDictation() {
        try {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak now to dictat...")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, "Voice recognition not available on this device", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * Theme Engine:
     * Skins the native keyboard across 4 themes:
     * - "forest_champagne": Deep Forest Emerald (#102C26) & Champagne Gold (#F7E7CE)
     * - "glacier": Stitch Frozen Light (#0A0E1A base, #7DD3FC ice blue, #C8A0F0 lavender)
     * - "obsidian": OKLCH cyber-violet/cyan (#0E0F14 base, #22D3EE accent)
     * - "terracotta": 60/30/10 warm clay paper (#FAF5EE base, #C2652A baked clay accent)
     */
    fun applyKeyboardTheme(theme: String) {
        currentTheme = theme
        val isForest = theme.equals(ZenoDeckKeyboardBridgePlugin.THEME_FOREST_CHAMPAGNE, ignoreCase = true)
        val isTerracotta = theme.equals(ZenoDeckKeyboardBridgePlugin.THEME_TERRACOTTA, ignoreCase = true)
        val isGlacier = theme.equals(ZenoDeckKeyboardBridgePlugin.THEME_GLACIER, ignoreCase = true)

        keyboardRootView?.let { root ->
            when {
                isForest -> {
                    root.setBackgroundColor(0xFF102C26.toInt())
                    root.findViewById<View>(R.id.media_container)?.setBackgroundColor(0xFF0D241F.toInt())
                    deckTitleTextView?.setTextColor(0xFFFAF5EE.toInt())
                    statusTextView?.setTextColor(0xFFA79277.toInt())
                    btnSpacebar?.setTextColor(0xFFF7E7CE.toInt())
                    btnBackspace?.setTextColor(0xFFE9D8A6.toInt())
                    tvSuggestionCenter?.setTextColor(0xFFF7E7CE.toInt())
                }
                isTerracotta -> {
                    root.setBackgroundColor(0xFFFAF5EE.toInt())
                    root.findViewById<View>(R.id.media_container)?.setBackgroundColor(0xFFF3ECE2.toInt())
                    deckTitleTextView?.setTextColor(0xFF342A24.toInt())
                    statusTextView?.setTextColor(0xFF79695F.toInt())
                    btnSpacebar?.setTextColor(0xFF342A24.toInt())
                    btnBackspace?.setTextColor(0xFFC2652A.toInt())
                    tvSuggestionCenter?.setTextColor(0xFFFFFFFF.toInt())
                }
                isGlacier -> {
                    root.setBackgroundColor(0xFF0A0E1A.toInt())
                    root.findViewById<View>(R.id.media_container)?.setBackgroundColor(0xFF0F1524.toInt())
                    deckTitleTextView?.setTextColor(0xFFE0E8F0.toInt())
                    statusTextView?.setTextColor(0xFFA0B4C4.toInt())
                    btnSpacebar?.setTextColor(0xFF7DD3FC.toInt())
                    btnBackspace?.setTextColor(0xFFC8A0F0.toInt())
                    tvSuggestionCenter?.setTextColor(0xFFFFFFFF.toInt())
                }
                else -> {
                    root.setBackgroundColor(0xFF0E0F14.toInt())
                    root.findViewById<View>(R.id.media_container)?.setBackgroundColor(0xFF12131A.toInt())
                    deckTitleTextView?.setTextColor(0xFFF1F5F9.toInt())
                    statusTextView?.setTextColor(0xFF64748B.toInt())
                    btnSpacebar?.setTextColor(0xFFF1F5F9.toInt())
                    btnBackspace?.setTextColor(0xFFF87171.toInt())
                    tvSuggestionCenter?.setTextColor(0xFFFFFFFF.toInt())
                }
            }
            tvFloatingKeyPopup?.let { popup ->
                when {
                    isForest -> popup.setTextColor(0xFFF7E7CE.toInt())
                    isTerracotta -> popup.setTextColor(0xFF342A24.toInt())
                    isGlacier -> popup.setTextColor(0xFF7DD3FC.toInt())
                    else -> popup.setTextColor(0xFFFFFFFF.toInt())
                }
            }
            filterDeckByCategory(selectedCategory)
        }
    }

    private fun applyKeyboardSettings() {
        applyKeyboardDimensions(keyboardRootView)
        applyKeyLayout(if (isSymbolsMode) "SYMBOLS" else currentLayout)
        layoutNumberRow?.visibility = if (layoutKeysView?.visibility == View.VISIBLE && isShowNumberRow) View.VISIBLE else View.GONE
    }

    private fun loadSavedTheme(): String {
        return try {
            val prefs = getSharedPreferences(ZenoDeckKeyboardBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
            currentTheme = prefs.getString(ZenoDeckKeyboardBridgePlugin.PREF_KEY_THEME, ZenoDeckKeyboardBridgePlugin.THEME_GLACIER)
                ?: ZenoDeckKeyboardBridgePlugin.THEME_GLACIER
            currentTheme
        } catch (e: Exception) {
            ZenoDeckKeyboardBridgePlugin.THEME_GLACIER
        }
    }

    private fun loadSavedSettings() {
        try {
            val prefs = getSharedPreferences(ZenoDeckKeyboardBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
            currentLayout = prefs.getString(ZenoDeckKeyboardBridgePlugin.PREF_KEY_LAYOUT_MODE, "QWERTY") ?: "QWERTY"
            keyboardHeightScale = prefs.getFloat(
                ZenoDeckKeyboardBridgePlugin.PREF_KEY_KEYBOARD_HEIGHT_SCALE,
                DEFAULT_KEYBOARD_HEIGHT_SCALE
            ).coerceIn(MIN_KEYBOARD_HEIGHT_SCALE, MAX_KEYBOARD_HEIGHT_SCALE)
            isShowNumberRow = prefs.getBoolean(ZenoDeckKeyboardBridgePlugin.PREF_KEY_SHOW_NUMBER_ROW, true)
            isAutoCorrectEnabled = prefs.getBoolean(ZenoDeckKeyboardBridgePlugin.PREF_KEY_AUTO_CORRECT, true)
            isGestureTypingEnabled = prefs.getBoolean(ZenoDeckKeyboardBridgePlugin.PREF_KEY_GESTURE_TYPING, true)
            isDoubleSpacePeriodEnabled = prefs.getBoolean(ZenoDeckKeyboardBridgePlugin.PREF_KEY_DOUBLE_SPACE_PERIOD, true)
        } catch (e: Exception) {
            Log.e(TAG, "Error loading keyboard settings", e)
        }
    }

    private fun loadUserDictionary() {
        try {
            val prefs = getSharedPreferences(ZenoDeckKeyboardBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
            val raw = prefs.getString("user_word_freq", "{}") ?: "{}"
            val json = JSONObject(raw)
            userWordFreq.clear()
            for (key in json.keys()) {
                userWordFreq[key] = json.getInt(key)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed loading user dictionary", e)
        }
    }

    private fun saveUserDictionary() {
        try {
            val prefs = getSharedPreferences(ZenoDeckKeyboardBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
            val json = JSONObject()
            for ((k, v) in userWordFreq) {
                json.put(k, v)
            }
            prefs.edit().putString("user_word_freq", json.toString()).apply()
        } catch (e: Exception) {
            Log.w(TAG, "Failed saving user dictionary", e)
        }
    }

    private fun loadRecentEmojis() {
        try {
            val prefs = getSharedPreferences(ZenoDeckKeyboardBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
            val raw = prefs.getString("recent_emojis", "[]") ?: "[]"
            val array = JSONArray(raw)
            recentEmojis.clear()
            for (i in 0 until array.length()) {
                recentEmojis.add(array.getString(i))
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed loading recent emojis", e)
        }
    }

    private fun saveRecentEmojis() {
        try {
            val prefs = getSharedPreferences(ZenoDeckKeyboardBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
            val array = JSONArray(recentEmojis)
            prefs.edit().putString("recent_emojis", array.toString()).apply()
        } catch (e: Exception) {
            Log.w(TAG, "Failed saving recent emojis", e)
        }
    }

    private fun loadClipboardVault() {
        try {
            val prefs = getSharedPreferences(ZenoDeckKeyboardBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
            val raw = prefs.getString(ZenoDeckKeyboardBridgePlugin.PREF_KEY_CLIPBOARD_VAULT, "[]") ?: "[]"
            val array = JSONArray(raw)
            clipboardVaultItems.clear()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                clipboardVaultItems.add(
                    ClipboardVaultItem(
                        id = obj.optString("id", ""),
                        text = obj.optString("text", ""),
                        timestamp = obj.optLong("timestamp", 0L),
                        isPinned = obj.optBoolean("isPinned", false)
                    )
                )
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed loading clipboard vault", e)
        }
    }

    private fun saveClipboardVault() {
        try {
            val prefs = getSharedPreferences(ZenoDeckKeyboardBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE)
            val array = JSONArray()
            for (item in clipboardVaultItems) {
                val obj = JSONObject().apply {
                    put("id", item.id)
                    put("text", item.text)
                    put("timestamp", item.timestamp)
                    put("isPinned", item.isPinned)
                }
                array.put(obj)
            }
            prefs.edit().putString(ZenoDeckKeyboardBridgePlugin.PREF_KEY_CLIPBOARD_VAULT, array.toString()).apply()
        } catch (e: Exception) {
            Log.w(TAG, "Failed saving clipboard vault", e)
        }
    }

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
        }
    }

    private fun hidePopupOverlay() {
        imePopupOverlay?.visibility = View.GONE
    }

    private fun togglePinFile(file: File) {
        val parent = file.parentFile ?: return
        val isPinned = file.name.startsWith("pinned_", ignoreCase = true)
        val newName = if (isPinned) file.name.removePrefix("pinned_") else "pinned_${file.name}"
        val target = File(parent, newName)
        if (file.renameTo(target)) {
            val thumb = File(parent, "${file.name}.thumb.webp")
            if (thumb.exists()) {
                thumb.renameTo(File(parent, "${newName}.thumb.webp"))
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
        }
    }

    private fun filterDeckByCategory(category: String) {
        selectedCategory = category
        val isForest = currentTheme.equals(ZenoDeckKeyboardBridgePlugin.THEME_FOREST_CHAMPAGNE, ignoreCase = true)
        val isTerracotta = currentTheme.equals(ZenoDeckKeyboardBridgePlugin.THEME_TERRACOTTA, ignoreCase = true)
        val isGlacier = currentTheme.equals(ZenoDeckKeyboardBridgePlugin.THEME_GLACIER, ignoreCase = true)
        val activeColor = when {
            isForest -> 0xFFF7E7CE.toInt()
            isGlacier -> 0xFF7DD3FC.toInt()
            isTerracotta -> 0xFFC2652A.toInt()
            else -> 0xFF22D3EE.toInt()
        }
        val inactiveColor = 0xFF94A3B8.toInt()

        btnCatAll?.setTextColor(if (category == "all") activeColor else inactiveColor)
        btnCatGifs?.setTextColor(if (category == "gifs") activeColor else inactiveColor)
        btnCatStickers?.setTextColor(if (category == "stickers") activeColor else inactiveColor)
        btnCatPinned?.setTextColor(if (category == "pinned") activeColor else inactiveColor)

        val filtered = when (category) {
            "stickers" -> deckGifs.filter { it.name.contains("sticker", ignoreCase = true) }
            "gifs" -> deckGifs.filter { !it.name.contains("sticker", ignoreCase = true) }
            "pinned" -> deckGifs.filter { it.name.startsWith("pinned_", ignoreCase = true) }.ifEmpty { deckGifs.take(4) }
            else -> deckGifs
        }
        gifAdapter?.submitList(filtered.toList())
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        currentEditorInfo = info

        loadSavedTheme()
        loadSavedSettings()
        applyKeyboardDimensions(keyboardRootView)
        applyKeyboardTheme(currentTheme)
        applyKeyboardSettings()
        refreshDeckFiles()
        checkAutoCapitalization()

        if (info == null) {
            updateHostCapabilitiesDisplay("Unknown Host", supported = false, emptyMime = true)
            return
        }

        val targetPackage = info.packageName ?: "Host App"
        val supportedMimes = EditorInfoCompat.getContentMimeTypes(info)
        isRichContentSupportedByHost = isMimeSupported(supportedMimes, MIME_TYPE_GIF)

        updateHostCapabilitiesDisplay(targetPackage, isRichContentSupportedByHost, supportedMimes.isEmpty())
        updateCommitResultDisplay("Ready for media injection", isSuccess = null)
    }

    override fun onFinishInputView(finishingInput: Boolean) {
        super.onFinishInputView(finishingInput)
        finalizeComposingWord()
        hidePopupOverlay()
        hideKeyEcho()
        hideFloatingPopup()
        backspaceHandler.removeCallbacksAndMessages(null)
        for (s in pointerStates) {
            s.button?.let { hideKeyHighlight(it) }
            s.active = false
            s.characterCommitted = false
            s.button = null
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        echoHandler.removeCallbacksAndMessages(null)
        backspaceHandler.removeCallbacksAndMessages(null)
        hideFloatingPopup()
        for (s in pointerStates) {
            s.button?.let { hideKeyHighlight(it) }
            s.active = false
            s.button = null
        }
        if (isReceiverRegistered) {
            try { unregisterReceiver(deckUpdateReceiver) } catch (_: Exception) {}
        }
        if (isThemeReceiverRegistered) {
            try { unregisterReceiver(themeUpdateReceiver) } catch (_: Exception) {}
        }
        if (isSettingsReceiverRegistered) {
            try { unregisterReceiver(settingsUpdateReceiver) } catch (_: Exception) {}
        }
        try {
            clipboardManager.removePrimaryClipChangedListener(clipChangedListener)
        } catch (_: Exception) {}
        GifThumbnailLoader.clearCache()
    }

    private fun refreshDeckFiles() {
        val deckDir = File(filesDir, DECK_DIRECTORY_NAME)
        if (!deckDir.exists()) {
            deckDir.mkdirs()
        }

        val files = deckDir.listFiles { file ->
            file.isFile && (file.extension.equals("gif", ignoreCase = true) ||
                    file.extension.equals("webp", ignoreCase = true) ||
                    file.extension.equals("png", ignoreCase = true)) &&
                    !file.name.contains(".thumb.")
        } ?: emptyArray()

        deckGifs.clear()
        deckGifs.addAll(
            files.sortedWith(
                compareByDescending<File> { it.name.startsWith("pinned_", ignoreCase = true) }
                    .thenByDescending { it.lastModified() }
            )
        )

        val isEmpty = deckGifs.isEmpty()
        rvGifDeck?.visibility = if (isEmpty) View.GONE else View.VISIBLE
        layoutEmptyDeck?.visibility = if (isEmpty) View.VISIBLE else View.GONE

        filterDeckByCategory(selectedCategory)
    }

    private fun commitGif(gifFile: File, description: String) {
        val ic = currentInputConnection
        val info = currentEditorInfo

        if (ic == null || info == null) {
            commitContentListener?.onCommitFailure("No active input connection", fallbackUsed = false)
            return
        }

        val contentUri = try {
            FileProvider.getUriForFile(
                this,
                "$packageName.fileprovider",
                gifFile
            )
        } catch (e: Exception) {
            commitContentListener?.onCommitFailure("FileProvider failure: ${e.message}", fallbackUsed = false)
            return
        }

        val isSupported = isRichContentSupportedByHost || isMimeSupported(EditorInfoCompat.getContentMimeTypes(info), MIME_TYPE_GIF)

        if (!isSupported) {
            executeFallback(gifFile, contentUri, description, "Host does not advertise GIF support")
            return
        }

        val clipDescription = ClipDescription(description, arrayOf(MIME_TYPE_GIF))
        val inputContentInfo = InputContentInfoCompat(
            contentUri,
            clipDescription,
            null
        )

        var flags = 0
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
            flags = flags or InputConnectionCompat.INPUT_CONTENT_GRANT_READ_URI_PERMISSION
        }

        try {
            val committed = InputConnectionCompat.commitContent(ic, info, inputContentInfo, flags, null)
            if (committed) {
                vibrateTactileClick()
                commitContentListener?.onCommitSuccess(contentUri, MIME_TYPE_GIF, info.packageName ?: "Host")
                showKeyEcho("✓ GIF SENT", 800)
            } else {
                executeFallback(gifFile, contentUri, description, "commitContent returned false")
            }
        } catch (e: Exception) {
            executeFallback(gifFile, contentUri, description, "Exception during commit: ${e.message}")
        }
    }

    private fun executeFallback(file: File, uri: Uri, description: String?, reason: String) {
        try {
            val clip = ClipData.newUri(contentResolver, description ?: "GIF", uri)
            clip.description.extras = null
            clipboardManager.setPrimaryClip(clip)

            vibrateTactileClick()
            commitContentListener?.onCommitFailure(reason, fallbackUsed = true)
            showKeyEcho("COPIED TO CLIPBOARD", 1200)
        } catch (e: Exception) {
            commitContentListener?.onCommitFailure("$reason (Fallback failed: ${e.message})", fallbackUsed = false)
        }
    }

    private fun isMimeSupported(supportedMimes: Array<String>?, targetMime: String): Boolean {
        if (supportedMimes.isNullOrEmpty()) return false
        for (mime in supportedMimes) {
            if (ClipDescription.compareMimeTypes(mime, targetMime)) return true
        }
        return false
    }

    private fun updateHostCapabilitiesDisplay(packageName: String, supported: Boolean, emptyMime: Boolean) {
        statusTextView?.apply {
            text = when {
                supported -> "Host: $packageName (Rich Media Ready)"
                emptyMime -> "Host: $packageName (Standard Input Only)"
                else -> "Host: $packageName (Media Incompatible)"
            }
            setTextColor(if (supported) 0xFF38BDF8.toInt() else 0xFF94A3B8.toInt())
        }
        viewMimeDot?.setBackgroundResource(
            if (supported) R.drawable.bg_category_chip else R.drawable.bg_utility_pill
        )
    }

    private fun updateCommitResultDisplay(message: String, isSuccess: Boolean?) {
        commitResultTextView?.apply {
            text = message
            visibility = View.VISIBLE
            val color = when (isSuccess) {
                true -> 0xFF34D399.toInt()
                false -> 0xFFF87171.toInt()
                null -> 0xFF94A3B8.toInt()
            }
            setTextColor(color)
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

        updateCommitResultDisplay("⚡ Processing $action headlessly…", isSuccess = null)

        ZenoHeadlessMediaEngine.getInstance(applicationContext).processClipboardActionAsync(
            action = action,
            clipUri = clipUri,
            clipText = clipText
        ) { result ->
            if (result.isSuccess) {
                val outputFile = result.getOrNull()
                if (outputFile != null && outputFile.exists()) {
                    refreshDeckFiles()
                    vibrateTactileClick()
                    // Finish composing text before committing rich media content
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

    private fun switchToNextOrPicker() {
        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                switchToNextInputMethod(false)
                return
            } catch (_: Exception) {}
        }
        imm.showInputMethodPicker()
    }

    private fun vibrateTick() {
        try {
            val v = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                v?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK))
            } else {
                v?.vibrate(12L)
            }
        } catch (_: Exception) {}
    }

    private fun vibrateTactileClick() {
        try {
            val v = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                v?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK))
            } else {
                v?.vibrate(22L)
            }
        } catch (_: Exception) {}
    }

    private fun vibrateHeavy() {
        try {
            val v = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                v?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK))
            } else {
                v?.vibrate(45L)
            }
        } catch (_: Exception) {}
    }

    private fun ensureSampleGif(): File {
        val dir = File(filesDir, DECK_DIRECTORY_NAME)
        if (!dir.exists()) dir.mkdirs()
        val sample = File(dir, "sample_zenotap.gif")
        if (!sample.exists() || sample.length() == 0L) {
            val minimalBytes = byteArrayOf(
                0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
                0x80.toByte(), 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF.toByte(), 0xFF.toByte(), 0xFF.toByte(),
                0x21, 0xF9.toByte(), 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
                0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
            )
            FileOutputStream(sample).use { it.write(minimalBytes) }
        }
        return sample
    }
}
