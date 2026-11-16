"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  User,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCw,
  Terminal,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useHaptics } from "@/hooks/use-haptics";
import { AiAudioWave } from "./ai-audio-wave";
import type { ChatMessage } from "@/lib/gemini";

interface AiMessageBubbleProps {
  message: ChatMessage;
  isLatest: boolean;
  isStreaming: boolean;
  onRegenerate?: () => void;
}

function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const haptics = useHaptics();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    haptics.light();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-border/80 bg-zinc-950/90 shadow-md font-mono text-xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-zinc-900/90 px-3 py-1.5 text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Terminal className="size-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
            {language || "TERMINAL"}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
          title="Copy Code"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400 font-bold">COPIED</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>COPY</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function AiMessageBubble({
  message,
  isLatest,
  isStreaming,
  onRegenerate,
}: AiMessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const haptics = useHaptics();
  const isUser = message.role === "user";

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Never render a blank message bubble unless it is actively streaming tokens
  if (!message.content?.trim() && !isStreaming) {
    return null;
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    haptics.light();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    haptics.light();

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown formatting for cleaner speech
    const cleanText = message.content
      .replace(/[*#`_~[\]()]/g, "")
      .replace(/\n+/g, " ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const formatTime = (ts?: number) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 360, damping: 25 }}
      className={`flex items-start gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Omni Bot Avatar (for model messages) */}
      {!isUser && (
        <div className="relative size-7 shrink-0 flex items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/40 shadow-sm mt-0.5">
          {isLatest && isStreaming && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-1 rounded-xl border border-dashed border-primary/50 pointer-events-none"
            />
          )}
          <Bot className="size-4" />
        </div>
      )}

      {/* Message Card */}
      <div className="flex flex-col max-w-[85%] sm:max-w-[80%] min-w-0">
        <div
          className={`rounded-2xl p-3.5 shadow-sm text-sm leading-relaxed transition-all ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-xs font-sans font-medium"
              : "bg-card/90 border border-border/80 text-foreground rounded-tl-xs backdrop-blur-md"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeStr = String(children).replace(/\n$/, "");
                    const isMultiline = codeStr.includes("\n") || Boolean(match);

                    if (isMultiline) {
                      return <CodeBlock language={match?.[1]} code={codeStr} />;
                    }

                    return (
                      <code
                        className="rounded-md bg-secondary/80 border border-border/60 px-1.5 py-0.5 font-mono text-[11px] text-primary font-semibold"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return <p className="mb-2 last:mb-0">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="my-1.5 space-y-1 pl-4 list-disc marker:text-primary">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="my-1.5 space-y-1 pl-4 list-decimal marker:text-primary font-semibold">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="text-sm leading-relaxed">{children}</li>;
                  },
                  strong({ children }) {
                    return <strong className="font-bold text-foreground">{children}</strong>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-2 border-primary/60 pl-3 my-2 text-muted-foreground italic">
                        {children}
                      </blockquote>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>

              {/* Streaming Pulsing Neon Cursor */}
              {isLatest && isStreaming && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-block w-1.5 h-4 ml-1 translate-y-0.5 rounded-xs bg-primary shadow-[0_0_8px_var(--primary)]"
                />
              )}
            </div>
          )}
        </div>

        {/* Action Bar Below Model Bubble */}
        {!isUser && !isStreaming && Boolean(message.content?.trim()) && (
          <div className="flex items-center justify-between gap-2 mt-1 px-1 text-[10px] font-mono text-muted-foreground">
            <div className="flex items-center gap-1">
              {/* Copy Message */}
              <button
                onClick={handleCopyMessage}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground transition-colors"
                title="Copy entire response"
              >
                {copied ? (
                  <>
                    <Check className="size-3 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Text-to-Speech (TTS) */}
              <button
                onClick={handleToggleSpeech}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors ${
                  isSpeaking
                    ? "bg-primary/20 text-primary font-bold"
                    : "hover:bg-muted hover:text-foreground"
                }`}
                title={isSpeaking ? "Stop speaking" : "Listen to response"}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="size-3 text-primary" />
                    <AiAudioWave isAnimating={true} barCount={3} barColor="bg-primary" />
                  </>
                ) : (
                  <>
                    <Volume2 className="size-3" />
                    <span>Speak</span>
                  </>
                )}
              </button>

              {/* Regenerate Button (Only for latest model message) */}
              {isLatest && onRegenerate && (
                <button
                  onClick={() => {
                    haptics.light();
                    onRegenerate();
                  }}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground transition-colors"
                  title="Regenerate reply"
                >
                  <RotateCw className="size-3" />
                  <span>Retry</span>
                </button>
              )}
            </div>

            {/* Timestamp */}
            {message.timestamp && (
              <span className="opacity-60 text-[9px]">
                {formatTime(message.timestamp)}
              </span>
            )}
          </div>
        )}

        {/* User Timestamp */}
        {isUser && message.timestamp && (
          <div className="flex items-center justify-end gap-2 mt-1 px-1 text-[10px] font-mono text-muted-foreground">
            <span className="opacity-60 text-[9px]">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}
      </div>

      {/* User Avatar (for user messages) */}
      {isUser && (
        <div className="size-7 shrink-0 flex items-center justify-center rounded-lg bg-secondary text-foreground border border-border/80 shadow-sm mt-0.5">
          <User className="size-4 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}
