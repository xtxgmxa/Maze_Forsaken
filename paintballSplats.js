import * as THREE from "three";
import { cellCenter, worldToCell, collides } from "./maze.js";

export const PAINT_PALETTE = [
  0xff4466, 0x44ddff, 0xffcc44, 0x66ff99, 0xff66cc, 0xaa88ff, 0xff8844, 0x22ffaa,
];

const MAX_SPLATS = 160;
const MAX_WALL_BLOBS_PER_FACE = 28;
const splatPool = [];
const wallAccum = new Map();
const _raycaster = new THREE.Raycaster();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _wp = new THREE.Vector3();
const _wn = new THREE.Vector3();

export function assignPaintColor(p, index = 0) {
  if (!p) return;
  p.paintColor = p.charDef?.accent || PAINT_PALETTE[index % PAINT_PALETTE.length];
}

export function clearPaintSplats(scene) {
  for (const s of splatPool) {
    const root = s.anchor || s.mesh;
    root?.parent?.remove(root);
  }
  splatPool.length = 0;
  wallAccum.clear();
}

function pushSplat(entry) {
  while (splatPool.length >= MAX_SPLATS) {
    const old = splatPool.shift();
    const root = old.anchor || old.mesh;
    root?.parent?.remove(root);
    if (old.wallKey) wallAccum.delete(old.wallKey);
  }
  splatPool.push(entry);
}

function splatMat(color, opacity = 0.96) {
  return new THREE.MeshBasicMaterial({
    color: color ?? 0xff4466,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
  });
}

function findSurvivorForObject(obj, players) {
  if (!obj || !players?.length) return null;
  let o = obj;
  while (o) {
    for (const p of players) {
      if (!p?.mesh) continue;
      let hit = false;
      p.mesh.traverse((c) => {
        if (c === o) hit = true;
      });
      if (hit) return p;
    }
    o = o.parent;
  }
  return null;
}

function buildSplatDiscs(mat, coreR, droplets = 6, spread = 0.45) {
  const group = new THREE.Group();
  group.name = "paintSplat";
  const core = new THREE.Mesh(new THREE.CircleGeometry(coreR, 12), mat);
  group.add(core);
  for (let i = 0; i < droplets; i++) {
    const r = 0.08 + Math.random() * 0.16;
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 8), mat);
    m.position.set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, 0);
    group.add(m);
  }
  return group;
}

/** 漆彈貼在角色網格上，會跟著人移動 */
function attachSplatToPlayer(player, worldPoint, worldNormal, color) {
  if (!player?.mesh) return null;
  const mesh = player.mesh;
  mesh.updateWorldMatrix(true, true);
  const inv = mesh.matrixWorld.clone().invert();
  const lp = worldPoint.clone().applyMatrix4(inv);
  const ln = worldNormal.clone().transformDirection(inv).normalize();
  const mat = splatMat(color);
  const group = buildSplatDiscs(mat, 0.22 + Math.random() * 0.12, 5, 0.38);
  const up = Math.abs(ln.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(up, ln).normalize();
  const bitangent = new THREE.Vector3().crossVectors(ln, tangent);
  group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent, bitangent, ln));
  group.position.copy(lp).addScaledVector(ln, 0.04);
  mesh.add(group);
  if (!player._paintSplats) player._paintSplats = [];
  player._paintSplats.push(group);
  pushSplat({ mesh: group, anchor: mesh, kind: "body" });
  return group;
}

export function clearPlayerPaintSplats(player) {
  if (!player?._paintSplats) return;
  for (const g of player._paintSplats) {
    g.parent?.remove(g);
  }
  player._paintSplats.length = 0;
}

function spawnPaintOnWorldSurface(scene, point, normal, color) {
  const n = (normal && normal.lengthSq() > 0.01)
    ? normal.clone().normalize()
    : new THREE.Vector3(0, 1, 0);
  const mat = splatMat(color);
  const group = buildSplatDiscs(mat, 0.28 + Math.random() * 0.14, 7, 0.48);
  const up = Math.abs(n.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(up, n).normalize();
  const bitangent = new THREE.Vector3().crossVectors(n, tangent);
  group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent, bitangent, n));
  group.position.copy(point).addScaledVector(n, 0.05);
  scene.add(group);
  pushSplat({ mesh: group, kind: "world" });
}

function wallFaceKey(face) {
  const qCell = (v) => Math.round(v * 4);
  const qAlong = (v) => Math.round(v * 9);
  const along = Math.abs(face.nx) > 0.5 ? (face.hitZ ?? face.pz) : (face.hitX ?? face.px);
  return `${qCell(face.px)}_${qCell(face.pz)}_${face.nx}_${face.nz}_${qAlong(along)}`;
}

function orientGroupToWall(group, face) {
  const eps = 0.26;
  const wx = Math.abs(face.nx) > 0.5 ? face.px + face.nx * eps : (face.hitX ?? face.px);
  const wz = Math.abs(face.nz) > 0.5 ? face.pz + face.nz * eps : (face.hitZ ?? face.pz);
  group.position.set(wx, 0, wz);
  if (face.nx > 0) group.rotation.y = -Math.PI / 2;
  else if (face.nx < 0) group.rotation.y = Math.PI / 2;
  else if (face.nz > 0) group.rotation.y = 0;
  else group.rotation.y = Math.PI;
}

/** 同一面牆累積擴散漆彈 */
function addBlobWallSplat(scene, face, color, opts = {}) {
  const key = wallFaceKey(face);
  let entry = wallAccum.get(key);
  const mat = splatMat(color, 0.94);
  const light = !!opts.light;

  if (entry?.group?.parent) {
    const group = entry.group;
    const count = group.children.length;
    if (count < MAX_WALL_BLOBS_PER_FACE) {
      const baseY = 0.35 + Math.random() * 2.5;
      const r = 0.12 + Math.random() * 0.22;
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 10), mat);
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.85;
      mesh.position.set(Math.cos(ang) * dist, baseY + (Math.random() - 0.5) * 0.9, 0.02 + Math.random() * 0.04);
      mesh.rotation.z = Math.random() * Math.PI;
      group.add(mesh);
      const core = group.children[0];
      if (core?.scale) {
        core.scale.setScalar(Math.min(1.45, 1 + count * 0.018));
      }
    }
    return;
  }

  const group = new THREE.Group();
  group.name = "paintSplat";
  orientGroupToWall(group, face);
  const baseY = 0.45 + Math.random() * 2.2;
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.4 + Math.random() * 0.22, 14), mat);
  core.position.set(0, baseY, 0.04);
  group.add(core);
  for (let i = 0; i < 8; i++) {
    const r = 0.12 + Math.random() * 0.24;
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 10), mat);
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * 0.6;
    mesh.position.set(Math.cos(ang) * dist, baseY + (Math.random() - 0.5) * 0.7, 0.02);
    mesh.rotation.z = Math.random() * Math.PI;
    group.add(mesh);
  }
  scene.add(group);
  wallAccum.set(key, { group });
  pushSplat({ mesh: group, kind: "wall", wallKey: key });
}

function collectPaintMeshes(scene, ignoreMesh) {
  const list = [];
  if (!scene) return list;
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    if (o.userData?.skipPaint || o.userData?.fpGun) return;
    if (o.name === "paintSplat") return;
    if (ignoreMesh && (o === ignoreMesh || ignoreMesh === o.parent)) return;
    const n = o.name || "";
    if (n === "exit" || n.startsWith("teleporter")) return;
    list.push(o);
  });
  return list;
}

function wallFaceFromCell(ctx, maze, gx, gz, nx, nz) {
  const c = cellCenter(ctx, gx, gz);
  const half = ctx.cell * 0.5 - 0.08;
  if (nx > 0) return { nx: 1, nz: 0, px: c.x + half, pz: c.z };
  if (nx < 0) return { nx: -1, nz: 0, px: c.x - half, pz: c.z };
  if (nz > 0) return { nx: 0, nz: 1, px: c.x, pz: c.z + half };
  return { nx: 0, nz: -1, px: c.x, pz: c.z - half };
}

function raycastWallFace(ctx, maze, x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return null;
  const steps = Math.max(16, Math.ceil(len / (ctx.cell * 0.05)));
  let lastGx = -1;
  let lastGz = -1;
  let lastFreeX = x0;
  let lastFreeZ = z0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const sx = x0 + dx * t;
    const sz = z0 + dz * t;
    const { gx, gz } = worldToCell(ctx, sx, sz);
    if (gx < 0 || gz < 0 || gz >= ctx.h || gx >= ctx.w) break;
    if (collides(ctx, maze, sx, sz, 0.06, 0, 0, { vaultClear: 99 })) {
      const { gx: fg, gz: fz } = worldToCell(ctx, lastFreeX, lastFreeZ);
      if (fg >= 0 && fz >= 0 && fz < ctx.h && fg < ctx.w) {
        const cell = maze[fz][fg];
        const ax = dx / len;
        const az = dz / len;
        const walls = [];
        const add = (nx, nz, exists) => {
          if (!exists) return;
          const dot = ax * nx + az * nz;
          if (dot > 0.05) walls.push({ ...wallFaceFromCell(ctx, maze, fg, fz, nx, nz), dot });
        };
        add(0, -1, cell.top);
        add(0, 1, cell.bottom);
        add(-1, 0, cell.left);
        add(1, 0, cell.right);
        if (walls.length) {
          walls.sort((a, b) => b.dot - a.dot);
          return walls[0];
        }
      }
      return wallFaceFromRayPlane(ctx, maze, lastFreeX, lastFreeZ, x1, z1);
    }
    if (lastGx >= 0 && (gx !== lastGx || gz !== lastGz)) {
      const cell = maze[lastGz][lastGx];
      if (gx > lastGx && cell.right) return wallFaceFromCell(ctx, maze, lastGx, lastGz, 1, 0);
      if (gx < lastGx && cell.left) return wallFaceFromCell(ctx, maze, lastGx, lastGz, -1, 0);
      if (gz > lastGz && cell.bottom) return wallFaceFromCell(ctx, maze, lastGx, lastGz, 0, 1);
      if (gz < lastGz && cell.top) return wallFaceFromCell(ctx, maze, lastGx, lastGz, 0, -1);
    }
    lastGx = gx;
    lastGz = gz;
    lastFreeX = sx;
    lastFreeZ = sz;
  }
  return wallFaceFromRayPlane(ctx, maze, x0, z0, x1, z1);
}

function wallFaceFromRayPlane(ctx, maze, x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return null;
  const { gx, gz } = worldToCell(ctx, x1, z1);
  if (gx < 0 || gz < 0 || gz >= ctx.h || gx >= ctx.w) return null;
  const cell = maze[gz][gx];
  const c = cellCenter(ctx, gx, gz);
  const half = ctx.cell * 0.5 - 0.08;
  let best = null;
  let bestT = Infinity;
  const tryPlane = (nx, nz, px, pz, exists) => {
    if (!exists) return;
    let t = Infinity;
    if (Math.abs(nx) > 0.5) {
      if (Math.abs(dx) < 1e-6) return;
      t = (px - x0) / dx;
    } else {
      if (Math.abs(dz) < 1e-6) return;
      t = (pz - z0) / dz;
    }
    if (t < 0.01 || t > 1.08 || t >= bestT) return;
    const hx = x0 + dx * t;
    const hz = z0 + dz * t;
    if (Math.abs(hx - c.x) > half + 0.35 || Math.abs(hz - c.z) > half + 0.35) return;
    bestT = t;
    best = { nx, nz, px, pz };
  };
  tryPlane(0, -1, c.x, c.z - half, cell.top);
  tryPlane(0, 1, c.x, c.z + half, cell.bottom);
  tryPlane(-1, 0, c.x - half, c.z, cell.left);
  tryPlane(1, 0, c.x + half, c.z, cell.right);
  if (best) return best;
  const ax = dx / len;
  const az = dz / len;
  const walls = [];
  const add = (nx, nz, exists) => {
    if (!exists) return;
    const dot = ax * nx + az * nz;
    if (dot > 0.05) walls.push({ ...wallFaceFromCell(ctx, maze, gx, gz, nx, nz), dot });
  };
  add(0, -1, cell.top);
  add(0, 1, cell.bottom);
  add(-1, 0, cell.left);
  add(1, 0, cell.right);
  if (!walls.length) return null;
  walls.sort((a, b) => b.dot - a.dot);
  return walls[0];
}

function addFloorBlob(scene, x, z, color) {
  const group = new THREE.Group();
  group.name = "paintSplat";
  group.position.set(x, 0.11, z);
  const mat = splatMat(color);
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.34, 12), mat);
  core.rotation.x = -Math.PI / 2;
  group.add(core);
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.1 + Math.random() * 0.18, 8), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((Math.random() - 0.5) * 0.55, 0.01, (Math.random() - 0.5) * 0.55);
    group.add(m);
  }
  scene.add(group);
  pushSplat({ mesh: group, kind: "floor" });
}

/** 依瞄準線上漆；命中角色會貼在模型上 */
export function spawnPaintFromAim(scene, ctx, maze, ox, oy, oz, dx, dy, dz, color, ignoreRoot = null, players = []) {
  if (!scene) return false;
  const col = color ?? 0xff4466;
  _origin.set(ox, oy, oz);
  _dir.set(dx, dy, dz);
  if (_dir.lengthSq() < 1e-6) return false;
  _dir.normalize();
  _raycaster.set(_origin, _dir);
  _raycaster.far = 58;
  const meshes = collectPaintMeshes(scene, ignoreRoot);
  const hits = _raycaster.intersectObjects(meshes, true);
  for (const hit of hits) {
    if (!hit.face) continue;
    _wp.copy(hit.point);
    const n = hit.face.normal.clone();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
    n.applyMatrix3(normalMatrix).normalize();
    _wn.copy(n);
    const player = findSurvivorForObject(hit.object, players);
    if (player) {
      attachSplatToPlayer(player, _wp, _wn, col);
      return true;
    }
    spawnPaintOnWorldSurface(scene, _wp, _wn, col);
    return true;
  }
  return spawnPaintAlongAimMaze(scene, ctx, maze, ox, oy, oz, dx, dy, dz, col);
}

export function spawnPaintOnBody(scene, target, fromX, fromZ, footY, color) {
  if (!target?.mesh) return;
  const col = color ?? 0xff4466;
  const tx = target.pos.x;
  const tz = target.pos.z;
  const ty = (footY ?? 0) + 0.85 + Math.random() * 0.75;
  const nx = tx - fromX;
  const nz = tz - fromZ;
  const len = Math.hypot(nx, nz) || 1;
  const normal = new THREE.Vector3(nx / len, 0.12, nz / len);
  _wp.set(tx + (Math.random() - 0.5) * 0.3, ty, tz + (Math.random() - 0.5) * 0.3);
  attachSplatToPlayer(target, _wp, normal, col);
}

function spawnPaintAlongAimMaze(scene, ctx, maze, ox, oy, oz, dx, dy, dz, color) {
  if (!ctx || !maze) return false;
  const dir = new THREE.Vector3(dx, dy, dz).normalize();
  const maxDist = 52;
  if (dir.y < -0.06 && oy > 0.15) {
    const tFloor = -oy / dir.y;
    if (tFloor > 0.05 && tFloor < maxDist) {
      const fx = ox + dir.x * tFloor;
      const fz = oz + dir.z * tFloor;
      if (!collides(ctx, maze, fx, fz, 0.15, 0, 0, { vaultClear: 99 })) {
        addFloorBlob(scene, fx, fz, color);
        return true;
      }
    }
  }
  const hLen = Math.hypot(dir.x, dir.z);
  if (hLen < 0.04) return false;
  const endX = ox + (dir.x / hLen) * maxDist;
  const endZ = oz + (dir.z / hLen) * maxDist;
  const face = raycastWallFace(ctx, maze, ox, oz, endX, endZ);
  if (face) {
    addBlobWallSplat(scene, face, color);
    return true;
  }
  return false;
}

export function spawnPaintSplat(scene, ctx, maze, x, z, color) {
  if (!scene) return;
  addFloorBlob(scene, x, z, color ?? 0xff4466);
}

export function spawnPaintAtHit(scene, ctx, maze, x, z, color, prevX, prevZ, fireDir = null, hitType = "wall", opts = {}) {
  if (!scene || !ctx || !maze) return;
  const col = color ?? 0xff4466;
  if (hitType === "floor") {
    addFloorBlob(scene, x, z, col);
    return;
  }
  const x0 = prevX ?? x;
  const z0 = prevZ ?? z;
  const face = raycastWallFace(ctx, maze, x0, z0, x, z);
  if (face) {
    face.hitX = x;
    face.hitZ = z;
    addBlobWallSplat(scene, face, col, opts);
  } else addFloorBlob(scene, x, z, col);
}
