/**
 * 手把連線時顯示對應版型虛擬按鍵，按下時發亮（全模式共用）
 */
import { GP_BTN } from "./controls.js";

const LAYOUTS = {
  xbox: {
    name: "Xbox",
    face: [
      { btn: GP_BTN.A, label: "A", style: { right: "8%", bottom: "6%" } },
      { btn: GP_BTN.B, label: "B", style: { right: "22%", bottom: "18%" } },
      { btn: GP_BTN.X, label: "X", style: { right: "22%", bottom: "2%" } },
      { btn: GP_BTN.Y, label: "Y", style: { right: "36%", bottom: "12%" } },
    ],
    shoulders: [
      { btn: GP_BTN.L1, label: "LB", style: { left: "4%", top: "8%" } },
      { btn: GP_BTN.R1, label: "RB", style: { right: "4%", top: "8%" } },
      { btn: GP_BTN.L2, label: "LT", style: { left: "4%", top: "22%" } },
      { btn: GP_BTN.R2, label: "RT", style: { right: "4%", top: "22%" } },
    ],
    menu: [
      { btn: GP_BTN.view, label: "View", style: { left: "28%", top: "6%" } },
      { btn: GP_BTN.menu, label: "Menu", style: { right: "28%", top: "6%" } },
    ],
  },
  switch: {
    name: "Switch",
    face: [
      { btn: GP_BTN.B, label: "B", style: { right: "8%", bottom: "6%" } },
      { btn: GP_BTN.A, label: "A", style: { right: "22%", bottom: "18%" } },
      { btn: GP_BTN.Y, label: "Y", style: { right: "22%", bottom: "2%" } },
      { btn: GP_BTN.X, label: "X", style: { right: "36%", bottom: "12%" } },
    ],
    shoulders: [
      { btn: GP_BTN.L1, label: "L", style: { left: "4%", top: "8%" } },
      { btn: GP_BTN.R1, label: "R", style: { right: "4%", top: "8%" } },
      { btn: GP_BTN.L2, label: "ZL", style: { left: "4%", top: "22%" } },
      { btn: GP_BTN.R2, label: "ZR", style: { right: "4%", top: "22%" } },
    ],
    menu: [
      { btn: GP_BTN.view, label: "−", style: { left: "28%", top: "6%" } },
      { btn: GP_BTN.menu, label: "+", style: { right: "28%", top: "6%" } },
    ],
  },
  ps: {
    name: "PlayStation",
    face: [
      { btn: GP_BTN.A, label: "✕", style: { right: "8%", bottom: "6%" } },
      { btn: GP_BTN.B, label: "○", style: { right: "22%", bottom: "18%" } },
      { btn: GP_BTN.X, label: "□", style: { right: "22%", bottom: "2%" } },
      { btn: GP_BTN.Y, label: "△", style: { right: "36%", bottom: "12%" } },
    ],
    shoulders: [
      { btn: GP_BTN.L1, label: "L1", style: { left: "4%", top: "8%" } },
      { btn: GP_BTN.R1, label: "R1", style: { right: "4%", top: "8%" } },
      { btn: GP_BTN.L2, label: "L2", style: { left: "4%", top: "22%" } },
      { btn: GP_BTN.R2, label: "R2", style: { right: "4%", top: "22%" } },
    ],
    menu: [
      { btn: GP_BTN.view, label: "Share", style: { left: "28%", top: "6%" } },
      { btn: GP_BTN.menu, label: "Opt", style: { right: "28%", top: "6%" } },
    ],
  },
};

export function detectGamepadLayout(gp) {
  const id = (gp?.id || "").toLowerCase();
  if (id.includes("switch") || id.includes("057e") || id.includes("nintendo") || id.includes("pro controller")) {
    return "switch";
  }
  if (id.includes("054c") || id.includes("dualsense") || id.includes("dualshock") || id.includes("playstation")) {
    return "ps";
  }
  return "xbox";
}

function readPressed(gp) {
  if (!gp?.connected) return {};
  const out = {};
  for (let i = 0; i < (gp.buttons?.length || 0); i++) {
    out[i] = !!gp.buttons[i]?.pressed;
  }
  return out;
}

let built = false;
const panels = [];

function ensureHud() {
  if (built) return;
  built = true;
  const root = document.getElementById("gamepadHudRoot");
  if (!root) return;
  for (let slot = 0; slot < 4; slot++) {
    const panel = document.createElement("div");
    panel.className = "gamepad-hud-panel";
    panel.dataset.slot = String(slot);
    panel.hidden = true;
    const title = document.createElement("span");
    title.className = "gamepad-hud-title";
    panel.appendChild(title);
    const grid = document.createElement("div");
    grid.className = "gamepad-hud-grid";
    panel.appendChild(grid);
    root.appendChild(panel);
    panels[slot] = { panel, grid, title, nodes: [] };
  }
}

function rebuildPanel(slot, layoutKey) {
  const p = panels[slot];
  if (!p) return;
  const layout = LAYOUTS[layoutKey] || LAYOUTS.xbox;
  p.grid.innerHTML = "";
  p.nodes = [];
  p.title.textContent = `P${slot + 1} · ${layout.name}`;
  const all = [...layout.shoulders, ...layout.menu, ...layout.face];
  for (const spec of all) {
    const el = document.createElement("span");
    el.className = "gamepad-hud-btn";
    el.textContent = spec.label;
    Object.assign(el.style, spec.style);
    el.dataset.btn = String(spec.btn);
    p.grid.appendChild(el);
    p.nodes.push({ el, btn: spec.btn });
  }
}

/** @param {number} maxSlots 顯示幾個手把面板（分割畫面用） */
export function tickGamepadHud(maxSlots = 1) {
  ensureHud();
  const pads = navigator.getGamepads?.() || [];
  const connected = pads.filter((g) => g?.connected);
  document.body.classList.toggle("gamepad-hud-on", connected.length > 0);
  const show = Math.min(maxSlots, 4, Math.max(1, connected.length));
  for (let slot = 0; slot < 4; slot++) {
    const p = panels[slot];
    if (!p) continue;
    const gp = pads[slot];
    if (slot >= show || !gp?.connected) {
      p.panel.hidden = true;
      continue;
    }
    const layoutKey = detectGamepadLayout(gp);
    if (p._layoutKey !== layoutKey) {
      p._layoutKey = layoutKey;
      rebuildPanel(slot, layoutKey);
    }
    p.panel.hidden = false;
    const pressed = readPressed(gp);
    for (const n of p.nodes) {
      const on = !!pressed[n.btn];
      n.el.classList.toggle("lit", on);
    }
  }
}

export function hideGamepadHud() {
  document.body.classList.remove("gamepad-hud-on");
  for (const p of panels) {
    if (p?.panel) p.panel.hidden = true;
  }
}
