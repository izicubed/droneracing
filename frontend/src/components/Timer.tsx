"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import type { Phase } from "@/hooks/useTimer";

const R = 118;
const CIRC = 2 * Math.PI * R;

function formatTime(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function Ring({ progress, color, glow, children, onClick }: {
  progress: number;
  color: string;
  glow: string;
  children: ReactNode;
  onClick: () => void;
}) {
  const offset = CIRC * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-72 w-72 items-center justify-center rounded-full outline-none transition-transform duration-150 active:scale-[0.97]"
      aria-label="Timer control"
    >
      <span className={clsx("absolute inset-3 rounded-full blur-2xl transition-opacity duration-300", glow)} />
      <span className="absolute inset-0 rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.11),rgba(255,255,255,0.03)_34%,rgba(0,0,0,0.38)_68%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_70px_rgba(0,0,0,0.55)]" />
      <span className="absolute inset-8 rounded-full border border-white/10 bg-black/35" />
      <span className="absolute left-1/2 top-5 h-4 w-px -translate-x-1/2 bg-white/30" />
      <span className="absolute bottom-5 left-1/2 h-4 w-px -translate-x-1/2 bg-white/20" />
      <span className="absolute left-5 top-1/2 h-px w-4 -translate-y-1/2 bg-white/20" />
      <span className="absolute right-5 top-1/2 h-px w-4 -translate-y-1/2 bg-white/20" />

      <svg className="absolute inset-0 -rotate-90" width="288" height="288" viewBox="0 0 288 288">
        <defs>
          <filter id="timerGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="144" cy="144" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle cx="144" cy="144" r="98" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 10" />
        <circle
          cx="144" cy="144" r={R} fill="none"
          stroke={color} strokeWidth="9"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter="url(#timerGlow)"
          style={{ transition: "stroke 0.3s" }}
        />
      </svg>
      <div className="relative z-10 flex items-center justify-center text-center">
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
    phase === "RACING" || phase === "GO"        ? "#34d399" :
    phase === "STOPPED"                         ? "#a1a1aa" :
    phase === "BEEP"                            ? "#facc15" :
    phase === "DELAY"                           ? "#22d3ee" :
    phase === "READY" || phase === "COUNTDOWN"  ? "#fb923c" :
    "#52525b";

  const glow =
    phase === "RACING" || phase === "GO"        ? "bg-emerald-400/30" :
    phase === "STOPPED"                         ? "bg-zinc-400/12" :
    phase === "BEEP"                            ? "bg-yellow-300/30" :
    phase === "DELAY"                           ? "bg-cyan-300/28" :
    phase === "READY" || phase === "COUNTDOWN"  ? "bg-orange-400/28" :
    "bg-cyan-400/12";

  const textColor =
    phase === "RACING" || phase === "GO"        ? "text-emerald-300" :
    phase === "STOPPED"                         ? "text-zinc-200" :
    phase === "BEEP"                            ? "text-yellow-300" :
    phase === "DELAY"                           ? "text-cyan-200" :
    phase === "READY" || phase === "COUNTDOWN"  ? "text-orange-300" :
    "text-cyan-100";

  const displayValue =
    phase === "READY"     ? "ARM" :
    phase === "COUNTDOWN" ? countdown :
    phase === "BEEP"      ? beep.total - beep.n + 1 :
    phase === "DELAY"     ? `${(delayTotal / 1000).toFixed(1)}` :
    phase === "GO"        ? "GO" :
    phase === "RACING"    ? formatTime(elapsed) :
    phase === "STOPPED"   ? formatTime(elapsed) :
    "START";

  const textSize =
    phase === "RACING" || phase === "STOPPED" ? "text-4xl" :
    phase === "COUNTDOWN" || phase === "BEEP"  ? "text-7xl" :
    phase === "GO"                             ? "text-6xl" :
    phase === "DELAY"                          ? "text-5xl" :
    phase === "READY"                          ? "text-5xl" :
    "text-4xl";

  const phaseLabel =
    phase === "IDLE"      ? "tap to arm" :
    phase === "READY"     ? "systems ready" :
    phase === "COUNTDOWN" ? "countdown" :
    phase === "BEEP"      ? "launch tones" :
    phase === "DELAY"     ? "random gate" :
    phase === "GO"        ? "race start" :
    phase === "RACING"    ? "tap to stop" :
    "session stopped";

  return (
    <div className="flex flex-col items-center">
      <Ring progress={progress} color={ringColor} glow={glow} onClick={onTap}>
        <div>
          <span className={clsx("block font-black tabular-nums tracking-tight drop-shadow-[0_0_24px_currentColor]", textColor, textSize)}>
            {displayValue}
          </span>
          <span className={clsx("mt-2 block text-xs font-bold uppercase tracking-[0.28em]", textColor)}>
            {phaseLabel}
          </span>
        </div>
      </Ring>
    </div>
  );
}
