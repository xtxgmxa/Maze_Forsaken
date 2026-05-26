/**

 * 槍戰分割畫面 — 每位本機玩家獨立 HUD（上方面板、雷達、武器欄）

 */

import { SHOOTER_WEAPONS } from "./shooterMode.js";



let root = null;

const slots = [];



const WEAPON_ICONS = { smg: "▮", rifle: "╬", shotgun: "▦", sniper: "◎", pad: "⌁", katana: "刀" };



function ensureRoot() {

  if (root) return root;

  root = document.getElementById("shooterSplitHud");

  if (!root) {

    root = document.createElement("div");

    root.id = "shooterSplitHud";

    root.setAttribute("aria-hidden", "true");

    document.body.appendChild(root);

  }

  return root;

}



function buildWeaponStrip(container, viewer, onWeapon) {

  container.innerHTML = "";

  for (const w of SHOOTER_WEAPONS) {

    const btn = document.createElement("button");

    btn.type = "button";

    btn.className = `shooter-split-wep wep-${w.id}`;

    btn.dataset.slot = String(w.slot);

    btn.title = w.name;

    btn.innerHTML =

      `<span class="wep-key">${w.slot}</span><span class="wep-ico">${WEAPON_ICONS[w.id] || "●"}</span>`;

    btn.addEventListener("click", (e) => {

      e.stopPropagation();

      onWeapon?.(viewer, w.slot);

    });

    container.appendChild(btn);

  }

}



function ensureSlot(i) {

  if (slots[i]) return slots[i];

  const el = document.createElement("div");

  el.className = "shooter-split-slot";

  el.dataset.slot = String(i);

  el.innerHTML = `
    <div class="shooter-split-top">
      <div class="shooter-split-toprow">
        <span class="shooter-split-tag">P${i + 1}</span>
        <span class="shooter-split-timer">04:00</span>
      </div>
      <div class="shooter-split-metarow">
        <span class="shooter-split-mode">—</span>
        <span class="shooter-split-map"></span>
      </div>
      <div class="shooter-split-hpbar"><div class="shooter-split-hpfill"></div><span class="shooter-split-hpnum">100</span></div>
    </div>

    <canvas class="shooter-split-radar" width="88" height="88"></canvas>

    <div class="shooter-split-weapons" aria-label="武器欄"></div>

  `;

  ensureRoot().appendChild(el);

  slots[i] = {

    el,

    top: el.querySelector(".shooter-split-top"),

    canvas: el.querySelector(".shooter-split-radar"),

    tag: el.querySelector(".shooter-split-tag"),

    map: el.querySelector(".shooter-split-map"),

    hpFill: el.querySelector(".shooter-split-hpfill"),

    hpNum: el.querySelector(".shooter-split-hpnum"),

    timer: el.querySelector(".shooter-split-timer"),

    mode: el.querySelector(".shooter-split-mode"),

    weapons: el.querySelector(".shooter-split-weapons"),

    viewer: null,

    onWeapon: null,

  };

  return slots[i];

}



export function hideShooterSplitHud() {

  if (root) root.style.display = "none";

  for (const s of slots) {

    if (s?.el) s.el.style.display = "none";

  }

}



function formatCountdown(sec) {

  const s = Math.max(0, Math.ceil(sec ?? 0));

  const m = Math.floor(s / 60);

  const r = s % 60;

  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;

}



/** @param {Array<{ viewer: object, x: number, y: number, w: number, h: number }>} viewports */

export function layoutShooterSplitHud(viewports, W, H, hudOpts = {}) {

  const r = ensureRoot();

  r.style.display = "block";

  const timeLeft = hudOpts.timeLeft ?? 0;

  const modeLabel = hudOpts.modeLabel ?? "槍戰";

  const mapLabel = hudOpts.mapLabel ?? "";

  const onWeapon = hudOpts.onWeapon ?? null;

  for (let i = 0; i < 4; i++) {

    const s = slots[i];

    if (s?.el) s.el.style.display = "none";

  }

  viewports.forEach((vp, i) => {

    const s = ensureSlot(i);

    const pad = Math.max(4, Math.floor(Math.min(vp.w, vp.h) * 0.02));

    const radarSize = Math.min(72, Math.max(48, Math.floor(Math.min(vp.w, vp.h) * 0.16)));

    const barH = Math.min(36, Math.max(28, Math.floor(vp.h * 0.075)));

    const topW = Math.min(vp.w - radarSize - pad * 3, Math.max(108, Math.floor(vp.w * 0.52)));

    s.el.style.display = "block";

    s.el.style.left = `${vp.x}px`;

    s.el.style.top = `${vp.y}px`;

    s.el.style.width = `${vp.w}px`;

    s.el.style.height = `${vp.h}px`;

    if (s.top) {

      s.top.style.left = `${Math.floor((vp.w - topW) / 2)}px`;

      s.top.style.top = `${pad}px`;

      s.top.style.width = `${topW}px`;

    }

    if (s.canvas) {

      s.canvas.width = radarSize;

      s.canvas.height = radarSize;

      s.canvas.style.width = `${radarSize}px`;

      s.canvas.style.height = `${radarSize}px`;

      s.canvas.style.right = `${pad}px`;

      s.canvas.style.top = `${pad}px`;

    }

    if (s.weapons) {

      s.weapons.style.left = `${pad}px`;

      s.weapons.style.right = `${pad}px`;

      s.weapons.style.bottom = `${pad + 4}px`;

      s.weapons.style.height = `${barH}px`;

      if (s.viewer !== vp.viewer || s.onWeapon !== onWeapon) {

        s.viewer = vp.viewer;

        s.onWeapon = onWeapon;

        buildWeaponStrip(s.weapons, vp.viewer, onWeapon);

      }

    }

    const v = vp.viewer;

    const name = v?.displayName || v?.charDef?.name || `P${i + 1}`;

    if (s.tag) s.tag.textContent = name.slice(0, 10);

    if (s.map) s.map.textContent = mapLabel.slice(0, 20);

    const maxHp = Math.max(1, v?.maxHp ?? 100);

    const hp = Math.max(0, Math.round(v?.hp ?? maxHp));

    const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

    if (s.hpFill) s.hpFill.style.width = `${pct}%`;

    if (s.hpNum) s.hpNum.textContent = `${hp}/${maxHp}`;

    if (s.timer) s.timer.textContent = formatCountdown(timeLeft);

    if (s.mode) s.mode.textContent = modeLabel;

    const activeSlot = SHOOTER_WEAPONS.find((w) => w.id === (v?.weaponId || "rifle"))?.slot ?? 2;

    s.weapons?.querySelectorAll(".shooter-split-wep").forEach((btn) => {

      btn.classList.toggle("active", parseInt(btn.dataset.slot, 10) === activeSlot);

    });

  });

}



export function updateShooterSplitWeaponBars() {

  for (const s of slots) {

    if (!s?.weapons || !s.viewer) continue;

    const activeSlot = SHOOTER_WEAPONS.find((w) => w.id === (s.viewer.weaponId || "rifle"))?.slot ?? 2;

    s.weapons.querySelectorAll(".shooter-split-wep").forEach((btn) => {

      btn.classList.toggle("active", parseInt(btn.dataset.slot, 10) === activeSlot);

    });

  }

}



function paintColorCss(c) {

  return `#${((c ?? 0xffffff) >>> 0).toString(16).padStart(6, "0").slice(-6)}`;

}



export function drawShooterSplitRadars(ctx, maze, minimapBaseCanvas, players, viewports) {

  if (!minimapBaseCanvas || !ctx) return;

  viewports.forEach((vp, i) => {

    const s = slots[i];

    if (!s?.canvas || !vp.viewer) return;

    const canvas = s.canvas;

    const ctx2 = canvas.getContext("2d");

    const w = canvas.width;

    const pad = 2;

    const cellPx = (w - pad * 2) / ctx.w;

    ctx2.drawImage(minimapBaseCanvas, 0, 0, w, w);

    const toMap = (wx, wz) => [

      pad + ((wx + (ctx.w * ctx.cell) / 2) / ctx.cell) * cellPx,

      pad + ((wz + (ctx.h * ctx.cell) / 2) / ctx.cell) * cellPx,

    ];

    const viewer = vp.viewer;

    const { yaw } = vp.viewerYaw ?? { yaw: viewer.yaw ?? 0 };

    for (const pl of players) {

      if (isDown(pl)) continue;

      const [px, py] = toMap(pl.pos.x, pl.pos.z);

      const isYou = pl === viewer;

      ctx2.fillStyle = paintColorCss(pl.paintColor ?? pl.charDef?.accent ?? 0xffffff);

      ctx2.strokeStyle = isYou ? "#ffffff" : "#00000088";

      ctx2.lineWidth = isYou ? 2 : 1;

      ctx2.beginPath();

      ctx2.arc(px, py, isYou ? 4 : 3, 0, Math.PI * 2);

      ctx2.fill();

      ctx2.stroke();

      if (isYou) {

        ctx2.save();

        ctx2.translate(px, py);

        ctx2.rotate(-yaw);

        ctx2.fillStyle = "#fff";

        ctx2.beginPath();

        ctx2.moveTo(0, -7);

        ctx2.lineTo(3, 2);

        ctx2.lineTo(-3, 2);

        ctx2.closePath();

        ctx2.fill();

        ctx2.restore();

      }

    }

  });

}



function isDown(p) {

  return p._shooterDowned || p._awaitingRespawn || (p.hp ?? 0) <= 0;

}



export function syncShooterSplitGridLines(nLocal, W, H) {

  let grid = document.getElementById("shooterSplitGrid");

  if (!grid) {

    grid = document.createElement("div");

    grid.id = "shooterSplitGrid";

    grid.setAttribute("aria-hidden", "true");

    document.body.appendChild(grid);

  }

  grid.innerHTML = "";

  grid.style.display = nLocal >= 2 ? "block" : "none";

  if (nLocal === 2) {

    const halfW = Math.floor((W - 5) / 2);

    const v = document.createElement("div");

    v.className = "shooter-split-bar v";

    v.style.left = `${halfW + 2}px`;

    grid.appendChild(v);

  } else if (nLocal >= 3) {

    const halfW = Math.floor(W / 2);

    const halfH = Math.floor(H / 2);

    const v = document.createElement("div");

    v.className = "shooter-split-bar v";

    v.style.left = `${halfW - 2}px`;

    grid.appendChild(v);

    const h = document.createElement("div");

    h.className = "shooter-split-bar h";

    h.style.top = `${halfH - 2}px`;

    grid.appendChild(h);

  }

}


