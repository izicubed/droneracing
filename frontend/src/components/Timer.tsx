"use client";

import clsx from "clsx";
import type { Phase } from "@/hooks/useTimer";

const R = 104;
const CIRC = 2 * Math.PI * R;

function formatTime(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

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

interface TimerProps {
  phase: Phase;
  countdown: number;
  beep: { n: number; total: number };
  elapsed: number;
  cdProgress: number;
  delayProgress: number;
  delayTotal: number;
  onTap: () => void;
}

export default function Timer({
  phase, countdown, beep, elapsed, cdProgress, delayProgress, delayTotal, onTap,
}: TimerProps) {
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

  return (
    <>
      <Ring progress={progress} color={ringColor} onClick={onTap}>
        <span className={clsx("font-black tabular-nums", textColor, textSize)}>
          {displayValue}
        </span>
      </Ring>
      <p className={clsx("text-xs uppercase tracking-widest -mt-2", textColor)}>
        {phaseLabel}
      </p>
    </>
  );
}
