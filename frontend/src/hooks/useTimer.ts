"use client";

import { useEffect, useRef, useState } from "react";

export type Phase = "IDLE" | "READY" | "COUNTDOWN" | "BEEP" | "DELAY" | "GO" | "RACING" | "STOPPED";

interface RaceEntry {
  time: number;
  startedAt: number;
  finishedAt: number;
}

interface UseTimerOptions {
  onRaceStopped: (entry: RaceEntry) => void;
  playBuffer: (src: string) => Promise<void>;
}

export function useTimer({ onRaceStopped, playBuffer }: UseTimerOptions) {
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [countdown, setCountdown] = useState(0);
  const [beep, setBeep] = useState({ n: 0, total: 3 });
  const [elapsed, setElapsed] = useState(0);
  const [cdProgress, setCdProgress] = useState(0);
  const [delayProgress, setDelayProgress] = useState(0);
  const [delayTotal, setDelayTotal] = useState(0);

  const abortRef = useRef(false);
  const raceStartRef = useRef(0);
  const cdStartRef = useRef(0);
  const cdTotalRef = useRef(0);
  const delayStartRef = useRef(0);
  const delayTotalRef = useRef(0);

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
    onRaceStopped({ time: finalTime, startedAt, finishedAt });
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

  return {
    phase, setPhase,
    countdown,
    beep,
    elapsed, setElapsed,
    cdProgress, setCdProgress,
    delayProgress,
    delayTotal,
    runSequence,
    stopAll,
    stopRace,
  };
}
