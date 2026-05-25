import * as THREE from "three";
import { cellCenter } from "./maze.js";
import { addRivalsBouncePad, launchRivalsBounce } from "./verticalWorld.js";

const MAX_PADS_PER_PLAYER = 4;
const PAD_PREVIEW_COLOR = 0x33eeff;

function cellPassable(maze, w, h, gx, gz) {
  if (gx < 0 || gz < 0 || gx >= w || gz >= h) return false;
  const c = maze[gz][gx];
  return !c.left || !c.right || !c.top || !c.bottom;
}

/** 前方落點（可走地面） */
export function getPadPlaceWorld(p, ctx, maze, dist = 2.2) {
  if (!p) return null;
  const yaw = p.yaw ?? 0;
  let x = p.pos.x + Math.sin(yaw) * dist;
  let z = p.pos.z + Math.cos(yaw) * dist;
  const { w, h, cell } = ctx;
  for (let i = 0; i < 6; i++) {
    const gx = Math.floor((x + (w * cell) / 2) / cell);
    const gz = Math.floor((z + (h * cell) / 2) / cell);
    if (cellPassable(maze, w, h, gx, gz)) {
      const c = cellCenter(ctx, gx, gz);
      return { x: c.x, z: c.z, gx, gz, elev: p.elev ?? 0 };
    }
    x = p.pos.x + Math.sin(yaw) * (dist - i * 0.45);
    z = p.pos.z + Math.cos(yaw) * (dist - i * 0.45);
  }
  const c = cellCenter(ctx, Math.floor(w / 2), Math.floor(h / 2));
  return { x: c.x, z: c.z, gx: Math.floor(w / 2), gz: Math.floor(h / 2), elev: 0 };
}

export function ensurePadPreview(p) {
  if (!p?.mesh) return null;
  if (p._padPreview) return p._padPreview;
  const g = new THREE.Group();
  g.name = "padPreview";
  const mat = new THREE.MeshBasicMaterial({
    color: PAD_PREVIEW_COLOR,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.2, 2.7), mat);
  base.position.y = 0.12;
  g.add(base);
  const core = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 1.2), mat.clone());
  core.material.opacity = 0.65;
  core.position.y = 0.28;
  g.add(core);
  p.mesh.add(g);
  p._padPreview = g;
  return g;
}

export function tickShooterPadPreview(p, ctx, maze) {
  if (!p || p.weaponId !== "pad") {
    if (p?._padPreview) p._padPreview.visible = false;
    return;
  }
  const spot = getPadPlaceWorld(p, ctx, maze);
  if (!spot) return;
  const g = ensurePadPreview(p);
  g.visible = true;
  const elev = spot.elev ?? p.elev ?? 0;
  g.position.set(
    spot.x - p.pos.x,
    elev + 0.1 - (p._jumpY ?? 0),
    spot.z - p.pos.z
  );
}

export function countPlayerPads(pads, owner) {
  if (!pads?.length || !owner) return 0;
  return pads.filter((pad) => pad.ownerId === owner.profile || pad.owner === owner).length;
}

/** 放置玩家彈跳板（高彈 + 朝面向前） */
export function placeShooterBouncePad(p, ctx, maze, scene, verticalState) {
  if (!p || p.weaponId !== "pad" || !verticalState) return { ok: false, reason: "no_state" };
  const spot = getPadPlaceWorld(p, ctx, maze);
  if (!spot) return { ok: false, reason: "no_spot" };
  if (!verticalState.bouncePads) verticalState.bouncePads = [];
  const n = countPlayerPads(verticalState.bouncePads, p);
  if (n >= MAX_PADS_PER_PLAYER) return { ok: false, reason: "limit" };

  const yaw = p.yaw ?? 0;
  const group = verticalState.group || scene;
  const vis = addRivalsBouncePad(group, spot.x, spot.z, spot.elev ?? 0);
  const pad = {
    x: spot.x,
    z: spot.z,
    startElev: spot.elev ?? 0,
    launchVy: 32,
    launchDx: Math.sin(yaw),
    launchDz: Math.cos(yaw),
    launchPower: 1.35,
    launchSpeed: 18,
    halfW: 1.45,
    halfD: 1.45,
    owner: p,
    ownerId: p.profile,
    playerPlaced: true,
    ...vis,
  };
  verticalState.bouncePads.push(pad);
  return { ok: true, pad, placeCd: 0.55 };
}

export { launchRivalsBounce };
