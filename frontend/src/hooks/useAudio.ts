let actx: AudioContext | null = null;
const audioBuffers: Record<string, AudioBuffer> = {};
const mediaAudio: Record<string, HTMLAudioElement> = {};
let audioUnlocked = false;

const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA==";

type NavigatorWithAudioSession = Navigator & {
  audioSession?: { type?: string };
};

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

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

function getMediaAudio(src: string) {
  if (!mediaAudio[src]) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.playsInline = true;
    audio.volume = 1;
    mediaAudio[src] = audio;
  }
  return mediaAudio[src];
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

  for (const src of ["/audio/stage.mp3", "/audio/buzzer.mp3"]) {
    try {
      const media = getMediaAudio(src);
      media.muted = true;
      await media.play();
      media.pause();
      media.currentTime = 0;
      media.muted = false;
    } catch {
      mediaAudio[src].muted = false;
    }
  }
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
    getMediaAudio(src).load();
    if (audioBuffers[src]) continue;
    try {
      const ab = await (await fetch(src)).arrayBuffer();
      audioBuffers[src] = await ctx.decodeAudioData(ab);
    } catch {}
  }
}

async function playMediaAudio(src: string) {
  try {
    const audio = getMediaAudio(src);
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

export async function playBuffer(src: string) {
  await ensureAudioReady();

  if (isIOS() && await playMediaAudio(src)) return;

  const ctx = getCtx();
  const buf = audioBuffers[src];
  if (!buf) {
    await playMediaAudio(src);
    return;
  }
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
