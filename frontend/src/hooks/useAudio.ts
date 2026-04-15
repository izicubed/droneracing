// Module-level singletons — survive re-renders, one AudioContext per tab
let actx: AudioContext | null = null;
const audioBuffers: Record<string, AudioBuffer> = {};

function getCtx() {
  if (!actx) actx = new AudioContext();
  return actx;
}

export async function loadBuffers() {
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

export async function playBuffer(src: string) {
  const ctx = getCtx();
  // iOS Safari: AudioContext уходит в suspended после паузы — resume() перед каждым воспроизведением
  if (ctx.state === "suspended") await ctx.resume();
  const buf = audioBuffers[src];
  if (!buf) return;
  const n = ctx.createBufferSource();
  n.buffer = buf;
  n.connect(ctx.destination);
  n.start(0);
}

export async function playClick() {
  try {
    const ctx = getCtx();
    // iOS Safari: resume перед воспроизведением
    if (ctx.state === "suspended") await ctx.resume();
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.015), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.12;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.connect(ctx.destination);
    s.start(0);
  } catch {}
}

export function useAudio() {
  return { getCtx, loadBuffers, playBuffer, playClick };
}
