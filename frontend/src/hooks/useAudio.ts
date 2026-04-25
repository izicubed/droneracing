// Module-level singletons — survive re-renders, one AudioContext per tab
let actx: AudioContext | null = null;
const audioBuffers: Record<string, AudioBuffer> = {};
let audioUnlocked = false;

function getCtx() {
  if (!actx) actx = new AudioContext();
  return actx;
}

async function ensureAudioReady() {
  const ctx = getCtx();
  if (ctx.state !== "running") {
    await ctx.resume();
  }

  if (!audioUnlocked) {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    audioUnlocked = true;
  }

  return ctx;
}

export async function loadBuffers() {
  const ctx = await ensureAudioReady();
  for (const src of ["/audio/stage.mp3", "/audio/buzzer.mp3"]) {
    if (audioBuffers[src]) continue;
    try {
      const ab = await (await fetch(src)).arrayBuffer();
      audioBuffers[src] = await ctx.decodeAudioData(ab);
    } catch {}
  }
}

export async function playBuffer(src: string) {
  const ctx = await ensureAudioReady();
  const buf = audioBuffers[src];
  if (!buf) return;
  const n = ctx.createBufferSource();
  n.buffer = buf;
  n.connect(ctx.destination);
  n.start(0);
}

export async function playClick() {
  try {
    const ctx = await ensureAudioReady();
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
  return { getCtx, loadBuffers, playBuffer, playClick, ensureAudioReady };
}
