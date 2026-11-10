package com.omnitool.app.keyboard

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.omnitool.app.R

/**
 * EmojiDeckAdapter
 *
 * High-performance 7-column RecyclerView adapter for rendering Unicode emojis
 * with zero-lag tap insertion and instant haptic feedback.
 */
class EmojiDeckAdapter(
    private val onEmojiClick: (String) -> Unit
) : RecyclerView.Adapter<EmojiDeckAdapter.EmojiViewHolder>() {

    private val emojis = mutableListOf<String>()

    fun submitList(newEmojis: List<String>) {
        emojis.clear()
        emojis.addAll(newEmojis)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): EmojiViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_emoji_cell, parent, false)
        return EmojiViewHolder(view)
    }

    override fun onBindViewHolder(holder: EmojiViewHolder, position: Int) {
        val emoji = emojis[position]
        holder.bind(emoji)
    }

    override fun getItemCount(): Int = emojis.size

    inner class EmojiViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvEmoji: TextView = itemView.findViewById(R.id.tv_emoji_char)

        fun bind(emoji: String) {
            tvEmoji.text = emoji
            itemView.setOnClickListener {
                onEmojiClick(emoji)
            }
        }
    }
}
