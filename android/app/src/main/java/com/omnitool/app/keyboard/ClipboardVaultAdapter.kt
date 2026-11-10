package com.omnitool.app.keyboard

import android.text.format.DateUtils
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.omnitool.app.R

data class ClipboardVaultItem(
    val id: String,
    val text: String,
    val timestamp: Long,
    var isPinned: Boolean = false
)

/**
 * ClipboardVaultAdapter
 *
 * RecyclerView adapter for displaying the 30-slot persistent clipboard vault items
 * with 1-tap paste, pin/unpin toggles, and individual item deletion.
 */
class ClipboardVaultAdapter(
    private val onClipClick: (ClipboardVaultItem) -> Unit,
    private val onPinToggle: (ClipboardVaultItem) -> Unit,
    private val onDeleteClick: (ClipboardVaultItem) -> Unit
) : RecyclerView.Adapter<ClipboardVaultAdapter.ClipboardViewHolder>() {

    private val items = mutableListOf<ClipboardVaultItem>()

    fun submitList(newItems: List<ClipboardVaultItem>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ClipboardViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_clipboard_cell, parent, false)
        return ClipboardViewHolder(view)
    }

    override fun onBindViewHolder(holder: ClipboardViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    inner class ClipboardViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvPinIcon: TextView = itemView.findViewById(R.id.tv_clip_pin_icon)
        private val tvContent: TextView = itemView.findViewById(R.id.tv_clip_content)
        private val tvTimestamp: TextView = itemView.findViewById(R.id.tv_clip_timestamp)
        private val btnPin: ImageButton = itemView.findViewById(R.id.btn_clip_pin)
        private val btnDelete: ImageButton = itemView.findViewById(R.id.btn_clip_delete)

        fun bind(item: ClipboardVaultItem) {
            tvContent.text = item.text
            tvPinIcon.visibility = if (item.isPinned) View.VISIBLE else View.GONE

            val timeAgo = DateUtils.getRelativeTimeSpanString(
                item.timestamp,
                System.currentTimeMillis(),
                DateUtils.MINUTE_IN_MILLIS,
                DateUtils.FORMAT_ABBREV_RELATIVE
            )
            tvTimestamp.text = timeAgo

            btnPin.setColorFilter(if (item.isPinned) 0xFFF59E0B.toInt() else 0xFF94A3B8.toInt())

            itemView.setOnClickListener {
                onClipClick(item)
            }

            btnPin.setOnClickListener {
                onPinToggle(item)
            }

            btnDelete.setOnClickListener {
                onDeleteClick(item)
            }
        }
    }
}
