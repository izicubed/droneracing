"use client";

import { useState } from "react";

export default function OrderForm() {
  const [form, setForm] = useState({ name: "", contact: "", message: "" });
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
    setForm({ name: "", contact: "", message: "" });
  }

  if (sent) {
    return (
      <div className="bg-green-900/20 border border-green-700/50 rounded-xl px-6 py-10 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-green-300 text-lg font-semibold">Сообщение отправлено!</p>
        <p className="text-gray-400 mt-2 text-sm">Свяжемся с вами в ближайшее время.</p>
        <button
          onClick={() => setSent(false)}
          className="mt-5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Отправить ещё
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Имя</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors text-sm"
          placeholder="Ваше имя"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Telegram / телефон</label>
        <input
          type="text"
          required
          value={form.contact}
          onChange={(e) => setForm({ ...form, contact: e.target.value })}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors text-sm"
          placeholder="@username или +7..."
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Что интересует?</label>
        <textarea
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none text-sm"
          placeholder="Укажите количество и любые пожелания..."
        />
      </div>
      <button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Отправить заявку
      </button>
    </form>
  );
}
