'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Bot, RotateCcw, ShieldCheck, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'cipher';
  text: string;
  timestamp: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'cipher-intro',
  sender: 'cipher',
  text: 'Welcome to the Syndicate. I am Cipher, your private sneaker concierge. Need sizing guidance, drop reservations, or style pairing?',
  timestamp: 'Just now',
};

const QUICK_CHIPS = [
  'Drop Schedule & Raffles',
  'Travis Scott AJ1 Price & Sizes',
  'Sizing Guide: Dunks vs AF1',
];

export function SyndicateAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  const sendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputValue).trim();
    if (!messageText || isTyping) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: timeString,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setHasInteracted(true);

    try {
      const backendUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
      let res: Response | null = null;

      try {
        res = await fetch(`${backendUrl}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageText }),
        });
      } catch (directErr) {
        // Fallback: try relative /api/ai/chat proxy in case of browser CORS or hostname variance
        try {
          res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: messageText }),
          });
        } catch {
          throw directErr;
        }
      }

      if (!res || !res.ok) {
        const errorText = res ? await res.text() : 'No response';
        throw new Error(`HTTP ${res?.status || 500}: ${errorText}`);
      }

      const data = await res.json();
      const reply = data.reply || data.response || (data.data && (data.data.reply || data.data.response)) || "Couldn't reach Cipher.";

      const cipherMessage: ChatMessage = {
        id: `cipher-${Date.now()}`,
        sender: 'cipher',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, cipherMessage]);
    } catch (err) {
      console.error('Cipher Widget Error:', err);
      const errorMessage: ChatMessage = {
        id: `cipher-${Date.now()}`,
        sender: 'cipher',
        text: "Apologies, the Syndicate secure channel is momentarily experiencing high volume. You can still reach our team directly or retry in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setHasInteracted(false);
  };

  return (
    <>
      {/* Floating Trigger Button (Positioned at bottom-right, accommodating mobile navigation) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-3"
          >
            {/* Cipher teaser bubble on desktop before first interaction */}
            {!hasInteracted && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
                onClick={() => setIsOpen(true)}
                className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-[#121212]/95 border border-[#C9A961]/40 rounded-full shadow-xl cursor-pointer hover:border-[#C9A961] transition-all group backdrop-blur-md"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-[#EDEDED] group-hover:text-[#C9A961] transition-colors">
                  Ask Cipher • Syndicate Concierge
                </span>
              </motion.div>
            )}

            <button
              onClick={() => setIsOpen(true)}
              aria-label="Open Velvet Syndicate AI Concierge"
              className="relative group flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#1A1A1A] via-[#0D0D0D] to-[#0A0A0A] border-2 border-[#C9A961]/60 hover:border-[#C9A961] shadow-[0_4px_25px_rgba(201,169,97,0.25)] hover:shadow-[0_4px_35px_rgba(201,169,97,0.45)] transition-all duration-300"
            >
              {/* Outer pulsing gold halo */}
              <div className="absolute inset-0 rounded-full bg-[#C9A961]/10 group-hover:bg-[#C9A961]/20 animate-ping opacity-60 pointer-events-none" />

              <div className="relative flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#C9A961] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
              </div>

              {/* Status Indicator */}
              <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#0A0A0A]" />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[410px] h-[580px] max-h-[82vh] flex flex-col rounded-2xl bg-[#0A0A0A]/95 backdrop-blur-2xl border border-[#C9A961]/40 shadow-[0_16px_45px_rgba(0,0,0,0.9),0_0_30px_rgba(201,169,97,0.18)] overflow-hidden"
          >
            {/* Header: CIPHER • Syndicate Concierge */}
            <div className="relative px-4 py-3.5 bg-gradient-to-r from-[#141414] via-[#121212] to-[#0D0D0D] border-b border-[#C9A961]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#242424] to-[#121212] border border-[#C9A961]/60 shadow-inner">
                  <Bot className="w-5 h-5 text-[#C9A961]" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#121212] rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold tracking-wide text-[#EDEDED]">
                      CIPHER • Syndicate Concierge
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#C9A961]" />
                    Grounded Sneaker Archivist
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={resetChat}
                  title="Reset conversation"
                  aria-label="Reset conversation"
                  className="p-1.5 text-zinc-400 hover:text-[#C9A961] hover:bg-[#1F1F1F] rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close widget"
                  aria-label="Close widget"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1F1F1F] rounded-lg transition-colors"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Chips Section */}
            <div className="px-3.5 py-2.5 bg-[#0F0F0F]/90 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {QUICK_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(chip)}
                  disabled={isTyping}
                  className="shrink-0 text-[11px] text-[#D8D8D8] hover:text-[#C9A961] bg-[#171717] hover:bg-[#C9A961]/15 border border-[#C9A961]/30 hover:border-[#C9A961] px-3 py-1 rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 no-scrollbar bg-gradient-to-b from-[#0A0A0A] via-[#0E0E0E] to-[#0A0A0A]">
              {messages.map((msg) => {
                const isCipher = msg.sender === 'cipher';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex flex-col ${isCipher ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isCipher
                          ? 'bg-[#151515] text-[#EDEDED] border border-[#C9A961]/25 rounded-tl-sm shadow-[0_2px_10px_rgba(0,0,0,0.5)]'
                          : 'bg-gradient-to-r from-[#C9A961] to-[#DEBE75] text-[#0A0A0A] font-medium rounded-tr-sm shadow-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </motion.div>
                );
              })}

              {/* Animated Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 max-w-[70%] bg-[#151515] border border-[#C9A961]/25 rounded-2xl rounded-tl-sm text-xs text-zinc-400"
                >
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A961] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A961] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A961] animate-bounce" />
                  </div>
                  <span className="text-[11px] text-zinc-400">Cipher consulting archives...</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-[#111111]/95 border-t border-[#C9A961]/30">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-2 bg-[#181818] border border-[#C9A961]/40 rounded-xl px-3 py-1.5 focus-within:border-[#C9A961] focus-within:ring-1 focus-within:ring-[#C9A961]/40 transition-all shadow-inner"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Cipher about sizing, drops, pricing..."
                  disabled={isTyping}
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50 py-1"
                />

                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  aria-label="Send message"
                  className="p-2 rounded-lg bg-[#C9A961] hover:bg-[#DEBE75] text-[#0A0A0A] font-semibold disabled:opacity-30 disabled:hover:bg-[#C9A961] transition-all duration-200 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500 px-1">
                <span>Grounded live in Velvet Syndicate catalog & policies</span>
                <span className="text-[#C9A961]/70 font-mono">Cipher v2.0</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default SyndicateAIWidget;
