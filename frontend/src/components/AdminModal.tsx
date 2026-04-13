"use client";

import { useEffect, useState } from "react";
import { getAdminUsers, getAdminUserSessions, AdminUser, AdminSession } from "@/lib/api";

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

export default function AdminModal({ onClose }: Props) {
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-red-500 uppercase tracking-widest font-bold">Superadmin</span>
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest">· Users</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition text-xs">
            Close
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center text-zinc-600 text-xs py-8">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-zinc-600 text-xs py-8">No users found</p>
          ) : (
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

                  {/* Sessions for selected user */}
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
          )}
        </div>
      </div>
    </div>
  );
}
