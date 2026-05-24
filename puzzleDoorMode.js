import * as THREE from "three";
import { cellCenter } from "./maze.js";
import { openDoor } from "./keysMode.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PUZZLE_COLORS = [0xffcc44, 0x66ddff, 0xff88cc, 0x88ff99, 0xffaa66, 0xaa88ff, 0x44ffdd, 0xff6644];

function makeLabelSprite(text, color, scale = 0.85) {
  const cvs = document.createElement("canvas");
  cvs.width = 64;
  cvs.height = 32;
  const cx = cvs.getContext("2d");
  cx.fillStyle = "rgba(0,0,0,0.55)";
  cx.fillRect(0, 0, 64, 32);
  cx.fillStyle = `#${(color >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
  cx.font = "bold 16px sans-serif";
  cx.textAlign = "center";
  cx.fillText(text, 32, 22);
  const tex = new THREE.CanvasTexture(cvs);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(scale * 2, scale, 1);
  return sp;
}

function pickSpreadPassages(passages, count) {
  const remain = passages.filter((p) => p.gx + p.gz >= 2);
  const picked = [];
  while (picked.length < count && remain.length) {
    if (!picked.length) {
      const i = Math.floor(Math.random() * remain.length);
      picked.push(remain.splice(i, 1)[0]);
      continue;
    }
    let bestI = 0;
    let bestMin = -1;
    for (let i = 0; i < remain.length; i++) {
      const p = remain[i];
      let minD = Infinity;
      for (const q of picked) {
        minD = Math.min(minD, Math.hypot(p.x - q.x, p.z - q.z));
      }
      if (minD > bestMin) {
        bestMin = minD;
        bestI = i;
      }
    }
    picked.push(remain.splice(bestI, 1)[0]);
  }
  return picked;
}

/** 解題闖關：謎題門分散地圖、答對才開 */
export function setupPuzzleDoorLevel(ctx, maze, level) {
  const w = ctx.w;
  const h = ctx.h;
  const doorCount = level.puzzleDoors ?? 10;

  const passages = [];
  for (let gz = 0; gz < h; gz++) {
    for (let gx = 0; gx < w; gx++) {
      const c = maze[gz][gx];
      if (gx < w - 1 && !c.right) {
        const cc = cellCenter(ctx, gx, gz);
        passages.push({ side: "right", gx, gz, x: cc.x + ctx.cell * 0.5, z: cc.z });
      }
      if (gz < h - 1 && !c.bottom) {
        const cc = cellCenter(ctx, gx, gz);
        passages.push({ side: "bottom", gx, gz, x: cc.x, z: cc.z + ctx.cell * 0.5 });
      }
    }
  }

  const picked = pickSpreadPassages(passages, Math.min(doorCount, passages.length));
  const doors = [];

  for (let i = 0; i < picked.length; i++) {
    const p = picked[i];
    const cellData = maze[p.gz][p.gx];
    if (p.side === "right") {
      cellData.right = true;
      if (p.gx < w - 1) maze[p.gz][p.gx + 1].left = true;
    } else {
      cellData.bottom = true;
      if (p.gz < h - 1) maze[p.gz + 1][p.gx].top = true;
    }
    doors.push({
      id: i,
      side: p.side,
      gx: p.gx,
      gz: p.gz,
      label: i + 1,
      open: false,
      x: p.x,
      z: p.z,
      color: PUZZLE_COLORS[i % PUZZLE_COLORS.length],
      style: i % 4,
      requires: i > 0 ? i - 1 : -1,
      mesh: null,
      beacon: null,
      _isPuzzleDoor: true,
    });
  }

  doors.sort((a, b) => {
    const da = Math.hypot(a.x, a.z);
    const db = Math.hypot(b.x, b.z);
    return da - db;
  });
  doors.forEach((d, i) => {
    d.id = i;
    d.label = i + 1;
    d.requires = i > 0 ? i - 1 : -1;
  });

  return { doors };
}

export function getDoorApproach(ctx, door) {
  const c = cellCenter(ctx, door.gx, door.gz);
  const off = ctx.cell * 0.36;
  if (door.side === "right") {
    return { x: c.x + off, z: c.z };
  }
  return { x: c.x, z: c.z + off };
}

export function getDoorMapPos(ctx, door) {
  return getDoorApproach(ctx, door);
}

function buildDoorVisual(g, d, cellSize) {
  const col = d.color;
  const em = new THREE.MeshLambertMaterial({
    color: 0x2a1838,
    emissive: col,
    emissiveIntensity: 0.65,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: col,
    transparent: true,
    opacity: 0.45,
  });

  if (d.style === 0) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3.2, 8), em);
    pillar.position.y = 1.6;
    g.add(pillar);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 10, 24), glow);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    g.add(ring);
  } else if (d.style === 1) {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.75, 0),
      new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 1.2 })
    );
    crystal.position.y = 2.2;
    g.add(crystal);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.4, 6), em);
    base.position.y = 0.2;
    g.add(base);
  } else if (d.style === 2) {
    const w = cellSize * 0.35;
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.4, 0.25), em);
    postL.position.set(-w, 1.7, 0);
    const postR = postL.clone();
    postR.position.x = w;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w * 2.2, 0.3, 0.3), em);
    beam.position.y = 3.1;
    g.add(postL, postR, beam);
  } else {
    const obelisk = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.8, 6), em);
    obelisk.position.y = 1.5;
    g.add(obelisk);
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 10, 10),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 })
    );
    orb.position.y = 3.1;
    g.add(orb);
  }

  const label = makeLabelSprite(`?${d.label}`, col, 1.1);
  label.position.y = 3.5;
  g.add(label);

  const light = new THREE.PointLight(col, 1.8, cellSize * 2.2);
  light.position.y = 2.4;
  g.add(light);
  d.beacon = light;

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 1.1, 20),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.08;
  g.add(halo);
}

export function buildPuzzleDoorMeshes(scene, state, cellSize, ctx) {
  const { doors } = state;
  const group = new THREE.Group();
  group.name = "puzzleDoors";

  doors.forEach((d) => {
    const g = new THREE.Group();
    buildDoorVisual(g, d, cellSize);
    const ap = ctx ? getDoorApproach(ctx, d) : { x: d.x, z: d.z };
    g.position.set(ap.x, 0, ap.z);
    if (d.side === "right") g.rotation.y = -Math.PI / 2;
    d.mesh = g;
    d.approachX = ap.x;
    d.approachZ = ap.z;
    group.add(g);
  });

  scene.add(group);
  return group;
}

export function isPuzzleDoorUnlocked(door, doors) {
  if (!door || door.open) return false;
  if (door.requires < 0) return true;
  const prev = doors[door.requires];
  return prev?.open === true;
}

export function getNearPuzzleDoor(player, doors, ctx, maxDist = 4.8) {
  if (!player || !doors?.length) return null;
  let best = null;
  let bestD = maxDist;
  for (const d of doors) {
    if (d.open) continue;
    if (!isPuzzleDoorUnlocked(d, doors)) continue;
    const ap = ctx
      ? getDoorApproach(ctx, d)
      : { x: d.approachX ?? d.x, z: d.approachZ ?? d.z };
    const dist = Math.hypot(player.pos.x - ap.x, player.pos.z - ap.z);
    if (dist <= bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

export function getLockedPuzzleDoorHint(player, doors, ctx, maxDist = 5) {
  for (const d of doors) {
    if (d.open || isPuzzleDoorUnlocked(d, doors)) continue;
    const ap = ctx ? getDoorApproach(ctx, d) : { x: d.x, z: d.z };
    if (Math.hypot(player.pos.x - ap.x, player.pos.z - ap.z) > maxDist) continue;
    return `需先解開 #${d.requires + 1} 號謎門`;
  }
  return null;
}

export function getNextPuzzleDoor(doors) {
  if (!doors?.length) return null;
  for (const d of doors) {
    if (d.open) continue;
    if (d.requires >= 0 && !doors[d.requires]?.open) continue;
    return d;
  }
  return null;
}

export function solvePuzzleDoor(door, maze, ctx) {
  if (!door || door.open) return false;
  openDoor(door, maze, ctx);
  return true;
}

export function allPuzzleDoorsOpen(doors) {
  return doors.every((d) => d.open);
}

export function puzzleDoorsRemaining(doors) {
  return doors.filter((d) => !d.open).length;
}
