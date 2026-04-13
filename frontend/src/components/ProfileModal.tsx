"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { logout } from "@/lib/auth";

interface Pilot {
  id: number;
  callsign: string;
  real_name: string | null;
  avatar_url: string | null;
}

interface Lap {
  lap_number: number;
  duration_ms: number;
}

interface TrainingSession {
  id: number;
  pack_count: number;
  started_at: string;
  laps: Lap[];
}

interface Props {
  onClose: () => void;
  onLogout: () => void;
  onPilotUpdated?: (pilot: Pilot) => void;
}

function formatTime(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Avatar({ pilot, size = 48 }: { pilot: Pilot; size?: number }) {
  const colors = ["#f97316", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899"];
  const color = colors[pilot.callsign.charCodeAt(0) % colors.length];
  const initials = pilot.callsign.slice(0, 2).toUpperCase();

  if (pilot.avatar_url) {
    return (
      <img
        src={pilot.avatar_url}
        alt={pilot.callsign}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-black text-white shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

export default function ProfileModal({ onClose, onLogout, onPilotUpdated }: Props) {
  const [pilot, setPilot] = useState<Pilot | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ callsign: "", real_name: "", avatar_url: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const p = await api.get<Pilot>("/pilots/me");
        setPilot(p);
        setForm({ callsign: p.callsign, real_name: p.real_name ?? "", avatar_url: p.avatar_url ?? "" });
        try {
          const s = await api.get<TrainingSession[]>("/sessions/");
          setSessions(s);
        } catch {
          // sessions failed, but pilot is fine
        }
      } catch {
        setCreating(true);
      }
    }
    load();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!form.callsign.trim()) return;
    setError("");
    setLoading(true);
    try {
      if (creating) {
        const p = await api.authPost<Pilot>("/pilots/me", {
          callsign: form.callsign.trim(),
          real_name: form.real_name || null,
          avatar_url: form.avatar_url || null,
        });
        setPilot(p);
        setCreating(false);
        setSessions([]);
        onPilotUpdated?.(p);
      } else {
        const p = await api.authPut<Pilot>("/pilots/me", {
          callsign: form.callsign.trim(),
          real_name: form.real_name || null,
          avatar_url: form.avatar_url || null,
        });
        setPilot(p);
        setEditing(false);
        onPilotUpdated?.(p);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    onLogout();
    onClose();
  }

  const showForm = creating || editing;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <span className="text-xs text-zinc-500 uppercase tracking-widest">Profile</span>
          <div className="flex items-center gap-3">
            {pilot && !showForm && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-zinc-500 hover:text-red-400 transition"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Profile section */}
          {showForm ? (
            <form onSubmit={handleSaveProfile} className="p-5 flex flex-col gap-3">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                {creating ? "Set up your profile" : "Edit Profile"}
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  Callsign <span className="text-orange-500">*</span>
                </label>
                <input
                  required
                  value={form.callsign}
                  onChange={e => setForm(f => ({ ...f, callsign: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition"
                  placeholder="YourCallsign"
                  maxLength={30}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">Real Name</label>
                <input
                  value={form.real_name}
                  onChange={e => setForm(f => ({ ...f, real_name: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition"
                  placeholder="Optional"
                  maxLength={60}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">Avatar URL</label>
                <input
                  value={form.avatar_url}
                  onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition"
                  placeholder="https://... (optional)"
                  type="url"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-2 mt-1">
                {!creating && (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:border-zinc-600 transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition disabled:opacity-50"
                >
                  {loading ? "..." : "Save"}
                </button>
              </div>
            </form>
          ) : pilot ? (
            <div className="p-5 flex items-center gap-4 border-b border-zinc-800">
              <Avatar pilot={pilot} size={52} />
              <div className="min-w-0">
                <p className="text-white font-bold text-lg leading-tight truncate">{pilot.callsign}</p>
                {pilot.real_name && (
                  <p className="text-zinc-500 text-sm truncate">{pilot.real_name}</p>
                )}
              </div>
            </div>
          ) : null}

          {/* Sessions list */}
          {!showForm && pilot && (
            <div>
              <div className="px-5 py-3 border-b border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  Training Sessions
                  {sessions.length > 0 && (
                    <span className="ml-2 text-zinc-600 normal-case tracking-normal">
                      {sessions.length} saved
                    </span>
                  )}
                </p>
              </div>

              {sessions.length === 0 ? (
                <p className="text-center text-zinc-600 text-xs py-8">
                  No sessions saved yet. Use the timer and tap Save Training.
                </p>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {sessions.map(s => (
                    <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-zinc-300 text-sm font-medium">{formatDate(s.started_at)}</p>
                        <p className="text-zinc-600 text-xs mt-0.5">
                          {s.laps.length > 0
                            ? `${s.laps.length} ${s.laps.length === 1 ? "flight" : "flights"}`
                            : "no flights logged"}
                        </p>
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
      </div>
    </div>
  );
}
