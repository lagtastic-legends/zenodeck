'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Bot,
  Square,
  Maximize2,
  Minimize2,
  RefreshCw,
  CornerDownLeft,
} from 'lucide-react';
import { useAiStore } from '../store/useAiStore';
import { streamAiResponse, generateAiResponse, type ChatMessage } from '../lib/gemini';
import { useHaptics } from '@/hooks/use-haptics';
import { AiMessageBubble } from './ai/ai-message-bubble';
import { AiThinkingIndicator } from './ai/ai-thinking-indicator';
import { AiSuggestionChips } from './ai/ai-suggestion-chips';
import { AiAudioWave } from './ai/ai-audio-wave';

interface AskOmniProps {
  showTrigger?: boolean;
}

export default function AskOmni({ showTrigger = false }: AskOmniProps) {
  const {
    isOpen,
    toggleOpen,
    setIsOpen,
    isExpanded,
    toggleExpanded,
    messages,
    addMessage,
    updateLastMessage,
    removeLastMessage,
    isLoading,
    setLoading,
    isStreaming,
    setStreaming,
    clearChat,
  } = useAiStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const haptics = useHaptics();

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(true);
    }
  }, [messages, isLoading, isStreaming, isOpen, scrollToBottom]);

  // Global escape key to close or stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (isStreaming) {
          handleStop();
        } else {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isStreaming, setIsOpen]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
    setLoading(false);
    haptics.light();
  };

  const handleSendPrompt = async (promptText: string, isRetry = false) => {
    if (!promptText.trim() || isLoading || isStreaming) return;

    haptics.light();
    const userText = promptText.trim();
    setInput('');

    if (!isRetry) {
      addMessage({
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      });
    }

    setLoading(true);
    setStreaming(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Gather non-empty messages to provide pristine conversation context
      const currentMessages = useAiStore
        .getState()
        .messages.filter(
          (m) => m && typeof m.content === 'string' && m.content.trim().length > 0
        );

      let fullContent = '';
      let isFirstChunk = true;
      let streamFailed = false;

      try {
        const stream = streamAiResponse(currentMessages, controller.signal);

        for await (const chunk of stream) {
          if (controller.signal.aborted) break;

          // If stream yielded a connection error, mark as failed to try non-streaming fallback
          if (chunk.includes("[Connection failed:")) {
            streamFailed = true;
            break;
          }

          if (isFirstChunk) {
            setLoading(false);
            setStreaming(true);
            isFirstChunk = false;
            fullContent = chunk;
            addMessage({
              role: 'model',
              content: fullContent,
              timestamp: Date.now(),
            });
          } else {
            fullContent += chunk;
            updateLastMessage(fullContent);
          }
        }
      } catch (streamErr) {
        streamFailed = true;
      }

      // If stream ended without chunks or encountered connection issues, attempt non-streaming fallback
      if ((isFirstChunk || streamFailed) && !controller.signal.aborted) {
        setLoading(true);
        setStreaming(false);
        const fallbackText = await generateAiResponse(currentMessages);
        setLoading(false);

        if (fallbackText && !fallbackText.includes("Connection failed:")) {
          if (isFirstChunk) {
            addMessage({
              role: 'model',
              content: fallbackText,
              timestamp: Date.now(),
            });
            isFirstChunk = false;
          } else {
            updateLastMessage(fallbackText);
          }
        } else {
          if (isFirstChunk) {
            addMessage({
              role: 'model',
              content: fallbackText || "I apologize, but I couldn't generate a response. Please try asking again.",
              timestamp: Date.now(),
            });
          }
        }
      }
    } catch (error: any) {
      if (!controller.signal.aborted) {
        setLoading(false);
        addMessage({
          role: 'model',
          content: 'Connection to Omni network failed. Please verify connection and try again.',
          timestamp: Date.now(),
        });
      }
    } finally {
      setLoading(false);
      setStreaming(false);
      abortControllerRef.current = null;
      // Safeguard: remove any trailing empty model message if aborted prematurely
      const state = useAiStore.getState();
      const lastMsg = state.messages[state.messages.length - 1];
      if (lastMsg && lastMsg.role === 'model' && !lastMsg.content?.trim()) {
        state.removeLastMessage();
      }
    }
  };

  const handleRegenerate = () => {
    if (isLoading || isStreaming || messages.length < 2) return;

    // Find the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    // Remove the current last model message
    removeLastMessage();

    // Re-trigger with isRetry = true so user prompt is not duplicated
    handleSendPrompt(lastUserMsg.content, true);
  };

  return (
    <>
      {/* Optional Legacy Floating Action Button */}
      {showTrigger && !isOpen && (
        <button
          onClick={() => {
            haptics.light();
            toggleOpen();
          }}
          aria-label="Open Ask Zeno AI Assistant"
          className="fixed bottom-24 right-6 z-50 p-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 360, damping: 27, mass: 0.75 }}
            style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
            className={`fixed bottom-20 right-4 sm:right-6 z-[70] rounded-2xl bg-card/95 backdrop-blur-3xl border border-border/80 shadow-2xl flex flex-col overflow-hidden will-change-[transform,opacity] transition-all duration-300 ${
              isExpanded
                ? 'w-[calc(100vw-32px)] sm:w-[580px] h-[720px] max-h-[90vh]'
                : 'w-[calc(100vw-32px)] sm:w-[420px] h-[600px] max-h-[82vh]'
            }`}
          >
            {/* Ambient Top Glow Line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-border/70 bg-card/80 backdrop-blur-md select-none shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative size-8 rounded-xl bg-primary/20 text-primary border border-primary/40 flex items-center justify-center shadow-sm">
                  <Bot className="size-4.5" />
                  <motion.div
                    animate={isStreaming ? { rotate: 360 } : {}}
                    transition={isStreaming ? { duration: 3, repeat: Infinity, ease: 'linear' } : undefined}
                    className="absolute -inset-0.5 rounded-xl border border-primary/30 pointer-events-none"
                  />
                </div>

                <div className="flex flex-col leading-none">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-sm tracking-wide text-foreground">
                      Ask Zeno
                    </h3>
                    {/* Live Neural Status Badge */}
                    <div className="flex items-center gap-1 rounded-full bg-secondary/80 border border-border/60 px-2 py-0.5 text-[9px] font-mono font-semibold">
                      {isLoading ? (
                        <>
                          <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                          <span className="text-amber-300">THINKING</span>
                        </>
                      ) : isStreaming ? (
                        <>
                          <AiAudioWave isAnimating={true} barCount={3} barColor="bg-primary" />
                          <span className="text-primary font-bold">STREAMING</span>
                        </>
                      ) : (
                        <>
                          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                          <span className="text-emerald-400">ONLINE</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono mt-1">
                    Client-Side Media Co-Pilot
                  </span>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    haptics.light();
                    toggleExpanded();
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                  title={isExpanded ? 'Restore compact size' : 'Expand window'}
                >
                  {isExpanded ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                </button>

                <button
                  onClick={() => {
                    haptics.light();
                    clearChat();
                  }}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-muted"
                  title="Clear Chat History"
                >
                  <Trash2 className="size-4" />
                </button>

                <button
                  onClick={() => {
                    haptics.light();
                    toggleOpen();
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                  title="Close (Esc)"
                >
                  <X className="size-4.5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/40 scrollbar-thin scrollbar-thumb-border">
              {messages
                .filter((msg) => Boolean(msg.content && msg.content.trim()))
                .map((msg, idx, arr) => {
                  const isLatest = idx === arr.length - 1;
                  return (
                    <AiMessageBubble
                      key={msg.id || idx}
                      message={msg}
                      isLatest={isLatest}
                      isStreaming={isLatest && isStreaming}
                      onRegenerate={handleRegenerate}
                    />
                  );
                })}

              {/* Animated Thinking Bar when waiting for response */}
              <AnimatePresence>
                {isLoading && !isStreaming && (
                  <AiThinkingIndicator statusText="Zeno is analyzing your query..." />
                )}
              </AnimatePresence>

              {/* Suggestion Chips when only greeting is present */}
              {messages.length <= 1 && !isLoading && !isStreaming && (
                <AiSuggestionChips
                  onSelectPrompt={(prompt) => handleSendPrompt(prompt)}
                  disabled={isLoading || isStreaming}
                />
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer Area */}
            <div className="p-3 border-t border-border/70 bg-card/80 backdrop-blur-md shrink-0">
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  disabled={isLoading && !isStreaming}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendPrompt(input);
                    }
                  }}
                  placeholder={
                    isStreaming
                      ? 'Generating response...'
                      : 'Ask Zeno about audio, video, PDF, or vault...'
                  }
                  className="w-full bg-secondary/50 border border-border/80 rounded-xl py-3 pl-3.5 pr-20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all font-sans"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  {/* Stop Generation Button when streaming */}
                  {isStreaming ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStop}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-mono font-bold shadow-sm hover:bg-destructive/90 transition-all"
                      title="Stop generation"
                    >
                      <Square className="size-3 fill-current" />
                      <span>STOP</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSendPrompt(input)}
                      disabled={!input.trim() || isLoading}
                      className="p-2 rounded-lg text-primary hover:bg-primary/15 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                      title="Send message (Enter)"
                    >
                      <Send className="size-4" />
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Bottom Micro Hint */}
              <div className="flex items-center justify-between mt-1.5 px-1 font-mono text-[9px] text-muted-foreground select-none">
                <span className="flex items-center gap-1">
                  <Sparkles className="size-2.5 text-primary" />
                  <span>Gemini 3.8 Flash Neural Engine</span>
                </span>
                <span>Enter ↵ to send · Esc to close</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
