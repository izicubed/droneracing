"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type Phase = "IDLE" | "COUNTDOWN" | "BEEP" | "GO" | "ERROR";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

function playSound(src: string) {
  const audio = new Audio(src);
  audio.play().catch(() => {});
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

  const [countdownSec, setCountdownSec] = useState(10);
  const [beepCount, setBeepCount] = useState(3);
  const [delayMin, setDelayMin] = useState(0.5);
  const [delayMax, setDelayMax] = useState(2.5);
  const wsRef = useRef<WebSocket | null>(null);
  const running = phase !== "IDLE" && phase !== "GO" && phase !== "ERROR";

  function start() {
    if (wsRef.current) wsRef.current.close();
    setPhase("IDLE");

    const ws = new WebSocket(`${WS_URL}/ws/timer`);
    wsRef.current = ws;

    ws.onopen = () =>
      ws.send(JSON.stringify({
        countdown_sec: countdownSec,
        beep_count: beepCount,
        random_delay_min_sec: delayMin,
        random_delay_max_sec: delayMax,
      }));

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      setPhase(msg.phase);
      if (msg.phase === "COUNTDOWN") setCountdown(msg.remaining);
      if (msg.phase === "BEEP") {
        setBeep({ n: msg.n, total: msg.total });
        playSound("/audio/stage.mp3");
      }
      if (msg.phase === "GO") playSound("/audio/buzzer.mp3");
    };

    ws.onerror = () => setPhase("ERROR");
  }

  function stop() {
    wsRef.current?.close();
    setPhase("IDLE");
  }

  useEffect(() => () => { wsRef.current?.close(); }, []);

  const ringColor =
    phase === "GO"        ? "border-green-400 shadow-[0_0_50px_#4ade80]" :
    phase === "BEEP"      ? "border-yellow-400 shadow-[0_0_35px_#facc15]" :
    phase === "COUNTDOWN" ? "border-orange-500 shadow-[0_0_25px_#f97316]" :
    phase === "ERROR"     ? "border-red-500" :
                            "border-zinc-800";

  const textColor =
    phase === "GO"        ? "text-green-400" :
    phase === "BEEP"      ? "text-yellow-400" :
    phase === "COUNTDOWN" ? "text-orange-400" :
    phase === "ERROR"     ? "text-red-500" :
                            "text-zinc-700";

  const displayValue =
    phase === "COUNTDOWN" ? countdown :
    phase === "BEEP"      ? `${beep.n}/${beep.total}` :
    phase === "GO"        ? "GO!" :
    phase === "ERROR"     ? "ERR" :
                            "···";

  const phaseLabel =
    phase === "IDLE"      ? "waiting" :
    phase === "COUNTDOWN" ? "countdown" :
    phase === "BEEP"      ? `beep ${beep.n} of ${beep.total}` :
    phase === "GO"        ? "race start!" :
                            "connection error";

  return (
    <main className="h-screen bg-zinc-950 flex flex-col items-center justify-between py-10 px-6 overflow-hidden select-none">

      <p className="text-xs text-zinc-600 uppercase tracking-[0.2em]">FPV Timer</p>

      <div className={clsx(
        "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-300",
        ringColor,
      )}>
        <span className={clsx("font-black tabular-nums transition-colors duration-150", textColor,
          phase === "COUNTDOWN" ? "text-6xl" :
          phase === "GO"        ? "text-5xl" :
          phase === "BEEP"      ? "text-4xl" : "text-3xl",
        )}>
          {displayValue}
        </span>
      </div>

      <p className={clsx("text-xs uppercase tracking-widest -mt-4", textColor)}>
        {phaseLabel}
      </p>

      <div className="w-full grid grid-cols-2 gap-x-6 gap-y-4 px-2">
        <NumInput label="Countdown" unit="sec" value={countdownSec}
          onChange={setCountdownSec} min={1} max={60} step={1} />
        <NumInput label="Beeps" unit="pcs" value={beepCount}
          onChange={setBeepCount} min={1} max={10} step={1} />
        <NumInput label="Delay min" unit="sec" value={delayMin}
          onChange={setDelayMin} min={0.1} max={delayMax} step={0.1} />
        <NumInput label="Delay max" unit="sec" value={delayMax}
          onChange={setDelayMax} min={delayMin} max={10} step={0.1} />
      </div>

      {!running ? (
        <button
          onClick={start}
          className={clsx(
            "w-20 h-20 rounded-full font-black text-base tracking-widest transition-all duration-150 active:scale-90",
            phase === "GO"
              ? "bg-green-500 text-white shadow-[0_0_30px_#4ade80]"
              : "bg-orange-500 text-white shadow-[0_0_20px_#f97316] hover:bg-orange-400",
          )}
        >
          {phase === "GO" ? "✓" : "START"}
        </button>
      ) : (
        <button
          onClick={stop}
          className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 font-bold text-sm tracking-widest hover:border-red-500 hover:text-red-500 transition active:scale-90"
        >
          STOP
        </button>
      )}

    </main>
  );
}
