"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type Phase = "IDLE" | "COUNTDOWN" | "BEEP" | "GO" | "RACING" | "STOPPED" | "ERROR";

// Preloaded audio — iOS requires reuse of the same object after unlock
const sounds: Record<string, HTMLAudioElement> = {};

function getAudio(src: string): HTMLAudioElement {
  if (!sounds[src]) sounds[src] = new Audio(src);
  return sounds[src];
}

function playClick() {
  try {
    const ctx = new AudioContext();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = 0.15;
    src.buffer = buf;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch {}
}

function unlockAudio() {
  ["/audio/stage.mp3", "/audio/buzzer.mp3"].forEach((src) => {
    const a = getAudio(src);
    a.volume = 0;
    a.play().then(() => { a.pause(); a.currentTime = 0; a.volume = 1; }).catch(() => {});
  });
}

function playSound(src: string) {
  const audio = getAudio(src);
  audio.currentTime = 0;
  audio.volume = 1;
  audio.play().catch(() => {});
}

function formatTime(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function NumInput({
  label, unit, value, onChange, min, max, step,
}: {
  label: string; unit: string; value: number;
  onChange: (v: number) => void; min: number; max: number; step: number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(1)))}
          className="w-7 h-7 rounded-full border border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-500 active:scale-90 transition text-base leading-none"
        >−</button>
        <span className="text-xl font-bold text-white w-12 text-center tabular-nums">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))}
          className="w-7 h-7 rounded-full border border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-500 active:scale-90 transition text-base leading-none"
        >+</button>
      </div>
      <span className="text-[10px] text-zinc-600">{unit}</span>
    </div>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [countdown, setCountdown] = useState(0);
  const [beep, setBeep] = useState({ n: 0, total: 5 });
  const [elapsed, setElapsed] = useState(0);

  const [countdownSec, setCountdownSec] = useState(5);
  const [beepCount, setBeepCount] = useState(3);
  const [delayMin, setDelayMin] = useState(0.5);
  const [delayMax, setDelayMax] = useState(2.5);

  const abortRef = useRef(false);
  const raceStartRef = useRef(0);
  const rafRef = useRef(0);

  function stopAll() {
    abortRef.current = true;
    cancelAnimationFrame(rafRef.current);
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

  async function runSequence() {
    abortRef.current = false;

    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        const t = setTimeout(res, ms);
        const check = setInterval(() => {
          if (abortRef.current) { clearTimeout(t); clearInterval(check); res(); }
        }, 50);
        setTimeout(() => clearInterval(check), ms + 100);
      });

    // Countdown
    for (let i = countdownSec; i >= 1; i--) {
      if (abortRef.current) return;
      setPhase("COUNTDOWN");
      setCountdown(i);
      await sleep(1000);
    }

    // Beeps
    for (let i = 1; i <= beepCount; i++) {
      if (abortRef.current) return;
      setPhase("BEEP");
      setBeep({ n: i, total: beepCount });
      playSound("/audio/stage.mp3");
      await sleep(1000);
    }

    // Random delay
    if (abortRef.current) return;
    const randomDelay = delayMin * 1000 + Math.random() * (delayMax - delayMin) * 1000;
    await sleep(randomDelay);

    // GO
    if (abortRef.current) return;
    playSound("/audio/buzzer.mp3");
    setPhase("GO");
    await sleep(800);

    if (abortRef.current) return;
    setPhase("RACING");
    startRace();
  }

  function handleRingTap() {
    unlockAudio();
    playClick();
    if (phase === "IDLE" || phase === "STOPPED" || phase === "ERROR") {
      setElapsed(0);
      runSequence();
    } else if (phase === "RACING") {
      stopRace();
    } else {
      stopAll();
      setPhase("IDLE");
    }
  }

  useEffect(() => () => stopAll(), []);

  const ringColor =
    phase === "RACING"    ? "border-green-400 shadow-[0_0_50px_#4ade80]" :
    phase === "STOPPED"   ? "border-zinc-500" :
    phase === "GO"        ? "border-green-400 shadow-[0_0_50px_#4ade80]" :
    phase === "BEEP"      ? "border-yellow-400 shadow-[0_0_35px_#facc15]" :
    phase === "COUNTDOWN" ? "border-orange-500 shadow-[0_0_25px_#f97316]" :
    phase === "ERROR"     ? "border-red-500" :
                            "border-zinc-700";

  const textColor =
    phase === "RACING"    ? "text-green-400" :
    phase === "STOPPED"   ? "text-zinc-300" :
    phase === "GO"        ? "text-green-400" :
    phase === "BEEP"      ? "text-yellow-400" :
    phase === "COUNTDOWN" ? "text-orange-400" :
    phase === "ERROR"     ? "text-red-500" :
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
    phase === "STOPPED"   ? "tap to restart" :
                            "";

  return (
    <main className="h-screen bg-zinc-950 flex flex-col items-center justify-between py-10 px-6 overflow-hidden select-none">

      <p className="text-xs text-zinc-600 uppercase tracking-[0.2em]">FPV Timer</p>

      <button
        onClick={handleRingTap}
        className={clsx(
          "w-56 h-56 rounded-full border-4 flex items-center justify-center transition-all duration-300 active:scale-95",
          ringColor,
        )}
      >
        <span className={clsx("font-black tabular-nums transition-colors duration-150", textColor, textSize)}>
          {displayValue}
        </span>
      </button>

      <p className={clsx("text-xs uppercase tracking-widest -mt-4", textColor)}>
        {phaseLabel}
      </p>

      <div className={clsx(
        "w-full grid grid-cols-2 gap-x-6 gap-y-4 px-2 transition-opacity duration-300",
        (phase !== "IDLE" && phase !== "STOPPED" && phase !== "ERROR") ? "opacity-0 pointer-events-none" : "opacity-100",
      )}>
        <NumInput label="Countdown" unit="sec" value={countdownSec}
          onChange={setCountdownSec} min={1} max={60} step={1} />
        <NumInput label="Beeps" unit="pcs" value={beepCount}
          onChange={setBeepCount} min={1} max={10} step={1} />
        <NumInput label="Delay min" unit="sec" value={delayMin}
          onChange={setDelayMin} min={0.1} max={delayMax} step={0.1} />
        <NumInput label="Delay max" unit="sec" value={delayMax}
          onChange={setDelayMax} min={delayMin} max={10} step={0.1} />
      </div>

      <div className="h-4" />

    </main>
  );
}
