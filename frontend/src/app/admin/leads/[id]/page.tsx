"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Message {
  id: number;
  sender: string;
  text: string;
  created_at: string;
}

interface Lead {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  product: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [product, setProduct] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) fetchLead();
  }, [id]);

  const fetchLead = async () => {
    const res = await fetch(`/api/admin/leads/${id}`);
    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setLead(data.lead);
      setMessages(data.messages || []);
      setStatus(data.lead.status);
      setNotes(data.lead.notes || "");
      setName(data.lead.name || "");
      setEmail(data.lead.email || "");
      setPhone(data.lead.phone || "");
      setProduct(data.lead.product || "");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/admin/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes, name, email, phone, product }),
    });
    setSaving(false);
  };

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/leads" className="text-yellow-400 hover:text-yellow-300 font-bold text-lg">
          ← Назад
        </Link>
        <h1 className="text-2xl font-bold text-yellow-400">Заявка #{lead.id}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lead card */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Информация</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Имя</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:border-yellow-500"
                placeholder="—"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:border-yellow-500"
                placeholder="—"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Телефон</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:border-yellow-500"
                placeholder="—"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Товар / интерес</label>
              <input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:border-yellow-500"
                placeholder="—"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-xs text-gray-500 mb-1">Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 focus:outline-none focus:border-yellow-500"
            >
              <option value="new">Новая</option>
              <option value="in_progress">В работе</option>
              <option value="completed">Завершено</option>
              <option value="rejected">Отклонено</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-1">Комментарии</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 focus:outline-none focus:border-yellow-500"
              rows={4}
              placeholder="Заметки..."
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-950 font-bold py-2 rounded transition"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>

          <p className="text-gray-600 text-xs mt-3">
            Создано: {new Date(lead.created_at).toLocaleString("ru-RU")}
          </p>
        </div>

        {/* Chat */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 flex flex-col" style={{ maxHeight: "70vh" }}>
          <h2 className="text-xl font-bold mb-4">💬 Диалог</h2>
          <div className="flex-1 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="text-gray-500 text-sm">Сообщений нет</div>
            ) : (
              messages.map((msg) => (
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
                    <div>{msg.text}</div>
                    <div className={`text-xs mt-1 ${msg.sender === "user" ? "text-gray-700" : "text-gray-500"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
