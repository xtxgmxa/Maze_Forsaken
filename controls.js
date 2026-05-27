/** 按鍵與手把設定（localStorage） */

export const DEFAULT_BINDINGS = {
  p1: {
    up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD",
    sprint: "ShiftLeft", jump: "Space", slide: "ControlLeft",
    ab1: "KeyQ", ab2: "KeyE", ab3: "KeyF",
    openDoor: "KeyG", useItem: "KeyR",
    zoomIn: "KeyZ", zoomOut: "KeyX",
  },
  p2: {
    up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
    sprint: "ShiftRight", jump: "Numpad0", ab1: "Numpad1", ab2: "Numpad2", ab3: "Numpad3",
  },
  killer: {
    up: "KeyI", down: "KeyK", left: "KeyJ", right: "KeyL",
    sprint: "ControlRight", jump: "Space", slide: "ControlLeft",
    ab1: "KeyU", ab2: "KeyO", ab3: "KeyP",
    zoomIn: "KeyZ", zoomOut: "KeyX",
  },
};

/** 標準 Xbox / PS4 / Switch Pro（Windows 映射） */
export const GP_BTN = {
  A: 0, B: 1, X: 2, Y: 3,
  L1: 4, R1: 5, L2: 6, R2: 7,
  view: 8, menu: 9, L3: 10, R3: 11,
  dpadUp: 12, dpadDown: 13, dpadLeft: 14, dpadRight: 15,
};

export const GP_LABELS = [
  "A", "B", "X", "Y", "L1", "R1", "L2", "R2",
  "View", "Menu", "L3", "R3", "↑", "↓", "←", "→",
];

const STORAGE_KEY = "forsaken_controls_v1";
const STICK_DEAD = 0.22;
const LOOK_DEAD = 0.14;

let bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
let lastConnected = false;

export function loadBindings() {
  bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return bindings;
    const saved = JSON.parse(raw);
    for (const profile of Object.keys(DEFAULT_BINDINGS)) {
      bindings[profile] = {
        ...DEFAULT_BINDINGS[profile],
        ...(saved[profile] || {}),
      };
    }
  } catch {
    bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
  }
  return bindings;
}

export function saveBindings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

export function getBindings() {
  return bindings;
}

export function setBinding(profile, action, code) {
  bindings[profile][action] = code;
}

export function resetBindings() {
  bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
  saveBindings();
}

export function keyDown(keys, profile, action) {
  const code = bindings[profile]?.[action];
  return code ? !!keys[code] : false;
}

export function gamepadBtnLabel(index) {
  return GP_LABELS[index] ?? `B${index}`;
}

/** 手把對應顯示（技能欄 / 提示用） */
export function getGamepadActionLabels(keyHunt = false) {
  if (keyHunt) {
    return {
      move: "左搖桿",
      look: "右搖桿",
      jump: gamepadBtnLabel(GP_BTN.A),
      openDoor: gamepadBtnLabel(GP_BTN.X),
      useItem: gamepadBtnLabel(GP_BTN.B),
      sprint: gamepadBtnLabel(GP_BTN.R2),
      slide: gamepadBtnLabel(GP_BTN.L1),
      ab1: gamepadBtnLabel(GP_BTN.X),
      ab2: gamepadBtnLabel(GP_BTN.B),
      ab3: gamepadBtnLabel(GP_BTN.Y),
      interact: gamepadBtnLabel(GP_BTN.X),
    };
  }
  return {
    move: "左搖桿",
    look: "右搖桿",
    jump: gamepadBtnLabel(GP_BTN.A),
    openDoor: gamepadBtnLabel(GP_BTN.X),
    useItem: gamepadBtnLabel(GP_BTN.B),
    sprint: gamepadBtnLabel(GP_BTN.R2),
    slide: gamepadBtnLabel(GP_BTN.L1),
    ab1: gamepadBtnLabel(GP_BTN.X),
    ab2: gamepadBtnLabel(GP_BTN.B),
    ab3: gamepadBtnLabel(GP_BTN.Y),
    interact: gamepadBtnLabel(GP_BTN.X),
  };
}

export function isGamepadConnected() {
  const pads = navigator.getGamepads?.() || [];
  return pads.some((p) => p?.connected);
}

export function pollGamepad(gpIndex) {
  const pads = navigator.getGamepads?.() || [];
  const gp = pads[gpIndex];
  if (!gp?.connected) return null;

  const ax = gp.axes[0] ?? 0;
  const ay = gp.axes[1] ?? 0;
  const lookX = gp.axes[2] ?? 0;
  const lookY = gp.axes[3] ?? 0;

  const btn = (i) => !!gp.buttons[i]?.pressed;
  const stick = (v) => (Math.abs(v) > STICK_DEAD ? v : 0);

  return {
    move: {
      x: stick(-ax),
      z: stick(-ay),
    },
    lookX: Math.abs(lookX) > LOOK_DEAD ? lookX : 0,
    lookY: Math.abs(lookY) > LOOK_DEAD ? lookY : 0,
    sprint: btn(GP_BTN.R2) || btn(GP_BTN.R1),
    ads: btn(GP_BTN.L2),
    jump: btn(GP_BTN.A),
    slide: btn(GP_BTN.L1),
    ab1: btn(GP_BTN.X),
    ab2: btn(GP_BTN.B),
    ab3: btn(GP_BTN.Y),
    openDoor: btn(GP_BTN.X),
    useItem: btn(GP_BTN.B),
    interact: btn(GP_BTN.X),
    confirm: btn(GP_BTN.A),
    dpadUp: btn(GP_BTN.dpadUp),
    dpadDown: btn(GP_BTN.dpadDown),
    dpadLeft: btn(GP_BTN.dpadLeft),
    dpadRight: btn(GP_BTN.dpadRight),
  };
}

/** 遊戲迴圈：偵測手把插拔 */
export function tickGamepadPresence(onChange) {
  const now = isGamepadConnected();
  if (now !== lastConnected) {
    lastConnected = now;
    onChange?.(now);
  }
  return now;
}

export const KEY_LABELS = {
  KeyW: "W", KeyA: "A", KeyS: "S", KeyD: "D",
  KeyQ: "Q", KeyE: "E", KeyF: "F",
  KeyI: "I", KeyJ: "J", KeyK: "K", KeyL: "L",
  KeyU: "U", KeyO: "O", KeyP: "P", KeyZ: "Z", KeyX: "X",
  KeyG: "G", KeyR: "R",
  ShiftLeft: "Shift", ShiftRight: "R-Shift",
  ControlLeft: "Ctrl", ControlRight: "RCtrl",
  ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
  Numpad1: "Num1", Numpad2: "Num2", Numpad3: "Num3",
  Space: "空白", Numpad0: "Num0",
};

export function labelFor(code) {
  if (!code) return "—";
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  return String(code).replace("Key", "").replace("Numpad", "Num");
}
