/**
 * 全模式共用音效（跳躍、落地、彈跳板、腳步）
 * 設定：assets/audio/game-sounds.json
 */
import { getAudioContext, getSfxBus, playSfx } from "./audio.js";
import { fetchDecodeAudio } from "./audioLoad.js";

const CONFIG_URL = "assets/audio/game-sounds.json";
const DEFAULT_PATHS = {
  footstep: "assets/audio/sfx/footstep.mp3",
  jump: "assets/audio/sfx/jump.mp3",
  land: "assets/audio/sfx/land.mp3",
  bouncePad: "assets/audio/sfx/bounce_pad.mp3",
};

const FALLBACK = {
  footstep: "footstep",
  jump: "jump",
  land: "teleport",
  bouncePad: "teleport",
};

let config = { ...DEFAULT_PATHS };
const buffers = {};
let loadPromise = null;
const lastPlay = {};

export async function loadGameSounds() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch(CONFIG_URL, { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        config = { ...DEFAULT_PATHS, ...data };
        delete config._comment;
      }
    } catch {
      config = { ...DEFAULT_PATHS };
    }
    return config;
  })();
  return loadPromise;
}

export function getGameSoundConfig() {
  return { ...config };
}

export async function preloadGameSounds() {
  await loadGameSounds();
  const actx = getAudioContext();
  if (!actx) return;
  for (const [id, path] of Object.entries(config)) {
    if (!path || typeof path !== "string") continue;
    const buf = await fetchDecodeAudio(actx, path);
    if (buf) buffers[id] = buf;
    else delete buffers[id];
  }
}

function playSample(id, minGap = 0.05, vol = 0.55) {
  const now = performance.now();
  if (lastPlay[id] && now - lastPlay[id] < minGap * 1000) return false;
  lastPlay[id] = now;
  const buf = buffers[id];
  const actx = getAudioContext();
  const bus = getSfxBus();
  if (buf && actx && bus) {
    try {
      const src = actx.createBufferSource();
      src.buffer = buf;
      const g = actx.createGain();
      g.gain.value = vol;
      src.connect(g);
      g.connect(bus);
      src.start(0);
      return true;
    } catch {
      /* fallback */
    }
  }
  if (FALLBACK[id]) playSfx(FALLBACK[id], minGap);
  return false;
}

export function playFootstepSfx(minGap = 0.08) {
  playSample("footstep", minGap, 0.5);
}

export function playJumpSfx(minGap = 0.06) {
  playSample("jump", minGap, 0.62);
}

export function playLandSfx(minGap = 0.08) {
  playSample("land", minGap, 0.58);
}

export function playBouncePadSfx(minGap = 0.12) {
  playSample("bouncePad", minGap, 0.72);
}
