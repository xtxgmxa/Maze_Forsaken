import * as THREE from "three";
import { cellCenter, worldToCell, collides } from "./maze.js";

export const PAINT_PALETTE = [
  0xff4466, 0x44ddff, 0xffcc44, 0x66ff99, 0xff66cc, 0xaa88ff, 0xff8844, 0x22ffaa,
];

const MAX_SPLATS = 140;
const splatPool = [];
const _raycaster = new THREE.Raycaster();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();

export function assignPaintColor(p, index = 0) {
  if (!p) return;
  p.paintColor = p.charDef?.accent || PAINT_PALETTE[index % PAINT_PALETTE.length];
}

export function clearPaintSplats(scene) {
  for (const s of splatPool) {
    if (scene) s.mesh?.parent?.remove(s.mesh);
  }
  splatPool.length = 0;
}

function pushSplat(mesh) {
  while (splatPool.length >= MAX_SPLATS) {
    const old = splatPool.shift();
    old.mesh?.parent?.remove(old.mesh);
  }
  splatPool.push({ mesh });
}

function splatMat(color) {
  return new THREE.MeshBasicMaterial({
    color: color ?? 0xff4466,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
  });
}

function collectPaintMeshes(scene, ignoreMesh) {
  const list = [];
  if (!scene) return list;
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    if (o.userData?.skipPaint || o.userData?.fpGun) return;
    if (ignoreMesh && (o === ignoreMesh || o.parent === ignoreMesh)) return;
    const n = o.name || "";
    if (n === "exit" || n.startsWith("teleporter")) return;
    list.push(o);
  });
  return list;
}

function spawnPaintOnSurface(scene, point, normal, color) {
  const n = (normal && normal.lengthSq() > 0.01)
    ? normal.clone().normalize()
    : new THREE.Vector3(0, 1, 0);
  const group = new THREE.Group();
  const mat = splatMat(color);
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.28 + Math.random() * 0.18, 12), mat);
  group.add(core);
  for (let i = 0; i < 7; i++) {
    const r = 0.08 + Math.random() * 0.16;
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 8), mat);
    m.position.set((Math.random() - 0.5) * 0.45, (Math.random() - 0.5) * 0.45, 0);
    group.add(m);
  }
  const up = Math.abs(n.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(up, n).normalize();
  const bitangent = new THREE.Vector3().crossVectors(n, tangent);
  group.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(tangent, bitangent, n)
  );
  group.position.copy(point).addScaledVector(n, 0.05);
  scene.add(group);
  pushSplat(group);
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

function orientGroupToWall(group, face) {
  const eps = 0.26;
  group.position.set(face.px + face.nx * eps, 0, face.pz + face.nz * eps);
  if (face.nx > 0) group.rotation.y = -Math.PI / 2;
  else if (face.nx < 0) group.rotation.y = Math.PI / 2;
  else if (face.nz > 0) group.rotation.y = 0;
  else group.rotation.y = Math.PI;
}

function addBlobWallSplat(scene, face, color) {
  const group = new THREE.Group();
  orientGroupToWall(group, face);
  const mat = splatMat(color);
  const baseY = 0.45 + Math.random() * 2.4;
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.42 + Math.random() * 0.25, 14), mat);
  core.position.set(0, baseY, 0.04);
  group.add(core);
  for (let i = 0; i < 10; i++) {
    const r = 0.14 + Math.random() * 0.28;
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 10), mat);
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * 0.65;
    mesh.position.set(Math.cos(ang) * dist, baseY + (Math.random() - 0.5) * 0.75, 0.02);
    mesh.rotation.z = Math.random() * Math.PI;
    group.add(mesh);
  }
  scene.add(group);
  pushSplat(group);
}

function addFloorBlob(scene, x, z, color) {
  const group = new THREE.Group();
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
  pushSplat(group);
}

/** 依瞄準線對場景網格射線 → 牆／地／角色／掩體皆可上漆 */
export function spawnPaintFromAim(scene, ctx, maze, ox, oy, oz, dx, dy, dz, color, ignoreRoot = null) {
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
    const n = hit.face.normal.clone();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
    n.applyMatrix3(normalMatrix).normalize();
    spawnPaintOnSurface(scene, hit.point, n, col);
    return true;
  }
  return spawnPaintAlongAimMaze(scene, ctx, maze, ox, oy, oz, dx, dy, dz, col);
}

export function spawnPaintOnBody(scene, target, fromX, fromZ, footY, color) {
  if (!scene || !target) return;
  const col = color ?? 0xff4466;
  const tx = target.pos.x;
  const tz = target.pos.z;
  const ty = (footY ?? 0) + 0.9 + Math.random() * 0.7;
  const nx = tx - fromX;
  const nz = tz - fromZ;
  const len = Math.hypot(nx, nz) || 1;
  const normal = new THREE.Vector3(nx / len, 0.15, nz / len);
  spawnPaintOnSurface(scene, new THREE.Vector3(tx + (Math.random() - 0.5) * 0.35, ty, tz + (Math.random() - 0.5) * 0.35), normal, col);
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

export function spawnPaintAtHit(scene, ctx, maze, x, z, color, prevX, prevZ, fireDir = null, hitType = "wall") {
  if (!scene || !ctx || !maze) return;
  const col = color ?? 0xff4466;
  if (hitType === "floor") {
    addFloorBlob(scene, x, z, col);
    return;
  }
  const x0 = prevX ?? x;
  const z0 = prevZ ?? z;
  const face = raycastWallFace(ctx, maze, x0, z0, x, z);
  if (face) addBlobWallSplat(scene, face, col);
  else addFloorBlob(scene, x, z, col);
}
