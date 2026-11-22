package com.omnitool.app.keyboard

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.View

/**
 * GlideTrailOverlayView
 *
 * 120fps hardware-accelerated glide typing trail overlay with a preallocated
 * 24-point circular ring buffer and zero allocations on hot touch/draw frames.
 */
class GlideTrailOverlayView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    companion object {
        const val RING_BUFFER_CAPACITY = 24
        const val TRAIL_COLOR = 0xFFF7E7CE.toInt() // Champagne Gold (#F7E7CE)
        const val FADE_OUT_DURATION_MS = 140L
    }

    // Preallocated 24-Point Circular Ring Buffer
    private val ringX = FloatArray(RING_BUFFER_CAPACITY)
    private val ringY = FloatArray(RING_BUFFER_CAPACITY)
    private val ringTime = LongArray(RING_BUFFER_CAPACITY)
    private var ringHead = 0
    private var ringCount = 0

    // Single Reusable Path & Paint (Zero per-frame allocations)
    private val trailPath = Path()
    private val trailPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
        color = TRAIL_COLOR
    }

    private val tempLoc = IntArray(2)

    private val fadeAnimator = ValueAnimator.ofFloat(1f, 0f).apply {
        duration = FADE_OUT_DURATION_MS
        addUpdateListener { anim ->
            val v = anim.animatedValue as Float
            alpha = v
            if (v <= 0.01f) {
                clearBuffer()
                alpha = 1f
                visibility = GONE
            }
        }
    }

    init {
        val density = resources.displayMetrics.density
        trailPaint.strokeWidth = 6f * density
        visibility = GONE
    }

    /**
     * Appends a coordinate from raw screen coordinates to the trail ring buffer.
     */
    fun addPoint(rawX: Float, rawY: Float) {
        if (fadeAnimator.isRunning) {
            fadeAnimator.cancel()
            alpha = 1f
        }
        visibility = VISIBLE

        getLocationOnScreen(tempLoc)
        val viewX = rawX - tempLoc[0]
        val viewY = rawY - tempLoc[1]

        ringX[ringHead] = viewX
        ringY[ringHead] = viewY
        ringTime[ringHead] = System.currentTimeMillis()

        ringHead = (ringHead + 1) % RING_BUFFER_CAPACITY
        if (ringCount < RING_BUFFER_CAPACITY) {
            ringCount++
        }

        postInvalidateOnAnimation()
    }

    /**
     * Finishes the current trail with a 140ms hardware-accelerated fade out.
     */
    fun finishTrail() {
        if (ringCount < 2) {
            clearBuffer()
            visibility = GONE
            return
        }
        if (!fadeAnimator.isRunning) {
            fadeAnimator.start()
        }
    }

    /**
     * Clears buffer points immediately without animation.
     */
    fun clearBuffer() {
        ringHead = 0
        ringCount = 0
        trailPath.rewind()
        postInvalidateOnAnimation()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (ringCount < 2) return

        trailPath.rewind()

        // Calculate oldest point index in the circular buffer
        val startIdx = if (ringCount < RING_BUFFER_CAPACITY) 0 else ringHead
        val firstX = ringX[startIdx]
        val firstY = ringY[startIdx]
        trailPath.moveTo(firstX, firstY)

        var prevX = firstX
        var prevY = firstY

        for (i in 1 until ringCount) {
            val idx = (startIdx + i) % RING_BUFFER_CAPACITY
            val currX = ringX[idx]
            val currY = ringY[idx]

            // Quadratic bezier midpoint smoothing between successive trail points
            val midX = (prevX + currX) / 2f
            val midY = (prevY + currY) / 2f
            trailPath.quadTo(prevX, prevY, midX, midY)

            prevX = currX
            prevY = currY
        }
        trailPath.lineTo(prevX, prevY)

        canvas.drawPath(trailPath, trailPaint)
    }
}
