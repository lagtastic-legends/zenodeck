import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage } from '../lib/gemini';

interface AiState {
  isOpen: boolean;
  isExpanded: boolean;
  isStreaming: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  setIsExpanded: (isExpanded: boolean) => void;
  toggleExpanded: () => void;
  setStreaming: (isStreaming: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  removeLastMessage: () => void;
  setLoading: (isLoading: boolean) => void;
  clearChat: () => void;
  sendMessage: (prompt: string, signal?: AbortSignal) => Promise<void>;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      isOpen: false,
      isExpanded: false,
      isStreaming: false,
      messages: [
        {
          id: 'welcome-msg',
          role: 'model',
          content: "Hello! I'm **Zeno**, your client-side AI co-pilot. I can guide you through video compression, vocal cancellation, 8D audio, PDF tools, and local storage.",
          timestamp: Date.now(),
        }
      ],
      isLoading: false,
      setIsOpen: (isOpen) => set({ isOpen }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setIsExpanded: (isExpanded) => set({ isExpanded }),
      toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
      setStreaming: (isStreaming) => set({ isStreaming }),
      addMessage: (message) => set((state) => {
        if (!message.content || !message.content.trim()) {
          return state;
        }
        return {
          messages: [
            ...state.messages,
            {
              ...message,
              id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              timestamp: message.timestamp || Date.now(),
            }
          ]
        };
      }),
      updateLastMessage: (content) => set((state) => {
        const newMessages = [...state.messages];
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content,
          };
        }
        return { messages: newMessages };
      }),
      removeLastMessage: () => set((state) => ({
        messages: state.messages.slice(0, -1),
      })),
      setLoading: (isLoading) => set({ isLoading }),
      clearChat: () => set({
        messages: [
          {
            id: `welcome-${Date.now()}`,
            role: 'model',
            content: "Hello! I'm **Zeno**, your client-side AI co-pilot. How can I help you today?",
            timestamp: Date.now(),
          }
        ]
      }),
      sendMessage: async (prompt: string, signal?: AbortSignal) => {
        const cleanPrompt = prompt.trim();
        if (!cleanPrompt) return;

        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: `msg-${Date.now()}-user`,
              role: 'user',
              content: cleanPrompt,
              timestamp: Date.now(),
            },
          ],
          isLoading: true,
          isStreaming: false,
        }));

        try {
          const { streamAiResponse, generateAiResponse } = await import('../lib/gemini');
          const currentMessages = useAiStore
            .getState()
            .messages.filter(
              (m) => m && typeof m.content === 'string' && m.content.trim().length > 0
            );

          let fullContent = '';
          let isFirstChunk = true;
          let streamFailed = false;

          try {
            const stream = streamAiResponse(currentMessages, signal);
            for await (const chunk of stream) {
              if (signal?.aborted) break;
              if (chunk.includes('[Connection failed:')) {
                streamFailed = true;
                break;
              }

              if (isFirstChunk) {
                set({ isLoading: false, isStreaming: true });
                isFirstChunk = false;
                fullContent = chunk;
                set((state) => ({
                  messages: [
                    ...state.messages,
                    {
                      id: `msg-${Date.now()}-model`,
                      role: 'model',
                      content: fullContent,
                      timestamp: Date.now(),
                    },
                  ],
                }));
              } else {
                fullContent += chunk;
                set((state) => {
                  const msgs = [...state.messages];
                  if (msgs.length > 0) {
                    msgs[msgs.length - 1] = {
                      ...msgs[msgs.length - 1],
                      content: fullContent,
                    };
                  }
                  return { messages: msgs };
                });
              }
            }
          } catch {
            streamFailed = true;
          }

          if ((isFirstChunk || streamFailed) && !signal?.aborted) {
            set({ isLoading: true, isStreaming: false });
            const fallbackText = await generateAiResponse(currentMessages);
            set({ isLoading: false, isStreaming: false });
            if (isFirstChunk) {
              set((state) => ({
                messages: [
                  ...state.messages,
                  {
                    id: `msg-${Date.now()}-model`,
                    role: 'model',
                    content: fallbackText,
                    timestamp: Date.now(),
                  },
                ],
              }));
            } else {
              set((state) => {
                const msgs = [...state.messages];
                if (msgs.length > 0) {
                  msgs[msgs.length - 1] = {
                    ...msgs[msgs.length - 1],
                    content: fallbackText,
                  };
                }
                return { messages: msgs };
              });
            }
          } else {
            set({ isStreaming: false, isLoading: false });
          }
        } catch (err: any) {
          set({ isLoading: false, isStreaming: false });
          set((state) => ({
            messages: [
              ...state.messages,
              {
                id: `msg-${Date.now()}-err`,
                role: 'model',
                content: `Connection failed: ${err?.message || 'Unable to connect to AI server'}`,
                timestamp: Date.now(),
              },
            ],
          }));
        }
      },
    }),
    {
      name: 'zeno-ai-storage',
      partialize: (state) => ({ messages: state.messages, isExpanded: state.isExpanded }),
      merge: (persistedState: any, currentState: AiState) => {
        const raw = persistedState?.messages;
        const validMessages = Array.isArray(raw)
          ? raw.filter(
              (m: ChatMessage) =>
                m && typeof m.content === 'string' && m.content.trim().length > 0
            )
          : currentState.messages;

        return {
          ...currentState,
          ...persistedState,
          messages: validMessages.length > 0 ? validMessages : currentState.messages,
        };
      },
    }
  )
);
