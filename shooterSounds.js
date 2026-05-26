/**
 * 槍戰漆彈音效：讀取 assets/audio/shooter-sounds.json
 * 未配置或載入失敗時，由 audio.js 的合成音 fallback。
 */
import { getAudioContext, getAudioSettings, getSfxBus } from "./audio.js";
import { fetchDecodeAudio } from "./audioLoad.js";
import { resolveAsset } from "./assetUrls.js";

const CONFIG_URL = resolveAsset("assets/audio/shooter-sounds.json");

const SAMPLE_PATHS = {
  fire: resolveAsset("assets/audio/sfx/paintball_fire.mp3"),
  hitBody: resolveAsset("assets/audio/sfx/paintball_hit_body.mp3"),
  hitWall: resolveAsset("assets/audio/sfx/paintball_hit_wall.mp3"),
  headshot: resolveAsset("assets/audio/sfx/paintball_headshot.mp3"),
  pickupHeal: resolveAsset("assets/audio/sfx/paintball_pickup_heal.mp3"),
};

function normalizeAssetPath(path) {
  if (!path || typeof path !== "string") return "";
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return resolveAsset(path.replace(/^\.?\//, ""));
}

let config = { ...SAMPLE_PATHS };
const buffers = {};
let loadPromise = null;
const lastPlay = {};

const FALLBACK_SFX = {
  fire: "shoot",
  hitBody: "shoot_hit",
  hitWall: "hit",
  headshot: "headshot",
  pickupHeal: "item",
};

export async function loadShooterSounds() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch(CONFIG_URL, { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        config = { ...SAMPLE_PATHS, ...data };
        for (const [id, path] of Object.entries(config)) {
          if (typeof path === "string") config[id] = normalizeAssetPath(path);
        }
        delete config._comment;
      }
    } catch {
      config = { ...SAMPLE_PATHS };
    }
    return config;
  })();
  return loadPromise;
}

export function getShooterSoundConfig() {
  return { ...config };
}

export async function preloadShooterSounds() {
  await loadShooterSounds();
  const actx = getAudioContext();
  if (!actx) return false;
  if (actx.state === "suspended") {
    try { await actx.resume(); } catch { /* */ }
  }
  for (const [id, path] of Object.entries(config)) {
    if (!path || typeof path !== "string") continue;
    if (id === "winMusic" || id === "loseMusic") continue;
    const buf = await fetchDecodeAudio(actx, path);
    if (buf) buffers[id] = buf;
    else delete buffers[id];
  }
  return true;
}

export async function warmShooterSounds() {
  const { initAudioEngine } = await import("./audio.js");
  const ok = await initAudioEngine();
  if (!ok) return false;
  await loadShooterSounds();
  return preloadShooterSounds();
}

export function playShooterSfx(id, playSfx, minGap = 0.04) {
  const now = performance.now();
  if (lastPlay[id] && now - lastPlay[id] < minGap * 1000) return false;
  lastPlay[id] = now;

  const buf = buffers[id];
  const actx = getAudioContext();
  if (buf && actx) {
    try {
      if (actx.state === "suspended") actx.resume().catch(() => {});
      const src = actx.createBufferSource();
      src.buffer = buf;
      const g = actx.createGain();
      const sfxMul = Math.max(0, Math.min(2, getAudioSettings().sfx ?? 1));
      g.gain.value = (id === "fire" ? 0.82 : 0.92) * sfxMul;
      src.connect(g);
      const bus = getSfxBus();
      g.connect(bus || actx.destination);
      src.start(0);
      return true;
    } catch {
      /* fallback */
    }
  }
  if (!buf && config[id] && actx) {
    fetchDecodeAudio(actx, config[id]).then((b) => {
      if (b) buffers[id] = b;
    });
  }
  if (playSfx && FALLBACK_SFX[id]) {
    playSfx(FALLBACK_SFX[id], minGap);
    return true;
  }
  return false;
}
