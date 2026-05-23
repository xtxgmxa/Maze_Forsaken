/** 觸控操作（僅在觸控／粗指標裝置啟用，不影響一般電腦滑鼠鍵盤） */

const MOBILE_SETTINGS_KEY = "forsaken_mobile_v1";
const IMMERSIVE_KEY = "forsaken_immersive_v1";
const DEFAULT_MOBILE = { lookSens: 165, stickDead: 22 };
let missionHighlight = false;
let immersiveMode = false;

let enabled = false;
let stick = { x: 0, z: 0 };
let lookDelta = { x: 0, y: 0 };
const stickCodes = new Set();
const buttonCodes = new Set();
let bindingsRef = null;
let getCtx = () => ({});
let mobileSettings = { ...DEFAULT_MOBILE };

function loadMobileSettings() {
  try {
    const raw = localStorage.getItem(MOBILE_SETTINGS_KEY);
    if (raw) mobileSettings = { ...DEFAULT_MOBILE, ...JSON.parse(raw) };
  } catch {
    mobileSettings = { ...DEFAULT_MOBILE };
  }
  return mobileSettings;
}

function saveMobileSettings() {
  localStorage.setItem(MOBILE_SETTINGS_KEY, JSON.stringify(mobileSettings));
}

export function getLookSensitivity() {
  return (mobileSettings.lookSens ?? DEFAULT_MOBILE.lookSens) / 100;
}

export function getStickDeadzone() {
  return (mobileSettings.stickDead ?? DEFAULT_MOBILE.stickDead) / 100;
}

function setKey(keys, code, on, bucket) {
  if (!code) return;
  keys[code] = on;
  if (on) bucket.add(code);
  else bucket.delete(code);
}

function clearStickKeys(keys) {
  for (const code of stickCodes) keys[code] = false;
  stickCodes.clear();
}

function bindStick(base, knob) {
  let pid = null;
  let cx = 0;
  let cy = 0;
  const maxR = 52;

  const moveKnob = (dx, dy) => {
    const len = Math.hypot(dx, dy);
    const cl = Math.min(len, maxR);
    const nx = len > 0 ? (dx / len) * cl : 0;
    const ny = len > 0 ? (dy / len) * cl : 0;
    knob.style.transform = `translate(${nx}px, ${ny}px)`;
    stick.x = nx / maxR;
    stick.z = ny / maxR;
  };

  const end = () => {
    pid = null;
    stick.x = 0;
    stick.z = 0;
    knob.style.transform = "";
    base.classList.remove("active");
  };

  base.addEventListener("touchstart", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (pid != null) return;
    const t = e.changedTouches[0];
    pid = t.identifier;
    const r = base.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    base.classList.add("active");
    moveKnob(t.clientX - cx, t.clientY - cy);
  }, { passive: false });

  base.addEventListener("touchmove", (e) => {
    e.preventDefault();
    e.stopPropagation();
    for (const t of e.changedTouches) {
      if (t.identifier === pid) moveKnob(t.clientX - cx, t.clientY - cy);
    }
  }, { passive: false });

  const up = (e) => {
    e.stopPropagation();
    for (const t of e.changedTouches) {
      if (t.identifier === pid) end();
    }
  };
  base.addEventListener("touchend", up, { passive: false });
  base.addEventListener("touchcancel", up, { passive: false });
}

function bindLook(zone) {
  let pid = null;
  let lastX = 0;
  let lastY = 0;
  zone.addEventListener("touchstart", (e) => {
    if (e.target.closest(".touch-btn, #touchStickWrap, #btnTouchSettings")) return;
    const t = e.changedTouches[0];
    if (t.clientX < window.innerWidth * 0.36) return;
    pid = t.identifier;
    lastX = t.clientX;
    lastY = t.clientY;
  }, { passive: true });
  zone.addEventListener("touchmove", (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== pid) continue;
      lookDelta.x += t.clientX - lastX;
      lookDelta.y += t.clientY - lastY;
      lastX = t.clientX;
      lastY = t.clientY;
    }
  }, { passive: true });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === pid) pid = null;
    }
  };
  zone.addEventListener("touchend", end);
  zone.addEventListener("touchcancel", end);
}

function releaseTouchKey(keys, code) {
  setKey(keys, code, false, buttonCodes);
  if (code === "Space" || code === "Numpad0") {
    getCtx().clearJumpHeld?.();
  }
  if (code === "ControlLeft" || code === "ControlRight") {
    getCtx().clearSlideHeld?.();
  }
}

function bindButton(btn, keys) {
  const down = (e) => {
    const code = btn.dataset.code;
    if (!code) return;
    e.preventDefault();
    e.stopPropagation();
    setKey(keys, code, true, buttonCodes);
    btn.classList.add("pressed");
  };
  const up = (e) => {
    const code = btn.dataset.code;
    if (!code) return;
    e.preventDefault();
    releaseTouchKey(keys, code);
    btn.classList.remove("pressed");
  };
  btn.addEventListener("touchstart", down, { passive: false });
  btn.addEventListener("touchend", up, { passive: false });
  btn.addEventListener("touchcancel", up, { passive: false });
}

function touchSkillLabel(ab) {
  if (!ab) return "—";
  if (ab.desc && ab.desc.length <= 4) return ab.desc;
  const n = (ab.name || ab.id || "").trim();
  if (n.length <= 5) return n;
  return n.slice(0, 4);
}

export function updateTouchSkillLabels(abilities = []) {
  if (!enabled) return;
  for (let i = 0; i < 3; i++) {
    const btn = document.getElementById(`touchAb${i + 1}`);
    if (!btn) continue;
    const ab = abilities[i];
    const nameEl = btn.querySelector(".touch-skill-name");
    const keyEl = btn.querySelector(".touch-skill-key");
    if (i === 1 && missionHighlight) {
      if (keyEl) keyEl.textContent = "⚡";
      if (nameEl) nameEl.textContent = "任務";
      btn.classList.add("mission-ready");
      btn.title = "靠近發電站 · 點此答題（-3 秒獵人時間）";
      continue;
    }
    btn.classList.remove("mission-ready");
    if (keyEl) keyEl.textContent = `技${i + 1}`;
    if (nameEl) nameEl.textContent = touchSkillLabel(ab);
    btn.title = ab ? `${ab.name || ab.id}：${ab.desc || ""}` : "";
  }
}

/** 靠近任務站時高亮技2，不再另顯浮動「解任務」鈕 */
export function setTouchMissionHighlight(active) {
  missionHighlight = !!active;
  const ab2 = document.getElementById("touchAb2");
  if (ab2) ab2.classList.toggle("mission-ready", missionHighlight);
  getCtx().updateTouchSkillLabels?.();
}

export function updateTouchAbilityCooldowns(slots = []) {
  if (!enabled) return;
  slots.forEach((slot, i) => {
    const btn = document.getElementById(`touchAb${i + 1}`);
    if (!btn) return;
    const onCd = (slot.cd ?? 0) > 0;
    btn.classList.toggle("on-cd", onCd);
    const fill = btn.querySelector(".touch-cd-fill");
    if (fill) fill.style.height = `${slot.fill ?? 0}%`;
    const cdEl = btn.querySelector(".touch-cd-time");
    if (cdEl) {
      cdEl.textContent = onCd ? `${slot.cd.toFixed(1)}` : "";
      cdEl.style.display = onCd ? "block" : "none";
    }
  });
}

export function openMobileSettingsPanel() {
  const panel = document.getElementById("mobileSettingsPanel");
  if (!panel) return;
  const sens = document.getElementById("mobileLookSens");
  const dead = document.getElementById("mobileStickDead");
  if (sens) sens.value = String(mobileSettings.lookSens ?? DEFAULT_MOBILE.lookSens);
  if (dead) dead.value = String(mobileSettings.stickDead ?? DEFAULT_MOBILE.stickDead);
  syncMobileSettingsLabels();
  panel.classList.add("show");
}

export function closeMobileSettingsPanel() {
  document.getElementById("mobileSettingsPanel")?.classList.remove("show");
}

function syncMobileSettingsLabels() {
  const sens = document.getElementById("mobileLookSens");
  const dead = document.getElementById("mobileStickDead");
  const sensVal = document.getElementById("mobileLookSensVal");
  const deadVal = document.getElementById("mobileStickDeadVal");
  if (sensVal && sens) sensVal.textContent = `${(Number(sens.value) / 100).toFixed(2)}×`;
  if (deadVal && dead) deadVal.textContent = `${Number(dead.value)}%`;
}

export function initMobileSettingsUI() {
  if (!enabled) return;
  loadMobileSettings();

  const panel = document.getElementById("mobileSettingsPanel");
  const sens = document.getElementById("mobileLookSens");
  const dead = document.getElementById("mobileStickDead");

  const apply = () => {
    mobileSettings.lookSens = Number(sens?.value ?? DEFAULT_MOBILE.lookSens);
    mobileSettings.stickDead = Number(dead?.value ?? DEFAULT_MOBILE.stickDead);
    saveMobileSettings();
    syncMobileSettingsLabels();
  };

  sens?.addEventListener("input", apply);
  dead?.addEventListener("input", apply);

  document.getElementById("btnCloseMobileSettings")?.addEventListener("click", () => {
    apply();
    closeMobileSettingsPanel();
  });
  document.getElementById("btnSaveMobileSettings")?.addEventListener("click", () => {
    apply();
    closeMobileSettingsPanel();
  });
  document.getElementById("btnToggleFullscreen")?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleMobileFullscreen();
  });
  document.getElementById("btnToggleFullscreenMenu")?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleMobileFullscreen();
  });
  document.addEventListener("fullscreenchange", syncFullscreenButtonLabel);
  document.addEventListener("webkitfullscreenchange", syncFullscreenButtonLabel);
  syncFullscreenButtonLabel();

  document.getElementById("btnResetMobileSettings")?.addEventListener("click", () => {
    mobileSettings = { ...DEFAULT_MOBILE };
    saveMobileSettings();
    if (sens) sens.value = String(DEFAULT_MOBILE.lookSens);
    if (dead) dead.value = String(DEFAULT_MOBILE.stickDead);
    syncMobileSettingsLabels();
  });
  panel?.addEventListener("click", (e) => {
    if (e.target === panel) closeMobileSettingsPanel();
  });

  const openers = ["btnMobileSettings", "btnTouchSettings"];
  openers.forEach((id) => {
    document.getElementById(id)?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openMobileSettingsPanel();
    });
  });
}

export function initTouchControls({ keys, getBindings, getContext }) {
  bindingsRef = getBindings;
  getCtx = getContext;
  loadMobileSettings();
  const root = document.getElementById("touchControls");
  if (!root) return { enabled: false };

  const coarse =
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    (window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 1400);

  if (!coarse) {
    root.hidden = true;
    return { enabled: false };
  }

  enabled = true;
  root.hidden = false;
  document.body.classList.add("touch-ui");

  const base = document.getElementById("touchStick");
  const knob = document.getElementById("touchStickKnob");
  if (base && knob) bindStick(base, knob);

  const lookZone = document.getElementById("touchLookZone");
  if (lookZone) bindLook(lookZone);

  root.querySelectorAll(".touch-btn[data-code]").forEach((btn) => bindButton(btn, keys));
  initMobileSettingsUI();
  loadMobileImmersive();
  const gear = document.getElementById("btnTouchSettings");
  if (gear) gear.hidden = false;

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      if (!immersiveMode) return;
      document.documentElement.style.height = `${window.visualViewport.height}px`;
    });
  }

  return { enabled: true };
}

export function touchControlsTick(keys) {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.gameState !== "play") {
    clearStickKeys(keys);
    for (const code of [...buttonCodes]) releaseTouchKey(keys, code);
    buttonCodes.clear();
    stick.x = 0;
    stick.z = 0;
    return;
  }

  const b = bindingsRef?.().p1 || {};
  clearStickKeys(keys);

  const dead = getStickDeadzone();
  if (stick.z < -dead) setKey(keys, b.up, true, stickCodes);
  if (stick.z > dead) setKey(keys, b.down, true, stickCodes);
  if (stick.x < -dead) setKey(keys, b.left, true, stickCodes);
  if (stick.x > dead) setKey(keys, b.right, true, stickCodes);

  refreshTouchButtons(ctx);
  ctx.updateTouchSkillLabels?.();
}

function refreshTouchButtons(ctx) {
  const rowAb = document.getElementById("touchRowAbilities");
  const rowDoor = document.getElementById("touchRowDoor");
  const rowMove = document.getElementById("touchRowMove");
  if (!rowAb || !rowDoor) return;
  const kh = ctx.isKeyHunt?.();
  rowAb.hidden = kh || ctx.playAsKiller;
  rowDoor.hidden = !kh;
  if (rowMove) rowMove.hidden = false;
}

export function consumeTouchLook() {
  if (!enabled) return null;
  const mult = getLookSensitivity();
  const dx = lookDelta.x * mult;
  const dy = lookDelta.y * mult;
  lookDelta.x = 0;
  lookDelta.y = 0;
  if (!dx && !dy) return null;
  return { dx, dy };
}

export function isTouchUiEnabled() {
  return enabled;
}

export function syncTouchButtonBindings(getBindings) {
  if (!enabled || !getBindings) return;
  const b = getBindings().p1 || {};
  const map = [
    ["touchAb1", "ab1"],
    ["touchAb2", "ab2"],
    ["touchAb3", "ab3"],
    ["touchOpen", "openDoor"],
    ["touchItem", "useItem"],
    ["touchSprint", "sprint"],
    ["touchJump", "jump"],
    ["touchSlide", "slide"],
  ];
  for (const [id, action] of map) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    const code = b[action];
    if (code) btn.dataset.code = code;
  }
}

export function applyMobileCameraDefaults() {
  return enabled ? 6.8 : null;
}

export function isMobileFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement
  );
}

export function isMobileImmersive() {
  return immersiveMode || isMobileFullscreen();
}

function applyImmersiveClass(on) {
  immersiveMode = !!on;
  document.body.classList.toggle("mobile-immersive", immersiveMode);
  try {
    localStorage.setItem(IMMERSIVE_KEY, immersiveMode ? "1" : "0");
  } catch { /* ignore */ }
  if (immersiveMode) {
    window.scrollTo(0, 1);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      if (window.visualViewport) {
        document.documentElement.style.height = `${window.visualViewport.height}px`;
      }
    });
  } else {
    document.documentElement.style.height = "";
  }
}

export function loadMobileImmersive() {
  if (!enabled) return;
  try {
    if (localStorage.getItem(IMMERSIVE_KEY) === "1") applyImmersiveClass(true);
  } catch { /* ignore */ }
}

/** 全螢幕：API + 沉浸式版面（iOS Safari 常需「加入主畫面」才無網址列） */
export async function toggleMobileFullscreen() {
  const root = document.documentElement;
  const wantOn = !isMobileImmersive();

  if (wantOn) {
    applyImmersiveClass(true);
    try {
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: "hide" });
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    } catch { /* 仍保留 immersive */ }
  } else {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch { /* ignore */ }
    applyImmersiveClass(false);
  }
  syncFullscreenButtonLabel();
}

export function syncFullscreenButtonLabel() {
  const on = isMobileImmersive();
  const native = isMobileFullscreen();
  document.querySelectorAll("[data-fullscreen-toggle]").forEach((btn) => {
    btn.textContent = on ? "退出全螢幕" : "進入全螢幕";
  });
  const hint = document.getElementById("immersiveHint");
  if (hint) hint.hidden = !on || native;
}
