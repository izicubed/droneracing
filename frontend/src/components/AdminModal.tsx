"use client";

import { useEffect, useState } from "react";
import {
  getAdminUsers,
  getAdminUserSessions,
  getAdminLeads,
  getAdminLead,
  updateAdminLead,
  AdminUser,
  AdminSession,
  AdminLead,
  AdminLeadDetail,
} from "@/lib/api";

interface Props {
  onClose: () => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatWallTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function formatMs(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

const STATUS_LABELS: Record<string, string> = {
  new: "new",
  in_progress: "in progress",
  completed: "completed",
  rejected: "rejected",
};

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  async function handleSelectUser(user: AdminUser) {
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
      setSessions([]);
      return;
    }
    setSelectedUser(user);
    setSessionsLoading(true);
    try {
      const s = await getAdminUserSessions(user.id);
      setSessions(s);
    } finally {
      setSessionsLoading(false);
    }
  }

  if (loading) return <p className="text-center text-zinc-600 text-xs py-8">Loading...</p>;
  if (users.length === 0) return <p className="text-center text-zinc-600 text-xs py-8">No users found</p>;

  return (
    <div className="divide-y divide-zinc-800/50">
      {users.map(user => (
        <div key={user.id}>
          <button
            className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-zinc-800/40 transition text-left"
            onClick={() => handleSelectUser(user)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-zinc-200 text-sm font-medium truncate">{user.email}</p>
                {user.role === "superadmin" && (
                  <span className="text-[9px] text-red-500 border border-red-500/40 rounded px-1 py-0.5 uppercase tracking-widest shrink-0">
                    superadmin
                  </span>
                )}
              </div>
              <p className="text-zinc-600 text-xs mt-0.5">
                {user.callsign ? `@${user.callsign}` : "no profile"} · {formatDate(user.created_at)}
              </p>
            </div>
            <span className="text-zinc-600 text-xs shrink-0">
              {selectedUser?.id === user.id ? "▲" : "▼"}
            </span>
          </button>

          {selectedUser?.id === user.id && (
            <div className="bg-zinc-950/50 border-t border-zinc-800/50">
              {sessionsLoading ? (
                <p className="text-center text-zinc-600 text-xs py-4">Loading sessions...</p>
              ) : sessions.length === 0 ? (
                <p className="text-center text-zinc-600 text-xs py-4">No training sessions</p>
              ) : (
                <div className="divide-y divide-zinc-800/30">
                  {sessions.map(s => (
                    <div key={s.id} className="px-6 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-zinc-300 text-sm">{formatDate(s.started_at)}</p>
                        <p className="text-zinc-600 text-xs font-mono">
                          {formatWallTime(s.started_at)}
                          {s.ended_at ? ` → ${formatWallTime(s.ended_at)}` : ""}
                        </p>
                        <p className="text-zinc-600 text-xs mt-0.5">
                          {s.laps.length > 0
                            ? `${s.laps.length} flight${s.laps.length !== 1 ? "s" : ""}`
                            : "no flights"}
                        </p>
                        {s.laps.length > 0 && (
                          <p className="text-zinc-700 text-[10px] font-mono mt-0.5">
                            {s.laps.map(l => formatMs(l.duration_ms)).join("  ·  ")}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-black text-xl tabular-nums">{s.pack_count}</p>
                        <p className="text-zinc-600 text-[10px] uppercase tracking-widest">packs</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leads tab
// ---------------------------------------------------------------------------

function LeadsTab() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminLeadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAdminLeads()
      .then(setLeads)
      .finally(() => setLoading(false));
  }, []);

  async function handleSelectLead(lead: AdminLead) {
    if (selected?.id === lead.id) {
      setSelected(null);
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await getAdminLead(lead.id);
      setSelected(detail);
      setEditStatus(detail.status);
      setEditNotes(detail.notes ?? "");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await updateAdminLead(selected.id, { status: editStatus, notes: editNotes });
      setLeads(prev => prev.map(l => l.id === selected.id ? { ...l, status: editStatus, notes: editNotes } : l));
      setSelected(prev => prev ? { ...prev, status: editStatus, notes: editNotes } : prev);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-center text-zinc-600 text-xs py-8">Loading...</p>;
  if (leads.length === 0) return <p className="text-center text-zinc-600 text-xs py-8">No leads yet</p>;

  return (
    <div className="divide-y divide-zinc-800/50">
      {leads.map(lead => (
        <div key={lead.id}>
          <button
            className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-zinc-800/40 transition text-left"
            onClick={() => handleSelectLead(lead)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-zinc-200 text-sm font-medium truncate">
                  {lead.name ?? lead.phone ?? lead.conversation_id.slice(0, 8)}
                </p>
                <span className="text-[9px] text-zinc-500 border border-zinc-700 rounded px-1 py-0.5 uppercase tracking-widest shrink-0">
                  {STATUS_LABELS[lead.status] ?? lead.status}
                </span>
              </div>
              <p className="text-zinc-600 text-xs mt-0.5">
                {lead.phone ?? "no phone"}
                {lead.product ? ` · ${lead.product}` : ""}
                {" · "}
                {formatDate(lead.created_at)}
              </p>
            </div>
            <span className="text-zinc-600 text-xs shrink-0">
              {selected?.id === lead.id ? "▲" : "▼"}
            </span>
          </button>

          {selected?.id === lead.id && (
            <div className="bg-zinc-950/50 border-t border-zinc-800/50 px-6 py-4 space-y-4">
              {detailLoading ? (
                <p className="text-zinc-600 text-xs">Loading...</p>
              ) : (
                <>
                  {/* Fields */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-zinc-600">Name</span>
                    <span className="text-zinc-300">{selected.name ?? "—"}</span>
                    <span className="text-zinc-600">Phone</span>
                    <span className="text-zinc-300">{selected.phone ?? "—"}</span>
                    <span className="text-zinc-600">Email</span>
                    <span className="text-zinc-300">{selected.email ?? "—"}</span>
                    <span className="text-zinc-600">Product</span>
                    <span className="text-zinc-300">{selected.product ?? "—"}</span>
                  </div>

                  {/* Status + Notes edit */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-zinc-600 text-xs w-12 shrink-0">Status</label>
                      <select
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value)}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none"
                      >
                        {Object.entries(STATUS_LABELS).map(([v, label]) => (
                          <option key={v} value={v}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-start gap-2">
                      <label className="text-zinc-600 text-xs w-12 shrink-0 mt-1">Notes</label>
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        rows={2}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none resize-none"
                        placeholder="Internal notes..."
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-xs px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded transition disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  {selected.messages.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Conversation</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {selected.messages.map(m => (
                          <div
                            key={m.id}
                            className={`text-xs px-3 py-1.5 rounded ${
                              m.sender === "user"
                                ? "bg-zinc-800 text-zinc-300"
                                : "bg-zinc-900 text-zinc-500"
                            }`}
                          >
                            <span className="text-[9px] uppercase tracking-widest mr-2 text-zinc-600">
                              {m.sender}
                            </span>
                            {m.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

type Tab = "users" | "leads";

export default function AdminModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("users");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-red-500 uppercase tracking-widest font-bold">Superadmin</span>
            <div className="flex items-center gap-1">
              {(["users", "leads"] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded transition ${
                    tab === t
                      ? "text-zinc-200 bg-zinc-700"
                      : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition text-xs">
            Close
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === "users" ? <UsersTab /> : <LeadsTab />}
        </div>
      </div>
    </div>
  );
}
