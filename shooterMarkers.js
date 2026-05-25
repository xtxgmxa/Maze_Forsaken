import * as THREE from "three";
import { isShooterMoleMode, isSameShooterTeam } from "./shooterMode.js";

const _proj = new THREE.Vector3();
const labelPool = new Map();

function ensureLabelLayer() {
  let layer = document.getElementById("shooterLabelLayer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "shooterLabelLayer";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
  }
  return layer;
}

/** 相對於觀察者的頭頂文字：敵人 / 隊友 / 內鬼 */
export function getShooterRelationLabel(viewer, target, playStyle, state) {
  if (!viewer || !target || viewer === target) return null;
  if (isShooterMoleMode(state) && target.isMole && target._moleRevealed) {
    return { text: "內鬼", cls: "mole" };
  }
  if (playStyle === "ffa") return { text: "敵人", cls: "enemy" };
  if (isSameShooterTeam(viewer, target)) return { text: "隊友", cls: "teammate" };
  return { text: "敵人", cls: "enemy" };
}

function hideAllLabels() {
  for (const el of labelPool.values()) el.style.display = "none";
}

function getLabelEl(key) {
  if (labelPool.has(key)) return labelPool.get(key);
  const layer = ensureLabelLayer();
  const el = document.createElement("span");
  el.className = "shooter-lbl";
  el.dataset.key = key;
  layer.appendChild(el);
  labelPool.set(key, el);
  return el;
}

/** 依各玩家視窗投影頭頂文字（分割畫面各自判斷敵友） */
export function syncShooterOverheadLabels({
  players,
  viewports,
  playStyle,
  state,
  active,
}) {
  const layer = ensureLabelLayer();
  if (!active || !players?.length || !viewports?.length) {
    hideAllLabels();
    layer.style.display = "none";
    return;
  }
  layer.style.display = "block";
  const used = new Set();

  for (const vp of viewports) {
    const { viewer, camera, x, y, w, h } = vp;
    if (!viewer || !camera || w <= 0 || h <= 0) continue;
    for (const target of players) {
      if (!target?.mesh || target === viewer) continue;
      if (target._shooterDowned || target._awaitingRespawn || (target.hp ?? 0) <= 0) continue;
      const rel = getShooterRelationLabel(viewer, target, playStyle, state);
      if (!rel) continue;
      _proj.set(target.pos.x, 2.55 + (target._jumpY ?? 0) + (target.elev ?? 0), target.pos.z);
      _proj.project(camera);
      if (_proj.z < -1 || _proj.z > 1) continue;
      const sx = x + (_proj.x * 0.5 + 0.5) * w;
      const sy = y + (-_proj.y * 0.5 + 0.5) * h;
      if (sx < x - 8 || sx > x + w + 8 || sy < y - 8 || sy > y + h + 8) continue;
      const key = `${viewer.profile || viewer.id || "v"}:${target.profile || target.charDef?.id || target.pos.x}`;
      used.add(key);
      const el = getLabelEl(key);
      el.className = `shooter-lbl ${rel.cls}`;
      el.textContent = rel.text;
      el.style.display = "block";
      el.style.left = `${sx}px`;
      el.style.top = `${sy}px`;
    }
  }

  for (const [key, el] of labelPool) {
    if (!used.has(key)) el.style.display = "none";
  }
}

export function clearShooterTeamMarkers(players) {
  hideAllLabels();
  const layer = document.getElementById("shooterLabelLayer");
  if (layer) layer.innerHTML = "";
  labelPool.clear();
  for (const p of players || []) {
    if (p._teamMarker) {
      p.mesh?.remove(p._teamMarker);
      p._teamMarker = null;
    }
    p._hpBarFg = null;
  }
}

export function syncShooterTeamMarker() {}
export function syncAllShooterTeamMarkers() {}
export function updateShooterMarkerHp() {}

export function revealMoleOnHit(target, human, playStyle, state) {
  if (!target?.isMole || target._moleRevealed) return;
  target._moleRevealed = true;
}
