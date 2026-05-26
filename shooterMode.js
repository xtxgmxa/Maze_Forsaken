import * as THREE from "three";
import { cellCenter, bfsNextStep } from "./maze.js";
import { shooterRayBlocked } from "./shooterCollision.js";
import { lambertStud } from "./mapTextures.js";
import { PAINT_PALETTE } from "./paintballSplats.js";
import { addRivalsBouncePad } from "./verticalWorld.js";
import {
  getShooterLayout, resolveSpot, isShooterAlcove, findMazeJunctions,
} from "./shooterLayouts.js";
import { buildLayoutSignature } from "./shooterArenaArt.js";

const SHOOTER_TIER_Y = [0, 5.5, 11, 16.5];

function shooterRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellPassable(maze, w, h, gx, gz) {
  if (gx < 0 || gz < 0 || gx >= w || gz >= h) return false;
  const c = maze?.[gz]?.[gx];
  if (!c) return false;
  const open = !c.left || !c.right || !c.top || !c.bottom;
  return open;
}

/** 梯子／平台落點：避免牆格導致長梯不生成 */
function nearestOpenCell(ctx, maze, gx, gz, w, h, maxR = 5) {
  if (cellPassable(maze, w, h, gx, gz)) return { gx, gz };
  for (let r = 1; r <= maxR; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = gx + dx;
        const nz = gz + dz;
        if (cellPassable(maze, w, h, nx, nz)) return { gx: nx, gz: nz };
      }
    }
  }
  return null;
}

/** 槍戰密道：在迷宮內額外打通牆壁捷徑 */
export function carveShooterSecretPassages(ctx, maze, level = {}) {
  const { w, h } = ctx;
  const tier = level.sizeTier || "medium";
  const want = level.secretPassages ?? { small: 2, medium: 3, large: 4, xlarge: 5 }[tier] ?? 3;
  const rng = shooterRng((level.mapSeed ?? level.id ?? 1) ^ 0x5ec7e7);
  let carved = 0;
  for (let attempt = 0; attempt < want * 80 && carved < want; attempt++) {
    const gx = 1 + Math.floor(rng() * Math.max(1, w - 2));
    const gz = 1 + Math.floor(rng() * Math.max(1, h - 2));
    if (!cellPassable(maze, w, h, gx, gz)) continue;
    const c = maze?.[gz]?.[gx];
    if (!c) continue;
    const dirs = [];
    if (c.right && gx < w - 1 && cellPassable(maze, w, h, gx + 1, gz)) dirs.push("right");
    if (c.bottom && gz < h - 1 && cellPassable(maze, w, h, gx, gz + 1)) dirs.push("bottom");
    if (c.left && gx > 0 && cellPassable(maze, w, h, gx - 1, gz)) dirs.push("left");
    if (c.top && gz > 0 && cellPassable(maze, w, h, gx, gz - 1)) dirs.push("top");
    if (!dirs.length) continue;
    const dir = dirs[Math.floor(rng() * dirs.length)];
    if (dir === "right") {
      c.right = false;
      if (maze?.[gz]?.[gx + 1]) maze[gz][gx + 1].left = false;
    } else if (dir === "bottom") {
      c.bottom = false;
      if (maze?.[gz + 1]?.[gx]) maze[gz + 1][gx].top = false;
    } else if (dir === "left") {
      c.left = false;
      if (maze?.[gz]?.[gx - 1]) maze[gz][gx - 1].right = false;
    } else {
      c.top = false;
      if (maze?.[gz - 1]?.[gx]) maze[gz - 1][gx].bottom = false;
    }
    carved++;
  }
}

function pickDeckCell(ctx, maze, gx, gz, w, h) {
  if (!cellPassable(maze, w, h, gx, gz)) return null;
  if ((gx <= 1 && gz <= 1) || (gx >= w - 2 && gz >= h - 2)) return null;
  return { gx, gz };
}

function linkRampToDeck(ctx, maze, group, pl, stairs, cell, w, h) {
  const neighbors = [[pl.gx - 1, pl.gz], [pl.gx + 1, pl.gz], [pl.gx, pl.gz - 1], [pl.gx, pl.gz + 1]];
  const stepMat = lambertStud(0xbb9988, 0x776655, 0.28);
  for (const [nx, nz] of neighbors) {
    if (!cellPassable(maze, w, h, nx, nz)) continue;
    const fc = cellCenter(ctx, nx, nz);
    stairs.push({
      ax: fc.x, az: fc.z, ay: 0,
      bx: pl.x, bz: pl.z, by: pl.y,
      halfW: cell * 0.44,
    });
    const steps = 7;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(cell * 0.4, 0.22, cell * 0.55),
        stepMat
      );
      step.position.set(
        fc.x + (pl.x - fc.x) * t,
        (pl.y * t) + 0.11,
        fc.z + (pl.z - fc.z) * t
      );
      group.add(step);
    }
    return;
  }
}

function addShooterLadder(ctx, group, gx, gz, tierTop, ladders, stairs, style, cell) {
  const c = cellCenter(ctx, gx, gz);
  const y1 = SHOOTER_TIER_Y[Math.min(tierTop, 3)];
  const halfW = cell * 0.48;
  ladders.push({ x: c.x, z: c.z, halfW, halfD: halfW, y0: 0, y1, climbSpeed: 12 });
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ly = y1 * t;
    stairs.push({
      ax: c.x, az: c.z, ay: ly,
      bx: c.x + 0.02, bz: c.z, by: ly + y1 / steps,
      halfW: halfW + 0.1,
    });
  }
  const railCol = style === "neon" ? 0xcc66ff : style === "sky" ? 0x66aadd : 0x887766;
  const railMat = lambertStud(railCol, railCol >> 1, 0.38);
  const rungMat = lambertStud(0xffdd88, 0xcc9955, 0.45);
  for (const ox of [-0.38, 0.38]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, y1 + 0.2, 0.14),
      railMat
    );
    rail.position.set(c.x + ox * cell, (y1 + 0.2) / 2, c.z);
    rail.castShadow = true;
    group.add(rail);
  }
  const rungCount = Math.max(8, Math.floor(y1 / 0.85));
  for (let i = 0; i < rungCount; i++) {
    const rung = new THREE.Mesh(
      new THREE.BoxGeometry(cell * 0.5, 0.1, 0.18),
      rungMat
    );
    rung.position.set(c.x, 0.45 + i * (y1 / rungCount), c.z);
    group.add(rung);
  }
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(cell * 0.55, 0.5, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x44ffaa })
  );
  sign.position.set(c.x, 1.2, c.z + cell * 0.42);
  group.add(sign);
}

function addShooterDeck(ctx, maze, group, gx, gz, tier, scale, style, layout, platforms, cell, w, h) {
  const spot = pickDeckCell(ctx, maze, gx, gz, w, h);
  if (!spot) return null;
  const { gx: dgx, gz: dgz } = spot;
  const c = cellCenter(ctx, dgx, dgz);
  const y = SHOOTER_TIER_Y[Math.min(tier, 3)];
  if (y <= 0) return null;
  const palette = {
    arena: [0x8899aa, 0x667788],
    dock: [0xcc6633, 0xaa4422],
    sky: [0x66ccff, 0x3388dd],
    urban: [0x99aa88, 0x667755],
    neon: [0xff66cc, 0xaa44ff],
  }[style] || [0x88aacc, 0x556677];
  const col = layout.accent ?? palette[(dgx + dgz) % palette.length];
  const half = cell * 0.38 * scale;
  const pillarH = Math.max(0.5, y - 0.4);
  const pl = {
    x: c.x, z: c.z, halfW: half, halfD: half, y, gx: dgx, gz: dgz, tier,
    standable: true, solidSides: false,
    minApproach: tier >= 3 ? Math.max(0, y - 2.5) : 0,
  };
  platforms.push(pl);
  platforms.push({
    x: c.x, z: c.z, halfW: cell * 0.22, halfD: cell * 0.22, y: pillarH,
    blockTop: pillarH, baseY: 0, solidSides: true, standable: false,
  });
  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(cell * 0.42, pillarH, cell * 0.42),
    lambertStud((col & 0xfefefe) >> 1, col, 0.22)
  );
  pillar.position.set(c.x, pillarH / 2, c.z);
  pillar.castShadow = true;
  group.add(pillar);
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(cell * 0.72 * scale, 0.28, cell * 0.72 * scale),
    lambertStud(col, col, 0.42)
  );
  deck.position.set(c.x, y, c.z);
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(cell * 0.76 * scale, 0.06, cell * 0.76 * scale),
    lambertStud(0xffffff, col, 0.5)
  );
  trim.position.set(c.x, y + 0.17, c.z);
  group.add(trim);
  return pl;
}

function finishDeckLinks(ctx, maze, group, platforms, stairs, cell, w, h) {
  for (const pl of platforms) {
    if (pl.y > 0.5) linkRampToDeck(ctx, maze, group, pl, stairs, cell, w, h);
  }
}

function addShooterBridge(ctx, maze, group, g0, g1, tier, bridges, cell, w, h) {
  if (!cellPassable(maze, w, h, g0.gx, g0.gz) || !cellPassable(maze, w, h, g1.gx, g1.gz)) return;
  const c0 = cellCenter(ctx, g0.gx, g0.gz);
  const c1 = cellCenter(ctx, g1.gx, g1.gz);
  const mx = (c0.x + c1.x) / 2;
  const mz = (c0.z + c1.z) / 2;
  const len = Math.hypot(c1.x - c0.x, c1.z - c0.z);
  const y = SHOOTER_TIER_Y[Math.min(tier, 3)];
  const halfW = cell * 0.22;
  const halfD = len / 2 + cell * 0.06;
  bridges.push({ x: mx, z: mz, halfW, halfD, y, standable: true, minApproach: Math.max(0, y - 1.2) });
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(
      Math.abs(c1.x - c0.x) > 0.5 ? len : cell * 0.48,
      0.18,
      Math.abs(c1.z - c0.z) > 0.5 ? len : cell * 0.48
    ),
    lambertStud(0x99ccee, 0x4488bb, 0.32)
  );
  bridge.position.set(mx, y + 0.09, mz);
  if (Math.abs(c1.x - c0.x) > Math.abs(c1.z - c0.z)) bridge.rotation.y = Math.PI / 2;
  group.add(bridge);
  for (const t of [-0.35, 0.35]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, y + 0.5, 0.12),
      lambertStud(0x667788, 0x445566, 0.25)
    );
    post.position.set(mx + t * cell, (y + 0.5) / 2, mz);
    group.add(post);
  }
}

/** 依關卡 shooterLayout 建造立體結構（長梯、窄台、不擋主干道） */
export function buildShooterVerticalWorld(ctx, maze, group, level = {}) {
  const { w, h, cell } = ctx;
  const style = level.mapStyle || "arena";
  const layout = getShooterLayout(level);
  const platforms = [];
  const stairs = [];
  const bridges = [];
  const ladders = [];
  const usedPad = new Set();

  for (const d of layout.decks || []) {
    const { gx, gz, tier, scale } = resolveSpot(ctx, d);
    addShooterDeck(ctx, maze, group, gx, gz, tier, scale, style, layout, platforms, cell, w, h);
  }
  finishDeckLinks(ctx, maze, group, platforms, stairs, cell, w, h);
  for (const l of layout.ladders || []) {
    const { gx, gz, tier } = resolveSpot(ctx, l);
    const tierTop = l.tierTop ?? tier ?? 2;
    const spot = nearestOpenCell(ctx, maze, gx, gz, w, h) || pickDeckCell(ctx, maze, gx, gz, w, h);
    if (spot) addShooterLadder(ctx, group, spot.gx, spot.gz, tierTop, ladders, stairs, style, cell);
  }
  if (!ladders.length && (layout.decks?.length || 0) > 0) {
    const d0 = layout.decks[0];
    const { gx, gz } = resolveSpot(ctx, d0);
    const spot = nearestOpenCell(ctx, maze, gx, gz, w, h);
    if (spot) addShooterLadder(ctx, group, spot.gx, spot.gz, d0.tier ?? 2, ladders, stairs, style, cell);
  }
  for (const b of layout.bridges || []) {
    const g0 = resolveSpot(ctx, { u: b.u0, v: b.v0, gx: b.gx0, gz: b.gz0 });
    const g1 = resolveSpot(ctx, { u: b.u1, v: b.v1, gx: b.gx1, gz: b.gz1 });
    addShooterBridge(ctx, maze, group, g0, g1, b.tier ?? 1, bridges, cell, w, h);
  }

  return { platforms, stairs, bridges, ladders };
}

/** 依布局放置彈跳板（地面 + 高台） */
export function spawnShooterBouncePads(ctx, maze, group, level, platforms = []) {
  const pads = [];
  const layout = getShooterLayout(level);
  const want = Math.min(16, level.bouncePads ?? 4);
  const spots = [...(layout.pads || [])];
  const rng = shooterRng((level.mapSeed ?? 2) ^ 0xb0adc3);
  const usedPad = new Set();

  const tryPadAt = (gx, gz, elev = 0, sp = {}) => {
    const key = `${gx},${gz},${elev}`;
    if (usedPad.has(key)) return false;
    if (!cellPassable(maze, ctx.w, ctx.h, gx, gz)) return false;
    const c = cellCenter(ctx, gx, gz);
    const vis = addRivalsBouncePad(group, c.x, c.z, elev);
    let launchDx = 0;
    let launchDz = 0;
    if (sp.launchU != null || sp.launchV != null) {
      const len = Math.hypot(sp.launchU ?? 0, sp.launchV ?? 0) || 1;
      launchDx = (sp.launchU ?? 0) / len;
      launchDz = (sp.launchV ?? 0) / len;
    }
    pads.push({
      x: c.x, z: c.z, startElev: elev,
      launchVy: elev > 4 ? 30 : 28,
      launchDx, launchDz,
      launchPower: sp.power ?? 1.15,
      launchSpeed: 14 + (sp.power ?? 0) * 4,
      halfW: 1.45, halfD: 1.45, ...vis,
    });
    usedPad.add(key);
    return true;
  };

  for (const sp of spots) {
    if (pads.length >= want) break;
    const { gx, gz } = resolveSpot(ctx, sp);
    const pl = platforms.find((p) => p.gx === gx && p.gz === gz);
    tryPadAt(gx, gz, pl?.y ?? 0, sp);
  }

  const junctions = findMazeJunctions(maze, ctx.w, ctx.h);
  for (let j = 0; pads.length < want && j < junctions.length; j++) {
    const { gx, gz } = junctions[(j * 7 + (level.id ?? 0)) % junctions.length];
    tryPadAt(gx, gz, 0, { launchV: -1, power: 1.25 });
  }

  for (const pl of platforms) {
    if (pads.length >= want) break;
    if (pl.y >= 4 && rng() > 0.45) tryPadAt(pl.gx, pl.gz, pl.y);
  }

  for (let i = 0; pads.length < want && i < 80; i++) {
    const gx = 2 + Math.floor(rng() * Math.max(1, ctx.w - 4));
    const gz = 2 + Math.floor(rng() * Math.max(1, ctx.h - 4));
    if (isShooterAlcove(maze, ctx.w, ctx.h, gx, gz)) tryPadAt(gx, gz, 0);
  }

  return pads;
}

export const SHOOTER_TEAMS = [
  { id: 0, name: "紅隊", color: 0xff4466 },
  { id: 1, name: "藍隊", color: 0x44aaff },
];

/** playStyle: "teams" 平均分队 | "ffa" 自由混戰每人一色 */
export function assignShooterPlayer(p, index, total, playStyle = "teams") {
  if (playStyle === "ffa") {
    p.teamId = -1;
    p.paintColor = PAINT_PALETTE[index % PAINT_PALETTE.length];
  } else {
    const half = Math.ceil(Math.max(2, total) / 2);
    const teamId = index < half ? 0 : 1;
    p.teamId = teamId;
    p.paintColor = SHOOTER_TEAMS[teamId].color;
  }
  p._shooterColor = p.paintColor;
}

export function isShooterMoleMode(stateOrStyle) {
  if (typeof stateOrStyle === "object" && stateOrStyle) return stateOrStyle.playStyle === "mole";
  return stateOrStyle === "mole";
}

export function isShooterEnemy(a, b, playStyle = "teams", state = null) {
  if (!a || !b || a === b) return false;
  if (a._shooterDowned || a._awaitingRespawn || b._shooterDowned || b._awaitingRespawn) return false;
  if ((a.hp ?? 0) <= 0 || (b.hp ?? 0) <= 0) return false;
  const mole = isShooterMoleMode(state) || playStyle === "mole";
  if (mole && a.isMole && state?.moleCanShoot) return true;
  if (playStyle === "ffa") return true;
  return (a.teamId ?? 0) !== (b.teamId ?? 0);
}

export function isSameShooterTeam(a, b) {
  if (!a || !b) return false;
  if (a.teamId < 0 || b.teamId < 0) return false;
  return (a.teamId ?? 0) === (b.teamId ?? 0);
}

/** 無間道：開局隨機內鬼（僅該隊伍一人知曉身分） */
export function setupMoleRound(players, state) {
  const pool = players.filter((p) => p && p.teamId >= 0);
  if (!pool.length) return null;
  const teamPick = Math.random() < 0.5 ? 0 : 1;
  const teamMates = pool.filter((p) => (p.teamId ?? 0) === teamPick);
  const pickFrom = teamMates.length ? teamMates : pool;
  const mole = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  for (const p of players) {
    p.isMole = false;
    p._moleRevealed = false;
  }
  mole.isMole = true;
  state.moleRef = mole;
  state.moleTeamId = mole.teamId ?? 0;
  state.moleCanShoot = false;
  state.moleAnnounced = false;
  state.moleArmAt = state.moleArmAt ?? 30;
  state.teamRoundScore = state.teamRoundScore || [0, 0];
  return mole;
}

export function tickMoleAlerts(state, elapsed, onToast) {
  if (!isShooterMoleMode(state)) return;
  if (!state.moleAnnounced && elapsed >= (state.moleArmAt ?? 30)) {
    state.moleCanShoot = true;
    state.moleAnnounced = true;
    onToast?.("⚠ 警報：內鬼現在可以對隊友開槍了！", 2600);
  }
}

/** 射擊同隊好人 → 立刻淘汰射手（已識破內鬼可開槍） */
export function isMoleTeamkillViolation(killer, target, state) {
  if (!isShooterMoleMode(state)) return false;
  if (!killer || !target || killer === target) return false;
  if (!isSameShooterTeam(killer, target)) return false;
  if (target.isMole && target._moleRevealed) return false;
  if (killer.isMole && state.moleCanShoot) return false;
  return true;
}

export function scoreMoleKill(killer, victim, state) {
  if (!isShooterMoleMode(state) || !killer || !victim) return;
  if (killer.isMole && state.moleCanShoot && isSameShooterTeam(killer, victim)) {
    const tid = killer.teamId ?? 0;
    state.teamRoundScore[tid] = (state.teamRoundScore[tid] || 0) + 5;
    return;
  }
  if (!isSameShooterTeam(killer, victim)) {
    const tid = killer.teamId ?? 0;
    state.teamRoundScore[tid] = (state.teamRoundScore[tid] || 0) + 1;
  }
}

export function checkMoleRoundEnd(players, state) {
  if (!isShooterMoleMode(state)) return null;
  const mole = state.moleRef || players.find((p) => p.isMole);
  if (mole && (mole._shooterDowned || mole._awaitingRespawn || (mole.hp ?? 0) <= 0)) {
    const win = mole.teamId === 0 ? 1 : 0;
    state.teamRoundScore[win] = (state.teamRoundScore[win] || 0) + 3;
    return { winTeam: win, reason: "內鬼被擊殺，對方隊伍贏得本局" };
  }
  const alive0 = players.filter((p) => (p.teamId ?? 0) === 0 && !p._shooterDowned && (p.hp ?? 0) > 0 && !p._awaitingRespawn);
  const alive1 = players.filter((p) => (p.teamId ?? 0) === 1 && !p._shooterDowned && (p.hp ?? 0) > 0 && !p._awaitingRespawn);
  if (!alive0.length) return { winTeam: 1, reason: "紅隊全滅" };
  if (!alive1.length) return { winTeam: 0, reason: "藍隊全滅" };
  return null;
}

export function buildMoleEndResults(players, human, state) {
  const s0 = state.teamRoundScore?.[0] ?? 0;
  const s1 = state.teamRoundScore?.[1] ?? 0;
  let teamWin = null;
  if (s0 !== s1) teamWin = s0 > s1 ? 0 : 1;
  const mole = state.moleRef;
  const moleName = mole?.charDef?.name || "?";
  const moleTeam = SHOOTER_TEAMS[state.moleTeamId ?? 0]?.name || "—";
  if (teamWin != null) {
    const youWin = human && (human.teamId ?? 0) === teamWin;
    const wonTeam = SHOOTER_TEAMS[teamWin];
    return {
      won: !!youWin,
      msg: `紅 ${s0} · 藍 ${s1} · 內鬼 ${moleName}`,
      shortTitle: `${wonTeam.name} 獲勝`,
      shortSub: `紅 ${s0} · 藍 ${s1} · 內鬼 ${moleName}（${moleTeam}）`,
      teamWin,
      playStyle: "mole",
      teamKills: [s0, s1],
    };
  }
  return {
    won: false,
    msg: `平手 · 內鬼 ${moleName}`,
    shortTitle: "平手",
    shortSub: `紅 ${s0} · 藍 ${s1} · 內鬼 ${moleName}（${moleTeam}）`,
    teamWin: null,
    playStyle: "mole",
    teamKills: [s0, s1],
  };
}

export const SHOOTER_WEAPONS = [
  { id: "smg", name: "衝鋒槍", slot: 1, damage: 8, fireCd: 0.14, spread: 0.035, speed: 30, color: 0x44ddff, pellets: 1 },
  { id: "rifle", name: "步槍", slot: 2, damage: 18, fireCd: 0.36, spread: 0.008, speed: 34, color: 0xffcc44, pellets: 1 },
  { id: "shotgun", name: "霰彈槍", slot: 3, damage: 7, fireCd: 0.58, spread: 0.26, speed: 26, color: 0xff8844, pellets: 9 },
  { id: "sniper", name: "狙擊槍", slot: 4, damage: 42, fireCd: 1.15, spread: 0.0005, speed: 58, color: 0xff66cc, pellets: 1, headshotKill: true },
  { id: "pad", name: "彈跳板", slot: 5, damage: 0, fireCd: 0.55, spread: 0, speed: 0, color: 0x33eeff, pellets: 0, placePad: true },
  { id: "katana", name: "武士刀", slot: 6, damage: 36, fireCd: 0.46, spread: 0, speed: 0, color: 0xcfd8e8, pellets: 0, melee: true, meleeRange: 2.6 },
];

export function getShooterWeapon(id) {
  return SHOOTER_WEAPONS.find((w) => w.id === id) || SHOOTER_WEAPONS[0];
}

export function getTargetHeadY(target) {
  return (target?.elev ?? 0) + (target?._jumpY ?? 0) + 2.15;
}

export function getShooterEyeY(p) {
  return (p?.elev ?? 0) + (p?._jumpY ?? 0) + 1.62;
}

/** 狙擊爆頭：瞄準線與頭部夾角極小時一擊必殺 */
export function isShooterHeadshot(shooter, target, fireDir) {
  const w = getShooterWeapon(shooter?.weaponId);
  if (!w.headshotKill || !fireDir || !target) return false;
  const head = new THREE.Vector3(target.pos.x, getTargetHeadY(target), target.pos.z);
  const eye = new THREE.Vector3(shooter.pos.x, getShooterEyeY(shooter), shooter.pos.z);
  const toHead = head.clone().sub(eye);
  const dist = toHead.length();
  if (dist > 58) return false;
  toHead.normalize();
  const dir = fireDir.isVector3 ? fireDir : new THREE.Vector3(fireDir.x, fireDir.y, fireDir.z);
  dir.normalize();
  return dir.dot(toHead) > 0.988;
}

export function applyShooterLoadout(p, weaponId = "rifle") {
  const w = getShooterWeapon(weaponId);
  p.weaponId = w.id;
  p.maxHp = 140;
  p.hp = 140;
  p._shooterSpeedMult = w.id === "sniper" ? 0.9 : w.id === "shotgun" ? 0.94 : w.id === "pad" ? 0.98 : w.id === "katana" ? 1.06 : 1;
  p._shooterColor = p.paintColor ?? w.color;
  p._shooterFireCd = w.fireCd;
  p._shooterDamage = w.damage;
  p._shooterSpread = w.spread;
  p._shooterPellets = w.pellets;
  p._shooterBulletSpeed = w.speed;
  p._shooterHeadshot = !!w.headshotKill;
}

export function cycleShooterWeapon(p, dir = 1) {
  const idx = SHOOTER_WEAPONS.findIndex((w) => w.id === p.weaponId);
  const next = SHOOTER_WEAPONS[(idx + dir + SHOOTER_WEAPONS.length) % SHOOTER_WEAPONS.length];
  applyShooterLoadout(p, next.id);
  return next;
}

export function createShooterState(level = {}, playStyle = "teams") {
  const ps = playStyle === "ffa" ? "ffa" : playStyle === "mole" ? "mole" : "teams";
  return {
    playStyle: ps,
    humanKills: 0,
    botKills: 0,
    respawnDelay: 2.2,
    mapStyle: level.mapStyle || "arena",
    levelName: level.name || "槍戰",
    moleArmAt: 30,
    moleCanShoot: false,
    moleAnnounced: false,
    moleRef: null,
    moleTeamId: 0,
    teamRoundScore: [0, 0],
    /** 開局幾秒內 AI 不開火，先走位（無間道較不易暴露內鬼） */
    aiWarmupUntil: ps === "mole" ? 14 : 5,
  };
}

export function pickRespawnCell(ctx, maze, avoid = []) {
  const { w, h } = ctx;
  for (let t = 0; t < 80; t++) {
    const gx = 1 + Math.floor(Math.random() * Math.max(1, w - 2));
    const gz = 1 + Math.floor(Math.random() * Math.max(1, h - 2));
    const c = cellCenter(ctx, gx, gz);
    if (avoid.some((p) => Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 7)) continue;
    return { x: c.x, z: c.z, gx, gz };
  }
  return cellCenter(ctx, 0, 0);
}

export function respawnShooterPlayer(p, ctx, maze, players) {
  const spot = pickRespawnCell(ctx, maze, players.filter((x) => x !== p));
  p.pos.x = spot.x;
  p.pos.z = spot.z;
  p.elev = 0;
  p._jumpY = 0;
  p.vel = { x: 0, z: 0 };
  p.velY = 0;
  p.onGround = true;
  p.caught = false;
  p.hp = p.maxHp ?? 140;
  p.invuln = 1.6;
  p._respawnUntil = 0;
  if (p.mesh) {
    p.mesh.visible = true;
    resetShooterCharacterPose(p);
    p.mesh.position.set(spot.x, 0, spot.z);
  }
}

function isShooterCombatActive(p) {
  return p && !p._shooterDowned && !p._awaitingRespawn && (p.hp ?? 0) > 0;
}

export function canShooterFire(p, elapsed, state = null) {
  if (p.isMole && isShooterMoleMode(state) && !state.moleCanShoot) return false;
  if (state && p.isAI && elapsed < (state.aiWarmupUntil ?? 10)) return false;
  return (p._shootCd ?? 0) <= elapsed && !p._shooterDowned && !p._awaitingRespawn
    && (p.hp ?? 0) > 0 && !(p._respawnUntil > elapsed);
}

/** 重置角色骨架（倒地／重生後避免只剩頭頂文字、身體埋地） */
export function resetShooterCharacterPose(p) {
  if (!p?.mesh) return;
  const parts = p.mesh.userData?.parts;
  p.mesh.rotation.x = 0;
  p.mesh.rotation.z = 0;
  if (parts?.torso) {
    parts.torso.rotation.x = 0;
    parts.torso.rotation.z = 0;
    parts.torso.position.y = parts.baseTorsoY ?? 1.38;
  }
  if (parts?.head) {
    parts.head.rotation.x = 0;
    parts.head.position.y = parts.baseHeadY ?? 1.14;
  }
  if (parts?.leftArm) parts.leftArm.rotation.x = 0;
  if (parts?.rightArm) parts.rightArm.rotation.x = 0;
  if (parts?.leftLeg) {
    parts.leftLeg.rotation.x = 0;
    parts.leftLeg.position.z = 0;
  }
  if (parts?.rightLeg) {
    parts.rightLeg.rotation.x = 0;
    parts.rightLeg.position.z = 0;
  }
}

/** 倒地動畫：先側躺約 5 秒再隱藏模型 */
export function tickShooterDownedPose(p, elapsed, worldHeightFn) {
  if (!p?._shooterDowned || !p.mesh) return;
  const wh = worldHeightFn ? worldHeightFn(p) : (p.elev ?? 0);
  const t0 = p._shooterDownedAt ?? elapsed;
  const layT = Math.min(1, (elapsed - t0) / 0.7);
  const parts = p.mesh.userData?.parts;
  if (parts?.torso) {
    parts.torso.rotation.x = -layT * 1.35;
    if (parts.head) parts.head.rotation.x = layT * 0.4;
    if (parts.leftLeg) parts.leftLeg.rotation.x = layT * 0.55;
    if (parts.rightLeg) parts.rightLeg.rotation.x = layT * 0.55;
    p.mesh.rotation.x = 0;
  } else {
    p.mesh.rotation.x = -layT * (Math.PI / 2) * 0.9;
  }
  p.mesh.position.y = wh - layT * 0.42;
  p.mesh.rotation.y = p._shooterDownedYaw ?? p.yaw ?? p.mesh.rotation.y;
  p.mesh.visible = true;
  if (!p._awaitingRespawn && p._shooterBodyHideAt != null && elapsed >= p._shooterBodyHideAt) {
    p.mesh.visible = false;
  }
}

export function clearShooterDownedState(p) {
  if (!p) return;
  p.caught = false;
  p._shooterDowned = false;
  p._awaitingRespawn = false;
  p._autoRespawnAt = 0;
  p._shooterBodyHideAt = null;
  if (p.mesh) {
    p.mesh.visible = true;
    resetShooterCharacterPose(p);
  }
}

export function tryManualShooterRespawn(p, ctx, maze, players) {
  if (!p || !p._awaitingRespawn) return false;
  clearShooterDownedState(p);
  respawnShooterPlayer(p, ctx, maze, players);
  return true;
}

export function makeShooterProjectile(p, yaw, pelletOffset = 0, fireDir = null, pelletJitter = null) {
  const spread = (p._shooterSpread ?? 0) * pelletOffset;
  const spd = p._shooterBulletSpeed ?? 30;
  const muzzle = 0.85;
  let dir;
  if (fireDir && (fireDir.isVector3 || fireDir.x != null)) {
    const v = fireDir.isVector3 ? fireDir : { x: fireDir.x, y: fireDir.y, z: fireDir.z };
    dir = new THREE.Vector3(v.x, v.y, v.z);
    if (dir.lengthSq() < 1e-6) dir.set(Math.sin(yaw), 0, Math.cos(yaw));
    else dir.normalize();
    if (pelletJitter) {
      const baseYaw = Math.atan2(dir.x, dir.z);
      const horiz = Math.hypot(dir.x, dir.z) || 1;
      const basePitch = Math.atan2(dir.y, horiz);
      const jy = baseYaw + (pelletJitter.yaw ?? 0);
      const jp = basePitch + (pelletJitter.pitch ?? 0);
      const cosP = Math.cos(jp);
      dir.set(Math.sin(jy) * cosP, Math.sin(jp), Math.cos(jy) * cosP).normalize();
    } else if (spread) {
      const horiz = Math.hypot(dir.x, dir.z) || 1;
      const baseYaw = Math.atan2(dir.x, dir.z) + spread;
      dir.x = Math.sin(baseYaw) * horiz;
      dir.z = Math.cos(baseYaw) * horiz;
      dir.normalize();
    }
  } else {
    const aim = yaw + spread + (pelletJitter?.yaw ?? 0);
    const pitch = pelletJitter?.pitch ?? 0;
    const cosP = Math.cos(pitch);
    dir = new THREE.Vector3(Math.sin(aim) * cosP, Math.sin(pitch), Math.cos(aim) * cosP);
  }
  const eyeY = 1.52 + (p._jumpY ?? 0) + (p.elev ?? 0);
  const fd = { x: dir.x, y: dir.y, z: dir.z };
  return {
    x: p.pos.x + dir.x * muzzle,
    y: eyeY + dir.y * muzzle,
    z: p.pos.z + dir.z * muzzle,
    vx: dir.x * spd,
    vy: dir.y * spd,
    vz: dir.z * spd,
    life: p.weaponId === "sniper" ? 2.2 : 1.4,
    color: p.paintColor ?? p._shooterColor ?? 0x44aaff,
    damage: p._shooterDamage ?? 20,
    fromShooter: true,
    owner: p,
    fireDir: fd,
  };
}

export function fireShooterWeapon(p, yaw, fireDir = null) {
  if (p?.weaponId === "katana") return [];
  const n = p._shooterPellets ?? 1;
  const spreadBase = p._shooterSpread ?? 0;
  const list = [];
  for (let i = 0; i < n; i++) {
    let jitter = null;
    if (n > 1) {
      const s = spreadBase || 0.22;
      jitter = {
        yaw: (Math.random() - 0.5) * s * 2.4,
        pitch: (Math.random() - 0.5) * s * 1.6,
      };
    }
    const off = n <= 1 ? 0 : (i / (n - 1) - 0.5) * 2;
    const pr = makeShooterProjectile(p, yaw, jitter ? 0 : off, fireDir, jitter);
    pr.pelletIndex = i;
    pr.pelletTotal = n;
    pr.weaponId = p.weaponId;
    list.push(pr);
  }
  return list;
}

const GUN_COLORS = { smg: 0x44ddff, rifle: 0xffcc44, shotgun: 0xff8844, sniper: 0xff66cc, katana: 0xcfd8e8 };

export function attachShooterGun(p) {
  if (!p?.mesh || p.gunMesh) return;
  const gun = new THREE.Group();
  const partNames = ["body", "barrel", "grip", "acc1", "acc2", "acc3"];
  for (const n of partNames) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x888899 })
    );
    m.name = `wp_${n}`;
    gun.add(m);
  }
  gun.position.set(0.38, 1.12, 0.42);
  gun.rotation.y = 0.15;
  p.mesh.add(gun);
  p.gunMesh = gun;
  syncGunVisual(p);
}

function heldPartMat(color, opacity = 1, opts = {}) {
  const emissive = opts.emissive ?? color;
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: opts.emissiveIntensity ?? 0.22,
    metalness: opts.metalness ?? 0.35,
    roughness: opts.roughness ?? 0.58,
    transparent: opacity < 1,
    opacity,
    depthTest: false,
    depthWrite: false,
  });
}

function accentPart(mesh, w, h, d, color, x, y, z, ry = 0) {
  setHeldPart(mesh, w, h, d, color);
  placeHeldPart(mesh, x, y, z, 0, ry, 0);
}

function setHeldPart(mesh, w, h, d, color, opacity = 1) {
  if (!mesh) return;
  mesh.geometry = new THREE.BoxGeometry(w, h, d);
  mesh.material = heldPartMat(color, opacity);
  mesh.visible = true;
}

function placeHeldPart(mesh, x, y, z, rx = 0, ry = 0, rz = 0) {
  if (!mesh) return;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
}

function hideFpParts(parts) {
  if (!parts) return;
  for (const m of Object.values(parts)) if (m) m.visible = false;
}

function layoutKatanaParts(parts, flashCol) {
  const { body, barrel, grip, acc1, acc2, acc3 } = parts;
  const blade = flashCol ?? 0xf8fbff;
  const edge = flashCol ? 0xffe8b8 : 0xe2eeff;
  setHeldPart(body, 0.052, 0.095, 1.34, blade, 1, { emissiveIntensity: 0.28 });
  placeHeldPart(body, 0.02, 0.025, 0.74, 0.06, 0.04, 0);
  setHeldPart(acc1, 0.014, 0.105, 1.3, edge, 1, { emissiveIntensity: 0.35 });
  placeHeldPart(acc1, 0.068, 0.028, 0.72, 0.06, 0.04, 0);
  setHeldPart(barrel, 0.36, 0.055, 0.13, 0xffd966, 1, { metalness: 0.55, emissiveIntensity: 0.4 });
  placeHeldPart(barrel, 0.02, 0.0, 0.14, 0, 0, 0);
  accentPart(acc2, 0.11, 0.045, 0.09, 0xccb04a, 0.02, -0.02, 0.06);
  setHeldPart(grip, 0.09, 0.09, 0.4, 0x141a2e, 1, { roughness: 0.82, metalness: 0.1 });
  placeHeldPart(grip, 0.02, -0.02, -0.2, 0.1, 0, 0);
  accentPart(acc3, 0.12, 0.12, 0.12, 0x2a3048, 0.02, -0.03, -0.42);
}

function layoutGunParts(parts, id, flashCol) {
  const { body, barrel, grip, acc1, acc2, acc3 } = parts;
  const col = flashCol ?? GUN_COLORS[id] ?? 0x888899;
  hideFpParts(parts);
  const trim = 0x2a2a36;
  const stud = 0x44445a;
  if (id === "smg") {
    setHeldPart(body, 0.4, 0.15, 0.5, col, 1, { emissiveIntensity: 0.3 });
    placeHeldPart(body, 0, 0, 0.04);
    accentPart(acc2, 0.08, 0.04, 0.42, trim, 0, 0.09, 0.1);
    setHeldPart(barrel, 0.075, 0.075, 0.34, 0x1e1e28, 1, { metalness: 0.65 });
    placeHeldPart(barrel, 0, 0.02, 0.4);
    accentPart(acc1, 0.06, 0.06, 0.06, stud, 0, 0.1, 0.52);
    setHeldPart(grip, 0.11, 0.22, 0.13, 0x12121c, 1, { roughness: 0.85 });
    placeHeldPart(grip, 0, -0.12, -0.02);
    accentPart(acc3, 0.09, 0.05, 0.14, 0x334455, 0.07, -0.04, 0.08);
    return;
  }
  if (id === "shotgun") {
    setHeldPart(body, 0.46, 0.17, 0.54, col, 1, { emissiveIntensity: 0.28 });
    placeHeldPart(body, 0, 0, 0.02);
    setHeldPart(barrel, 0.065, 0.065, 0.4, 0x1a1a24, 1, { metalness: 0.7 });
    placeHeldPart(barrel, -0.055, 0.03, 0.44);
    setHeldPart(acc1, 0.065, 0.065, 0.4, 0x1a1a24, 1, { metalness: 0.7 });
    placeHeldPart(acc1, 0.055, 0.03, 0.44);
    accentPart(acc2, 0.16, 0.13, 0.4, 0x3a2e22, 0, -0.02, -0.24);
    setHeldPart(grip, 0.13, 0.11, 0.24, 0x14141e, 1, { roughness: 0.8 });
    placeHeldPart(grip, 0, -0.1, -0.08);
    accentPart(acc3, 0.07, 0.07, 0.07, stud, -0.08, 0.1, 0.36);
    return;
  }
  if (id === "sniper") {
    setHeldPart(body, 0.42, 0.15, 0.6, col, 1, { emissiveIntensity: 0.26 });
    placeHeldPart(body, 0, 0, 0.04);
    setHeldPart(barrel, 0.065, 0.065, 0.62, 0x181822, 1, { metalness: 0.72 });
    placeHeldPart(barrel, 0, 0.03, 0.54);
    setHeldPart(acc1, 0.1, 0.09, 0.24, 0x3a4a5a, 1, { metalness: 0.5 });
    placeHeldPart(acc1, 0, 0.11, 0.2);
    setHeldPart(grip, 0.11, 0.21, 0.14, 0x101018, 1, { roughness: 0.82 });
    placeHeldPart(grip, 0, -0.12, -0.04);
    accentPart(acc2, 0.09, 0.05, 0.22, trim, 0, -0.14, 0.3);
    accentPart(acc3, 0.06, 0.06, 0.06, stud, 0.06, 0.12, 0.08);
    return;
  }
  setHeldPart(body, 0.44, 0.16, 0.56, col, 1, { emissiveIntensity: 0.28 });
  placeHeldPart(body, 0, 0, 0.04);
  setHeldPart(barrel, 0.075, 0.075, 0.42, 0x1e1e28, 1, { metalness: 0.62 });
  placeHeldPart(barrel, 0, 0.02, 0.44);
  accentPart(acc2, 0.1, 0.05, 0.18, trim, 0, 0.1, 0.2);
  setHeldPart(grip, 0.11, 0.21, 0.13, 0x12121c, 1, { roughness: 0.84 });
  placeHeldPart(grip, 0, -0.12, -0.02);
  accentPart(acc1, 0.12, 0.09, 0.22, 0x333348, 0.05, 0.09, 0.14);
  accentPart(acc3, 0.06, 0.06, 0.06, stud, -0.06, 0.1, 0.34);
}

const RECOIL_STRENGTH = { smg: 0.055, rifle: 0.095, shotgun: 0.16, sniper: 0.2 };
const RECOIL_DURATION = { smg: 0.1, rifle: 0.13, shotgun: 0.18, sniper: 0.22 };
const KATANA_SWING_DURATION = 0.44;
const SWING_AMP = 2.45;
export const KATANA_PARRY_DURATION = 4;
export const KATANA_PARRY_COOLDOWN = 4;

export function tickKatanaParry(p, dt) {
  if (!p) return;
  if ((p._katanaParryT ?? 0) > 0) {
    p._katanaParryT = Math.max(0, p._katanaParryT - dt);
    if (p._katanaParryT <= 0) p._katanaParryCdT = KATANA_PARRY_COOLDOWN;
  } else if ((p._katanaParryCdT ?? 0) > 0) {
    p._katanaParryCdT = Math.max(0, p._katanaParryCdT - dt);
  }
}

/** @returns {{ ok: boolean, reason?: string }} */
export function tryKatanaParry(p) {
  if (!p || p.weaponId !== "katana") return { ok: false, reason: "weapon" };
  if ((p._katanaParryT ?? 0) > 0) return { ok: true, reason: "active" };
  if ((p._katanaParryCdT ?? 0) > 0) return { ok: false, reason: "cd" };
  p._katanaParryT = KATANA_PARRY_DURATION;
  return { ok: true, reason: "start" };
}

export function isKatanaParryActive(p) {
  return (p?._katanaParryT ?? 0) > 0;
}

/** @returns {{ mode: 'ready'|'active'|'cd', fill: number, label: string }} */
export function getKatanaParryUi(p) {
  const active = p?._katanaParryT ?? 0;
  if (active > 0) {
    return {
      mode: "active",
      fill: active / KATANA_PARRY_DURATION,
      label: `格擋 ${active.toFixed(1)}s`,
    };
  }
  const cd = p?._katanaParryCdT ?? 0;
  if (cd > 0) {
    return {
      mode: "cd",
      fill: 1 - cd / KATANA_PARRY_COOLDOWN,
      label: `冷卻 ${cd.toFixed(1)}s`,
    };
  }
  return { mode: "ready", fill: 1, label: "格擋就緒" };
}

/** 霰彈：近距集中高傷，遠距散開低傷 */
export function computeShotgunMods(p, fireDir, players, isEnemyFn) {
  if (p?.weaponId !== "shotgun") return { spreadMult: 1, dmgMult: 1, dist: Infinity };
  const fx = fireDir?.x ?? Math.sin(p.yaw ?? 0);
  const fz = fireDir?.z ?? Math.cos(p.yaw ?? 0);
  const fLen = Math.hypot(fx, fz) || 1;
  const nx = fx / fLen;
  const nz = fz / fLen;
  let bestD = Infinity;
  for (const t of players || []) {
    if (!t || t === p) continue;
    if (isEnemyFn && !isEnemyFn(p, t)) continue;
    if ((t.hp ?? 0) <= 0) continue;
    const dx = t.pos.x - p.pos.x;
    const dz = t.pos.z - p.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 26) continue;
    const dot = (dx / (d || 1)) * nx + (dz / (d || 1)) * nz;
    if (dot < 0.45) continue;
    if (d < bestD) bestD = d;
  }
  const close = 3.2;
  const far = 15;
  const t = bestD < Infinity
    ? Math.min(1, Math.max(0, (bestD - close) / (far - close)))
    : 0.9;
  return {
    spreadMult: 0.32 + t * 1.75,
    dmgMult: 1.12 - t * 0.74,
    dist: bestD,
  };
}

/** 揮刀：0 下劈、1 右掃、2 左掃（連按輪替） */
export function startKatanaSwing(p) {
  if (!p) return;
  p._katanaSwingT = KATANA_SWING_DURATION;
  p._katanaSwingIdx = ((p._katanaSwingIdx ?? -1) + 1) % 3;
}

export function applyGunRecoil(p, weaponId) {
  if (!p || weaponId === "katana" || weaponId === "pad") return;
  const dur = RECOIL_DURATION[weaponId] ?? 0.12;
  p._fpRecoilT = dur;
  p._fpRecoilDur = dur;
  p._fpRecoilSide = (Math.random() - 0.5) * 0.12;
}

export function tickFpWeaponMotion(p, dt) {
  if (!p) return;
  tickKatanaParry(p, dt);
  if ((p._katanaSwingT ?? 0) > 0) p._katanaSwingT = Math.max(0, p._katanaSwingT - dt);
  if ((p._fpRecoilT ?? 0) > 0) p._fpRecoilT = Math.max(0, p._fpRecoilT - dt);
}

function getFpMotionOffsets(p, weaponId) {
  const off = { pos: [0, 0, 0], rot: [0, 0, 0] };
  const id = weaponId || "rifle";

  if ((p._fpRecoilT ?? 0) > 0 && id !== "katana" && id !== "pad") {
    const dur = p._fpRecoilDur ?? 0.12;
    const u = 1 - p._fpRecoilT / dur;
    const kick = Math.sin(u * Math.PI);
    const s = RECOIL_STRENGTH[id] ?? 0.1;
    off.pos[2] += kick * s * 1.1;
    off.pos[1] += kick * s * 0.45;
    off.pos[0] += (p._fpRecoilSide ?? 0) * kick;
    off.rot[0] += kick * s * 3.2;
    off.rot[2] += kick * s * 0.6;
  }

  if (id === "katana" && (p._katanaParryT ?? 0) > 0) {
    const u = (p._katanaParryT ?? 0) / KATANA_PARRY_DURATION;
    const hold = 0.55 + Math.sin(u * Math.PI) * 0.12;
    off.rot[0] += -1.35 * hold;
    off.rot[1] += 0.55 * hold;
    off.rot[2] += 0.18 * hold;
    off.pos[1] += 0.28 * hold;
    off.pos[2] -= 0.12 * hold;
  } else if (id === "katana" && (p._katanaSwingT ?? 0) > 0) {
    const u = 1 - p._katanaSwingT / KATANA_SWING_DURATION;
    const kind = p._katanaSwingIdx ?? 0;
    const a = SWING_AMP;
    if (kind === 0) {
      const chop = u < 0.25 ? u / 0.25 : u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45;
      off.rot[0] += (-1.75 + chop * 2.85) * a;
      off.rot[2] += Math.sin(u * Math.PI * 2) * 0.32 * a;
      off.pos[1] += (-0.14 + chop * 0.28) * a;
      off.pos[2] += (-0.1 + chop * 0.32) * a;
    } else if (kind === 1) {
      const sweep = Math.sin(u * Math.PI);
      off.rot[1] += (-1.35 + u * 2.7) * a;
      off.rot[0] += sweep * 0.72 * a;
      off.pos[0] += sweep * 0.22 * a;
      off.pos[2] += sweep * 0.08 * a;
    } else {
      const sweep = Math.sin(u * Math.PI);
      off.rot[1] += (1.35 - u * 2.7) * a;
      off.rot[0] += sweep * 0.68 * a;
      off.pos[0] -= sweep * 0.22 * a;
      off.pos[2] += sweep * 0.08 * a;
    }
  }
  return off;
}

/** 第三人稱／第一人稱手持（樂高方塊風） */
export function syncGunVisual(p) {
  if (!p?.gunMesh) return;
  const parts = {
    body: p.gunMesh.children.find((c) => c.name === "wp_body") || p.gunMesh.children[0],
    barrel: p.gunMesh.children.find((c) => c.name === "wp_barrel") || p.gunMesh.children[1],
    grip: p.gunMesh.children.find((c) => c.name === "wp_grip") || p.gunMesh.children[2],
    acc1: p.gunMesh.children.find((c) => c.name === "wp_acc1") || p.gunMesh.children[3],
    acc2: p.gunMesh.children.find((c) => c.name === "wp_acc2") || p.gunMesh.children[4],
    acc3: p.gunMesh.children.find((c) => c.name === "wp_acc3") || p.gunMesh.children[5],
  };
  p.gunMesh.visible = true;
  if (p.weaponId === "pad") {
    hideFpParts(parts);
    setHeldPart(parts.body, 0.48, 0.12, 0.48, 0x33eeff, 0.55, { emissiveIntensity: 0.45 });
    placeHeldPart(parts.body, 0, 0, 0.04);
    setHeldPart(parts.barrel, 0.14, 0.06, 0.14, 0x66ffee, 0.8, { emissiveIntensity: 0.5 });
    placeHeldPart(parts.barrel, 0, 0.08, 0);
    accentPart(parts.grip, 0.08, 0.22, 0.08, 0x22aacc, 0, -0.06, -0.04);
    accentPart(parts.acc1, 0.06, 0.04, 0.06, 0xaaffff, 0.1, 0.1, 0.12);
    p.gunMesh.position.set(0.36, 1.1, 0.38);
    p.gunMesh.rotation.set(0, 0.12, 0);
    p.gunMesh.scale.set(1.05, 1.05, 1.05);
    return;
  }
  if (p.weaponId === "katana") {
    layoutKatanaParts(parts);
    const parryT = p._katanaParryT ?? 0;
    if (parryT > 0 && p.gunMesh.parent === p.mesh) {
      const u = parryT / KATANA_PARRY_DURATION;
      const hold = 0.5 + Math.sin(u * Math.PI) * 0.1;
      p.gunMesh.rotation.set(-1.05 * hold, 0.35, 0.35 * hold);
      p.gunMesh.position.set(0.34, 1.22, 0.28);
    } else {
    const swingT = p._katanaSwingT ?? 0;
    const a = SWING_AMP * 0.92;
    if (swingT > 0 && p.gunMesh.parent === p.mesh) {
      const u = 1 - swingT / KATANA_SWING_DURATION;
      const kind = p._katanaSwingIdx ?? 0;
      const baseRot = new THREE.Euler(-0.08, 0.62, 0.22);
      if (kind === 0) {
        const chop = u < 0.25 ? u / 0.25 : u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45;
        baseRot.x += (-1.1 + chop * 1.75) * a;
      } else if (kind === 1) {
        baseRot.y += (-0.85 + u * 1.7) * a;
        baseRot.x += Math.sin(u * Math.PI) * 0.45 * a;
      } else {
        baseRot.y += (0.85 - u * 1.7) * a;
        baseRot.x += Math.sin(u * Math.PI) * 0.4 * a;
      }
      p.gunMesh.rotation.copy(baseRot);
    } else {
      p.gunMesh.rotation.set(-0.08, 0.62, 0.22);
    }
    p.gunMesh.position.set(0.36, 1.1, 0.32);
    }
    p.gunMesh.scale.set(1.15, 1.15, 1.15);
    return;
  }
  const id = p.weaponId || "rifle";
  layoutGunParts(parts, id);
  p.gunMesh.position.set(0.38, 1.12, 0.42);
  p.gunMesh.rotation.set(0, 0.15, 0);
  const sx = id === "shotgun" ? 1.25 : id === "smg" ? 0.82 : id === "sniper" ? 1.15 : 1;
  const sz = id === "shotgun" ? 1.15 : id === "smg" ? 0.88 : id === "sniper" ? 1.35 : 1;
  p.gunMesh.scale.set(sx, 1, sz);
}

const FP_HAND_POSE = {
  smg: { pos: [0.36, -0.26, -0.42], rot: [0.02, 0.06, 0], scale: [1.35, 1.35, 1.35] },
  rifle: { pos: [0.4, -0.28, -0.46], rot: [0.02, 0.05, 0], scale: [1.45, 1.45, 1.45] },
  shotgun: { pos: [0.42, -0.27, -0.44], rot: [0.02, 0.04, 0], scale: [1.55, 1.55, 1.55] },
  sniper: { pos: [0.44, -0.26, -0.5], rot: [0.01, 0.04, 0], scale: [1.5, 1.5, 1.5] },
  pad: { pos: [0.38, -0.24, -0.38], rot: [0.1, 0.08, 0], scale: [1.5, 1.5, 1.5] },
  katana: { pos: [0.46, -0.3, -0.5], rot: [-0.12, 0.58, 0.1], scale: [1.65, 1.65, 1.65] },
};

function buildFpHeldBlockRig() {
  const rig = new THREE.Group();
  rig.name = "fpHeldRig";
  const parts = {};
  for (const n of ["body", "barrel", "grip", "acc1", "acc2", "acc3"]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), heldPartMat(0xffffff));
    m.name = `fp_${n}`;
    m.visible = false;
    rig.add(m);
    parts[n] = m;
  }
  rig.userData.parts = parts;
  return rig;
}

function syncFpHeldBlockRig(rig, weaponId, flash = 0) {
  const parts = rig.userData.parts;
  if (!parts) return;
  const id = weaponId || "rifle";
  const flashCol = flash > 0.15 ? 0xffd7a2 : null;
  hideFpParts(parts);
  if (id === "pad") {
    setHeldPart(parts.body, 0.5, 0.12, 0.5, flashCol ?? 0x33eeff, 0.55, { emissiveIntensity: 0.45 });
    placeHeldPart(parts.body, 0, 0, 0);
    setHeldPart(parts.barrel, 0.16, 0.07, 0.16, flashCol ?? 0x88ffee, 0.75, { emissiveIntensity: 0.5 });
    placeHeldPart(parts.barrel, 0, 0.07, 0.02);
    accentPart(parts.grip, 0.07, 0.2, 0.07, 0x22aacc, 0, -0.05, -0.06);
    accentPart(parts.acc1, 0.05, 0.05, 0.05, 0xccffff, 0.12, 0.1, 0.1);
    return;
  }
  if (id === "katana") layoutKatanaParts(parts, flashCol);
  else layoutGunParts(parts, id, flashCol);
}

function ensureFpHeldRig(p) {
  if (!p._fpHeldRig) p._fpHeldRig = buildFpHeldBlockRig();
  return p._fpHeldRig;
}

/** 第一人稱：場景座標跟隨攝影機（方塊風手持） */
export function syncHeldWeaponOnCamera(p, cam, scene) {
  if (!p || !cam || !scene) return;
  attachShooterGun(p);
  syncGunVisual(p);
  const rig = ensureFpHeldRig(p);
  syncFpHeldBlockRig(rig, p.weaponId, 0);
  if (rig.parent !== scene) {
    rig.parent?.remove(rig);
    scene.add(rig);
  }
  const pose = FP_HAND_POSE[p.weaponId] || FP_HAND_POSE.rifle;
  const bump = 1 + ((p._fpFlash ?? 0) / 0.06) * 0.1;
  cam.updateMatrixWorld(true);
  const offset = new THREE.Vector3(pose.pos[0], pose.pos[1], pose.pos[2]);
  offset.applyQuaternion(cam.quaternion);
  rig.position.copy(cam.position).add(offset);
  rig.quaternion.copy(cam.quaternion);
  const e = new THREE.Euler(pose.rot[0], pose.rot[1], pose.rot[2], "XYZ");
  rig.quaternion.multiply(new THREE.Quaternion().setFromEuler(e));
  const motion = getFpMotionOffsets(p, p.weaponId);
  const swingQ = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(motion.rot[0], motion.rot[1], motion.rot[2], "XYZ")
  );
  rig.quaternion.multiply(swingQ);
  const motOff = new THREE.Vector3(motion.pos[0], motion.pos[1], motion.pos[2]);
  motOff.applyQuaternion(cam.quaternion);
  rig.position.add(motOff);
  rig.scale.set(pose.scale[0] * bump, pose.scale[1] * bump, pose.scale[2] * bump);
  rig.visible = true;
  rig.renderOrder = 99999;
  rig.traverse((c) => {
    if (c.isMesh) {
      c.renderOrder = 100000;
      c.frustumCulled = false;
    }
  });
}

export function hideFpHeldRig(p) {
  if (p?._fpHeldRig) p._fpHeldRig.visible = false;
}

export function restoreHeldWeaponToBody(p) {
  hideFpHeldRig(p);
  if (!p?.gunMesh || !p.mesh) return;
  if (p.gunMesh.parent !== p.mesh) {
    p.gunMesh.parent?.remove(p.gunMesh);
    p.mesh.add(p.gunMesh);
  }
  syncGunVisual(p);
}

export function muzzleFlash(p) {
  p._gunFlash = 0.06;
  p._fpFlash = 0.06;
  if (p?.weaponId && p.weaponId !== "katana" && p.weaponId !== "pad") {
    applyGunRecoil(p, p.weaponId);
  }
}

let fpGunMesh = null;

function fpGunMat(color) {
  return new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false });
}

function fpArmMat() {
  return new THREE.MeshBasicMaterial({ color: 0x5c2838, depthTest: false, depthWrite: false });
}

export function attachFpGun(cam, weaponId = "rifle") {
  detachFpGun(cam);
  if (!cam) return;
  const id = weaponId || "rifle";
  const col = GUN_COLORS[id] || 0x888899;
  const rig = new THREE.Group();
  rig.name = "fpGun";
  rig.renderOrder = 999;

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.32), fpArmMat());
  armL.position.set(-0.2, -0.08, -0.12);
  armL.rotation.set(0.35, 0.25, -0.15);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.36), fpArmMat());
  armR.position.set(0.18, -0.1, -0.1);
  armR.rotation.set(0.28, -0.18, 0.12);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.14), fpArmMat());
  hand.position.set(0.14, -0.14, 0.02);

  const gun = new THREE.Group();
  gun.name = "fpGunBody";
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.36), fpGunMat(col));
  body.name = "fpBody";
  body.position.z = 0.04;
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.34), fpGunMat(0x2a2a38));
  barrel.name = "fpBarrel";
  barrel.position.set(0, 0.02, 0.38);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.11), fpGunMat(0x151520));
  grip.name = "fpGrip";
  grip.position.set(0, -0.11, -0.04);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.1), fpGunMat(0x333344));
  guard.name = "fpGuard";
  guard.position.set(0, -0.02, 0.12);
  const scope = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.12), fpGunMat(0x556677));
  scope.position.set(0, 0.09, 0.04);
  scope.name = "fpScope";
  gun.add(body, barrel, grip, guard, scope);
  gun.position.set(0.12, -0.06, 0.02);
  gun.rotation.set(0.02, 0.05, 0);

  const katana = new THREE.Group();
  katana.name = "fpKatanaGroup";
  katana.visible = false;
  const katanaBlade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.055, 1.22), fpGunMat(0xf4f8ff));
  katanaBlade.name = "fpKatanaBlade";
  katanaBlade.position.set(0.04, 0.03, 0.78);
  katanaBlade.rotation.set(0.1, 0.06, 0);
  const katanaGuard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.1), fpGunMat(0xe8c86a));
  katanaGuard.name = "fpKatanaGuard";
  katanaGuard.position.set(0.04, 0.01, 0.12);
  const katanaHandle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.36), fpGunMat(0x1a1e2b));
  katanaHandle.name = "fpKatanaHandle";
  katanaHandle.position.set(0.04, -0.02, -0.16);
  katana.add(katanaHandle, katanaGuard, katanaBlade);
  katana.position.set(0.16, -0.1, 0.06);
  katana.rotation.set(0.14, -0.22, 0.1);

  rig.add(armL, armR, hand, gun, katana);
  rig.position.set(0.38, -0.28, -0.48);
  rig.rotation.set(0.03, 0.05, 0);
  cam.add(rig);
  fpGunMesh = rig;
  syncFpGunVisual(cam, id);
}

export function detachFpGun(cam) {
  if (fpGunMesh && cam) cam.remove(fpGunMesh);
  fpGunMesh = null;
}

export function setFpGunVisible(visible) {
  if (fpGunMesh) fpGunMesh.visible = visible;
}

export function syncFpGunVisual(cam, weaponId, flash = 0) {
  if (!fpGunMesh) return;
  const id = weaponId || "rifle";
  const col = GUN_COLORS[id] || 0x888899;
  const gunBody = fpGunMesh.getObjectByName("fpGunBody");
  const katanaGroup = fpGunMesh.getObjectByName("fpKatanaGroup");
  const katBlade = fpGunMesh.getObjectByName("fpKatanaBlade");
  const katGuard = fpGunMesh.getObjectByName("fpKatanaGuard");
  const katHandle = fpGunMesh.getObjectByName("fpKatanaHandle");
  const isKatana = id === "katana";
  if (gunBody) gunBody.visible = !isKatana;
  if (katanaGroup) {
    katanaGroup.visible = isKatana;
    if (isKatana) katanaGroup.traverse((c) => { if (c.isMesh) c.visible = true; });
  }
  if (katBlade) katBlade.visible = isKatana;
  if (katGuard) katGuard.visible = isKatana;
  if (katHandle) katHandle.visible = isKatana;
  fpGunMesh.traverse((c) => {
    if (!c.material?.color) return;
    if (c.name === "fpScope") {
      c.visible = !isKatana && (id === "sniper" || id === "rifle");
      c.material.color.setHex(id === "sniper" ? 0x6688aa : 0x445566);
      return;
    }
    if (c.parent === gunBody && c.geometry?.parameters?.depth > 0.2) {
      c.material.color.setHex(flash > 0.2 ? 0xffaa44 : col);
    }
  });
  const sx = id === "shotgun" ? 1.28 : id === "smg" ? 0.9 : id === "sniper" ? 1.05 : 1;
  if (gunBody) {
    gunBody.scale.set(sx, 1, id === "shotgun" ? 1.1 : id === "sniper" ? 1.4 : 1);
  }
  if (id === "sniper") {
    fpGunMesh.position.set(0.32, -0.26, -0.44);
  } else if (id === "katana") {
    if (katBlade?.material?.color) katBlade.material.color.setHex(flash > 0.15 ? 0xffd7a2 : 0xf2f6ff);
    if (katGuard?.material?.color) katGuard.material.color.setHex(flash > 0.15 ? 0xffe8a8 : 0xe8c86a);
    fpGunMesh.position.set(0.4, -0.27, -0.46);
    fpGunMesh.rotation.set(0.04, 0.08, 0.02);
  } else {
    fpGunMesh.position.set(0.38, -0.28, -0.48);
    fpGunMesh.rotation.set(0.03, 0.05, 0);
  }
}

export function tickGunFlash(p, dt, cam) {
  if (!p) return;
  tickFpWeaponMotion(p, dt);
  let flash = 0;
  if ((p._gunFlash ?? 0) > 0) {
    p._gunFlash -= dt;
    flash = Math.max(0, (p._gunFlash ?? 0) / 0.06);
  }
  if ((p._fpFlash ?? 0) > 0) {
    p._fpFlash -= dt;
    flash = Math.max(flash, (p._fpFlash ?? 0) / 0.06);
  }
  if (!p.isAI && p._fpHeldRig?.visible) {
    syncFpHeldBlockRig(p._fpHeldRig, p.weaponId, flash);
  }
}

function pushLowCover(covers, group, c, cell, hBox, halfW, halfD) {
  const top = hBox + 0.05;
  covers.push({
    x: c.x, z: c.z, halfW, halfD, y: top, blockTop: top, baseY: 0,
    standable: true, solidSides: false, minApproach: 0,
  });
}

function addLayoutProps(ctx, maze, group, level, layout, covers, cell, w, h) {
  const style = level.mapStyle || "arena";
  const rng = shooterRng((level.mapSeed ?? 0) ^ 0x707a0e);
  const props = layout.props || [];

  if (props.includes("arena_ring") || props.includes("holo_ring")) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry((w * cell) * 0.2, 0.4, 8, 40),
      new THREE.MeshBasicMaterial({
        color: layout.accent ?? 0xff4466,
        transparent: true,
        opacity: 0.4,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.12, 0);
    group.add(ring);
  }

  if (props.includes("wood_fence") || props.includes("paint_fence")) {
    for (let gz = 1; gz < h - 1; gz += 2) {
      for (const gx of [1, w - 2]) {
        if (!isShooterAlcove(maze, w, h, gx, gz)) continue;
        const c = cellCenter(ctx, gx, gz);
        const fence = new THREE.Mesh(
          new THREE.BoxGeometry(cell * 0.12, cell * 0.55, cell * 0.85),
          lambertStud(0x8b6914, 0x5a4010, 0.2)
        );
        fence.position.set(c.x, cell * 0.28, c.z);
        group.add(fence);
      }
    }
  }

  if (props.includes("tire_stack") || props.includes("sandbag")) {
    for (let i = 0; i < Math.floor(w * 0.6); i++) {
      const gx = 2 + Math.floor(rng() * Math.max(1, w - 4));
      const gz = 2 + Math.floor(rng() * Math.max(1, h - 4));
      if (!isShooterAlcove(maze, w, h, gx, gz)) continue;
      const c = cellCenter(ctx, gx, gz);
      const tire = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.14, 6, 12),
        lambertStud(0x222222, 0x111111, 0.4)
      );
      tire.rotation.x = Math.PI / 2;
      tire.position.set(c.x, 0.22, c.z);
      group.add(tire);
    }
  }

  if (props.includes("yellow_barrier")) {
    for (let i = 0; i < 6; i++) {
      const { gx, gz } = resolveSpot(ctx, { u: 0.2 + i * 0.12, v: 0.5 });
      const c = cellCenter(ctx, gx, gz);
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(cell * 0.55, cell * 0.5, cell * 0.2),
        lambertStud(0xffdd33, 0xccaa00, 0.35)
      );
      bar.position.set(c.x, cell * 0.25, c.z);
      group.add(bar);
      pushLowCover(covers, group, c, cell, cell * 0.5, cell * 0.22, cell * 0.12);
    }
  }

  if (props.includes("container_wall") || props.includes("crate_wall")) {
    const colors = [0xdd3333, 0x3333cc, 0xdddd33, 0x33aa55];
    for (let i = 0; i < Math.min(w, 14); i++) {
      const gz = 2 + (i * 2) % Math.max(1, h - 3);
      const gx = 2 + (i % 4);
      if (!cellPassable(maze, w, h, gx, gz)) continue;
      const c = cellCenter(ctx, gx, gz);
      const col = colors[i % colors.length];
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(cell * 0.65, cell * 0.42, cell * 0.3),
        lambertStud(col, col, 0.24)
      );
      const ch = cell * 0.42;
      crate.position.set(c.x, ch / 2, c.z);
      crate.castShadow = true;
      group.add(crate);
      pushLowCover(covers, group, c, cell, ch, cell * 0.28, cell * 0.16);
    }
  }

  if (props.includes("neon_sign") || props.includes("neon_spire")) {
    const { gx, gz } = resolveSpot(ctx, { u: 0.5, v: 0.5 });
    const c = cellCenter(ctx, gx, gz);
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(cell * 0.35, cell * 1.2, 6),
      lambertStud(0xff66cc, 0xaa44ff, 0.5)
    );
    spire.position.set(c.x, cell * 0.6, c.z);
    group.add(spire);
  }

  if (props.includes("sniper_nest")) {
    for (const spot of [{ u: 0.12, v: 0.12 }, { u: 0.88, v: 0.88 }]) {
      const { gx, gz } = resolveSpot(ctx, spot);
      const c = cellCenter(ctx, gx, gz);
      const nest = new THREE.Mesh(
        new THREE.BoxGeometry(cell * 0.9, cell * 0.25, cell * 0.9),
        lambertStud(0x666677, 0x444455, 0.3)
      );
      nest.position.set(c.x, cell * 0.12, c.z);
      group.add(nest);
    }
  }
}

/** 槍戰掩體 — 依 layout 差異化；掩體可跳站 */
export function buildShooterArena(ctx, maze, scene, level = {}) {
  const { w, h, cell } = ctx;
  const style = level.mapStyle || "arena";
  const layout = getShooterLayout(level);
  const group = new THREE.Group();
  group.name = "shooterArena";
  const covers = [];

  buildLayoutSignature(ctx, maze, group, level);
  const rng = shooterRng((level.mapSeed ?? level.id ?? 1) ^ 0xc0fee1);
  const density = layout.coverDensity ?? 0.45;
  const coverMat = lambertStud(
    layout.accent ?? 0x8899aa,
    (layout.accent ?? 0x556677) >> 1,
    0.24
  );

  const modes = {
    wall_alley: () => {
      for (let gz = 1; gz < h - 1; gz++) {
        for (let gx = 1; gx < w - 1; gx++) {
          if (!isShooterAlcove(maze, w, h, gx, gz) || rng() > density) continue;
          const c = cellCenter(ctx, gx, gz);
          const hBox = cell * (0.32 + rng() * 0.12);
          const box = new THREE.Mesh(new THREE.BoxGeometry(cell * 0.5, hBox, cell * 0.4), coverMat);
          box.position.set(c.x, hBox / 2, c.z);
          box.castShadow = true;
          group.add(box);
          pushLowCover(covers, group, c, cell, hBox, cell * 0.22, cell * 0.18);
        }
      }
    },
    ring_sparse: () => {
      for (let i = 0; i < Math.floor(w * h * 0.04 * density); i++) {
        const gx = 2 + Math.floor(rng() * Math.max(1, w - 4));
        const gz = 2 + Math.floor(rng() * Math.max(1, h - 4));
        if (!isShooterAlcove(maze, w, h, gx, gz)) continue;
        const c = cellCenter(ctx, gx, gz);
        const hBox = cell * 0.38;
        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(cell * 0.22, cell * 0.26, hBox, 6),
          coverMat
        );
        cyl.position.set(c.x, hBox / 2, c.z);
        group.add(cyl);
        pushLowCover(covers, group, c, cell, hBox, cell * 0.2, cell * 0.2);
      }
    },
    plaza_blocks: () => {
      for (let gz = 2; gz < h - 2; gz++) {
        for (let gx = 2; gx < w - 2; gx++) {
          if ((gx + gz) % 3 !== 0 || !isShooterAlcove(maze, w, h, gx, gz) || rng() > density) continue;
          const c = cellCenter(ctx, gx, gz);
          const hBox = cell * 0.36;
          const block = new THREE.Mesh(
            new THREE.BoxGeometry(cell * 0.62, hBox, cell * 0.38),
            lambertStud(0x777788, 0x555566, 0.22)
          );
          block.position.set(c.x, hBox / 2, c.z);
          group.add(block);
          pushLowCover(covers, group, c, cell, hBox, cell * 0.28, cell * 0.16);
        }
      }
    },
    shipping_rows: () => {
      for (let row = 0; row < Math.floor(h * 0.35); row++) {
        const gz = 2 + Math.floor((row / Math.max(1, h * 0.35)) * (h - 4));
        for (let col = 0; col < 3; col++) {
          const gx = 2 + col * Math.max(2, Math.floor((w - 4) / 3));
          if (!isShooterAlcove(maze, w, h, gx, gz)) continue;
          const c = cellCenter(ctx, gx, gz);
          const hBox = cell * 0.5;
          const crate = new THREE.Mesh(
            new THREE.BoxGeometry(cell * 0.85, hBox, cell * 0.42),
            lambertStud(0xcc4422, 0x882211, 0.25)
          );
          crate.position.set(c.x, hBox / 2, c.z);
          group.add(crate);
          pushLowCover(covers, group, c, cell, hBox, cell * 0.38, cell * 0.18);
        }
      }
    },
    cloud_pillars: () => {
      for (let i = 0; i < Math.floor(w * 0.8); i++) {
        const { gx, gz } = resolveSpot(ctx, { u: rng(), v: rng() });
        if (!isShooterAlcove(maze, w, h, gx, gz)) continue;
        const c = cellCenter(ctx, gx, gz);
        const hBox = cell * (0.45 + rng() * 0.2);
        const cloud = new THREE.Mesh(
          new THREE.SphereGeometry(cell * 0.28, 8, 6),
          lambertStud(0xaaddff, 0x66bbee, 0.4)
        );
        cloud.position.set(c.x, hBox * 0.55, c.z);
        group.add(cloud);
        pushLowCover(covers, group, c, cell, hBox * 0.5, cell * 0.2, cell * 0.2);
      }
    },
    sniper_rocks: () => {
      const spots = [
        { u: 0.15, v: 0.5 }, { u: 0.85, v: 0.5 },
        { u: 0.5, v: 0.15 }, { u: 0.5, v: 0.85 },
      ];
      for (const sp of spots) {
        const { gx, gz } = resolveSpot(ctx, sp);
        const c = cellCenter(ctx, gx, gz);
        const hBox = cell * 0.55;
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(cell * 0.32, 0),
          lambertStud(0x777788, 0x555566, 0.28)
        );
        rock.position.set(c.x, hBox / 2, c.z);
        group.add(rock);
        pushLowCover(covers, group, c, cell, hBox, cell * 0.26, cell * 0.26);
      }
    },
    paintball_field: () => modes.dense_crates(),
    dense_crates: () => {
      for (let gz = 2; gz < h - 2; gz++) {
        for (let gx = 2; gx < w - 2; gx++) {
          if (!isShooterAlcove(maze, w, h, gx, gz) || rng() > density + 0.15) continue;
          const c = cellCenter(ctx, gx, gz);
          const hBox = cell * 0.4;
          const crate = new THREE.Mesh(
            new THREE.BoxGeometry(cell * 0.55, hBox, cell * 0.55),
            lambertStud(0x889977, 0x556644, 0.22)
          );
          crate.position.set(c.x, hBox / 2, c.z);
          group.add(crate);
          pushLowCover(covers, group, c, cell, hBox, cell * 0.24, cell * 0.24);
        }
      }
    },
    grey_blocks: () => modes.wall_alley(),
    neon_pillars: () => {
      for (let i = 0; i < Math.floor(w * 0.5); i++) {
        const { gx, gz } = resolveSpot(ctx, { u: rng(), v: rng() });
        if (!isShooterAlcove(maze, w, h, gx, gz)) continue;
        const c = cellCenter(ctx, gx, gz);
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.5, cell * 0.6, 8),
          lambertStud(0xff66cc, 0xaa44ff, 0.48)
        );
        pillar.position.set(c.x, cell * 0.3, c.z);
        group.add(pillar);
        pushLowCover(covers, group, c, cell, cell * 0.55, cell * 0.2, cell * 0.2);
      }
    },
    stone_keep: () => modes.wall_alley(),
    minimal: () => { /* 開闊地圖少掩體 */ },
  };

  (modes[layout.coverMode] || modes.ring_sparse)();
  addLayoutProps(ctx, maze, group, level, layout, covers, cell, w, h);

  scene.add(group);
  return { group, style, covers, layoutId: level.shooterLayout };
}

function shooterPlayerLabel(p) {
  return p?.displayName || p?.charDef?.name || (p?.isAI ? "電腦" : "玩家");
}

/** 擊殺播報：你擊倒誰、或場上 A 擊倒 B */
export function getShooterKillAnnounce(killer, victim, human) {
  if (!killer || !victim || killer === victim) return null;
  const vName = shooterPlayerLabel(victim);
  if (killer === human) return `☠ 你擊倒了 ${vName}`;
  if (victim === human) return null;
  return `${shooterPlayerLabel(killer)} 擊倒 ${vName}`;
}

const BOT_VISION = { smg: 20, rifle: 26, shotgun: 14, sniper: 30, katana: 8 };

function botEyeY(bot) {
  return 1.52 + (bot._jumpY ?? 0) + (bot.elev ?? 0);
}

function botTargetHeadY(target) {
  return 1.05 + (target._jumpY ?? 0) + (target.elev ?? 0);
}

function botCanSeeTarget(bot, other, ctx, maze, state) {
  const bd = Math.hypot(other.pos.x - bot.pos.x, other.pos.z - bot.pos.z);
  const wId = getShooterWeapon(bot.weaponId).id;
  const maxD = BOT_VISION[wId] ?? 22;
  if (bd > maxD || bd < 0.6) return false;
  return !shooterRayBlocked(
    ctx, maze,
    bot.pos.x, bot.pos.z, botEyeY(bot),
    other.pos.x, botTargetHeadY(other), other.pos.z,
    state?.coverState
  );
}

function pickShooterBotTarget(bot, players, style, state, ctx, maze) {
  const moleMode = isShooterMoleMode(state) || style === "mole";

  if (bot.isMole && moleMode && state?.moleCanShoot) {
    let bestMate = null;
    let bestScore = Infinity;
    for (const other of players) {
      if (other === bot || !isSameShooterTeam(bot, other) || !isShooterCombatActive(other)) continue;
      const d = Math.hypot(other.pos.x - bot.pos.x, other.pos.z - bot.pos.z);
      let witnesses = 0;
      for (const w of players) {
        if (w === bot || w === other || !isShooterCombatActive(w)) continue;
        if (isSameShooterTeam(w, bot)) continue;
        if (Math.hypot(w.pos.x - bot.pos.x, w.pos.z - bot.pos.z) < 16) witnesses += 1;
      }
      const score = d + witnesses * 30;
      if (score < bestScore) {
        bestScore = score;
        bestMate = other;
      }
    }
    if (bestMate && bestScore < 24 && botCanSeeTarget(bot, bestMate, ctx, maze)) return bestMate;
  }

  let target = null;
  let best = Infinity;
  for (const other of players) {
    if (!isShooterEnemy(bot, other, style, state)) continue;
    if (!isShooterCombatActive(other)) continue;
    if (!botCanSeeTarget(bot, other, ctx, maze, state)) continue;
    const d = Math.hypot(other.pos.x - bot.pos.x, other.pos.z - bot.pos.z);
    const bias = other.isAI ? 0 : -12;
    const score = d + bias;
    if (score < best) {
      best = score;
      target = other;
    }
  }
  return target;
}

function pickShooterRoamCell(ctx, maze, bot, players) {
  const { w, h } = ctx;
  let best = null;
  let bestScore = -Infinity;
  for (let t = 0; t < 24; t++) {
    const gx = 1 + Math.floor(Math.random() * Math.max(1, w - 2));
    const gz = 1 + Math.floor(Math.random() * Math.max(1, h - 2));
    const c = cellCenter(ctx, gx, gz);
    let minEnemy = Infinity;
    for (const p of players) {
      if (p === bot || p._shooterDowned || p._awaitingRespawn || (p.hp ?? 0) <= 0) continue;
      const d = Math.hypot(p.pos.x - c.x, p.pos.z - c.z);
      if (d < minEnemy) minEnemy = d;
    }
    const selfD = Math.hypot(bot.pos.x - c.x, bot.pos.z - c.z);
    const huntDist = minEnemy < 999 ? minEnemy : 18;
    const score = -Math.abs(huntDist - 15) * 2 + selfD * 0.15 + Math.random() * 2;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best || cellCenter(ctx, Math.floor(w / 2), Math.floor(h / 2));
}

function dirToward(bot, tx, tz) {
  const dx = tx - bot.pos.x;
  const dz = tz - bot.pos.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len, len };
}

function smoothBotYaw(bot, targetYaw, dt, rate = 5.5) {
  const cur = bot.yaw ?? 0;
  let d = targetYaw - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) < 0.04) bot.yaw = targetYaw;
  else bot.yaw = cur + d * Math.min(1, dt * rate);
}

export function updateShooterBots(dt, players, ctx, maze, state, api) {
  const style = state.playStyle ?? "teams";
  const moleMode = isShooterMoleMode(state) || style === "mole";
  const warmupUntil = state.aiWarmupUntil ?? 10;
  const inWarmup = api.elapsed < warmupUntil;
  for (const bot of players) {
    if (!bot.isAI || bot._shooterDowned || bot._awaitingRespawn || (bot.hp ?? 0) <= 0) continue;
    if (bot._respawnUntil > api.elapsed) continue;

    if (inWarmup) {
      const roam = pickShooterRoamCell(ctx, maze, bot, players);
      const step = bfsNextStep(ctx, maze, bot.pos.x, bot.pos.z, roam.x, roam.z) || roam;
      const d = dirToward(bot, step.x, step.z);
      bot.yaw = Math.atan2(d.x, d.z);
      api.moveEntity(bot, dt, { x: d.x * 0.85, z: d.z * 0.85, sprint: Math.random() < 0.12 });
      if (d.len < 1.2) bot._shooterHuntRefresh = 0;
      continue;
    }

    const lx = bot._shooterLastX ?? bot.pos.x;
    const lz = bot._shooterLastZ ?? bot.pos.z;
    if (Math.hypot(bot.pos.x - lx, bot.pos.z - lz) > 0.4) bot._shooterStuckT = 0;
    else bot._shooterStuckT = (bot._shooterStuckT ?? 0) + dt;
    bot._shooterLastX = bot.pos.x;
    bot._shooterLastZ = bot.pos.z;

    let target = pickShooterBotTarget(bot, players, style, state, ctx, maze);
    if (!target) {
      if ((bot._shooterPatrolUntil ?? 0) <= api.elapsed) {
        bot._shooterPatrolUntil = api.elapsed + 1.8 + Math.random() * 1.6;
        bot._shooterPatrol = pickShooterRoamCell(ctx, maze, bot, players);
      }
      const patrol = bot._shooterPatrol || pickShooterRoamCell(ctx, maze, bot, players);
      const step = bfsNextStep(ctx, maze, bot.pos.x, bot.pos.z, patrol.x, patrol.z) || patrol;
      const d = dirToward(bot, step.x, step.z);
      if (Math.hypot(d.x, d.z) > 0.1) smoothBotYaw(bot, Math.atan2(d.x, d.z), dt, 5);
      api.moveEntity(bot, dt, { x: d.x * 0.92, z: d.z * 0.92, sprint: Math.random() < 0.35 });
      if (d.len < 1.1) bot._shooterPatrolUntil = api.elapsed;
      continue;
    }

    const wId = getShooterWeapon(bot.weaponId).id;
    const ideal = { smg: 12, rifle: 18, shotgun: 8, sniper: 26, katana: 3.1 }[wId] ?? 15;
    const minR = ideal * 0.55;
    const maxR = ideal * 1.22;
    const bd = Math.hypot(target.pos.x - bot.pos.x, target.pos.z - bot.pos.z);
    const yawTo = Math.atan2(target.pos.x - bot.pos.x, target.pos.z - bot.pos.z);

    const fwd = { x: Math.sin(yawTo), z: Math.cos(yawTo) };
    const right = { x: Math.cos(yawTo), z: -Math.sin(yawTo) };
    let mx = 0;
    let mz = 0;
    let sprint = false;

    const huntRefresh = (bot._shooterHuntRefresh ?? 0) <= api.elapsed;
    if (huntRefresh) {
      bot._shooterHuntRefresh = api.elapsed + 0.45 + Math.random() * 0.25;
      bot._shooterPathStep = bfsNextStep(ctx, maze, bot.pos.x, bot.pos.z, target.pos.x, target.pos.z);
      if (!bot._shooterPathStep && bd > 8) {
        const roam = pickShooterRoamCell(ctx, maze, bot, players);
        bot._shooterPathStep = bfsNextStep(ctx, maze, bot.pos.x, bot.pos.z, roam.x, roam.z)
          || roam;
      }
    }

    const inCombat = bd <= maxR + 2;
    const needHunt = bd > maxR + 1 || (bd > ideal * 1.35 && !inCombat);

    if (needHunt || (bot._shooterStuckT ?? 0) > 1.2) {
      if ((bot._shooterStuckT ?? 0) > 1.2) {
        bot._shooterWallTurn = ((bot._shooterWallTurn ?? 0) + 1) % 4;
        const escapeYaw = (bot.yaw ?? 0) + bot._shooterWallTurn * (Math.PI / 2);
        bot._shooterPathStep = {
          x: bot.pos.x + Math.sin(escapeYaw) * 3,
          z: bot.pos.z + Math.cos(escapeYaw) * 3,
        };
        bot._shooterStuckT = 0;
        bot._shooterHuntRefresh = api.elapsed + 0.35;
      }
      const step = bot._shooterPathStep;
      if (step) {
        const d = dirToward(bot, step.x, step.z);
        mx = d.x * 0.9;
        mz = d.z * 0.9;
        if (Math.hypot(mx, mz) > 0.12) smoothBotYaw(bot, Math.atan2(mx, mz), dt, 6);
        sprint = bd > ideal * 1.5 || bd > 22;
        if (d.len < 1.05) bot._shooterHuntRefresh = api.elapsed + 0.35;
      } else {
        const d = dirToward(bot, target.pos.x, target.pos.z);
        mx = d.x * 0.75;
        mz = d.z * 0.75;
        sprint = bd > 18;
      }
    } else if (bd < minR) {
      const back = 0.82;
      const strafe = Math.sin(api.elapsed * 3.1 + bot.pos.x * 0.2) > 0 ? 1 : -1;
      mx = -fwd.x * back + right.x * strafe * 0.55;
      mz = -fwd.z * back + right.z * strafe * 0.55;
      sprint = bd < minR * 0.65;
    } else {
      const strafe = Math.sin(api.elapsed * 2.6 + bot.pos.z * 0.15) > 0 ? 1 : -1;
      const press = bd > ideal * 1.05 ? 0.62 : 0.38;
      mx = fwd.x * press + right.x * strafe * 0.8;
      mz = fwd.z * press + right.z * strafe * 0.8;
      sprint = bd > ideal * 0.85 || Math.random() < 0.07;
      if (Math.random() < 0.01 && (bot.onGround || (bot._jumpY ?? 0) <= 0.1)) {
        bot.velY = 13 + Math.random() * 5;
        bot.onGround = false;
      }
    }

    if (Math.hypot(mx, mz) > 0.08) {
      smoothBotYaw(bot, Math.atan2(mx, mz), dt, 4.2);
    } else if (inCombat) {
      smoothBotYaw(bot, yawTo, dt, 4.5);
    }
    const preX = bot.pos.x;
    const preZ = bot.pos.z;
    api.moveEntity(bot, dt, { x: mx, z: mz, sprint });
    const moved = Math.hypot(bot.pos.x - preX, bot.pos.z - preZ);
    if (Math.hypot(mx, mz) > 0.2 && moved < 0.05) {
      bot._shooterStuckT = (bot._shooterStuckT ?? 0) + dt * 1.3;
      if ((bot._shooterStuckT ?? 0) > 1.4) {
        const escapeYaw = (bot.yaw ?? 0) + (Math.random() > 0.5 ? 1 : -1) * (Math.PI * 0.5);
        api.moveEntity(bot, dt, {
          x: Math.sin(escapeYaw) * 1.05,
          z: Math.cos(escapeYaw) * 1.05,
          sprint: true,
        });
        if ((bot.onGround || (bot._jumpY ?? 0) <= 0.08) && Math.random() < 0.75) {
          bot.velY = 14.5;
          bot.onGround = false;
        }
        bot._shooterHuntRefresh = 0;
      }
    }

    const visionMax = BOT_VISION[wId] ?? 22;
    const inRange = bd >= minR * 0.65 && bd <= Math.min(maxR * 1.15, visionMax);
    const hasLos = botCanSeeTarget(bot, target, ctx, maze, state);
    const wantShoot = inRange && hasLos;
    const moleSnipe = bot.isMole && moleMode && state?.moleCanShoot && isSameShooterTeam(bot, target);
    const fireDelay = moleSnipe ? 0.55 : wId === "sniper" ? 0.45 : wId === "katana" ? 0.2 : 0.28;
    if (wantShoot && canShooterFire(bot, api.elapsed, state)) {
      const readyAt = bot._nextShotReady ?? 0;
      if (api.elapsed >= readyAt) {
        smoothBotYaw(bot, yawTo, dt, 10);
        api.fire(bot, yawTo);
        muzzleFlash(bot);
        const baseCd = (bot._shooterFireCd ?? 0.28) + fireDelay;
        bot._shootCd = api.elapsed + baseCd * (0.85 + Math.random() * 0.45);
        bot._nextShotReady = bot._shootCd + 0.15 + Math.random() * 0.35;
      }
    }
  }
}
/** 時間結束：依擊殺積分排名；teams 比隊伍總分，ffa 僅個人排名 */
export function buildShooterEndResults(players, human, playStyle = "teams") {
  const ranked = [...players]
    .filter((p) => p)
    .sort((a, b) => {
      const ak = a._shooterStats?.kills ?? 0;
      const bk = b._shooterStats?.kills ?? 0;
      if (bk !== ak) return bk - ak;
      return (a._shooterStats?.deaths ?? 0) - (b._shooterStats?.deaths ?? 0);
    });
  const teamKills = [0, 0];
  for (const p of ranked) {
    if (p.teamId >= 0) teamKills[p.teamId] += p._shooterStats?.kills ?? 0;
  }

  const humanRank = human ? ranked.indexOf(human) + 1 : 0;
  const humanKills = human?._shooterStats?.kills ?? 0;
  const top = ranked[0];
  const topKills = top?._shooterStats?.kills ?? 0;

  const lineFor = (p, i) => {
    const st = p._shooterStats || { kills: 0, deaths: 0 };
    const tag = playStyle === "ffa"
      ? "混戰"
      : SHOOTER_TEAMS[p.teamId ?? 0]?.name ?? "?";
    return `${i + 1}. ${p.charDef?.name || "?"}（${tag}）${st.kills} 分`;
  };
  const lines = ranked.map(lineFor);

  if (playStyle === "ffa") {
    const youWon = human && human === top;
    const shortTitle = `${top?.charDef?.name || "—"} 奪冠`;
    const shortSub = `積分 ${topKills} · 你第 ${humanRank} 名（${humanKills} 分）`;
    return {
      won: youWon,
      msg: shortSub,
      shortTitle,
      shortSub,
      ranked,
      teamWin: null,
      humanRank,
      playStyle,
      teamKills,
    };
  }

  let teamWin = null;
  if (teamKills[0] !== teamKills[1]) teamWin = teamKills[0] > teamKills[1] ? 0 : 1;

  if (teamWin != null) {
    const wonTeam = SHOOTER_TEAMS[teamWin];
    const youWin = human && (human.teamId ?? 0) === teamWin;
    const shortTitle = `${wonTeam.name} 獲勝`;
    const shortSub = `紅 ${teamKills[0]} · 藍 ${teamKills[1]}${youWin ? " · 你在勝利隊" : ""}`;
    return {
      won: !!youWin,
      msg: shortSub,
      shortTitle,
      shortSub,
      ranked,
      teamWin,
      humanRank,
      playStyle,
      teamKills,
    };
  }

  const youWon = human && human === top;
  const shortTitle = "平手";
  const shortSub = `最高 ${topKills} 分 · 你第 ${humanRank} 名`;
  return {
    won: youWon,
    msg: shortSub,
    shortTitle,
    shortSub,
    ranked,
    teamWin: null,
    humanRank,
    playStyle,
    teamKills,
  };
}

export function onShooterDowned(killer, victim, state, elapsed, spawnHeal) {
  if (killer && killer !== victim) {
    killer._shooterStats = killer._shooterStats || { kills: 0, deaths: 0 };
    killer._shooterStats.kills += 1;
  }
  if (victim) {
    victim._shooterStats = victim._shooterStats || { kills: 0, deaths: 0 };
    victim._shooterStats.deaths += 1;
  }
  if (!killer?.isAI) state.humanKills = (state.humanKills || 0) + 1;
  else if (killer?.isAI && !victim?.isAI) state.botKills = (state.botKills || 0) + 1;

  victim.hp = 0;
  victim.caught = false;
  victim.vel = { x: 0, z: 0 };
  victim.velY = 0;
  victim._shooterDowned = true;
  victim._shooterDownedAt = elapsed;
  victim._shooterDownedYaw = victim.yaw ?? 0;
  victim._shooterBodyHideAt = victim.isAI ? elapsed + 5.5 : null;
  victim._respawnUntil = 0;

  if (victim.mesh) {
    victim.mesh.visible = true;
    victim.mesh.rotation.x = 0;
  }

  if (!victim.isAI) {
    victim._awaitingRespawn = true;
  } else {
    victim._awaitingRespawn = false;
    victim._autoRespawnAt = elapsed + 3.0;
  }

  if (typeof spawnHeal === "function") {
    spawnHeal(victim.pos.x, victim.pos.z);
  }
  if (!victim.isAI) {
    return `${killer?.charDef?.name || "敵人"} 擊倒了你 · 按「重生」復活`;
  }
  return null;
}

export function tickShooterRespawns(players, ctx, maze, elapsed) {
  for (const p of players) {
    tickShooterDownedPose(p, elapsed);
    if (p._awaitingRespawn) continue;
    if (p._autoRespawnAt && elapsed >= p._autoRespawnAt) {
      clearShooterDownedState(p);
      respawnShooterPlayer(p, ctx, maze, players);
    }
  }
}
