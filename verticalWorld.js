import * as THREE from "three";
import { cellCenter } from "./maze.js";
import { lambertStud } from "./mapTextures.js";

const FLOOR_H = 5.5;
const FLOOR_H2 = 11;
const FLOOR_H3 = 16.5;

function insideAabb(px, pz, x, z, halfW, halfD) {
  return Math.abs(px - x) <= halfW && Math.abs(pz - z) <= halfD;
}

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + dx * t;
  const qz = az + dz * t;
  return { t, dist: Math.hypot(px - qx, pz - qz), qx, qz };
}

function tierY(tier) {
  if (tier >= 3) return FLOOR_H3;
  if (tier === 2) return FLOOR_H2;
  if (tier === 1) return FLOOR_H;
  return 0;
}

function canLandOnPlatform(pl, footElev, jumpY) {
  if (pl.standable || pl.y < 2.2) {
    const foot = (footElev ?? 0) + (jumpY ?? 0);
    return foot >= (pl.y ?? 0) - 0.65 || (jumpY ?? 0) > 0.18;
  }
  if (pl.minApproach == null) return true;
  const foot = (footElev ?? 0) + (jumpY ?? 0);
  return foot >= pl.minApproach - 0.45 || (jumpY ?? 0) > 0.35;
}

function sampleLadderElev(px, pz, footElev, jumpY, lad) {
  if (!insideAabb(px, pz, lad.x, lad.z, lad.halfW, lad.halfD)) return null;
  const foot = (footElev ?? 0) + (jumpY ?? 0);
  if (foot < 0.8 && (jumpY ?? 0) < 0.25) return lad.y0 ?? 0;
  return Math.min(lad.y1, Math.max(lad.y0 ?? 0, foot));
}

/** 依位置取腳下樓層高度（可走平面 / 斜坡 / 天橋 / 長梯） */
export function sampleFloorElev(px, pz, state, player = null) {
  if (!state) return 0;
  const footElev = player?.elev ?? 0;
  const jumpY = player?._jumpY ?? 0;
  let best = 0;
  for (const st of state.stairs || []) {
    const seg = distToSegment(px, pz, st.ax, st.az, st.bx, st.bz);
    if (seg.dist <= st.halfW) {
      const y = st.ay + (st.by - st.ay) * seg.t;
      if (y >= best) best = y;
    }
  }
  for (const lad of state.ladders || []) {
    const ly = sampleLadderElev(px, pz, footElev, jumpY, lad);
    if (ly != null && ly >= best) best = ly;
  }
  for (const br of state.bridges || []) {
    if (insideAabb(px, pz, br.x, br.z, br.halfW, br.halfD) && br.y >= best) {
      if (!br.minApproach || canLandOnPlatform(br, footElev, jumpY)) best = br.y;
    }
  }
  for (const pl of state.platforms || []) {
    if (!insideAabb(px, pz, pl.x, pl.z, pl.halfW, pl.halfD)) continue;
    if (!canLandOnPlatform(pl, footElev, jumpY)) continue;
    if (pl.y >= best) best = pl.y;
  }
  return best;
}

export function buildVerticalWorld(ctx, maze, scene, level = {}) {
  if (level.flatPlay || level.category === "shooter") {
    return { group: new THREE.Group(), platforms: [], stairs: [], bridges: [], bouncePads: [] };
  }
  const { w, h, cell, theme: th } = ctx;
  const density = level.verticalDensity ?? (w >= 23 ? 4 : 5);
  const group = new THREE.Group();
  group.name = "verticalWorld";
  const platforms = [];
  const stairs = [];
  const bridges = [];
  const bouncePads = [];
  const usedPad = new Set(["0,0", `${w - 1},${h - 1}`]);

  const deckColors = [0x44ccff, 0xffcc44, 0xff66aa, 0x66ff99, 0xaa88ff];
  const railMat = new THREE.MeshBasicMaterial({
    color: th.deco || 0x66ccff,
    transparent: true,
    opacity: 0.85,
  });

  const isOpen = (gx, gz) => gx >= 0 && gz >= 0 && gx < w && gz < h;
  const cellOpen = (gx, gz, nx, nz) => {
    if (!isOpen(gx, gz) || !isOpen(nx, nz)) return false;
    const c = maze?.[gz]?.[gx];
    if (!c) return false;
    if (nx === gx + 1) return !c.right;
    if (nx === gx - 1) return !c.left;
    if (nz === gz + 1) return !c.bottom;
    if (nz === gz - 1) return !c.top;
    return false;
  };

  const addPlatform = (gx, gz, tier) => {
    if (!isOpen(gx, gz)) return null;
    if ((gx <= 1 && gz <= 1) || (gx >= w - 2 && gz >= h - 2)) return null;
    const c = cellCenter(ctx, gx, gz);
    const y = tierY(tier);
    if (y <= 0) return null;
    const col = deckColors[(gx + gz + tier) % deckColors.length];
    const half = cell * 0.58;
    const pl = { x: c.x, z: c.z, halfW: half, halfD: half, y, gx, gz, tier };
    platforms.push(pl);

    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(cell * 0.78, y, cell * 0.78),
      lambertStud((col & 0xfefefe) >> 1, col, 0.2)
    );
    pillar.position.set(c.x, y / 2, c.z);
    group.add(pillar);

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(cell * 0.92, 0.32, cell * 0.92),
      lambertStud(col, col, 0.4)
    );
    deck.position.set(c.x, y, c.z);
    group.add(deck);

    const railH = 0.65;
    for (const [ox, oz] of [[0, half], [0, -half], [half, 0], [-half, 0]]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(ox ? cell * 0.9 : 0.12, railH, oz ? cell * 0.9 : 0.12),
        railMat
      );
      rail.position.set(c.x + ox, y + railH / 2 + 0.16, c.z + oz);
      group.add(rail);
    }
    return pl;
  };

  const addRamp = (fromGx, fromGz, toGx, toGz, fromY, toY) => {
    const fc = cellCenter(ctx, fromGx, fromGz);
    const tc = cellCenter(ctx, toGx, toGz);
    stairs.push({
      ax: fc.x, az: fc.z, ay: fromY,
      bx: tc.x, bz: tc.z, by: toY,
      halfW: cell * 0.48,
    });
    const steps = 8;
    const stepMat = lambertStud(0xccb8e8, 0x8866aa, 0.25);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const sx = fc.x + (tc.x - fc.x) * t;
      const sz = fc.z + (tc.z - fc.z) * t;
      const sy = fromY + (toY - fromY) * t;
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(cell * 0.36, 0.22, cell * 0.58),
        stepMat
      );
      step.position.set(sx, sy + 0.11, sz);
      group.add(step);
    }
  };

  const addBridge = (gx, gz, nx, nz, y) => {
    const c0 = cellCenter(ctx, gx, gz);
    const c1 = cellCenter(ctx, nx, nz);
    const mx = (c0.x + c1.x) / 2;
    const mz = (c0.z + c1.z) / 2;
    const len = Math.hypot(c1.x - c0.x, c1.z - c0.z);
    const halfW = cell * 0.32;
    const halfD = len / 2 + cell * 0.08;
    bridges.push({ x: mx, z: mz, halfW, halfD, y });
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.abs(c1.x - c0.x) > 0.5 ? len : cell * 0.55,
        0.2,
        Math.abs(c1.z - c0.z) > 0.5 ? len : cell * 0.55
      ),
      lambertStud(0x88ddff, 0x4488cc, 0.3)
    );
    bridge.position.set(mx, y + 0.1, mz);
    if (Math.abs(c1.x - c0.x) > Math.abs(c1.z - c0.z)) bridge.rotation.y = Math.PI / 2;
    group.add(bridge);
  };

  const realmTier = level.realmTier ?? 0;
  if (realmTier >= 1) {
    for (let gz = 2; gz < h - 2; gz++) {
      for (let gx = 2; gx < w - 2; gx++) {
        if ((gx * 5 + gz * 11 + realmTier) % 19 !== 0) continue;
        addPlatform(gx, gz, realmTier >= 2 ? 3 : 2);
      }
    }
  }

  for (let gz = 1; gz < h - 1; gz++) {
    for (let gx = 1; gx < w - 1; gx++) {
      if ((gx * 2 + gz * 3) % density !== 0) continue;
      let tier = 1 + ((gx + gz) % 3);
      if (w >= 19 && (gx + gz) % 7 === 0) tier = 3;
      else if ((gx + gz) % 5 === 0) tier = 2;
      const pl = addPlatform(gx, gz, tier);
      if (!pl) continue;
      const py = pl.y;
      const neighbors = [[gx - 1, gz], [gx + 1, gz], [gx, gz - 1], [gx, gz + 1]];
      let ramped = false;
      for (const [nx, nz] of neighbors) {
        if (!cellOpen(gx, gz, nx, nz)) continue;
        const lower = platforms.find((p) => p.gx === nx && p.gz === nz);
        if (lower && lower.y < py - 0.5) {
          addBridge(gx, gz, nx, nz, Math.max(py, lower.y));
        } else if (!ramped) {
          addRamp(nx, nz, gx, gz, lower?.y ?? 0, py);
          ramped = true;
        }
      }
    }
  }

  const passages = [];
  for (let gz = 0; gz < h; gz++) {
    for (let gx = 0; gx < w; gx++) {
      const c = maze?.[gz]?.[gx];
      if (!c) continue;
      if (gx < w - 1 && !c.right) {
        passages.push({ gx, gz, x: cellCenter(ctx, gx, gz).x + cell * 0.5, z: cellCenter(ctx, gx, gz).z, dir: "r" });
      }
      if (gz < h - 1 && !c.bottom) {
        passages.push({ gx, gz, x: cellCenter(ctx, gx, gz).x, z: cellCenter(ctx, gx, gz).z + cell * 0.5, dir: "d" });
      }
    }
  }

  const padMax = Math.min(level.bouncePads ?? 6, 12);
  for (let i = 0; i < padMax && passages.length; i++) {
    for (let t = 0; t < 60; t++) {
      const p = passages[Math.floor(Math.random() * passages.length)];
      const k = `${p.gx},${p.gz},${p.dir}`;
      if (usedPad.has(k)) continue;
      usedPad.add(k);
      let tgx = p.gx;
      let tgz = p.gz;
      if (p.dir === "r") tgx += 1;
      else tgz += 1;
      if (!isOpen(tgx, tgz)) continue;
      const fromPlat = platforms.find((pl) => pl.gx === p.gx && pl.gz === p.gz);
      const startElev = fromPlat?.y ?? 0;
      const pad = addRivalsBouncePad(group, p.x, p.z, startElev);
      bouncePads.push({
        x: p.x,
        z: p.z,
        startElev,
        launchVy: 27,
        halfW: 1.42,
        halfD: 1.42,
        ...pad,
      });
      break;
    }
  }

  for (const pl of platforms) {
    if (pl.y < 1) continue;
    let hasDescent = false;
    for (const st of stairs) {
      if (Math.hypot(st.ax - pl.x, st.az - pl.z) < cell * 1.2) hasDescent = true;
      if (Math.hypot(st.bx - pl.x, st.bz - pl.z) < cell * 1.2) hasDescent = true;
    }
    if (hasDescent) continue;
    const neighbors = [[pl.gx - 1, pl.gz], [pl.gx + 1, pl.gz], [pl.gx, pl.gz - 1], [pl.gx, pl.gz + 1]];
    for (const [nx, nz] of neighbors) {
      if (!cellOpen(pl.gx, pl.gz, nx, nz)) continue;
      const lower = platforms.find((p) => p.gx === nx && p.gz === nz);
      const fromY = lower?.y ?? 0;
      if (fromY < pl.y - 0.3) {
        addRamp(nx, nz, pl.gx, pl.gz, fromY, pl.y);
        hasDescent = true;
        break;
      }
    }
    if (!hasDescent) {
      for (const [nx, nz] of neighbors) {
        if (!isOpen(nx, nz)) continue;
        addRamp(nx, nz, pl.gx, pl.gz, 0, pl.y);
        break;
      }
    }
  }

  scene.add(group);
  return { group, platforms, stairs, bridges, bouncePads };
}

/** Rivals 風格彈跳板模型（大方塊 + 青色發光核心） */
export function addRivalsBouncePad(group, x, z, floorY = 0) {
  const padRoot = new THREE.Group();
  padRoot.position.set(x, floorY + 0.1, z);

  const frameMat = lambertStud(0xe8ecef, 0xd0d8e0, 0.12);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x33eeff, transparent: true, opacity: 0.92 });
  const trimMat = lambertStud(0x9aa8b8, 0x667788, 0.2);

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.22, 2.85), frameMat);
  base.position.y = 0.11;
  padRoot.add(base);

  const core = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 1.35), glowMat);
  core.position.y = 0.28;
  padRoot.add(core);

  const corner = 1.18;
  for (const [cx, cz] of [[-corner, -corner], [corner, -corner], [-corner, corner], [corner, corner]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), trimMat);
    c.position.set(cx, 0.2, cz);
    padRoot.add(c);
  }
  for (let i = 0; i < 4; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 0.22), glowMat);
    strip.position.set(i < 2 ? 0 : 0, 0.24, i % 2 === 0 ? -0.95 : 0.95);
    if (i >= 2) strip.rotation.y = Math.PI / 2;
    padRoot.add(strip);
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 1.25, 4),
    new THREE.MeshBasicMaterial({ color: 0x66ffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.31;
  padRoot.add(ring);

  group.add(padRoot);
  return { mesh: padRoot, core, ring };
}

/** 垂直彈射：約 4～5 層樓高，空中可用移動鍵調整落點 */
export function launchRivalsBounce(p, pad) {
  p._bounceArc = null;
  const vy = pad.launchVy ?? 27;
  p.velY = vy;
  p._jumpY = 0.35;
  p.onGround = false;
  p._bounceAirTime = 4.2;
  p._bounceCd = 1.1;
  p._wasInAir = true;
  p._suppressLandSfx = 0.45;
  const hs = (pad.launchSpeed ?? 16) * (pad.launchPower ?? 1);
  if (pad.launchDx != null && pad.launchDz != null) {
    p.vel.x = pad.launchDx * hs;
    p.vel.z = pad.launchDz * hs;
  }
}

export function tickBounceArc(p, dt) {
  if (p._bounceArc) {
    p._bounceArc = null;
  }
  return false;
}

export function getBounceAirControlMult(p) {
  if ((p._bounceAirTime ?? 0) <= 0) return 1;
  return 1.55;
}

export function tickBounceAirTime(p, dt) {
  if ((p._bounceAirTime ?? 0) > 0) {
    p._bounceAirTime = Math.max(0, p._bounceAirTime - dt);
  }
}

export function updateVerticalPhysics(p, dt, verticalState) {
  if (!p || p.caught) return;
  tickBounceArc(p, dt);
  tickBounceAirTime(p, dt);

  if (p.elev == null) p.elev = 0;
  if (p._jumpY == null) p._jumpY = 0;

  const airBoost = (p._bounceAirTime ?? 0) > 0;
  const grav = airBoost
    ? (p.role === "killer" ? 24 : p._shooterSpeedMult != null ? 28 : 20)
    : (p.role === "killer" ? 32 : (p._shooterSpeedMult != null ? 36 : 26));
  if (!p.onGround) {
    p.velY = (p.velY ?? 0) - grav * dt;
    p._jumpY += p.velY * dt;
  }

  const footY = p.elev + p._jumpY;
  const groundElev = sampleFloorElev(p.pos.x, p.pos.z, verticalState, p);

  const rise = groundElev - (p.elev ?? 0);
  const landSnap = rise > 0.35 ? 0.95 : 0.62;
  if (p.velY <= 0 && footY <= groundElev + landSnap) {
    p.elev = groundElev;
    p._jumpY = 0;
    p.velY = 0;
    p.onGround = true;
  } else if (footY < groundElev - 14) {
    p.elev = groundElev;
    p._jumpY = 0;
    p.velY = 0;
    p.onGround = true;
  } else if (p.onGround && groundElev < p.elev - 0.2) {
    const drop = p.elev - groundElev;
    if (drop <= 6) {
      p.elev += (groundElev - p.elev) * Math.min(1, dt * 14);
      p._jumpY = 0;
      p.velY = 0;
      p.onGround = true;
    } else {
      p.onGround = false;
      p.velY = -2;
    }
  } else if (p.onGround && groundElev > p.elev + 0.2) {
    p.elev = groundElev;
    p._jumpY = 0;
    p.onGround = true;
  } else if (p._jumpY > 0.12 || p.velY > 0.9) {
    p.onGround = false;
  } else if (p.onGround) {
    p.elev += (groundElev - p.elev) * Math.min(1, dt * 12);
  }
}

export function updateBouncePads(bouncePads, players, verticalState, dt, onLaunch) {
  if (!bouncePads?.length) return;
  for (const p of players) {
    if (!p || p.caught) continue;
    if ((p._bounceCd ?? 0) > 0) {
      p._bounceCd -= dt;
      continue;
    }
    for (const pad of bouncePads) {
      const hw = pad.halfW ?? 1.42;
      const hd = pad.halfD ?? 1.42;
      if (!insideAabb(p.pos.x, p.pos.z, pad.x, pad.z, hw, hd)) continue;
      launchRivalsBounce(p, pad);
      if (pad.mesh) pad.mesh.scale.set(1.08, 0.72, 1.08);
      onLaunch?.(p, pad);
      break;
    }
  }
  for (const pad of bouncePads) {
    if (pad.mesh) pad.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.14);
    if (pad.core) pad.core.material.opacity = 0.82 + Math.sin(performance.now() * 0.006) * 0.12;
  }
}

/** 槍戰／平面關卡也可放彈跳板 */
export function spawnArenaBouncePads(ctx, maze, group, count = 4, floorY = 0) {
  const pads = [];
  const { w, h } = ctx;
  for (let i = 0; i < count; i++) {
    for (let t = 0; t < 40; t++) {
      const gx = 2 + Math.floor(Math.random() * Math.max(1, w - 4));
      const gz = 2 + Math.floor(Math.random() * Math.max(1, h - 4));
      if (maze[gz][gx].wall) continue;
      const c = cellCenter(ctx, gx, gz);
      const vis = addRivalsBouncePad(group, c.x, c.z, floorY);
      pads.push({
        x: c.x,
        z: c.z,
        startElev: floorY,
        launchVy: 27,
        halfW: 1.42,
        halfD: 1.42,
        ...vis,
      });
      break;
    }
  }
  return pads;
}

export function worldHeight(p) {
  return (p?.elev ?? 0) + (p?._jumpY ?? 0);
}
