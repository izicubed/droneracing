"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type Phase = "IDLE" | "COUNTDOWN" | "BEEP" | "GO" | "RACING" | "STOPPED";

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

// SVG ring with progress
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
        {/* Track */}
        <circle cx="112" cy="112" r={R} fill="none" stroke="#27272a" strokeWidth="6" />
        {/* Progress */}
        <circle
          cx="112" cy="112" r={R} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.15s linear, stroke 0.3s" }}
        />
      </svg>
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </button>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [countdown, setCountdown] = useState(0);
  const [beep, setBeep] = useState({ n: 0, total: 3 });
  const [elapsed, setElapsed] = useState(0);
  const [cdProgress, setCdProgress] = useState(0);

  const [countdownSec, setCountdownSec] = useState(5);
  const [beepCount, setBeepCount] = useState(3);
  const [delayMin, setDelayMin] = useState(0.5);
  const [delayMax, setDelayMax] = useState(2.5);

  const abortRef = useRef(false);
  const raceStartRef = useRef(0);
  const rafRef = useRef(0);
  const cdRafRef = useRef(0);

  function stopAll() {
    abortRef.current = true;
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(cdRafRef.current);
  }

  function startRace() {
    raceStartRef.current = Date.now();
    const tick = () => {
      setElapsed(Date.now() - raceStartRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopRace() {
    cancelAnimationFrame(rafRef.current);
    setElapsed(Date.now() - raceStartRef.current);
    setPhase("STOPPED");
  }

  async function runSequence(cSec: number, bCount: number, dMin: number, dMax: number) {
    abortRef.current = false;

    const sleep = (ms: number) => new Promise<void>((res) => {
      const id = setTimeout(res, ms);
      const iv = setInterval(() => {
        if (abortRef.current) { clearTimeout(id); clearInterval(iv); res(); }
      }, 30);
    });

    // Smooth countdown progress via RAF
    const cdStart = Date.now();
    const cdTotal = cSec * 1000;
    const trackCd = () => {
      const p = 1 - (Date.now() - cdStart) / cdTotal;
      setCdProgress(Math.max(0, p));
      if (!abortRef.current && p > 0) cdRafRef.current = requestAnimationFrame(trackCd);
    };
    cdRafRef.current = requestAnimationFrame(trackCd);

    for (let i = cSec; i >= 1; i--) {
      if (abortRef.current) return;
      setPhase("COUNTDOWN");
      setCountdown(i);
      await sleep(1000);
    }
    cancelAnimationFrame(cdRafRef.current);

    for (let i = 1; i <= bCount; i++) {
      if (abortRef.current) return;
      setPhase("BEEP");
      setBeep({ n: i, total: bCount });
      playBuffer("/audio/stage.mp3");
      await sleep(1000);
    }

    if (abortRef.current) return;
    await sleep(dMin * 1000 + Math.random() * (dMax - dMin) * 1000);

    if (abortRef.current) return;
    playBuffer("/audio/buzzer.mp3");
    setPhase("GO");
    await sleep(800);

    if (abortRef.current) return;
    setPhase("RACING");
    startRace();
  }

  async function handleRingTap() {
    playClick();
    await loadBuffers();
    if (phase === "IDLE" || phase === "STOPPED") {
      setElapsed(0);
      setCdProgress(0);
      runSequence(countdownSec, beepCount, delayMin, delayMax);
    } else if (phase === "RACING") {
      stopRace();
    } else {
      stopAll();
      setPhase("IDLE");
    }
  }

  useEffect(() => () => stopAll(), []);

  // Progress value 0–1 for the ring
  const progress =
    phase === "COUNTDOWN" ? cdProgress :
    phase === "BEEP"      ? beep.n / beep.total :
    phase === "GO"        ? 1 :
    phase === "RACING"    ? (elapsed % 60000) / 60000 :
    phase === "STOPPED"   ? (elapsed % 60000) / 60000 :
    0;

  const ringColor =
    phase === "RACING" || phase === "GO" ? "#4ade80" :
    phase === "STOPPED"                  ? "#71717a" :
    phase === "BEEP"                     ? "#facc15" :
    phase === "COUNTDOWN"                ? "#f97316" :
    "#3f3f46";

  const textColor =
    phase === "RACING" || phase === "GO" ? "text-green-400" :
    phase === "STOPPED"                  ? "text-zinc-300" :
    phase === "BEEP"                     ? "text-yellow-400" :
    phase === "COUNTDOWN"                ? "text-orange-400" :
    "text-zinc-500";

  const displayValue =
    phase === "COUNTDOWN" ? countdown :
    phase === "BEEP"      ? `${beep.n}/${beep.total}` :
    phase === "GO"        ? "GO!" :
    phase === "RACING"    ? formatTime(elapsed) :
    phase === "STOPPED"   ? formatTime(elapsed) :
    "START";

  const textSize =
    phase === "RACING" || phase === "STOPPED" ? "text-3xl" :
    phase === "COUNTDOWN"                     ? "text-6xl" :
    phase === "GO"                            ? "text-5xl" :
    phase === "BEEP"                          ? "text-4xl" :
    "text-2xl";

  const phaseLabel =
    phase === "IDLE"      ? "tap to start" :
    phase === "COUNTDOWN" ? "countdown" :
    phase === "BEEP"      ? `beep ${beep.n} of ${beep.total}` :
    phase === "GO"        ? "race start!" :
    phase === "RACING"    ? "tap to stop" :
    "tap to restart";

  return (
    <main className="h-screen bg-zinc-950 flex flex-col items-center justify-between py-10 px-6 overflow-hidden select-none">

      <p className="text-xs text-zinc-600 uppercase tracking-[0.2em]">FPV Timer</p>

      <Ring progress={progress} color={ringColor} onClick={handleRingTap}>
        <span className={clsx("font-black tabular-nums", textColor, textSize)}>
          {displayValue}
        </span>
      </Ring>

      <p className={clsx("text-xs uppercase tracking-widest -mt-4", textColor)}>
        {phaseLabel}
      </p>

      <div className={clsx(
        "w-full grid grid-cols-2 gap-x-6 gap-y-4 px-2 transition-opacity duration-300",
        phase !== "IDLE" && phase !== "STOPPED" ? "opacity-0 pointer-events-none" : "opacity-100",
      )}>
        <NumInput label="Countdown" unit="sec" value={countdownSec} onChange={setCountdownSec} min={1} max={60} step={1} />
        <NumInput label="Beeps" unit="pcs" value={beepCount} onChange={setBeepCount} min={1} max={10} step={1} />
        <NumInput label="Delay min" unit="sec" value={delayMin} onChange={setDelayMin} min={0.1} max={delayMax} step={0.1} />
        <NumInput label="Delay max" unit="sec" value={delayMax} onChange={setDelayMax} min={delayMin} max={10} step={0.1} />
      </div>

      <div className="h-4" />

    </main>
  );
}
