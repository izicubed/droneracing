"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Lead {
  id: number;
  conversation_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  product: string | null;
  status: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новые",
  in_progress: "В работе",
  completed: "Завершено",
  rejected: "Отклонено",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  in_progress: "bg-yellow-500",
  completed: "bg-green-500",
  rejected: "bg-red-500",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState("new");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchLeads();
  }, [filter]);

  const fetchLeads = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/leads?status=${filter}`);
    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads || []);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-yellow-400">📋 Заявки</h1>
        <Link href="/" className="text-gray-400 hover:text-gray-100 text-sm">← На сайт</Link>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        {Object.entries(STATUS_LABELS).map(([s, label]) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded font-semibold transition ${
              filter === s
                ? "bg-yellow-500 text-gray-950"
                : "bg-gray-800 text-gray-100 hover:bg-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500">Загрузка...</div>
      ) : leads.length === 0 ? (
        <div className="text-gray-500">Нет заявок в статусе «{STATUS_LABELS[filter]}»</div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/admin/leads/${lead.id}`}
              className="block bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-yellow-400 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{lead.name || "Клиент"}</h3>
                  <p className="text-gray-400 text-sm">{lead.email || lead.phone || "—"}</p>
                  {lead.product && <p className="text-gray-500 text-xs mt-1">{lead.product}</p>}
                </div>
                <span
                  className={`${STATUS_COLORS[lead.status] || "bg-gray-500"} px-3 py-1 rounded text-sm text-white font-semibold`}
                >
                  {STATUS_LABELS[lead.status] || lead.status}
                </span>
              </div>
              <p className="text-gray-600 text-xs mt-2">
                {new Date(lead.created_at).toLocaleString("ru-RU")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
