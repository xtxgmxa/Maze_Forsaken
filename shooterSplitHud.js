/**
 * 槍戰分割畫面 — 每位本機玩家獨立雷達與 HUD 區塊（非共用單人 UI）。
 */

let root = null;
const slots = [];

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

function ensureSlot(i) {
  if (slots[i]) return slots[i];
  const el = document.createElement("div");
  el.className = "shooter-split-slot";
  el.dataset.slot = String(i);
  el.innerHTML = `
    <span class="shooter-split-tag">P${i + 1}</span>
    <canvas class="shooter-split-radar" width="96" height="96"></canvas>
    <span class="shooter-split-hp"></span>
    <span class="shooter-split-gun"></span>
  `;
  ensureRoot().appendChild(el);
  slots[i] = {
    el,
    canvas: el.querySelector(".shooter-split-radar"),
    tag: el.querySelector(".shooter-split-tag"),
    hp: el.querySelector(".shooter-split-hp"),
    gun: el.querySelector(".shooter-split-gun"),
  };
  return slots[i];
}

export function hideShooterSplitHud() {
  if (root) root.style.display = "none";
  for (const s of slots) {
    if (s?.el) s.el.style.display = "none";
  }
}

/** @param {Array<{ viewer: object, x: number, y: number, w: number, h: number }>} viewports */
export function layoutShooterSplitHud(viewports, W, H) {
  const r = ensureRoot();
  r.style.display = "block";
  for (let i = 0; i < 4; i++) {
    const s = slots[i];
    if (s?.el) s.el.style.display = "none";
  }
  viewports.forEach((vp, i) => {
    const s = ensureSlot(i);
    const pad = 8;
    const radarSize = Math.min(96, Math.floor(Math.min(vp.w, vp.h) * 0.22));
    s.el.style.display = "flex";
    s.el.style.left = `${vp.x + vp.w - radarSize - pad}px`;
    s.el.style.top = `${vp.y + pad}px`;
    s.el.style.width = `${radarSize + 4}px`;
    s.canvas.width = radarSize;
    s.canvas.height = radarSize;
    const name = vp.viewer?.displayName || vp.viewer?.charDef?.name || `P${i + 1}`;
    s.tag.textContent = name.slice(0, 6);
    s.hp.textContent = `HP ${Math.max(0, Math.round(vp.viewer?.hp ?? 0))}`;
    const w = vp.viewer?.weaponId || "rifle";
    const gunZh = { smg: "衝鋒", rifle: "步槍", shotgun: "霰彈", sniper: "狙擊", pad: "彈跳" }[w] || w;
    s.gun.textContent = gunZh;
  });
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
    const bar = document.createElement("div");
    bar.className = "shooter-split-bar h";
    bar.style.top = `${Math.floor((H - 4) / 2)}px`;
    grid.appendChild(bar);
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
