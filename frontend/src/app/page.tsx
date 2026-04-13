"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import AuthModal from "@/components/AuthModal";
import ProfileModal from "@/components/ProfileModal";
import { api, saveTraining, PilotInfo } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Phase = "IDLE" | "READY" | "COUNTDOWN" | "BEEP" | "DELAY" | "GO" | "RACING" | "STOPPED";

type FlightEntry = { id: number; time: number; startedAt: number; finishedAt: number };

let actx: AudioContext | null = null;
const audioBuffers: Record<string, AudioBuffer> = {};

function getCtx() {
  if (!actx) actx = new AudioContext();
  return actx;
}

async function loadBuffers() {
  const ctx = getCtx();
  if (ctx.state === "suspended") await ctx.resume();
  for (const src of ["/audio/stage.mp3", "/audio/buzzer.mp3"]) {
    if (audioBuffers[src]) continue;
    try {
      const ab = await (await fetch(src)).arrayBuffer();
      audioBuffers[src] = await ctx.decodeAudioData(ab);
    } catch {}
  }
}

function playBuffer(src: string) {
  const ctx = getCtx();
  const buf = audioBuffers[src];
  if (!buf) return;
  const n = ctx.createBufferSource();
  n.buffer = buf;
  n.connect(ctx.destination);
  n.start(0);
}

function playClick() {
  try {
    const ctx = getCtx();
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.015), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.12;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.connect(ctx.destination);
    s.start(0);
  } catch {}
}

function formatTime(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function formatWallTime(ts: number) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function NumInput({ label, unit, value, onChange, min, max, step }: {
  label: string; unit: string; value: number;
  onChange: (v: number) => void; min: number; max: number; step: number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(1)))}
          className="w-7 h-7 rounded-full border border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-500 active:scale-90 transition text-base leading-none">−</button>
        <span className="text-xl font-bold text-white w-12 text-center tabular-nums">{value}</span>
        <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))}
          className="w-7 h-7 rounded-full border border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-500 active:scale-90 transition text-base leading-none">+</button>
      </div>
      <span className="text-[10px] text-zinc-600">{unit}</span>
    </div>
  );
}

const R = 104;
const CIRC = 2 * Math.PI * R;

function Ring({ progress, color, children, onClick }: {
  progress: number; color: string; children: React.ReactNode; onClick: () => void;
}) {
  const offset = CIRC * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <button
      onClick={onClick}
      className="relative w-56 h-56 flex items-center justify-center active:scale-95 transition-transform duration-150"
    >
      <svg className="-rotate-90 absolute inset-0" width="224" height="224" viewBox="0 0 224 224">
        <circle cx="112" cy="112" r={R} fill="none" stroke="#27272a" strokeWidth="6" />
        <circle
          cx="112" cy="112" r={R} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke 0.3s" }}
        />
      </svg>
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </button>
  );
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
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [countdown, setCountdown] = useState(0);
  const [beep, setBeep] = useState({ n: 0, total: 3 });
  const [elapsed, setElapsed] = useState(0);
  const [cdProgress, setCdProgress] = useState(0);
  const [delayProgress, setDelayProgress] = useState(0);
  const [delayTotal, setDelayTotal] = useState(0);

  const [countdownSec, setCountdownSec] = useState(5);
  const [beepCount, setBeepCount] = useState(3);
  const [delayMin, setDelayMin] = useState(0.5);
  const [delayMax, setDelayMax] = useState(2.5);

  const [packs, setPacks] = useState(0);
  const [flightLog, setFlightLog] = useState<FlightEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const logIdRef = useRef(0);

  // Auth / profile state
  const [pilot, setPilot] = useState<PilotInfo | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const abortRef = useRef(false);
  const raceStartRef = useRef(0);
  const cdStartRef = useRef(0);
  const cdTotalRef = useRef(0);
  const delayStartRef = useRef(0);
  const delayTotalRef = useRef(0);

  // Load pilot profile on mount if token exists
  useEffect(() => {
    if (!getToken()) return;
    api.get<PilotInfo>("/pilots/me").then(setPilot).catch(() => {});
  }, []);

  // Single animation loop driven by phase — reliable on iOS Safari
  useEffect(() => {
    if (phase !== "COUNTDOWN" && phase !== "DELAY" && phase !== "RACING") return;
    let raf: number;
    const tick = () => {
      if (phase === "COUNTDOWN") {
        const p = 1 - (Date.now() - cdStartRef.current) / cdTotalRef.current;
        setCdProgress(Math.max(0, p));
      } else if (phase === "DELAY") {
        const p = (Date.now() - delayStartRef.current) / delayTotalRef.current;
        setDelayProgress(Math.min(1, p));
      } else if (phase === "RACING") {
        setElapsed(Date.now() - raceStartRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Abort on unmount
  useEffect(() => () => { abortRef.current = true; }, []);

  function stopAll() {
    abortRef.current = true;
  }

  function stopRace() {
    const finishedAt = Date.now();
    const startedAt = raceStartRef.current;
    const finalTime = finishedAt - startedAt;
    setElapsed(finalTime);
    setPhase("STOPPED");
    setFlightLog(prev => [...prev, { id: ++logIdRef.current, time: finalTime, startedAt, finishedAt }]);
  }

  async function runSequence(cSec: number, bCount: number, dMin: number, dMax: number) {
    abortRef.current = false;

    const sleep = (ms: number) => new Promise<void>((res) => {
      const id = setTimeout(res, ms);
      const iv = setInterval(() => {
        if (abortRef.current) { clearTimeout(id); clearInterval(iv); res(); }
      }, 30);
    });

    setPhase("READY");
    await sleep(500);
    if (abortRef.current) return;

    cdStartRef.current = Date.now();
    cdTotalRef.current = cSec * 1000;
    for (let i = cSec; i >= 1; i--) {
      if (abortRef.current) return;
      setPhase("COUNTDOWN");
      setCountdown(i);
      await sleep(1000);
    }

    for (let i = 1; i <= bCount; i++) {
      if (abortRef.current) return;
      setPhase("BEEP");
      setBeep({ n: i, total: bCount });
      playBuffer("/audio/stage.mp3");
      await sleep(1000);
    }

    if (abortRef.current) return;
    const delayMs = dMin * 1000 + Math.random() * (dMax - dMin) * 1000;
    delayStartRef.current = Date.now();
    delayTotalRef.current = delayMs;
    setDelayTotal(delayMs);
    setDelayProgress(0);
    setPhase("DELAY");
    await sleep(delayMs);

    if (abortRef.current) return;
    playBuffer("/audio/buzzer.mp3");
    setPhase("GO");
    await sleep(800);

    if (abortRef.current) return;
    raceStartRef.current = Date.now();
    setPhase("RACING");
  }

  async function handleRingTap() {
    playClick();
    await loadBuffers();
    if (phase === "IDLE" || phase === "STOPPED") {
      setElapsed(0);
      setCdProgress(0);
      setPacks(p => p + 1);
      runSequence(countdownSec, beepCount, delayMin, delayMax);
    } else if (phase === "RACING") {
      stopRace();
    } else {
      stopAll();
      setPhase("IDLE");
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
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  }

  function handleAuthSuccess() {
    setShowAuth(false);
    api.get<PilotInfo>("/pilots/me")
      .then(p => { setPilot(p); setShowProfile(false); })
      .catch(() => setShowProfile(true));
  }

  const canSave = pilot && (packs > 0 || flightLog.length > 0);

  const progress =
    phase === "READY"     ? 1 :
    phase === "COUNTDOWN" ? cdProgress :
    phase === "BEEP"      ? beep.n / beep.total :
    phase === "DELAY"     ? delayProgress :
    phase === "GO"        ? 1 :
    phase === "RACING"    ? (elapsed % 60000) / 60000 :
    phase === "STOPPED"   ? (elapsed % 60000) / 60000 :
    0;

  const ringColor =
    phase === "RACING" || phase === "GO"        ? "#4ade80" :
    phase === "STOPPED"                         ? "#71717a" :
    phase === "BEEP"                            ? "#facc15" :
    phase === "DELAY"                           ? "#fb923c" :
    phase === "READY" || phase === "COUNTDOWN"  ? "#f97316" :
    "#3f3f46";

  const textColor =
    phase === "RACING" || phase === "GO"        ? "text-green-400" :
    phase === "STOPPED"                         ? "text-zinc-300" :
    phase === "BEEP"                            ? "text-yellow-400" :
    phase === "DELAY"                           ? "text-orange-300" :
    phase === "READY" || phase === "COUNTDOWN"  ? "text-orange-400" :
    "text-zinc-500";

  const displayValue =
    phase === "READY"     ? "•" :
    phase === "COUNTDOWN" ? countdown :
    phase === "BEEP"      ? beep.total - beep.n + 1 :
    phase === "DELAY"     ? `${(delayTotal / 1000).toFixed(1)}` :
    phase === "GO"        ? "GO!" :
    phase === "RACING"    ? formatTime(elapsed) :
    phase === "STOPPED"   ? formatTime(elapsed) :
    "START";

  const textSize =
    phase === "RACING" || phase === "STOPPED" ? "text-3xl" :
    phase === "COUNTDOWN" || phase === "BEEP"  ? "text-6xl" :
    phase === "GO"                             ? "text-5xl" :
    phase === "DELAY"                          ? "text-4xl" :
    phase === "READY"                          ? "text-5xl" :
    "text-2xl";

  const phaseLabel =
    phase === "IDLE"      ? "tap to start" :
    phase === "READY"     ? "get ready" :
    phase === "COUNTDOWN" ? "countdown" :
    phase === "BEEP"      ? "beep" :
    phase === "DELAY"     ? "standby..." :
    phase === "GO"        ? "race start!" :
    phase === "RACING"    ? "tap to stop" :
    "tap to restart";

  const isActive = phase !== "IDLE" && phase !== "STOPPED";

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center py-8 px-6 gap-3 select-none">

      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <p className="text-xs text-zinc-600 uppercase tracking-[0.2em]">FPV Timer</p>
        <UserButton
          pilot={pilot}
          onClick={() => pilot ? setShowProfile(true) : setShowAuth(true)}
        />
      </div>

      <Ring progress={progress} color={ringColor} onClick={handleRingTap}>
        <span className={clsx("font-black tabular-nums", textColor, textSize)}>
          {displayValue}
        </span>
      </Ring>

      <p className={clsx("text-xs uppercase tracking-widest -mt-2", textColor)}>
        {phaseLabel}
      </p>

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
          onLogout={() => { setPilot(null); setSaveStatus("idle"); }}
        />
      )}

    </main>
  );
}
