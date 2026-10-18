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
import {
  setKeyboardTheme,
  getKeyboardTheme,
  type DeckGifItem,
  type KeyboardTheme,
} from "@/lib/zenodeck-bridge";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "user" | "partner";
  text?: string;
  mediaUrl?: string;
  mediaType?: "gif" | "sticker";
  timestamp: string;
}

export interface ZenoTapInjectedItem {
  filename: string;
  caption?: string;
  speed?: number;
  url?: string;
  timestamp?: number;
}

interface ZenoTapKeyboardSimulatorProps {
  vaultItems?: DeckGifItem[];
  onThemeChanged?: (theme: KeyboardTheme) => void;
  className?: string;
  injectedItem?: ZenoTapInjectedItem | null;
  onSelectInspectItem?: (item: DeckGifItem) => void;
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
  injectedItem = null,
  onSelectInspectItem,
}: ZenoTapKeyboardSimulatorProps) {
  const sensory = useSensoryFeedback();
  const [theme, setTheme] = useState<KeyboardTheme>("glacier");
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

  // Sync external direct injection from Active Media Inspector
  useEffect(() => {
    if (!injectedItem) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const isSticker = injectedItem.filename.includes("sticker");
    setChatMessages((prev) => [
      ...prev,
      {
        id: `inject-${Date.now()}`,
        sender: "user",
        text:
          injectedItem.caption ||
          injectedItem.filename.replace(/^pinned_/, "").replace(/\.(gif|webp)$/i, "").replace(/_/g, " "),
        mediaUrl: injectedItem.url || "",
        mediaType: isSticker ? "sticker" : "gif",
        timestamp: now,
      },
    ]);
    setKeyEcho("⚡ DIRECT INJECTED");
    setTimeout(() => setKeyEcho(null), 1200);
    sensory.triggerSuccess();
  }, [injectedItem]);

  const handleSwitchTheme = async (newTheme: KeyboardTheme) => {
    sensory.triggerSuccess();
    setTheme(newTheme);
    onThemeChanged?.(newTheme);
    await setKeyboardTheme(newTheme);
    const label =
      newTheme === "glacier"
        ? "Glacier Frozen Light"
        : newTheme === "terracotta"
        ? "Terracotta Warm"
        : "Obsidian Dark";
    toast.success(`Theme updated to ${label}`);
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

  const isGlacier = theme === "glacier";
  const isTerracotta = theme === "terracotta";

  return (
    <div
      className={`space-y-4 rounded-2xl border p-4 sm:p-5 backdrop-blur-xl transition-colors ${
        isGlacier
          ? "bg-[#0f1524]/60 border-sky-400/20 shadow-[0_0_30px_rgba(125,211,252,0.05)] text-[#e0e8f0]"
          : "border-border/70 bg-card/60"
      } ${className}`}
    >
      {/* Simulator Header & Theme Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className={`size-8 rounded-xl border flex items-center justify-center ${
            isGlacier
              ? "bg-sky-400/10 border-sky-400/30 text-[#7dd3fc] shadow-[0_0_15px_rgba(125,211,252,0.2)]"
              : "bg-primary/10 border-primary/20 text-primary"
          }`}>
            <Eye className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-display flex items-center gap-2">
              1:1 Live ZenoTap Keyboard Studio
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-mono ${
                isGlacier
                  ? "bg-sky-400/10 text-[#7dd3fc] border-sky-400/30"
                  : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
              }`}>
                Glacier Glass IME
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Test typing, physical spacebar scrubbing, and rich media injection in real-time.
            </p>
          </div>
        </div>

        {/* Theme Segmented Switcher (Glacier / Obsidian / Terracotta) */}
        <div className={`flex items-center gap-1.5 p-1 rounded-xl border text-xs self-start sm:self-auto ${
          isGlacier ? "bg-[#0a0e1a]/80 border-sky-400/20" : "bg-background/80 border-border/70"
        }`}>
          <button
            type="button"
            onClick={() => void handleSwitchTheme("glacier")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              isGlacier
                ? "bg-[#141c2e] text-[#7dd3fc] shadow-sm border border-sky-400/40 font-semibold shadow-[0_0_12px_rgba(125,211,252,0.2)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="size-2 rounded-full bg-[#7dd3fc] shadow-[0_0_8px_rgba(125,211,252,0.6)]" />
            Glacier
          </button>
          <button
            type="button"
            onClick={() => void handleSwitchTheme("obsidian")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              theme === "obsidian"
                ? "bg-neutral-900 text-cyan-300 shadow-sm border border-cyan-500/30 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="size-2 rounded-full bg-cyan-400" />
            Obsidian
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
            Terracotta
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Mock Chat Sandbox on top, Live Hardware Deck below */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left/Top: Mock Messaging App Chat Sandbox (WhatsApp / Discord Simulator) */}
        <div
          className={`lg:col-span-5 flex flex-col h-72 rounded-xl border p-3 relative overflow-hidden transition-colors ${
            isGlacier
              ? "border-sky-400/25 bg-[#0a0e1a]/90 backdrop-blur-xl shadow-[0_0_30px_rgba(125,211,252,0.05)] text-[#e0e8f0]"
              : isTerracotta
              ? "border-[#C2652A]/30 bg-[#FAF5EE] text-[#342A24]"
              : "border-border/70 bg-neutral-950/70 text-neutral-200"
          }`}
        >
          {/* Mock Chat Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/30 text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`size-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  isGlacier
                    ? "bg-[#7dd3fc] text-[#001f2e] shadow-[0_0_10px_rgba(125,211,252,0.3)]"
                    : "bg-indigo-600 text-white"
                }`}
              >
                Z
              </div>
              <span
                className={`font-semibold ${
                  isGlacier ? "text-[#e0e8f0]" : isTerracotta ? "text-[#342A24]" : "text-neutral-200"
                }`}
              >
                Chat Sandbox (Discord / WhatsApp)
              </span>
            </div>
            <span
              className={`text-[10px] flex items-center gap-1 ${
                isGlacier ? "text-[#7dd3fc]" : "text-emerald-400"
              }`}
            >
              <span
                className={`size-1.5 rounded-full animate-ping ${
                  isGlacier ? "bg-[#7dd3fc]" : "bg-emerald-400"
                }`}
              />
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
                      ? isGlacier
                        ? "bg-[#7dd3fc] text-[#001f2e] font-medium shadow-md shadow-sky-400/20 rounded-br-none"
                        : isTerracotta
                        ? "bg-[#C2652A] text-white rounded-br-none"
                        : "bg-indigo-600 text-white rounded-br-none"
                      : isGlacier
                      ? "bg-[#141c2e] text-[#e0e8f0] border border-sky-400/20 rounded-bl-none"
                      : isTerracotta
                      ? "bg-[#EFE7DC] text-[#342A24] rounded-bl-none"
                      : "bg-neutral-800 text-neutral-200 rounded-bl-none"
                  }`}
                >
                  {msg.mediaUrl && (
                    <div
                      className={`mb-1 rounded-lg overflow-hidden border p-1 flex items-center gap-2 ${
                        isGlacier ? "border-sky-400/30 bg-[#0a0e1a]/80" : "border-white/10 bg-black/40"
                      }`}
                    >
                      <Film className={`size-4 ${isGlacier ? "text-[#7dd3fc]" : "text-cyan-300"}`} />
                      <span className={`font-mono text-[10px] ${isGlacier ? "text-[#7dd3fc]" : "text-cyan-200"}`}>
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
            <div
              className={`flex-1 rounded-xl px-2.5 py-1.5 text-xs flex items-center overflow-x-auto font-mono ${
                isGlacier
                  ? "bg-[#0f1524] border border-sky-400/30 text-[#e0e8f0]"
                  : isTerracotta
                  ? "bg-[#EFE7DC] border border-[#342A24]/20 text-[#342A24]"
                  : "bg-neutral-900 border border-neutral-700/60 text-neutral-200"
              }`}
            >
              <span>{inputText.slice(0, cursorPos)}</span>
              <span
                className={`w-1.5 h-3.5 animate-pulse mx-0.5 ${
                  isGlacier ? "bg-[#7dd3fc]" : isTerracotta ? "bg-[#C2652A]" : "bg-cyan-400"
                }`}
              />
              <span className="opacity-70">{inputText.slice(cursorPos)}</span>
            </div>
            <button
              type="button"
              onClick={handleSendTextMessage}
              className={`size-7 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                isGlacier
                  ? "bg-[#7dd3fc] hover:bg-[#7dd3fc]/90 text-[#001f2e] shadow-md shadow-sky-400/25"
                  : isTerracotta
                  ? "bg-[#C2652A] hover:bg-[#A8521C] text-white"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
              title="Send to chat"
            >
              <Send className="size-3" />
            </button>
          </div>
        </div>

        {/* Right/Bottom: Miniature Interactive 1:1 ZenoTap Native Keyboard Deck */}
        <div
          className={`lg:col-span-7 rounded-xl border p-3 flex flex-col justify-between transition-colors duration-300 shadow-xl ${
            isGlacier
              ? "bg-[#0f1524]/90 border-sky-400/25 text-[#e0e8f0] backdrop-blur-2xl shadow-[0_0_30px_rgba(125,211,252,0.06)]"
              : isTerracotta
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
                    ? isGlacier
                      ? "bg-[#7dd3fc]/15 text-[#7dd3fc] border border-[#7dd3fc]/40 shadow-[0_0_12px_rgba(125,211,252,0.2)]"
                      : isTerracotta
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
                    ? isGlacier
                      ? "bg-[#7dd3fc]/15 text-[#7dd3fc] border border-[#7dd3fc]/40 shadow-[0_0_12px_rgba(125,211,252,0.2)]"
                      : isTerracotta
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
                      isGlacier
                        ? "bg-[#7dd3fc] text-[#001f2e]"
                        : isTerracotta
                        ? "bg-[#C2652A] text-white"
                        : "bg-cyan-400 text-neutral-950"
                    }`}
                  >
                    {keyEcho}
                  </motion.span>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-1 text-[10px] font-mono opacity-80">
                <span
                  className={`size-2 rounded-full animate-pulse ${
                    isGlacier ? "bg-[#7dd3fc]" : "bg-emerald-400"
                  }`}
                />
                <span>{isGlacier ? "Glacier • WebP 60FPS" : "GIF • WebP Ready"}</span>
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
                          ? isGlacier
                            ? "bg-[#7dd3fc] text-[#001f2e] font-bold shadow-sm shadow-sky-400/20"
                            : isTerracotta
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
                        isGlacier
                          ? "bg-[#141c2e]/90 border-sky-400/20 hover:border-[#7dd3fc]/60 hover:-translate-y-0.5 shadow-sm"
                          : isTerracotta
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
                        <span className={isGlacier ? "text-[#7dd3fc]" : ""}>
                          {item.filename.includes("sticker") ? "STICKER" : "GIF"}
                        </span>
                        <span>{Math.round(item.size / 1024)}KB</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              /* Miniature QWERTY Keys */
              <div className="space-y-1 text-center font-mono w-full max-w-full overflow-hidden px-0.5">
                {["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row, rowIdx) => (
                  <div key={rowIdx} className="flex justify-center gap-0.5 sm:gap-1 w-full">
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
                        className={`flex-1 min-w-0 max-w-8 h-7 sm:h-8 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center justify-center p-0 ${
                          isGlacier
                            ? "bg-[#141c2e]/90 text-[#e0e8f0] border border-sky-400/20 hover:border-[#7dd3fc]/60 hover:bg-[#1a2438]"
                            : isTerracotta
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
              className={`w-[25%] h-8 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer truncate px-1 flex items-center justify-center ${
                isGlacier
                  ? "bg-[#141c2e] border-sky-400/25 text-[#7dd3fc]"
                  : isTerracotta
                  ? "bg-[#EFE7DC] border-[#342A24]/20 text-[#342A24]"
                  : "bg-neutral-900 border-neutral-800 text-neutral-300"
              }`}
            >
              <span className="hidden sm:inline">⚡ ZenoDeck</span>
              <span className="sm:hidden">⚡ App</span>
            </button>

            {/* 50% Spacebar with Horizontal Cursor Trackpad Gesture */}
            <div
              onPointerDown={handleSpacePointerDown}
              onPointerMove={handleSpacePointerMove}
              onPointerUp={handleSpacePointerUp}
              onPointerCancel={handleSpacePointerUp}
              className={`w-[50%] h-8 rounded-lg flex flex-col items-center justify-center cursor-ew-resize select-none border transition-all ${
                isScrubbing
                  ? isGlacier
                    ? "bg-sky-950/90 border-[#7dd3fc] text-[#7dd3fc] shadow-[0_0_15px_rgba(125,211,252,0.35)]"
                    : isTerracotta
                    ? "bg-[#C2652A] text-white border-[#C2652A]"
                    : "bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : isGlacier
                  ? "bg-[#141c2e] text-[#e0e8f0] border-sky-400/25"
                  : isTerracotta
                  ? "bg-[#342A24] text-[#FAF5EE] border-[#342A24]"
                  : "bg-[#282834] text-white border-neutral-700"
              }`}
              title="Drag horizontally to scrub cursor, or tap for Space"
            >
              <div
                className={`w-9 h-1 rounded-full mb-0.5 transition-colors ${
                  isScrubbing
                    ? isGlacier
                      ? "bg-[#7dd3fc] animate-pulse"
                      : "bg-cyan-400 animate-pulse"
                    : isGlacier
                    ? "bg-[#7dd3fc]"
                    : isTerracotta
                    ? "bg-[#C2652A]"
                    : "bg-slate-400"
                }`}
              />
              <span className="text-[10px] font-mono leading-none truncate px-1">
                {isScrubbing ? "Scrubbing..." : "Space"}
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
                isGlacier
                  ? "bg-[#141c2e] border-sky-400/25 text-[#88b4cc]"
                  : isTerracotta
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
              className={`w-[13%] h-8 rounded-lg text-[12px] font-bold border transition-colors cursor-pointer flex items-center justify-center ${
                isGlacier
                  ? "bg-[#141c2e] border-sky-400/25 text-[#c8a0f0] hover:bg-sky-500/10"
                  : isTerracotta
                  ? "bg-[#EFE7DC] border-[#342A24]/20 hover:bg-red-500/10 text-red-400"
                  : "bg-neutral-900 border-neutral-800 hover:bg-red-500/10 text-red-400"
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
