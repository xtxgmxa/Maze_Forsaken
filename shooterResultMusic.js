/**
 * 槍戰結算音樂
 * 設定：assets/audio/shooter-sounds.json 的 winMusic / loseMusic
 * 留空則用內建合成音
 */
const CONFIG_URL = "assets/audio/shooter-sounds.json";
let paths = { winMusic: "", loseMusic: "" };
let loadPromise = null;
let resultEl = null;

async function loadPaths() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch(CONFIG_URL, { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        paths = {
          winMusic: data.winMusic || "",
          loseMusic: data.loseMusic || "",
        };
      }
    } catch { /* default */ }
    return paths;
  })();
  return loadPromise;
}

function ensureElement() {
  if (resultEl) return resultEl;
  resultEl = new Audio();
  resultEl.preload = "auto";
  return resultEl;
}

export function stopShooterResultMusic() {
  if (!resultEl) return;
  resultEl.pause();
  resultEl.currentTime = 0;
  resultEl.removeAttribute("src");
}

/** @param {boolean} won */
export async function playShooterResultMusic(won, musicVolume = 0.35) {
  stopShooterResultMusic();
  await loadPaths();
  const src = won ? paths.winMusic : paths.loseMusic;
  const el = ensureElement();
  el.volume = Math.max(0, Math.min(1, musicVolume));
  if (src) {
    try {
      el.src = src;
      el.loop = false;
      await el.play();
      return;
    } catch { /* fallback */ }
  }
  const { playSfx } = await import("./audio.js");
  playSfx(won ? "exit" : "warn", won ? 0.2 : 0.15);
}
