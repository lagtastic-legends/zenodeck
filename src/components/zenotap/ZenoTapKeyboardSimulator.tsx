"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Keyboard,
  Sparkles,
  Zap,
  Check,
  Send,
  Smartphone,
  Eye,
  Sliders,
  Palette,
  Film,
  Smile,
  Delete,
} from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { setKeyboardTheme, getKeyboardTheme, type DeckGifItem } from "@/lib/zenodeck-bridge";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "user" | "partner";
  text?: string;
  mediaUrl?: string;
  mediaType?: "gif" | "sticker";
  timestamp: string;
}

interface ZenoTapKeyboardSimulatorProps {
  vaultItems?: DeckGifItem[];
  onThemeChanged?: (theme: "obsidian" | "terracotta") => void;
  className?: string;
}

const DEFAULT_SAMPLE_ITEMS: DeckGifItem[] = [
  { filename: "cyber_neon.gif", path: "", size: 142000, modified: Date.now() },
  { filename: "hype_sticker.gif", path: "", size: 88000, modified: Date.now() - 10000 },
  { filename: "mind_blown.gif", path: "", size: 210000, modified: Date.now() - 50000 },
  { filename: "zeno_thumbsup.gif", path: "", size: 125000, modified: Date.now() - 120000 },
];

export function ZenoTapKeyboardSimulator({
  vaultItems = [],
  onThemeChanged,
  className = "",
}: ZenoTapKeyboardSimulatorProps) {
  const sensory = useSensoryFeedback();
  const [theme, setTheme] = useState<"obsidian" | "terracotta">("obsidian");
  const [activeMode, setActiveMode] = useState<"vault" | "keys">("vault");
  const [activeCategory, setActiveCategory] = useState<"all" | "gifs" | "stickers" | "pinned">("all");
  const [keyEcho, setKeyEcho] = useState<string | null>(null);

  // Live Chat Sandbox State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "partner",
      text: "Yo! Did you finish making the new reaction GIF?",
      timestamp: "12:04 PM",
    },
    {
      id: "2",
      sender: "user",
      text: "Testing ZenoTap direct injection right now...",
      timestamp: "12:05 PM",
    },
  ]);
  const [inputText, setInputText] = useState("Tap space or scrub to test");
  const [cursorPos, setCursorPos] = useState(inputText.length);

  // Spacebar trackpad scrub state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubStartX = useRef(0);
  const scrubLastX = useRef(0);

  useEffect(() => {
    void getKeyboardTheme().then((t) => {
      setTheme(t);
    });
  }, []);

  const handleSwitchTheme = async (newTheme: "obsidian" | "terracotta") => {
    sensory.triggerSuccess();
    setTheme(newTheme);
    onThemeChanged?.(newTheme);
    await setKeyboardTheme(newTheme);
    toast.success(`Theme updated to ${newTheme === "obsidian" ? "Obsidian Dark" : "Terracotta Warm"}`);
  };

  const triggerEcho = (text: string, duration = 800) => {
    setKeyEcho(text);
    setTimeout(() => {
      setKeyEcho((curr) => (curr === text ? null : curr));
    }, duration);
  };

  // Spacebar pointer scrub handling
  const handleSpacePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    scrubStartX.current = e.clientX;
    scrubLastX.current = e.clientX;
    setIsScrubbing(false);
  };

  const handleSpacePointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    const deltaTotal = e.clientX - scrubStartX.current;
    if (Math.abs(deltaTotal) > 12) {
      setIsScrubbing(true);
      const deltaStep = e.clientX - scrubLastX.current;
      if (Math.abs(deltaStep) >= 12) {
        if (deltaStep > 0) {
          setCursorPos((pos) => Math.min(inputText.length, pos + 1));
          triggerEcho("CURSOR ▶", 400);
          sensory.triggerTap({ hapticOnly: true });
        } else {
          setCursorPos((pos) => Math.max(0, pos - 1));
          triggerEcho("◀ CURSOR", 400);
          sensory.triggerTap({ hapticOnly: true });
        }
        scrubLastX.current = e.clientX;
      }
    }
  };

  const handleSpacePointerUp = () => {
    if (!isScrubbing) {
      // Normal space click
      sensory.triggerTap();
      const updated = inputText.slice(0, cursorPos) + " " + inputText.slice(cursorPos);
      setInputText(updated);
      setCursorPos((p) => p + 1);
    }
    setIsScrubbing(false);
  };

  const handleBackspace = () => {
    sensory.triggerTap();
    if (cursorPos > 0) {
      const updated = inputText.slice(0, cursorPos - 1) + inputText.slice(cursorPos);
      setInputText(updated);
      setCursorPos((p) => Math.max(0, p - 1));
      triggerEcho("⌫ DEL", 400);
    }
  };

  const handleInjectMedia = (item: DeckGifItem) => {
    sensory.triggerSuccess();
    const isSticker = item.filename.includes("sticker");
    const newMsg: ChatMessage = {
      id: String(Date.now()),
      sender: "user",
      mediaUrl: item.path || "/sample-gif-placeholder.png",
      mediaType: isSticker ? "sticker" : "gif",
      text: item.filename.replace(/_/g, " ").replace(".gif", ""),
      timestamp: "Just now",
    };
    setChatMessages((prev) => [...prev, newMsg]);
    triggerEcho(`INJECTED ${isSticker ? "STICKER" : "GIF"} 🚀`, 1200);
    toast.success(`Injected "${item.filename}" into chat sandbox!`);
  };

  const handleSendTextMessage = () => {
    if (!inputText.trim()) return;
    sensory.triggerTap();
    const newMsg: ChatMessage = {
      id: String(Date.now()),
      sender: "user",
      text: inputText,
      timestamp: "Just now",
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setCursorPos(0);
  };

  const displayedItems = (vaultItems.length > 0 ? vaultItems : DEFAULT_SAMPLE_ITEMS).filter((item) => {
    if (activeCategory === "stickers") return item.filename.includes("sticker");
    if (activeCategory === "gifs") return !item.filename.includes("sticker");
    return true;
  });

  const isTerracotta = theme === "terracotta";

  return (
    <div className={`space-y-4 rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-5 backdrop-blur-xl ${className}`}>
      {/* Simulator Header & Theme Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Eye className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
              1:1 Live ZenoTap Keyboard Studio
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                Interactive IME
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Test typing, physical spacebar scrubbing, and rich media injection in real-time.
            </p>
          </div>
        </div>

        {/* Theme Segmented Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background/80 border border-border/70 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void handleSwitchTheme("obsidian")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              !isTerracotta
                ? "bg-neutral-900 text-cyan-300 shadow-sm border border-cyan-500/30 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="size-2 rounded-full bg-cyan-400" />
            Obsidian Dark
          </button>
          <button
            type="button"
            onClick={() => void handleSwitchTheme("terracotta")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              isTerracotta
                ? "bg-[#FAF5EE] text-[#342A24] shadow-sm border border-[#C2652A]/40 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="size-2 rounded-full bg-[#C2652A]" />
            Terracotta 60/30/10
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Mock Chat Sandbox on top, Live Hardware Deck below */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left/Top: Mock Messaging App Chat Sandbox (WhatsApp / Discord Simulator) */}
        <div className="lg:col-span-5 flex flex-col h-72 rounded-xl border border-border/70 bg-neutral-950/70 p-3 relative overflow-hidden">
          {/* Mock Chat Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/30 text-xs">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-[10px] text-white">
                Z
              </div>
              <span className="font-semibold text-neutral-200">Chat Sandbox (WhatsApp / Discord)</span>
            </div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
              Online
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-1.5 shadow-sm ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-neutral-800 text-neutral-200 rounded-bl-none"
                  }`}
                >
                  {msg.mediaUrl && (
                    <div className="mb-1 rounded-lg overflow-hidden border border-white/10 bg-black/40 p-1 flex items-center gap-2">
                      <Film className="size-4 text-cyan-300" />
                      <span className="font-mono text-[10px] text-cyan-200">
                        [{msg.mediaType?.toUpperCase()}] {msg.text}
                      </span>
                    </div>
                  )}
                  {msg.text && !msg.mediaUrl && <p>{msg.text}</p>}
                  <span className="text-[9px] opacity-60 block text-right mt-0.5">{msg.timestamp}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Mock Input Box */}
          <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-2">
            <div className="flex-1 bg-neutral-900 border border-neutral-700/60 rounded-xl px-2.5 py-1.5 text-xs text-neutral-200 flex items-center overflow-x-auto font-mono">
              <span>{inputText.slice(0, cursorPos)}</span>
              <span className="w-1.5 h-3.5 bg-cyan-400 animate-pulse mx-0.5" />
              <span className="opacity-70">{inputText.slice(cursorPos)}</span>
            </div>
            <button
              type="button"
              onClick={handleSendTextMessage}
              className="size-7 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Send to chat"
            >
              <Send className="size-3" />
            </button>
          </div>
        </div>

        {/* Right/Bottom: Miniature Interactive 1:1 ZenoTap Native Keyboard Deck */}
        <div
          className={`lg:col-span-7 rounded-xl border p-3 flex flex-col justify-between transition-colors duration-300 shadow-xl ${
            isTerracotta
              ? "bg-[#FAF5EE] border-[#C2652A]/30 text-[#342A24]"
              : "bg-[#0E0F14] border-neutral-800 text-neutral-200"
          }`}
        >
          {/* Top Morphing Ribbon */}
          <div className="flex items-center justify-between pb-2 border-b border-border/20 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  sensory.triggerTap();
                  setActiveMode("vault");
                  triggerEcho("⚡ VAULT ACTIVE", 600);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  activeMode === "vault"
                    ? isTerracotta
                      ? "bg-[#342A24] text-[#FAF5EE]"
                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                ⚡ Vault
              </button>
              <button
                type="button"
                onClick={() => {
                  sensory.triggerTap();
                  setActiveMode("keys");
                  triggerEcho("⌨️ FAST KEYS", 600);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  activeMode === "keys"
                    ? isTerracotta
                      ? "bg-[#342A24] text-[#FAF5EE]"
                      : "bg-neutral-800 text-white border border-neutral-700"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                ⌨️ Keys
              </button>
            </div>

            {/* Host MIME Indicator & Key Echo */}
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {keyEcho && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isTerracotta ? "bg-[#C2652A] text-white" : "bg-cyan-400 text-neutral-950"
                    }`}
                  >
                    {keyEcho}
                  </motion.span>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-1 text-[10px] font-mono opacity-80">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>GIF • WebP Ready</span>
              </div>
            </div>
          </div>

          {/* Middle Body: Media Vault Grid or QWERTY Keycaps Deck */}
          <div className="py-2 min-h-[140px] flex flex-col justify-center">
            {activeMode === "vault" ? (
              <div className="space-y-2">
                {/* Category Filter Strip */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                  {(["all", "gifs", "stickers", "pinned"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        sensory.triggerTap({ hapticOnly: true });
                        setActiveCategory(cat);
                      }}
                      className={`px-2 py-0.5 rounded-md font-mono uppercase transition-colors cursor-pointer ${
                        activeCategory === cat
                          ? isTerracotta
                            ? "bg-[#C2652A] text-white font-bold"
                            : "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Vault Media Cards */}
                <div className="grid grid-cols-4 gap-2">
                  {displayedItems.slice(0, 4).map((item, idx) => (
                    <motion.div
                      key={item.filename + idx}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleInjectMedia(item)}
                      className={`group relative rounded-xl border p-2 flex flex-col items-center justify-between text-center cursor-pointer transition-all ${
                        isTerracotta
                          ? "bg-[#EFE7DC] border-[#342A24]/15 hover:border-[#C2652A]"
                          : "bg-neutral-900 border-neutral-800 hover:border-cyan-500/40"
                      }`}
                    >
                      <span className="text-xl">
                        {item.filename.includes("sticker") ? "✨" : "🎞️"}
                      </span>
                      <p className="text-[10px] font-bold truncate w-full mt-1">
                        {item.filename.replace(/_/g, " ").replace(".gif", "")}
                      </p>
                      <div className="flex items-center justify-between w-full mt-1 text-[8px] font-mono opacity-70">
                        <span>{item.filename.includes("sticker") ? "STICKER" : "GIF"}</span>
                        <span>{Math.round(item.size / 1024)}KB</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              /* Miniature QWERTY Keys */
              <div className="space-y-1 text-center font-mono">
                {["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row, rowIdx) => (
                  <div key={rowIdx} className="flex justify-center gap-1">
                    {row.split("").map((char) => (
                      <motion.button
                        key={char}
                        whileTap={{ scale: 0.88 }}
                        onClick={() => {
                          sensory.triggerTap();
                          const updated =
                            inputText.slice(0, cursorPos) + char + inputText.slice(cursorPos);
                          setInputText(updated);
                          setCursorPos((p) => p + 1);
                          triggerEcho(char, 200);
                        }}
                        className={`size-7 sm:size-8 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer ${
                          isTerracotta
                            ? "bg-[#342A24] text-[#FAF5EE] hover:bg-[#43362E]"
                            : "bg-[#27272E] text-neutral-100 border border-neutral-700/60 hover:bg-neutral-800"
                        }`}
                      >
                        {char}
                      </motion.button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Action Bar: Open App (25%), 50% Spacebar (50%), Switch & Backspace (25%) */}
          <div className="flex items-center gap-1 pt-2 border-t border-border/20 text-xs">
            {/* App Key (25%) */}
            <button
              type="button"
              onClick={() => {
                sensory.triggerTap();
                toast.info("Navigates to main ZenoDeck studio");
              }}
              className={`w-[25%] h-8 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer truncate ${
                isTerracotta
                  ? "bg-[#EFE7DC] border-[#342A24]/20 text-[#342A24]"
                  : "bg-neutral-900 border-neutral-800 text-neutral-300"
              }`}
            >
              ⚡ ZenoDeck
            </button>

            {/* 50% Spacebar with Horizontal Cursor Trackpad Gesture */}
            <div
              onPointerDown={handleSpacePointerDown}
              onPointerMove={handleSpacePointerMove}
              onPointerUp={handleSpacePointerUp}
              onPointerCancel={handleSpacePointerUp}
              className={`w-[50%] h-8 rounded-lg flex flex-col items-center justify-center cursor-ew-resize select-none border transition-all ${
                isScrubbing
                  ? isTerracotta
                    ? "bg-[#C2652A] text-white border-[#C2652A]"
                    : "bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : isTerracotta
                  ? "bg-[#342A24] text-[#FAF5EE] border-[#342A24]"
                  : "bg-[#282834] text-white border-neutral-700"
              }`}
              title="Drag horizontally to scrub cursor, or tap for Space"
            >
              <div
                className={`w-9 h-1 rounded-full mb-0.5 transition-colors ${
                  isScrubbing
                    ? "bg-cyan-400 animate-pulse"
                    : isTerracotta
                    ? "bg-[#C2652A]"
                    : "bg-slate-400"
                }`}
              />
              <span className="text-[10px] font-mono leading-none">
                {isScrubbing ? "Scrubbing..." : "Space (50% Deck)"}
              </span>
            </div>

            {/* Switch Key (12%) */}
            <button
              type="button"
              onClick={() => {
                sensory.triggerTap();
                setActiveMode((m) => (m === "vault" ? "keys" : "vault"));
              }}
              className={`w-[12%] h-8 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center ${
                isTerracotta
                  ? "bg-[#EFE7DC] border-[#342A24]/20 text-[#342A24]"
                  : "bg-neutral-900 border-neutral-800 text-neutral-300"
              }`}
              title="Toggle Keys / Vault"
            >
              ⌨
            </button>

            {/* Backspace Key (13%) */}
            <button
              type="button"
              onClick={handleBackspace}
              className={`w-[13%] h-8 rounded-lg text-[12px] font-bold border transition-colors cursor-pointer flex items-center justify-center text-red-400 ${
                isTerracotta
                  ? "bg-[#EFE7DC] border-[#342A24]/20 hover:bg-red-500/10"
                  : "bg-neutral-900 border-neutral-800 hover:bg-red-500/10"
              }`}
              title="Backspace / Delete"
            >
              ⌫
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
