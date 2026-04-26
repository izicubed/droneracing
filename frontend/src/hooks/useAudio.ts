let actx: AudioContext | null = null;
const audioBuffers: Record<string, AudioBuffer> = {};
let audioUnlocked = false;

const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA==";

type NavigatorWithAudioSession = Navigator & {
  audioSession?: { type?: string };
};

function getCtx() {
  if (!actx) actx = new AudioContext();
  return actx;
}

function preferPlaybackAudioSession() {
  try {
    const nav = navigator as NavigatorWithAudioSession;
    if (nav.audioSession) nav.audioSession.type = "playback";
  } catch {}
}

async function unlockHtmlAudio() {
  const audio = new Audio(SILENT_WAV);
  audio.preload = "auto";
  audio.playsInline = true;
  audio.volume = 1;
  try {
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
  } catch {}
}

async function ensureAudioReady() {
  preferPlaybackAudioSession();

  const ctx = getCtx();
  if (ctx.state !== "running") {
    await ctx.resume();
  }

  if (!audioUnlocked) {
    await unlockHtmlAudio();

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
