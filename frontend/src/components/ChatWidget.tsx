"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ChatMessage {
  id: number;
  sender: "user" | "andrey";
  text: string;
  created_at: string;
}

const API_URL = "";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressPollRef = useRef(false);

  useEffect(() => {
    if (!conversationId) {
      setConversationId(crypto.randomUUID());
    }
  }, [conversationId]);

  const pollMessages = useCallback(async () => {
    if (!conversationId || suppressPollRef.current) return;
    try {
      const res = await fetch(`${API_URL}/api/support/conversation/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error("Poll error:", e);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!open || !conversationId) return;

    pollMessages();
    pollingRef.current = setInterval(pollMessages, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [open, conversationId, pollMessages]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || loading) return;

    const text = input.trim();
    const optimisticMessage: ChatMessage = {
      id: Date.now(),
      sender: "user",
      text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/support/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const replyText: string = data.andrey_response ?? "";
        // Delay proportional to reply length: ~12ms/char, clamped to 1.2–3.5s
        const delay = Math.min(Math.max(1200, replyText.length * 12), 3500);
        suppressPollRef.current = true;
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        suppressPollRef.current = false;
        await pollMessages();
      } else {
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      }
    } catch (e) {
      console.error("Send error:", e);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
    }
    setLoading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold py-3 px-4 rounded-full shadow-lg z-40 flex items-center gap-2"
      >
        💬 Поговорить с Андреем
      </button>
    );
  }

  return (
    <div
      className="fixed right-3 left-3 bottom-3 sm:left-auto sm:right-4 sm:bottom-4 sm:w-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col z-50 max-w-[calc(100vw-1.5rem)] h-[min(32rem,calc(100dvh-1.5rem-env(safe-area-inset-bottom)))] sm:h-[28rem]"
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-gray-950 p-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold">🛠️ Андрей Мещеряков</span>
          <span className="flex items-center gap-1 text-xs font-medium opacity-80">
            <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />
            онлайн
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-xl font-bold cursor-pointer hover:opacity-70"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 overscroll-contain">
        {messages.length === 0 && (
          <div className="text-gray-400 text-sm">
            Здравствуйте! Я Андрей, помогу с RotorHazard и NuclearHazard. Могу подсказать по комплектам, настройке и совместимости. Что именно вас интересует?
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                msg.sender === "user"
                  ? "bg-yellow-500 text-gray-950"
                  : "bg-gray-800 text-gray-100"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-4 py-3 rounded-lg flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="border-t border-gray-700 p-3 flex gap-2 flex-shrink-0 bg-gray-900 rounded-b-2xl"
        style={{ paddingBottom: "max(0.75rem, calc(env(safe-area-inset-bottom) + 0.25rem))" }}
      >
        <input
          type="text"
          placeholder="Напишите ваш вопрос..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={loading}
          className="flex-1 px-3 py-3 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm placeholder-gray-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-950 font-bold px-4 py-3 rounded"
        >
          {loading ? "..." : "➤"}
        </button>
      </div>
    </div>
  );
}
