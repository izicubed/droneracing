"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import AuthModal from "@/components/AuthModal";
import ProfileModal from "@/components/ProfileModal";
import AdminModal from "@/components/AdminModal";
import Timer from "@/components/Timer";
import NumInput from "@/components/NumInput";
import { useTimer } from "@/hooks/useTimer";
import { useAudio } from "@/hooks/useAudio";
import { api, saveTraining, PilotInfo, getMe } from "@/lib/api";
import { getToken } from "@/lib/auth";

type FlightEntry = { id: number; time: number; startedAt: number; finishedAt: number };

function formatWallTime(ts: number) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatTime(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function UserButton({ pilot, onClick }: { pilot: PilotInfo | null; onClick: () => void }) {
  if (pilot) {
    const colors = ["#f97316", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899"];
    const color = colors[pilot.callsign.charCodeAt(0) % colors.length];
    const initials = pilot.callsign.slice(0, 2).toUpperCase();
    return (
      <button
        onClick={onClick}
        className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs active:scale-90 transition shrink-0"
        style={{ background: color }}
        title={pilot.callsign}
      >
        {pilot.avatar_url
          ? <img src={pilot.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          : initials
        }
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-orange-500 hover:text-orange-500 active:scale-90 transition"
      title="Sign in"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </button>
  );
}

export default function Home() {
  const { getCtx, loadBuffers, playBuffer, playClick, ensureAudioReady } = useAudio();

  const [countdownSec, setCountdownSec] = useState(() => {
    try { const v = localStorage.getItem("fpv_countdownSec"); return v ? Number(v) : 5; } catch { return 5; }
  });
  const [beepCount, setBeepCount] = useState(() => {
    try { const v = localStorage.getItem("fpv_beepCount"); return v ? Number(v) : 3; } catch { return 3; }
  });
  const [delayMin, setDelayMin] = useState(() => {
    try { const v = localStorage.getItem("fpv_delayMin"); return v ? Number(v) : 0.5; } catch { return 0.5; }
  });
  const [delayMax, setDelayMax] = useState(() => {
    try { const v = localStorage.getItem("fpv_delayMax"); return v ? Number(v) : 2.5; } catch { return 2.5; }
  });

  const [packs, setPacks] = useState(() => {
    try { const v = localStorage.getItem("fpv_packs"); return v ? Number(v) : 0; } catch { return 0; }
  });
  const [flightLog, setFlightLog] = useState<FlightEntry[]>(() => {
    try { const v = localStorage.getItem("fpv_flightLog"); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [logOpen, setLogOpen] = useState(false);
  const logIdRef = useRef(0);

  // Sync logIdRef with restored flightLog so new entries get unique ids
  useEffect(() => {
    if (flightLog.length > 0) {
      logIdRef.current = Math.max(...flightLog.map(e => e.id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist settings and session state to localStorage
  useEffect(() => { try { localStorage.setItem("fpv_countdownSec", String(countdownSec)); } catch {} }, [countdownSec]);
  useEffect(() => { try { localStorage.setItem("fpv_beepCount", String(beepCount)); } catch {} }, [beepCount]);
  useEffect(() => { try { localStorage.setItem("fpv_delayMin", String(delayMin)); } catch {} }, [delayMin]);
  useEffect(() => { try { localStorage.setItem("fpv_delayMax", String(delayMax)); } catch {} }, [delayMax]);
  useEffect(() => { try { localStorage.setItem("fpv_packs", String(packs)); } catch {} }, [packs]);
  useEffect(() => { try { localStorage.setItem("fpv_flightLog", JSON.stringify(flightLog)); } catch {} }, [flightLog]);

  // Auth / profile state
  const [pilot, setPilot] = useState<PilotInfo | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isShopAdmin, setIsShopAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Load pilot profile on mount if token exists
  useEffect(() => {
    if (!getToken()) return;
    api.get<PilotInfo>("/pilots/me").then(setPilot).catch(() => {});
    getMe().then(u => {
      setIsSuperadmin(u.role === "superadmin");
      setIsShopAdmin(u.role === "admin" || u.role === "superadmin");
    }).catch(() => {});
  }, []);

  const timer = useTimer({
    playBuffer,
    onRaceStopped: ({ time, startedAt, finishedAt }) => {
      setFlightLog(prev => [...prev, { id: ++logIdRef.current, time, startedAt, finishedAt }]);
    },
  });

  async function handleRingTap() {
    // iOS: resume AudioContext строго в user gesture, до любых await
    await ensureAudioReady();
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    await playClick();
    await loadBuffers();
    if (timer.phase === "IDLE" || timer.phase === "STOPPED") {
      timer.setElapsed(0);
      timer.setCdProgress(0);
      setPacks(p => p + 1);
      timer.runSequence(countdownSec, beepCount, delayMin, delayMax);
    } else if (timer.phase === "RACING") {
      timer.stopRace();
    } else {
      timer.stopAll();
      timer.setPhase("IDLE");
    }
  }

  async function handleSaveTraining() {
    if (!pilot || saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      const sessionStart = flightLog.length > 0
        ? new Date(flightLog[0].startedAt).toISOString()
        : new Date().toISOString();
      await saveTraining(packs, flightLog.map(e => e.time), sessionStart);
      setPacks(0);
      setFlightLog([]);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  }

  function handleAuthSuccess() {
    setShowAuth(false);
    getMe().then(u => {
      setIsSuperadmin(u.role === "superadmin");
      setIsShopAdmin(u.role === "admin" || u.role === "superadmin");
    }).catch(() => {});
    api.get<PilotInfo>("/pilots/me")
      .then(p => { setPilot(p); setShowProfile(false); })
      .catch(() => setShowProfile(true));
  }

  const canSave = pilot && (packs > 0 || flightLog.length > 0);
  const isActive = timer.phase !== "IDLE" && timer.phase !== "STOPPED";

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center py-8 px-6 gap-3 select-none">

      {/* Navigation */}
      <nav className="w-full flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-1">
        <span className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/25 text-xs font-semibold tracking-wide">
          <span>⏱️</span> Таймер
        </span>
        <a
          href="/rotorhazard"
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition text-xs font-medium tracking-wide"
        >
          <span>📡</span> RotorHazard
        </a>
      </nav>

      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <p className="text-xs text-zinc-600 uppercase tracking-[0.2em]">FPV Timer</p>
        <div className="flex items-center gap-2">
          {isSuperadmin && (
            <button
              onClick={() => setShowAdmin(true)}
              className="text-[10px] text-red-500 border border-red-500/40 rounded px-2 py-1 uppercase tracking-widest hover:bg-red-500/10 active:scale-90 transition"
            >
              Admin
            </button>
          )}
          <UserButton
            pilot={pilot}
            onClick={() => pilot ? setShowProfile(true) : setShowAuth(true)}
          />
        </div>
      </div>

      <Timer
        phase={timer.phase}
        countdown={timer.countdown}
        beep={timer.beep}
        elapsed={timer.elapsed}
        cdProgress={timer.cdProgress}
        delayProgress={timer.delayProgress}
        delayTotal={timer.delayTotal}
        onTap={handleRingTap}
      />

      {/* Settings */}
      <div className={clsx(
        "w-full grid grid-cols-2 gap-x-6 gap-y-4 px-2 transition-opacity duration-300",
        isActive ? "opacity-0 pointer-events-none" : "opacity-100",
      )}>
        <NumInput label="Delay" unit="sec" value={countdownSec} onChange={setCountdownSec} min={1} max={60} step={1} />
        <NumInput label="Countdown" unit="sec" value={beepCount} onChange={setBeepCount} min={1} max={10} step={1} />
        <NumInput label="Start min" unit="sec" value={delayMin} onChange={setDelayMin} min={0.1} max={delayMax} step={0.1} />
        <NumInput label="Start max" unit="sec" value={delayMax} onChange={setDelayMax} min={delayMin} max={10} step={0.1} />
      </div>

      {/* Packs counter */}
      <div className="w-full flex justify-center py-1 border-t border-zinc-800/60">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Packs</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPacks(p => Math.max(0, p - 1))}
              className="w-8 h-8 rounded-full border border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-500 active:scale-90 transition text-base leading-none"
            >−</button>
            <span className="text-2xl font-black text-white w-14 text-center tabular-nums">{packs}</span>
            <button
              onClick={() => setPacks(p => p + 1)}
              className="w-8 h-8 rounded-full border border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-500 active:scale-90 transition text-base leading-none"
            >+</button>
          </div>
          <span className="text-[10px] text-zinc-600">packs flown</span>
        </div>
      </div>

      {/* Save Training button */}
      {canSave && (
        <button
          onClick={handleSaveTraining}
          disabled={saveStatus === "saving"}
          className={clsx(
            "w-full py-2.5 rounded-xl text-sm font-bold transition active:scale-[0.98] disabled:opacity-50",
            saveStatus === "saved"
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : saveStatus === "error"
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25",
          )}
        >
          {saveStatus === "saving" ? "Saving..." :
           saveStatus === "saved"  ? "Saved ✓" :
           saveStatus === "error"  ? "Save failed — retry" :
           "Save Training"}
        </button>
      )}

      {/* Flight log */}
      <div className="w-full">
        <button
          onClick={() => setLogOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 border border-zinc-800 rounded-lg text-zinc-500 text-xs uppercase tracking-widest hover:border-zinc-700 active:scale-[0.99] transition"
        >
          <span>Flight Log</span>
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 normal-case tracking-normal">
              {flightLog.length} {flightLog.length === 1 ? "entry" : "entries"}
            </span>
            <span className="text-zinc-600">{logOpen ? "▲" : "▼"}</span>
          </div>
        </button>

        {logOpen && (
          <div className="mt-1 border border-zinc-800 rounded-lg overflow-hidden">
            {flightLog.length === 0 ? (
              <p className="text-center text-zinc-600 text-xs py-4">No flights recorded yet</p>
            ) : (
              <>
                <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/50">
                  {flightLog.map((entry, idx) => (
                    <div key={entry.id} className="flex items-center justify-between px-3 py-2 gap-2">
                      <span className="text-zinc-600 text-xs w-6 shrink-0">#{idx + 1}</span>
                      <div className="flex flex-col items-center flex-1 min-w-0">
                        <span className="text-zinc-200 text-sm font-mono tabular-nums">
                          {formatTime(entry.time)}
                        </span>
                        <span className="text-zinc-600 text-[10px] font-mono tabular-nums">
                          {formatWallTime(entry.startedAt)} → {formatWallTime(entry.finishedAt)}
                        </span>
                      </div>
                      <button
                        onClick={() => setFlightLog(prev => prev.filter(e => e.id !== entry.id))}
                        className="text-zinc-700 hover:text-red-500 transition text-sm w-6 shrink-0 text-right leading-none"
                        aria-label="Delete entry"
                      >✕</button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setFlightLog([])}
                  className="w-full py-2 text-xs text-zinc-600 hover:text-red-500 border-t border-zinc-800 transition active:scale-[0.99]"
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />
      )}
      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          onLogout={() => { setPilot(null); setIsSuperadmin(false); setIsShopAdmin(false); setSaveStatus("idle"); }}
          onPilotUpdated={p => setPilot(p)}
        />
      )}
      {showAdmin && (
        <AdminModal onClose={() => setShowAdmin(false)} />
      )}

    </main>
  );
}
