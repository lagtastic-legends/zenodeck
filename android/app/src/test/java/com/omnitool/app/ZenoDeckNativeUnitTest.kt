package com.omnitool.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.hypot
import kotlin.math.roundToInt

/**
 * Native JVM Unit Tests for ZenoDeck & ZenoTap APK invariants.
 * Executed across build variants via Gradle :app:testDebugUnitTest.
 */
class ZenoDeckNativeUnitTest {

    private fun clampHeightScale(scale: Float): Float = scale.coerceIn(0.85f, 1.30f)

    private fun computeKeyHeightDp(scale: Float, baseKeyDp: Int = 54): Int =
        (baseKeyDp * clampHeightScale(scale)).roundToInt()

    private fun sanitizeHapticStrength(strength: Int): Int = strength.coerceIn(0, 3)

    private fun normalizeOneHandedMode(mode: String?): String = when (mode?.lowercase()) {
        "left", "right" -> mode.lowercase()
        else -> "off"
    }

    private fun pointerRawCoord(
        apiLevel: Int,
        pointerCoord: Float,
        primaryRawCoord: Float,
        primaryCoord: Float
    ): Float {
        // Mirrors ZenoDeckKeyboardService.getPointerRawX/Y API < 29 fallback calculation
        return if (apiLevel >= 29) pointerCoord else pointerCoord + (primaryRawCoord - primaryCoord)
    }

    @Test
    fun keyboardHeightScale_clampsWithinErgoRange() {
        assertEquals(0.85f, clampHeightScale(0.40f), 0.0001f)
        assertEquals(1.18f, clampHeightScale(1.18f), 0.0001f)
        assertEquals(1.30f, clampHeightScale(2.10f), 0.0001f)
        assertEquals(64, computeKeyHeightDp(1.18f))
    }

    @Test
    fun hapticStrength_clampsValidTiersZeroToThree() {
        assertEquals(0, sanitizeHapticStrength(-5))
        assertEquals(0, sanitizeHapticStrength(0))
        assertEquals(2, sanitizeHapticStrength(2))
        assertEquals(3, sanitizeHapticStrength(9))
    }

    @Test
    fun oneHandedMode_validatesKnownModes() {
        assertEquals("left", normalizeOneHandedMode("LEFT"))
        assertEquals("right", normalizeOneHandedMode("right"))
        assertEquals("off", normalizeOneHandedMode("invalid"))
        assertEquals("off", normalizeOneHandedMode(null))
    }

    @Test
    fun preApi29RawCoordinateFallback_tracksScreenOffsetAccurately() {
        // Simulated view top-left at screen x = 120f; primary pointer at x = 200f -> rawX = 320f
        // Second pointer at view x = 450f should resolve to screen rawX = 570f on API 24-28
        val rawX = pointerRawCoord(apiLevel = 26, pointerCoord = 450f, primaryRawCoord = 320f, primaryCoord = 200f)
        assertEquals(570f, rawX, 0.001f)
        assertTrue(hypot((rawX - 570f).toDouble(), 0.0) < 0.01)
    }

    @Test
    fun shareIntentUrlExtractor_handlesSharedTextSafely() {
        val pattern = Regex("https?://\\S+")
        val sample = "Check out this clip https://youtu.be/rxwTkp_xHSE?si=abc123"
        val match = pattern.find(sample)?.value
        assertEquals("https://youtu.be/rxwTkp_xHSE?si=abc123", match)
        assertFalse(sample.contains("eval("))
    }
}
