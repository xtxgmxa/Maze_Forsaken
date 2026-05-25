import * as THREE from "three";
import { plasticPBR, wallPBR } from "./mapTextures.js";

const WALL_H = 4;
const WALL_THICK = 0.38;

export function createSeededRandom(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function generateMaze(w, h, rng = Math.random) {
  const grid = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({
      top: true, right: true, bottom: true, left: true, visited: false,
    }))
  );
  const stack = [[0, 0]];
  grid[0][0].visited = true;
  const dirs = [[0, -1], [1, 0], [-1, 0], [0, 1]];
  const wallPair = [["top", "bottom"], ["right", "left"], ["left", "right"], ["bottom", "top"]];
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors = [];
    dirs.forEach(([dx, dy], i) => {
      const nx = cx + dx, ny = cy + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && !grid[ny][nx].visited)
        neighbors.push([nx, ny, i]);
    });
    if (!neighbors.length) { stack.pop(); continue; }
    const [nx, ny, di] = neighbors[Math.floor(rng() * neighbors.length)];
    const [a, b] = wallPair[di];
    grid[cy][cx][a] = false;
    grid[ny][nx][b] = false;
    grid[ny][nx].visited = true;
    stack.push([nx, ny]);
  }
  return grid;
}

export function generateMazeSeeded(w, h, seed) {
  return generateMaze(w, h, createSeededRandom(seed));
}

/** 打通額外牆 → 環路、多條路線 */
export function addMazeLoops(maze, w, h, extraPassages, rng = Math.random) {
  let added = 0;
  let tries = 0;
  while (added < extraPassages && tries < extraPassages * 40) {
    tries++;
    const gx = Math.floor(rng() * w);
    const gz = Math.floor(rng() * h);
    const cell = maze[gz][gx];
    const opts = [];
    if (cell.right && gx < w - 1) opts.push("right");
    if (cell.bottom && gz < h - 1) opts.push("bottom");
    if (!opts.length) continue;
    const pick = opts[Math.floor(rng() * opts.length)];
    if (pick === "right") {
      cell.right = false;
      maze[gz][gx + 1].left = false;
    } else {
      cell.bottom = false;
      maze[gz + 1][gx].top = false;
    }
    added++;
  }
}

/** 依地圖風格改造迷宮 — 讓各關視覺/路線明顯不同 */
export function applyMapStyle(maze, w, h, style, rng = Math.random) {
  const openSide = (gx, gz, side) => {
    if (gx < 0 || gz < 0 || gx >= w || gz >= h) return;
    const c = maze[gz][gx];
    if (side === "right" && gx < w - 1) {
      c.right = false;
      maze[gz][gx + 1].left = false;
    } else if (side === "bottom" && gz < h - 1) {
      c.bottom = false;
      maze[gz + 1][gx].top = false;
    } else if (side === "left" && gx > 0) {
      c.left = false;
      maze[gz][gx - 1].right = false;
    } else if (side === "top" && gz > 0) {
      c.top = false;
      maze[gz - 1][gx].bottom = false;
    }
  };
  const openBox = (x0, z0, x1, z1) => {
    for (let gz = z0; gz <= z1; gz++) {
      for (let gx = x0; gx <= x1; gx++) {
        openSide(gx, gz, "right");
        openSide(gx, gz, "bottom");
        openSide(gx, gz, "left");
        openSide(gx, gz, "top");
      }
    }
  };
  const cx = Math.floor(w / 2);
  const cz = Math.floor(h / 2);

  if (style === "arena") {
    openBox(Math.max(1, cx - 2), Math.max(1, cz - 2), Math.min(w - 2, cx + 2), Math.min(h - 2, cz + 2));
  } else if (style === "dock") {
    for (let gz = 1; gz < h - 1; gz += 2) {
      for (let gx = 0; gx < w - 1; gx++) openSide(gx, gz, "right");
    }
    for (let gx = 2; gx < w - 2; gx += 3) {
      for (let gz = 0; gz < h - 1; gz++) openSide(gx, gz, "bottom");
    }
  } else if (style === "sky") {
    for (let gx = 1; gx < w - 1; gx += 3) {
      for (let gz = 0; gz < h - 1; gz++) openSide(gx, gz, "bottom");
    }
    openBox(Math.max(1, cx - 1), Math.max(1, cz - 1), Math.min(w - 2, cx + 1), Math.min(h - 2, cz + 1));
  } else if (style === "puzzle") {
    addMazeLoops(maze, w, h, Math.max(4, Math.floor(w / 3)), rng);
  } else if (style === "platform") {
    for (let gz = 1; gz < h - 1; gz += 4) {
      for (let gx = 0; gx < w - 1; gx++) openSide(gx, gz, "right");
    }
  } else {
    for (let i = 0; i < 2 + Math.floor(rng() * 2); i++) {
      const rx = 2 + Math.floor(rng() * Math.max(1, w - 5));
      const rz = 2 + Math.floor(rng() * Math.max(1, h - 5));
      openBox(rx, rz, Math.min(w - 2, rx + 2), Math.min(h - 2, rz + 2));
    }
  }
}

export function createMazeContext(level, theme = null) {
  return {
    w: level.w,
    h: level.h,
    cell: level.cellSize ?? 9,
    killerSpeed: level.killerSpeed,
    fogNear: level.fogNear,
    fogFar: level.fogFar,
    loops: level.loops ?? 6,
    teleporters: level.teleporters ?? 1,
    items: level.items ?? 5,
    missions: level.missions ?? Math.max(6, Math.floor((level.w * level.h) / 18)),
    theme: theme || {
      floorA: 0x4a3868, floorB: 0x5e4a82, wall: 0xc8b0e8,
      sky: 0x1a1228, accent: 0xff4466, deco: 0x66ccff,
    },
  };
}

export function cellCenter(ctx, gx, gz) {
  return {
    x: (gx - ctx.w / 2) * ctx.cell + ctx.cell / 2,
    z: (gz - ctx.h / 2) * ctx.cell + ctx.cell / 2,
  };
}

export function worldToCell(ctx, x, z) {
  const gx = Math.floor((x + (ctx.w * ctx.cell) / 2) / ctx.cell);
  const gz = Math.floor((z + (ctx.h * ctx.cell) / 2) / ctx.cell);
  return {
    gx: Math.max(0, Math.min(ctx.w - 1, gx)),
    gz: Math.max(0, Math.min(ctx.h - 1, gz)),
  };
}

export const AIRY_JUMP_MIN = 0.1;
export const MAZE_WALL_HEIGHT = 4;

/** 子彈／視線：牆高 4m，僅當射線夠高才可越過矮牆 */
export function shooterLineBlocked(ctx, maze, x0, z0, y0, x1, z1, y1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const dy = y1 - y0;
  const len3 = Math.hypot(dx, dz, dy);
  if (len3 < 0.05) return false;
  const steps = Math.max(10, Math.ceil(len3 / (ctx.cell * 0.15)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sx = x0 + dx * t;
    const sz = z0 + dz * t;
    const sy = y0 + dy * t;
    if (sy > MAZE_WALL_HEIGHT + 0.2) continue;
    if (collides(ctx, maze, sx, sz, 0.1, 0, 0, { vaultClear: 99 })) return true;
  }
  return false;
}

export function collides(ctx, maze, x, z, radius = 0.45, jumpY = 0, footElev = 0, opts = {}) {
  const jy = jumpY ?? 0;
  const fe = footElev ?? 0;
  const vaultClear = opts.vaultClear ?? 2.6;
  const vaultJumpMin = opts.vaultJumpMin ?? AIRY_JUMP_MIN;
  const clearH = fe + jy;
  if (clearH >= MAZE_WALL_HEIGHT - 0.5) return false;
  const overWall = clearH >= MAZE_WALL_HEIGHT - 0.45;
  const airy =
    overWall ||
    (jy > vaultJumpMin && (jy > 0.35 || jy + fe * 0.22 > vaultClear * 0.55));
  const scale = opts.radiusScale ?? 1;
  const r = (airy ? Math.min(radius, 0.14) : radius) * scale;
  const half = ctx.cell / 2 - r - (airy ? 1.1 : 0.18);
  const { gx, gz } = worldToCell(ctx, x, z);
  const cell = maze[gz][gx];
  const c = cellCenter(ctx, gx, gz);
  if (cell.top && z < c.z - half) return true;
  if (cell.bottom && z > c.z + half) return true;
  if (cell.left && x < c.x - half) return true;
  if (cell.right && x > c.x + half) return true;
  return false;
}

export function moveWithCollision(ctx, maze, pos, vx, vz, dt, jumpY = 0, footElev = 0, colOpts = {}) {
  const nx = pos.x + vx * dt;
  const nz = pos.z + vz * dt;
  const clearH = (footElev ?? 0) + (jumpY ?? 0);
  const rad = clearH > MAZE_WALL_HEIGHT ? 0.28 : clearH > 3.6 ? 0.32 : jumpY > 0.45 ? 0.36 : 0.4;
  if (!collides(ctx, maze, nx, pos.z, rad, jumpY, footElev, colOpts)) pos.x = nx;
  if (!collides(ctx, maze, pos.x, nz, rad, jumpY, footElev, colOpts)) pos.z = nz;
  if (jumpY > 0.48 || clearH > 4) {
    const cx = pos.x + vx * dt;
    const cz = pos.z + vz * dt;
    if (!collides(ctx, maze, cx, cz, 0.32, jumpY, footElev, colOpts)) {
      pos.x = cx;
      pos.z = cz;
    }
  }
}

export function openMazePassage(maze, w, h, door) {
  if (!door || door.open) return;
  const cell = maze[door.gz][door.gx];
  if (door.side === "right") {
    cell.right = false;
    if (door.gx < w - 1) maze[door.gz][door.gx + 1].left = false;
  } else {
    cell.bottom = false;
    if (door.gz < h - 1) maze[door.gz + 1][door.gx].top = false;
  }
}

export function isCellReachable(ctx, maze, fromGx, fromGz, toGx, toGz) {
  if (fromGx < 0 || fromGz < 0 || toGx < 0 || toGz < 0) return false;
  if (fromGx >= ctx.w || fromGz >= ctx.h || toGx >= ctx.w || toGz >= ctx.h) return false;
  if (fromGx === toGx && fromGz === toGz) return true;
  const key = (a, b) => `${a},${b}`;
  const q = [[fromGx, fromGz]];
  const seen = new Set([key(fromGx, fromGz)]);
  const neighbors = (gx, gz) => {
    const cell = maze[gz][gx];
    const out = [];
    if (!cell.top && gz > 0) out.push([gx, gz - 1]);
    if (!cell.bottom && gz < ctx.h - 1) out.push([gx, gz + 1]);
    if (!cell.left && gx > 0) out.push([gx - 1, gz]);
    if (!cell.right && gx < ctx.w - 1) out.push([gx + 1, gz]);
    return out;
  };
  while (q.length) {
    const [gx, gz] = q.shift();
    if (gx === toGx && gz === toGz) return true;
    if (seen.size > ctx.w * ctx.h) break;
    for (const [nx, nz] of neighbors(gx, gz)) {
      const k = key(nx, nz);
      if (!seen.has(k)) {
        seen.add(k);
        q.push([nx, nz]);
      }
    }
  }
  return false;
}

export function bfsNextStep(ctx, maze, sx, sz, tx, tz) {
  const start = worldToCell(ctx, sx, sz);
  const target = worldToCell(ctx, tx, tz);
  if (start.gx === target.gx && start.gz === target.gz) return null;
  const key = (a, b) => `${a},${b}`;
  const q = [[start.gx, start.gz]];
  const prev = new Map();
  prev.set(key(start.gx, start.gz), null);
  const neighbors = (gx, gz) => {
    const cell = maze[gz][gx];
    const out = [];
    if (!cell.top && gz > 0) out.push([gx, gz - 1]);
    if (!cell.bottom && gz < ctx.h - 1) out.push([gx, gz + 1]);
    if (!cell.left && gx > 0) out.push([gx - 1, gz]);
    if (!cell.right && gx < ctx.w - 1) out.push([gx + 1, gz]);
    return out;
  };
  while (q.length) {
    const [gx, gz] = q.shift();
    if (gx === target.gx && gz === target.gz) {
      let cur = [gx, gz];
      let prevNode = cur;
      let p = prev.get(key(gx, gz));
      while (p) {
        prevNode = cur;
        cur = p;
        p = prev.get(key(cur[0], cur[1]));
      }
      return cellCenter(ctx, prevNode[0], prevNode[1]);
    }
    for (const [nx, nz] of neighbors(gx, gz)) {
      const k = key(nx, nz);
      if (!prev.has(k)) {
        prev.set(k, [gx, gz]);
        q.push([nx, nz]);
      }
    }
  }
  return null;
}

function isDoorWallAt(doors, gx, gz, side) {
  if (!doors?.length) return false;
  return doors.some((d) => {
    if (d.open) return false;
    if (side === "left" && d.side === "right" && d.gx === gx - 1 && d.gz === gz) return true;
    if (side === "top" && d.side === "bottom" && d.gx === gx && d.gz === gz - 1) return true;
    if (side === "right" && d.side === "right" && d.gx === gx && d.gz === gz) return true;
    if (side === "bottom" && d.side === "bottom" && d.gx === gx && d.gz === gz) return true;
    return false;
  });
}

function paletteFloorColors(pal) {
  if (!pal?.floor) return null;
  const f = pal.floor;
  const a = (f & 0xfefefe) >> 1;
  const b = ((f & 0xfefefe) * 0.85) | 0;
  return { floorA: f, floorB: b, accent: pal.secret ?? f, wall: a };
}

export function buildMazeMeshes(ctx, maze, scene, opts = {}) {
  const doorWalls = opts.doorWalls || [];
  const { w, h, cell } = ctx;
  const palTint = paletteFloorColors(opts.shooterPalette);
  const th = palTint
    ? { ...ctx.theme, floorA: palTint.floorA, floorB: palTint.floorB, accent: palTint.accent, wall: palTint.wall ?? ctx.theme.wall }
    : ctx.theme;
  const group = new THREE.Group();
  const usePbr = opts.usePbr !== false;
  const matFloorA = usePbr
    ? plasticPBR(th.floorA, th.accent || 0x000000, 0.1)
    : new THREE.MeshLambertMaterial({
      color: th.floorA, emissive: th.accent || 0x000000, emissiveIntensity: 0.08,
    });
  const matFloorB = usePbr
    ? plasticPBR(th.floorB, th.deco || 0x000000, 0.08)
    : new THREE.MeshLambertMaterial({
      color: th.floorB, emissive: th.deco || 0x000000, emissiveIntensity: 0.06,
    });
  const matFloorC = usePbr
    ? plasticPBR(th.accent || 0x664488, th.accent || 0x442266, 0.18)
    : new THREE.MeshLambertMaterial({
      color: th.accent || 0x664488, emissive: th.accent || 0x442266, emissiveIntensity: 0.2,
    });
  const matWall = usePbr
    ? wallPBR(th.wall, th.accent || 0x554466, 0.32)
    : new THREE.MeshLambertMaterial({
      color: th.wall, emissive: th.accent || 0x554466, emissiveIntensity: 0.35,
    });
  const matWallAlt = usePbr
    ? wallPBR(th.wallAlt || th.wall, th.deco || th.accent || 0x554466, 0.26)
    : new THREE.MeshLambertMaterial({
      color: th.wallAlt || th.wall, emissive: th.deco || th.accent || 0x554466, emissiveIntensity: 0.28,
    });
  const floorGeo = new THREE.BoxGeometry(cell - 0.12, 0.22, cell - 0.12);
  const wallGeoH = new THREE.BoxGeometry(1, WALL_H, WALL_THICK);
  const wallGeoV = new THREE.BoxGeometry(WALL_THICK, WALL_H, 1);
  const dummy = new THREE.Object3D();

  const floorCount = w * h;
  let countA = 0;
  let countB = 0;
  let countC = 0;
  for (let gz = 0; gz < h; gz++) {
    for (let gx = 0; gx < w; gx++) {
      const m = (gx + gz) % 3;
      if (m === 0) countA++;
      else if (m === 1) countB++;
      else countC++;
    }
  }
  const floorA = new THREE.InstancedMesh(floorGeo, matFloorA, Math.max(1, countA));
  const floorB = new THREE.InstancedMesh(floorGeo, matFloorB, Math.max(1, countB));
  const floorC = new THREE.InstancedMesh(floorGeo, matFloorC, Math.max(1, countC));
  let ia = 0;
  let ib = 0;
  let ic = 0;
  for (let gz = 0; gz < h; gz++) {
    for (let gx = 0; gx < w; gx++) {
      const c = cellCenter(ctx, gx, gz);
      dummy.position.set(c.x, 0.11, c.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      const m = (gx + gz) % 3;
      if (m === 0) floorA.setMatrixAt(ia++, dummy.matrix);
      else if (m === 1) floorB.setMatrixAt(ib++, dummy.matrix);
      else floorC.setMatrixAt(ic++, dummy.matrix);
    }
  }
  floorA.count = ia;
  floorB.count = ib;
  floorC.count = ic;
  for (const inst of [floorA, floorB, floorC]) {
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    inst.computeBoundingSphere();
    inst.receiveShadow = true;
    inst.castShadow = false;
  }
  group.add(floorA, floorB, floorC);

  const wallTransforms = [];
  const pushWall = (geo, px, pz, sx, sz, alt = false) => {
    wallTransforms.push({ geo, px, py: WALL_H / 2, pz, sx, sz, alt });
  };

  for (let gz = 0; gz < h; gz++) {
    for (let gx = 0; gx < w; gx++) {
      const c = cellCenter(ctx, gx, gz);
      const cellData = maze[gz][gx];
      const alt = (gx + gz) % 2 === 1;
      if (cellData.top && !isDoorWallAt(doorWalls, gx, gz, "top")) pushWall(wallGeoH, c.x, c.z - cell / 2, cell, 1, alt);
      if (cellData.left && !isDoorWallAt(doorWalls, gx, gz, "left")) pushWall(wallGeoV, c.x - cell / 2, c.z, 1, cell, alt);
      if (gz === h - 1 && cellData.bottom && !isDoorWallAt(doorWalls, gx, gz, "bottom")) pushWall(wallGeoH, c.x, c.z + cell / 2, cell, 1, alt);
      if (gx === w - 1 && cellData.right && !isDoorWallAt(doorWalls, gx, gz, "right")) pushWall(wallGeoV, c.x + cell / 2, c.z, 1, cell, alt);
    }
  }

  const hWalls = wallTransforms.filter((t) => t.geo === wallGeoH);
  const vWalls = wallTransforms.filter((t) => t.geo === wallGeoV);
  const addWallInst = (list, geo, wallMat) => {
    if (!list.length) return;
    const inst = new THREE.InstancedMesh(geo, wallMat, list.length);
    list.forEach((t, i) => {
      dummy.position.set(t.px, t.py, t.pz);
      dummy.scale.set(t.sx, 1, t.sz);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    inst.computeBoundingSphere();
    inst.castShadow = true;
    inst.receiveShadow = true;
    group.add(inst);
  };
  const hAlt = hWalls.filter((t) => t.alt);
  const hNorm = hWalls.filter((t) => !t.alt);
  const vAlt = vWalls.filter((t) => t.alt);
  const vNorm = vWalls.filter((t) => !t.alt);
  addWallInst(hNorm, wallGeoH, matWall);
  addWallInst(hAlt, wallGeoH, matWallAlt);
  addWallInst(vNorm, wallGeoV, matWall);
  addWallInst(vAlt, wallGeoV, matWallAlt);

  const decoMat = new THREE.MeshLambertMaterial({
    color: th.deco || 0x66ccff, emissive: th.deco || 0x4488aa, emissiveIntensity: 0.6,
  });
  for (let gz = 0; gz < h; gz++) {
    for (let gx = 0; gx < w; gx++) {
      if ((gx * 7 + gz * 13) % 11 !== 0) continue;
      const c = cellCenter(ctx, gx, gz);
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.8 + (gx % 3) * 0.4, 0.5), decoMat);
      pillar.position.set(c.x + ((gx % 2) ? 1.5 : -1.5), 1.4, c.z + ((gz % 2) ? 1.5 : -1.5));
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);
      if ((gx + gz) % 5 === 0) {
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 8, 8),
          new THREE.MeshBasicMaterial({ color: th.accent || 0xff4466, transparent: true, opacity: 0.75 })
        );
        orb.position.set(c.x, 3.2, c.z);
        group.add(orb);
      }
    }
  }

  if (!scene) throw new Error("buildMazeMeshes: scene 未定義");
  scene.add(group);
  return group;
}

export function createTeleporters(ctx, maze, count) {
  const pairs = [];
  const used = new Set();
  const pickCell = () => {
    for (let t = 0; t < 80; t++) {
      const gx = Math.floor(Math.random() * ctx.w);
      const gz = Math.floor(Math.random() * ctx.h);
      const k = `${gx},${gz}`;
      if (!used.has(k)) {
        used.add(k);
        return cellCenter(ctx, gx, gz);
      }
    }
    return cellCenter(ctx, 0, 0);
  };
  for (let i = 0; i < count; i++) {
    pairs.push({ a: pickCell(), b: pickCell(), id: i });
  }
  return pairs;
}

export function buildTeleporterMeshes(scene, pairs) {
  const group = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x66ccff, transparent: true, opacity: 0.9,
  });
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x44ddff, transparent: true, opacity: 0.45,
  });
  pairs.forEach((tp) => {
    [tp.a, tp.b].forEach((p) => {
      const pillar = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.22, 10, 24), ringMat.clone());
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.15;
      pillar.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 8), beamMat.clone());
      beam.position.y = 2.5;
      pillar.add(beam);
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xaaeeff, transparent: true, opacity: 0.8 })
      );
      core.position.y = 1.2;
      pillar.add(core);
      pillar.position.set(p.x, 0, p.z);
      pillar.userData.isTeleporter = true;
      group.add(pillar);
    });
  });
  scene.add(group);
  return group;
}

export function createExitMarker(scene, pos) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 2, 18, 10),
    new THREE.MeshBasicMaterial({ color: 0x33ff99, transparent: true, opacity: 0.85 })
  );
  beam.position.y = 9;
  g.add(beam);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2 + i * 0.8, 3 + i * 0.8, 28),
      new THREE.MeshBasicMaterial({
        color: 0x55ffbb, side: THREE.DoubleSide, transparent: true, opacity: 0.7 - i * 0.15,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1 + i * 0.05;
    g.add(ring);
  }
  g.position.set(pos.x, 0, pos.z);
  scene.add(g);
  return g;
}

export function spawnWorldItems(ctx, maze, count) {
  const types = ["cola", "smoke", "bandage", "speed", "doublejump"];
  const items = [];
  for (let i = 0; i < count; i++) {
    const gx = Math.floor(Math.random() * ctx.w);
    const gz = Math.floor(Math.random() * ctx.h);
    const c = cellCenter(ctx, gx, gz);
    items.push({
      type: types[i % types.length],
      x: c.x,
      z: c.z,
      taken: false,
    });
  }
  return items;
}

export function buildItemMeshes(scene, items) {
  const group = new THREE.Group();
  const colors = {
    cola: 0x3366ff, smoke: 0xaaaaaa, bandage: 0xff4444, speed: 0xffdd00, doublejump: 0x66ffcc,
  };
  items.forEach((it) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshLambertMaterial({ color: colors[it.type] || 0xffffff, emissive: 0x222222 })
    );
    m.position.set(it.x, 0.5, it.z);
    it.mesh = m;
    group.add(m);
  });
  scene.add(group);
  return group;
}
