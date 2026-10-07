package com.omnitool.app.keyboard

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.LruCache
import android.widget.ImageView
import java.io.File
import java.util.concurrent.Executors

/**
 * GifThumbnailLoader
 *
 * Lightweight, zero-dependency asynchronous thumbnail extractor and LRU cache
 * designed specifically for IME constraints.
 *
 * Constraints addressed:
 * 1. IME process memory quota: Limits in-memory cache to ~15MB.
 * 2. Main thread smoothness: Decoding performed off the UI thread.
 * 3. View recycling safety: Tag-based verification prevents stale bitmap injection into recycled cells.
 */
object GifThumbnailLoader {

    private const val TAG = "GifThumbLoader"
    private const val TARGET_SIZE_PX = 200 // Max width/height for keyboard grid cells

    // 15 MB max cache size
    private val maxCacheSize = (15 * 1024 * 1024).toInt()

    private val memoryCache: LruCache<String, Bitmap> = object : LruCache<String, Bitmap>(maxCacheSize) {
        override fun sizeOf(key: String, bitmap: Bitmap): Int {
            return bitmap.byteCount
        }
    }

    private val executor = Executors.newFixedThreadPool(2)
    private val mainHandler = Handler(Looper.getMainLooper())

    /**
     * Asynchronously loads a downsampled thumbnail of the GIF file into the provided ImageView.
     */
    fun loadThumbnail(file: File, imageView: ImageView) {
        val cacheKey = "${file.absolutePath}_${file.lastModified()}"

        // 1. Fast path: Memory cache hit
        val cached = memoryCache.get(cacheKey)
        if (cached != null) {
            imageView.setImageBitmap(cached)
            return
        }

        // 2. Clear previous bitmap and set tag to track recycling
        imageView.setImageBitmap(null)
        imageView.tag = cacheKey

        // 3. Background extraction
        executor.execute {
            val bitmap = decodeThumbnail(file)
            if (bitmap != null) {
                memoryCache.put(cacheKey, bitmap)

                mainHandler.post {
                    // Ensure the view has not been recycled for another item
                    if (imageView.tag == cacheKey) {
                        imageView.setImageBitmap(bitmap)
                    }
                }
            } else {
                Log.w(TAG, "Failed to decode thumbnail for: ${file.name}")
            }
        }
    }

    /**
     * Decodes the first frame of a GIF downsampled to thumbnail dimensions.
     */
    private fun decodeThumbnail(file: File): Bitmap? {
        if (!file.exists() || !file.canRead()) return null

        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val source = ImageDecoder.createSource(file)
                ImageDecoder.decodeBitmap(source) { decoder, info, _ ->
                    val origWidth = info.size.width
                    val origHeight = info.size.height

                    val sampleSize = calculateInSampleSize(origWidth, origHeight, TARGET_SIZE_PX, TARGET_SIZE_PX)
                    decoder.setTargetSampleSize(sampleSize)
                    decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
                }
            } else {
                val options = BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
                BitmapFactory.decodeFile(file.absolutePath, options)

                options.inSampleSize = calculateInSampleSize(
                    options.outWidth,
                    options.outHeight,
                    TARGET_SIZE_PX,
                    TARGET_SIZE_PX
                )
                options.inJustDecodeBounds = false
                options.inPreferredConfig = Bitmap.Config.RGB_565 // Conserves 50% RAM compared to ARGB_8888

                BitmapFactory.decodeFile(file.absolutePath, options)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error decoding GIF thumbnail for ${file.name}", e)
            null
        }
    }

    private fun calculateInSampleSize(
        width: Int,
        height: Int,
        reqWidth: Int,
        reqHeight: Int
    ): Int {
        var inSampleSize = 1
        if (height > reqHeight || width > reqWidth) {
            val halfHeight = height / 2
            val halfWidth = width / 2
            while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                inSampleSize *= 2
            }
        }
        return inSampleSize.coerceAtLeast(1)
    }

    /**
     * Clears cached thumbnails on low-memory conditions or when IME is torn down.
     */
    fun clearCache() {
        memoryCache.evictAll()
    }
}
