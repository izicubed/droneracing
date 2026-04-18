"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ChatMessage {
  id: number;
  sender: "user" | "andrey";
  text: string;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setConversationId(crypto.randomUUID());
    }
  }, [conversationId]);

  const pollMessages = useCallback(async () => {
    if (!conversationId) return;
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
    if (!input.trim() || !conversationId) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/support/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_email: email || undefined,
          text: input,
        }),
      });

      if (res.ok) {
        setInput("");
        await pollMessages();
      }
    } catch (e) {
      console.error("Send error:", e);
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
    <div className="fixed bottom-4 right-4 w-96 h-[28rem] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-gray-950 p-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
        <div className="font-bold">🛠️ Андрей Мещеряков</div>
        <button
          onClick={() => setOpen(false)}
          className="text-xl font-bold cursor-pointer hover:opacity-70"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-gray-400 text-sm">
            Привет! 👋 Я Андрей. Помогу выбрать оборудование или отвечу на вопросы о RotorHazard.
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
            <div className="bg-gray-800 text-gray-400 px-4 py-2 rounded-lg text-sm">
              ✍️ печатает...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Email input (shown before first message) */}
      {messages.length === 0 && !email && (
        <div className="px-4 pb-2 flex-shrink-0">
          <input
            type="email"
            placeholder="Твой email (опционально)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm placeholder-gray-500"
          />
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-700 p-3 flex gap-2 flex-shrink-0">
        <input
          type="text"
          placeholder="Напиши сообщение..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={loading}
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm placeholder-gray-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-950 font-bold px-4 py-2 rounded"
        >
          {loading ? "..." : "➤"}
        </button>
      </div>
    </div>
  );
}
