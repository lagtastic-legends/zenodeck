package com.omnitool.app.keyboard

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.RecyclerView
import com.omnitool.app.R
import java.io.File
import java.util.Locale

/**
 * GifDeckAdapter
 *
 * Ultra-lightweight RecyclerView adapter for displaying user-generated media cards in the ZenoTap vault tray.
 * Features:
 * - 12dp rounded glassmorphic cards with thumbnail preview
 * - Format badges (GIF vs STICKER) and micro file-size labels
 * - Pinned status indicator badge
 * - Click to inject, long-press to open management drawer (pin/delete)
 * - Keeps memory consumption strictly <30MB via GifThumbnailLoader
 */
class GifDeckAdapter(
    private val onItemClick: (File) -> Unit,
    private val onItemLongClick: ((File) -> Unit)? = null
) : RecyclerView.Adapter<GifDeckAdapter.GifViewHolder>() {

    private val items = mutableListOf<File>()

    fun submitList(newItems: List<File>) {
        val diffCallback = object : DiffUtil.Callback() {
            override fun getOldListSize(): Int = items.size
            override fun getNewListSize(): Int = newItems.size

            override fun areItemsTheSame(oldItemPosition: Int, newItemPosition: Int): Boolean {
                return items[oldItemPosition].absolutePath == newItems[newItemPosition].absolutePath
            }

            override fun areContentsTheSame(oldItemPosition: Int, newItemPosition: Int): Boolean {
                val oldFile = items[oldItemPosition]
                val newFile = newItems[newItemPosition]
                return oldFile.lastModified() == newFile.lastModified() && oldFile.length() == newFile.length()
            }
        }

        val diffResult = DiffUtil.calculateDiff(diffCallback)
        items.clear()
        items.addAll(newItems)
        diffResult.dispatchUpdatesTo(this)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GifViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_gif_cell, parent, false)
        return GifViewHolder(view)
    }

    override fun onBindViewHolder(holder: GifViewHolder, position: Int) {
        val file = items[position]
        holder.bind(file)
    }

    override fun getItemCount(): Int = items.size

    inner class GifViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val ivThumb: ImageView = itemView.findViewById(R.id.iv_gif_thumb)
        private val tvName: TextView = itemView.findViewById(R.id.tv_gif_name)
        private val tvSize: TextView = itemView.findViewById(R.id.tv_gif_size)
        private val tvFormat: TextView = itemView.findViewById(R.id.tv_gif_format)
        private val tvPinBadge: TextView = itemView.findViewById(R.id.tv_pin_badge)

        fun bind(file: File) {
            val cleanName = file.nameWithoutExtension
                .removePrefix("pinned_")
                .replace('_', ' ')
            tvName.text = cleanName
            tvSize.text = formatFileSize(file.length())

            val isSticker = file.name.contains("sticker", ignoreCase = true)
            if (isSticker) {
                tvFormat.text = "STICKER"
                tvFormat.setTextColor(0xFF34D399.toInt()) // Emerald/Mint
            } else {
                tvFormat.text = "GIF"
                tvFormat.setTextColor(0xFF38BDF8.toInt()) // Cyan/Sky
            }

            val isPinned = file.name.startsWith("pinned_", ignoreCase = true)
            tvPinBadge.visibility = if (isPinned) View.VISIBLE else View.GONE

            GifThumbnailLoader.loadThumbnail(file, ivThumb)

            itemView.setOnClickListener {
                onItemClick(file)
            }

            itemView.setOnLongClickListener {
                onItemLongClick?.invoke(file)
                true
            }
        }

        private fun formatFileSize(bytes: Long): String {
            return when {
                bytes >= 1024 * 1024 -> String.format(Locale.US, "%.1fMB", bytes / (1024f * 1024f))
                bytes >= 1024 -> String.format(Locale.US, "%dKB", bytes / 1024)
                else -> "${bytes}B"
            }
        }
    }
}
