/** 程式化音效 — 音量高於背景音樂 */
let actx = null;
let master = null;
let sfxBus = null;
let unlocked = false;
let lastSfxTime = {};

export async function initAudioEngine() {
  try {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = 1;
      sfxBus = actx.createGain();
      sfxBus.gain.value = 1.2;
      sfxBus.connect(master);
      master.connect(actx.destination);
    }
    if (actx.state === "suspended") await actx.resume();
    unlocked = true;
    return true;
  } catch (e) {
    console.warn("音效", e);
    return false;
  }
}

function out(node) {
  node.connect(sfxBus || master || actx.destination);
}

function tone(freq, dur, type = "sine", vol = 0.28) {
  if (!actx || !unlocked) return;
  const t0 = actx.currentTime;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  out(g);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noiseBurst(dur = 0.08, vol = 0.22) {
  if (!actx || !unlocked) return;
  const n = Math.floor(actx.sampleRate * dur);
  const buffer = actx.createBuffer(1, n, actx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = actx.createBufferSource();
  src.buffer = buffer;
  const g = actx.createGain();
  g.gain.value = vol;
  src.connect(g);
  out(g);
  src.start();
}

const SFX = {
  ability: () => { tone(440, 0.06, "sine", 0.22); tone(660, 0.1, "sine", 0.2); },
  hit: () => { noiseBurst(0.07, 0.28); tone(180, 0.1, "sawtooth", 0.3); tone(120, 0.08, "square", 0.18); },
  slash: () => { noiseBurst(0.05, 0.2); tone(280, 0.06, "sawtooth", 0.26); tone(140, 0.1, "sawtooth", 0.2); },
  swing_wind: () => { tone(200, 0.08, "triangle", 0.18); noiseBurst(0.04, 0.12); },
  catch: () => { tone(90, 0.22, "square", 0.32); tone(55, 0.28, "sawtooth", 0.22); },
  jump: () => tone(380, 0.1, "sine", 0.22),
  mission: () => { tone(523, 0.1, "sine", 0.24); tone(784, 0.16, "sine", 0.22); tone(988, 0.22, "sine", 0.2); },
  mission_fail: () => { tone(220, 0.16, "square", 0.22); tone(160, 0.22, "sawtooth", 0.18); },
  projectile: () => tone(520, 0.05, "triangle", 0.2),
  aoe: () => { noiseBurst(0.1, 0.24); tone(80, 0.22, "sawtooth", 0.24); },
  item: () => { tone(800, 0.1, "sine", 0.22); tone(1000, 0.12, "sine", 0.2); },
  teleport: () => {
    tone(520, 0.08, "sine", 0.26);
    tone(880, 0.14, "triangle", 0.24);
    tone(1200, 0.1, "sine", 0.18);
  },
  exit: () => {
    tone(440, 0.12, "sine", 0.22);
    tone(554, 0.12, "sine", 0.2);
    tone(659, 0.12, "sine", 0.2);
    tone(880, 0.28, "sine", 0.28);
  },
  ui: () => { tone(420, 0.05, "sine", 0.38); tone(560, 0.08, "sine", 0.42); },
  ui_back: () => tone(300, 0.08, "triangle", 0.36),
  ui_confirm: () => { tone(480, 0.06, "sine", 0.4); tone(720, 0.12, "sine", 0.44); },
  warn: () => tone(200, 0.14, "square", 0.22),
  chase: () => {
    tone(110, 0.1, "square", 0.24);
    tone(85, 0.12, "square", 0.2);
  },
  horror: () => {
    noiseBurst(0.14, 0.2);
    tone(180, 0.32, "sawtooth", 0.3);
    tone(120, 0.38, "square", 0.18);
    tone(90, 0.2, "sawtooth", 0.15);
  },
  slide: () => {
    noiseBurst(0.1, 0.18);
    tone(180, 0.08, "triangle", 0.16);
  },
  quiz_open: () => tone(600, 0.08, "sine", 0.2),
  hurt: () => {
    tone(150, 0.12, "sawtooth", 0.32);
    tone(95, 0.18, "square", 0.24);
    noiseBurst(0.06, 0.15);
  },
};

export function playSfx(name, minGap = 0.04) {
  const now = performance.now();
  if (lastSfxTime[name] && now - lastSfxTime[name] < minGap * 1000) return;
  lastSfxTime[name] = now;
  initAudioEngine().then((ok) => {
    if (!ok) return;
    try { (SFX[name] || SFX.ui)(); } catch { /* */ }
  });
}

export function bindAudioUnlock() {
  const unlock = () => {
    initAudioEngine();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}
