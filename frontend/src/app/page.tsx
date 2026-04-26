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
    const colors = ["#f97316", "#06b6d4", "#8b5cf6", "#10b981", "#ec4899"];
    const color = colors[pilot.callsign.charCodeAt(0) % colors.length];
    const initials = pilot.callsign.slice(0, 2).toUpperCase();
    return (
      <button
        onClick={onClick}
        className="h-10 w-10 shrink-0 rounded-full border border-white/15 shadow-[0_0_32px_rgba(255,255,255,0.08)] transition active:scale-95"
        style={{ background: color }}
        title={pilot.callsign}
      >
        {pilot.avatar_url
          ? <img src={pilot.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
          : <span className="flex h-full w-full items-center justify-center text-sm font-black text-white">{initials}</span>
        }
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/5 text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/10 active:scale-95"
      title="Sign in"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </button>
  );
}

function StatPill({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={clsx("mt-1 text-xl font-black tabular-nums", tone)}>{value}</p>
    </div>
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

  useEffect(() => {
    if (flightLog.length > 0) {
      logIdRef.current = Math.max(...flightLog.map(e => e.id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { try { localStorage.setItem("fpv_countdownSec", String(countdownSec)); } catch {} }, [countdownSec]);
  useEffect(() => { try { localStorage.setItem("fpv_beepCount", String(beepCount)); } catch {} }, [beepCount]);
  useEffect(() => { try { localStorage.setItem("fpv_delayMin", String(delayMin)); } catch {} }, [delayMin]);
  useEffect(() => { try { localStorage.setItem("fpv_delayMax", String(delayMax)); } catch {} }, [delayMax]);
  useEffect(() => { try { localStorage.setItem("fpv_packs", String(packs)); } catch {} }, [packs]);
  useEffect(() => { try { localStorage.setItem("fpv_flightLog", JSON.stringify(flightLog)); } catch {} }, [flightLog]);

  const [pilot, setPilot] = useState<PilotInfo | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isShopAdmin, setIsShopAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

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
  const bestLap = flightLog.length ? Math.min(...flightLog.map(e => e.time)) : null;
  const latestLap = flightLog.length ? flightLog[flightLog.length - 1] : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] text-white select-none">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(34,211,238,0.18),transparent_28rem),radial-gradient(circle_at_16%_74%,rgba(249,115,22,0.14),transparent_22rem),linear-gradient(180deg,#050711_0%,#020308_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 py-5">
        <nav className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
          <span className="flex flex-1 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
            Timer
          </span>
          <a
            href="/rotorhazard"
            className="flex flex-1 items-center justify-center rounded-xl py-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
          >
            RotorHazard
          </a>
        </nav>

        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-300/80">FPV Launch Deck</p>
            <h1 className="mt-1 text-2xl font-black tracking-wide text-white drop-shadow-[0_0_22px_rgba(34,211,238,0.18)]">Race Timer</h1>
          </div>
          <div className="flex items-center gap-2">
            {isShopAdmin && (
              <a
                href="/shop-admin"
                className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-400/15 active:scale-95"
              >
                Shop
              </a>
            )}
            {isSuperadmin && (
              <button
                onClick={() => setShowAdmin(true)}
                className="rounded-lg border border-red-400/30 bg-red-400/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-300 transition hover:bg-red-400/15 active:scale-95"
              >
                Admin
              </button>
            )}
            <UserButton
              pilot={pilot}
              onClick={() => pilot ? setShowProfile(true) : setShowAuth(true)}
            />
          </div>
        </header>

        <section className="grid grid-cols-3 gap-2">
          <StatPill label="Packs" value={packs} tone="text-orange-300" />
          <StatPill label="Flights" value={flightLog.length} tone="text-cyan-300" />
          <StatPill label="Best" value={bestLap ? formatTime(bestLap) : "--"} tone="text-emerald-300 text-base" />
        </section>

        <section className="relative flex flex-1 min-h-[330px] flex-col items-center justify-center rounded-[28px] border border-white/10 bg-black/30 px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute inset-x-7 top-5 flex justify-between text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            <span>Armed</span>
            <span>{timer.phase}</span>
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
          <div className="mt-4 grid w-full grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-2">
              <p className="uppercase tracking-[0.16em] text-zinc-500">Start window</p>
              <p className="mt-1 font-bold text-zinc-200">{delayMin.toFixed(1)}s - {delayMax.toFixed(1)}s</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-2">
              <p className="uppercase tracking-[0.16em] text-zinc-500">Last lap</p>
              <p className="mt-1 font-bold text-zinc-200">{latestLap ? formatTime(latestLap.time) : "--:--.--"}</p>
            </div>
          </div>
        </section>

        <section className={clsx(
          "rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur transition-opacity duration-300",
          isActive ? "opacity-30 pointer-events-none" : "opacity-100",
        )}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Launch settings</p>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-cyan-200">Preset live</span>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            <NumInput label="Delay" unit="sec" value={countdownSec} onChange={setCountdownSec} min={1} max={60} step={1} />
            <NumInput label="Countdown" unit="sec" value={beepCount} onChange={setBeepCount} min={1} max={10} step={1} />
            <NumInput label="Start min" unit="sec" value={delayMin} onChange={setDelayMin} min={0.1} max={delayMax} step={0.1} />
            <NumInput label="Start max" unit="sec" value={delayMax} onChange={setDelayMax} min={delayMin} max={10} step={0.1} />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Battery packs</p>
              <p className="text-sm text-zinc-400">Manual session counter</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPacks(p => Math.max(0, p - 1))}
                className="h-10 w-10 rounded-full border border-orange-300/25 bg-orange-300/5 text-xl text-orange-200 transition hover:bg-orange-300/10 active:scale-95"
              >-</button>
              <span className="w-14 text-center text-3xl font-black tabular-nums text-white">{packs}</span>
              <button
                onClick={() => setPacks(p => p + 1)}
                className="h-10 w-10 rounded-full border border-cyan-300/25 bg-cyan-300/5 text-xl text-cyan-200 transition hover:bg-cyan-300/10 active:scale-95"
              >+</button>
            </div>
          </div>
        </section>

        {canSave && (
          <button
            onClick={handleSaveTraining}
            disabled={saveStatus === "saving"}
            className={clsx(
              "w-full rounded-2xl py-3 text-sm font-black uppercase tracking-[0.18em] transition active:scale-[0.99] disabled:opacity-50",
              saveStatus === "saved"
                ? "border border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
                : saveStatus === "error"
                ? "border border-red-400/30 bg-red-400/15 text-red-300"
                : "border border-cyan-300/35 bg-cyan-300/10 text-cyan-200 shadow-[0_0_42px_rgba(34,211,238,0.1)] hover:bg-cyan-300/15",
            )}
          >
            {saveStatus === "saving" ? "Saving..." :
             saveStatus === "saved"  ? "Saved" :
             saveStatus === "error"  ? "Save failed - retry" :
             "Save Training"}
          </button>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur">
          <button
            onClick={() => setLogOpen(o => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.18em] text-zinc-400 transition hover:text-zinc-200"
          >
            <span>Flight Log</span>
            <div className="flex items-center gap-2">
              <span className="normal-case tracking-normal text-zinc-500">
                {flightLog.length} {flightLog.length === 1 ? "entry" : "entries"}
              </span>
              <span className="text-zinc-600">{logOpen ? "▲" : "▼"}</span>
            </div>
          </button>

          {logOpen && (
            <div className="border-t border-white/10">
              {flightLog.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-600">No flights recorded yet</p>
              ) : (
                <>
                  <div className="max-h-52 overflow-y-auto divide-y divide-white/10">
                    {flightLog.map((entry, idx) => (
                      <div key={entry.id} className="flex items-center justify-between gap-2 px-4 py-3">
                        <span className="w-8 shrink-0 text-xs text-zinc-600">#{idx + 1}</span>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="font-mono text-sm font-bold tabular-nums text-zinc-100">
                            {formatTime(entry.time)}
                          </span>
                          <span className="font-mono text-[10px] tabular-nums text-zinc-600">
                            {formatWallTime(entry.startedAt)} - {formatWallTime(entry.finishedAt)}
                          </span>
                        </div>
                        <button
                          onClick={() => setFlightLog(prev => prev.filter(e => e.id !== entry.id))}
                          className="w-8 shrink-0 text-right text-sm leading-none text-zinc-700 transition hover:text-red-400"
                          aria-label="Delete entry"
                        >x</button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setFlightLog([])}
                    className="w-full border-t border-white/10 py-2.5 text-xs uppercase tracking-[0.16em] text-zinc-600 transition hover:text-red-400 active:scale-[0.99]"
                  >
                    Clear All
                  </button>
                </>
              )}
            </div>
          )}
        </section>

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
      </div>
    </main>
  );
}
