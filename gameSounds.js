/**
 * 全模式共用音效（跳躍、落地、彈跳板、腳步、滑壘、揮刀等）
 * 設定：assets/audio/game-sounds.json
 */
import { getAudioContext, getSfxBus, playSfx } from "./audio.js";
import { fetchDecodeAudio } from "./audioLoad.js";
import { resolveAsset } from "./assetUrls.js";

const CONFIG_URL = resolveAsset("assets/audio/game-sounds.json");
const DEFAULT_PATHS = {
  footstep: resolveAsset("assets/audio/sfx/footstep.mp3"),
  jump: resolveAsset("assets/audio/sfx/jump.mp3"),
  land: resolveAsset("assets/audio/sfx/land.mp3"),
  bouncePad: resolveAsset("assets/audio/sfx/bounce_pad.mp3"),
  slide: resolveAsset("assets/audio/sfx/slide.mp3"),
  katanaSwing: resolveAsset("assets/audio/sfx/katana_swing.mp3"),
};

/** 動作 id → sample 鍵與合成音 fallback（全模式統一入口） */
export const ACTION_SFX = {
  footstep: { sample: "footstep", fallback: "footstep", vol: 0.72 },
  jump: { sample: "jump", fallback: "jump", vol: 0.8 },
  land: { sample: "land", fallback: "teleport", vol: 0.76 },
  bounceLaunch: { sample: "bouncePad", fallback: "teleport", vol: 0.72 },
  slide: { sample: "slide", fallback: "slide", vol: 0.82 },
  meleeSwing: { sample: "katanaSwing", fallback: "slash", vol: 0.88 },
  meleeWind: { sample: null, fallback: "swing_wind", vol: 0.5 },
};

const FALLBACK = {
  footstep: "footstep",
  jump: "jump",
  land: "teleport",
  bouncePad: "teleport",
  slide: "slide",
  katanaSwing: "slash",
};

let config = { ...DEFAULT_PATHS };
const buffers = {};
let loadPromise = null;
const lastPlay = {};

function normalizeAssetPath(path) {
  if (!path || typeof path !== "string") return "";
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return resolveAsset(path.replace(/^\.?\//, ""));
}

export async function loadGameSounds() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch(CONFIG_URL, { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        config = { ...DEFAULT_PATHS, ...data };
        for (const [id, path] of Object.entries(config)) {
          if (typeof path === "string") config[id] = normalizeAssetPath(path);
        }
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

function playSample(id, minGap = 0.05, vol = 0.78) {
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

/** 全模式共用：依動作播放（有 mp3 用 mp3，否則內建合成音） */
export function playActionSfx(action, minGap = 0.05) {
  const def = ACTION_SFX[action];
  if (!def) return false;
  if (def.sample && playSample(def.sample, minGap, def.vol)) return true;
  if (def.fallback) playSfx(def.fallback, minGap);
  return true;
}

export function playFootstepSfx(minGap = 0.08) {
  return playActionSfx("footstep", minGap);
}

export function playJumpSfx(minGap = 0.06) {
  return playActionSfx("jump", minGap);
}

export function playLandSfx(minGap = 0.08) {
  return playActionSfx("land", minGap);
}

export function playBouncePadSfx(minGap = 0.12) {
  return playActionSfx("bounceLaunch", minGap);
}

export function playSlideSfx(minGap = 0.2) {
  return playActionSfx("slide", minGap);
}

export function playKatanaSwingSfx(minGap = 0.05) {
  return playActionSfx("meleeSwing", minGap);
}

export function playMeleeWindSfx(minGap = 0.04) {
  return playActionSfx("meleeWind", minGap);
}
