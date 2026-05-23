import * as THREE from "three";
import { cellCenter, worldToCell, collides, openMazePassage, AIRY_JUMP_MIN } from "./maze.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const KEY_COLORS = [0xffdd44, 0x44ccff, 0xff66aa, 0x66ff99, 0xff8844, 0xaa88ff, 0xff44ff, 0x44ffdd];

/** 封鎖通道、放置門與鑰匙（每扇門對應同色編號鑰匙） */
export function setupKeyHuntLevel(ctx, maze, level) {
  const w = ctx.w;
  const h = ctx.h;
  const cell = ctx.cell;
  const doorCount = level.doors ?? 10;
  const extraKeys = level.extraKeys ?? 3;

  const passages = [];
  for (let gz = 0; gz < h; gz++) {
    for (let gx = 0; gx < w; gx++) {
      const c = maze[gz][gx];
      if (gx < w - 1 && !c.right) {
        const cc = cellCenter(ctx, gx, gz);
        passages.push({ side: "right", gx, gz, x: cc.x + cell * 0.5, z: cc.z });
      }
      if (gz < h - 1 && !c.bottom) {
        const cc = cellCenter(ctx, gx, gz);
        passages.push({ side: "bottom", gx, gz, x: cc.x, z: cc.z + cell * 0.5 });
      }
    }
  }
  shuffle(passages);

  const farFromSpawn = (gx, gz) => gx + gz >= 3;
  const doorPassages = passages.filter((p) => farFromSpawn(p.gx, p.gz));
  const nearPassages = passages.filter((p) => !farFromSpawn(p.gx, p.gz));

  const doors = [];
  const pickList = [...doorPassages];
  if (pickList.length < doorCount) pickList.push(...nearPassages);
  for (let i = 0; i < Math.min(doorCount, pickList.length); i++) {
    const p = pickList[i];
    const keyId = i;
    const cell = maze[p.gz][p.gx];
    if (p.side === "right") {
      cell.right = true;
      if (p.gx < w - 1) maze[p.gz][p.gx + 1].left = true;
    } else {
      cell.bottom = true;
      if (p.gz < h - 1) maze[p.gz + 1][p.gx].top = true;
    }
    doors.push({
      id: i,
      side: p.side,
      gx: p.gx,
      gz: p.gz,
      keyId,
      label: i + 1,
      open: false,
      x: p.x,
      z: p.z,
      color: KEY_COLORS[keyId % KEY_COLORS.length],
      mesh: null,
    });
  }

  const keys = [];
  const used = new Set(["0,0", `${w - 1},${h - 1}`]);
  doors.forEach((d) => used.add(`${d.gx},${d.gz}`));

  for (const d of doors) {
    let placed = false;
    for (let t = 0; t < 120 && !placed; t++) {
      const gx = Math.floor(Math.random() * w);
      const gz = Math.floor(Math.random() * h);
      const k = `${gx},${gz}`;
      if (used.has(k)) continue;
      used.add(k);
      const c = cellCenter(ctx, gx, gz);
      keys.push({
        gx, gz, x: c.x, z: c.z,
        keyId: d.keyId,
        label: d.label,
        color: d.color,
        collected: false,
        mesh: null,
      });
      placed = true;
    }
  }

  ensureSpawnReachable(ctx, maze, doors, w, h);
  placeStarterKey(ctx, maze, keys, doors, used, w, h);

  let guard = 0;
  while (keys.length < doors.length + Math.min(extraKeys, 2) && guard < 500) {
    guard++;
    const gx = Math.floor(Math.random() * w);
    const gz = Math.floor(Math.random() * h);
    const k = `${gx},${gz}`;
    if (used.has(k)) continue;
    used.add(k);
    const keyId = guard % KEY_COLORS.length;
    const c = cellCenter(ctx, gx, gz);
    keys.push({
      gx, gz, x: c.x, z: c.z,
      keyId,
      label: keyId + 1,
      color: KEY_COLORS[keyId],
      collected: false,
      mesh: null,
      decoy: true,
    });
  }

  const traps = [];
  for (let t = 0; t < (level.traps ?? 5); t++) {
    const gx = 2 + Math.floor(Math.random() * Math.max(1, w - 3));
    const gz = 2 + Math.floor(Math.random() * Math.max(1, h - 3));
    const c = cellCenter(ctx, gx, gz);
    traps.push({ x: c.x, z: c.z, radius: 1.6, cooldown: 0, mesh: null });
  }

  const spikes = [];
  for (let s = 0; s < (level.spikes ?? 4); s++) {
    const gx = 1 + Math.floor(Math.random() * Math.max(1, w - 2));
    const gz = 1 + Math.floor(Math.random() * Math.max(1, h - 2));
    const c = cellCenter(ctx, gx, gz);
    spikes.push({
      x: c.x, z: c.z,
      axis: Math.random() > 0.5 ? "x" : "z",
      len: 3 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      speed: 1.2 + Math.random() * 0.8,
      damage: level.spikeDamage ?? 18,
      mesh: null,
      _hitCd: 0,
    });
  }

  return { doors, keys, traps, spikes, keyColors: KEY_COLORS };
}

export function buildKeyHuntMeshes(scene, state, cellSize) {
  const { doors, keys, traps, spikes } = state;
  const group = new THREE.Group();
  group.name = "keyHunt";
  const thick = Math.max(0.5, cellSize * 0.1);
  const span = cellSize * 0.92;

  doors.forEach((d) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({
      color: 0x553366,
      emissive: d.color,
      emissiveIntensity: 0.55,
    });
    const bar = new THREE.Mesh(
      d.side === "right"
        ? new THREE.BoxGeometry(thick, 3.6, span)
        : new THREE.BoxGeometry(span, 3.6, thick),
      mat
    );
    bar.position.y = 1.8;
    g.add(bar);
    const lock = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.35),
      new THREE.MeshLambertMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.9 })
    );
    lock.position.y = 1.5;
    g.add(lock);
    const canvas = makeLabelSprite(`#${d.label}`, d.color);
    canvas.position.y = 2.8;
    g.add(canvas);
    g.position.set(d.x, 0, d.z);
    d.mesh = g;
    d.lockMesh = lock;
    group.add(g);
  });

  keys.forEach((k) => {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.MeshLambertMaterial({ color: k.color, emissive: k.color, emissiveIntensity: 0.95 })
    );
    core.position.y = 1.35;
    g.add(core);
    g.add(makeLabelSprite(`#${k.label}`, k.color, 0.55));
    g.children[g.children.length - 1].position.y = 2.1;
    g.position.set(k.x, 0, k.z);
    k.mesh = g;
    group.add(g);
  });

  traps.forEach((tr) => {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(tr.radius, tr.radius, 0.15, 12),
      new THREE.MeshLambertMaterial({
        color: 0x8844ff, emissive: 0x4422aa, emissiveIntensity: 0.6, transparent: true, opacity: 0.75,
      })
    );
    pad.position.set(tr.x, 0.08, tr.z);
    tr.mesh = pad;
    group.add(pad);
  });

  spikes.forEach((sp) => {
    const g = new THREE.Group();
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.2, 6),
      new THREE.MeshLambertMaterial({ color: 0xff2244, emissive: 0xaa0011, emissiveIntensity: 0.5 })
    );
    blade.position.y = 0.6;
    g.add(blade);
    g.position.set(sp.x, 0, sp.z);
    sp.mesh = g;
    group.add(g);
  });

  scene.add(group);
  return group;
}

function makeLabelSprite(text, color, scale = 0.85) {
  const cvs = document.createElement("canvas");
  cvs.width = 64;
  cvs.height = 32;
  const cx = cvs.getContext("2d");
  cx.fillStyle = "rgba(0,0,0,0.55)";
  cx.fillRect(0, 0, 64, 32);
  cx.fillStyle = `#${(color >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
  cx.font = "bold 18px sans-serif";
  cx.textAlign = "center";
  cx.fillText(text, 32, 22);
  const tex = new THREE.CanvasTexture(cvs);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(scale * 2, scale, 1);
  return sp;
}

export function collidesClosedDoor(doors, x, z, radius = 0.45, cellSize = 9) {
  const halfSpan = cellSize * 0.42 + radius;
  const thick = 0.65 + radius;
  for (const d of doors) {
    if (d.open || d.noCollider) continue;
    if (d.side === "right") {
      if (Math.abs(x - d.x) < thick && Math.abs(z - d.z) < halfSpan) return true;
    } else {
      if (Math.abs(z - d.z) < thick && Math.abs(x - d.x) < halfSpan) return true;
    }
  }
  return false;
}

export function moveWithDoorCollision(ctx, maze, doors, pos, vx, vz, dt, jumpY = 0) {
  const nx = pos.x + vx * dt;
  const nz = pos.z + vz * dt;
  const r = 0.45;
  const airy = jumpY > AIRY_JUMP_MIN;
  const jr = airy ? 0.16 : r;
  if (!collides(ctx, maze, nx, pos.z, jr, jumpY) && !collidesClosedDoor(doors, nx, pos.z, jr, ctx.cell)) pos.x = nx;
  if (!collides(ctx, maze, pos.x, nz, jr, jumpY) && !collidesClosedDoor(doors, pos.x, nz, jr, ctx.cell)) pos.z = nz;
  if (jumpY > 0.48) {
    const cx = pos.x + vx * dt;
    const cz = pos.z + vz * dt;
    if (
      !collides(ctx, maze, cx, cz, 0.34, jumpY) &&
      !collidesClosedDoor(doors, cx, cz, 0.34, ctx.cell)
    ) {
      pos.x = cx;
      pos.z = cz;
    }
  }
  nudgeThroughOpenDoor(doors, pos, vx, vz);
}

function nudgeThroughOpenDoor(doors, pos, vx, vz) {
  for (const d of doors) {
    if (!d.open) continue;
    if (Math.hypot(pos.x - d.x, pos.z - d.z) > 2.2) continue;
    if (d.side === "right" && Math.abs(vx) > 0.01) {
      pos.x += vx > 0 ? 0.15 : -0.15;
    }
    if (d.side === "bottom" && Math.abs(vz) > 0.01) {
      pos.z += vz > 0 ? 0.15 : -0.15;
    }
  }
}

export function openDoor(door, maze, ctx) {
  if (!door || door.open) return;
  door.open = true;
  door.noCollider = true;
  openMazePassage(maze, ctx.w, ctx.h, door);
  if (door.mesh) {
    door.mesh.visible = false;
    door.mesh.traverse((c) => { c.visible = false; });
  }
}

/** 須在門的「鑰匙側」才能開鎖 */
export function canOpenDoorFromPlayerSide(player, door, ctx) {
  const { gx, gz } = worldToCell(ctx, player.pos.x, player.pos.z);
  if (door.side === "right") return gx <= door.gx;
  return gz <= door.gz;
}

export function getDoorApproachHint(door) {
  if (door.side === "right") return "請繞到門的左側（另一條路）用鑰匙開門";
  return "請繞到門的上側（另一條路）用鑰匙開門";
}

export function playerHasKey(player, keyId) {
  if (!player.keysHeld) player.keysHeld = new Set();
  return player.keysHeld.has(keyId);
}

export function getOpenableDoors(player, doors, maxDist = 3.2) {
  const list = [];
  for (const d of doors) {
    if (d.open) continue;
    if (!playerHasKey(player, d.keyId)) continue;
    const dist = Math.hypot(player.pos.x - d.x, player.pos.z - d.z);
    if (dist <= maxDist) list.push({ door: d, dist });
  }
  list.sort((a, b) => a.dist - b.dist);
  return list;
}

export function tryOpenDoorAtPlayer(player, doors, maze, ctx, opts = {}) {
  const maxDist = opts.maxDist ?? 3.5;
  for (const d of doors) {
    if (d.open) continue;
    if (!playerHasKey(player, d.keyId)) continue;
    const dist = Math.hypot(player.pos.x - d.x, player.pos.z - d.z);
    if (dist > maxDist + 0.5) continue;
    if (!canOpenDoorFromPlayerSide(player, d, ctx)) {
      return { wrongSide: true, door: d, hint: getDoorApproachHint(d) };
    }
  }

  let near = getOpenableDoors(player, doors, maxDist)
    .filter((n) => canOpenDoorFromPlayerSide(player, n.door, ctx));
  if (!near.length && (player.boltCharges > 0 || (player.inventory?.bolt ?? 0) > 0)) {
    const any = [];
    for (const d of doors) {
      if (d.open) continue;
      const dist = Math.hypot(player.pos.x - d.x, player.pos.z - d.z);
      if (dist <= maxDist + 0.5) any.push({ door: d, dist });
    }
    any.sort((a, b) => a.dist - b.dist);
    if (any.length) {
      const d = any[0].door;
      openDoor(d, maze, ctx);
      if (player.boltCharges > 0) player.boltCharges--;
      else if (player.inventory?.bolt) {
        player.inventory.bolt--;
        if (player.inventory.bolt <= 0) delete player.inventory.bolt;
      }
      return { ...d, usedBolt: true };
    }
  }
  if (!near.length) return null;
  const d = near[0].door;
  openDoor(d, maze, ctx);
  return d;
}

function countReachableFromSpawn(ctx, maze, doors) {
  const blocked = (gx, gz, nx, nz) => {
    for (const d of doors) {
      if (d.open) continue;
      if (d.side === "right" && d.gx === gx && d.gz === gz && nx === gx + 1) return true;
      if (d.side === "bottom" && d.gx === gx && d.gz === gz && nz === gz + 1) return true;
    }
    return false;
  };
  return bfsReach(ctx, maze, 0, 0, blocked).size;
}

function ensureSpawnReachable(ctx, maze, doors, w, h) {
  const need = Math.max(10, Math.floor(w * h * 0.06));
  if (countReachableFromSpawn(ctx, maze, doors) >= need) return;

  const byDist = [...doors].filter((d) => !d.open).sort((a, b) => a.gx + a.gz - (b.gx + b.gz));
  for (const d of byDist) {
    if (d.gx + d.gz > 2) continue;
    openDoor(d, maze, ctx);
    if (countReachableFromSpawn(ctx, maze, doors) >= need) return;
  }
  if (countReachableFromSpawn(ctx, maze, doors) >= 6) return;
  const first = byDist.find((d) => !d.open);
  if (first) openDoor(first, maze, ctx);
}

function bfsReach(ctx, maze, sx, sz, blockedFn) {
  const seen = new Set([`${sx},${sz}`]);
  const q = [[sx, sz]];
  while (q.length) {
    const [gx, gz] = q.shift();
    const cell = maze[gz][gx];
    const tryN = (nx, nz, wall) => {
      if (wall || blockedFn(gx, gz, nx, nz)) return;
      if (nx < 0 || nz < 0 || nx >= ctx.w || nz >= ctx.h) return;
      const k = `${nx},${nz}`;
      if (seen.has(k)) return;
      seen.add(k);
      q.push([nx, nz]);
    };
    tryN(gx, gz - 1, cell.top);
    tryN(gx + 1, gz, cell.right);
    tryN(gx, gz + 1, cell.bottom);
    tryN(gx - 1, gz, cell.left);
  }
  return seen;
}

function placeStarterKey(ctx, maze, keys, doors, used, w, h) {
  const starterCells = [[1, 0], [0, 1], [1, 1], [2, 0], [0, 2]];
  const door0 = doors[0];
  if (!door0) return;
  for (const [gx, gz] of starterCells) {
    const k = `${gx},${gz}`;
    if (used.has(k) || gx >= w || gz >= h) continue;
    used.add(k);
    const c = cellCenter(ctx, gx, gz);
    keys.push({
      gx, gz, x: c.x, z: c.z,
      keyId: door0.keyId,
      label: door0.label,
      color: door0.color,
      collected: false,
      mesh: null,
      starter: true,
    });
    return;
  }
}

export function syncPlayerKeyVisuals(player) {
  if (!player.mesh) return;
  if (!player._keyVisualGroup) {
    player._keyVisualGroup = new THREE.Group();
    player._keyVisualGroup.name = "heldKeys";
    player.mesh.add(player._keyVisualGroup);
  }
  const g = player._keyVisualGroup;
  while (g.children.length) g.remove(g.children[0]);
  const held = [...(player.keysHeld || [])];
  held.forEach((keyId, i) => {
    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshLambertMaterial({
        color: KEY_COLORS[keyId % KEY_COLORS.length],
        emissive: KEY_COLORS[keyId % KEY_COLORS.length],
        emissiveIntensity: 0.9,
      })
    );
    orb.position.set(-0.45 + (i % 4) * 0.28, 2.15 + Math.floor(i / 4) * 0.22, 0.55);
    g.add(orb);
    const tag = makeLabelSprite(`#${keyId + 1}`, KEY_COLORS[keyId % KEY_COLORS.length], 0.35);
    tag.position.copy(orb.position);
    tag.position.y += 0.35;
    g.add(tag);
  });
}

export function bfsNextStepWithDoors(ctx, maze, doors, sx, sz, tx, tz) {
  const start = worldToCell(ctx, sx, sz);
  const target = worldToCell(ctx, tx, tz);
  if (start.gx === target.gx && start.gz === target.gz) return null;
  const key = (a, b) => `${a},${b}`;
  const q = [[start.gx, start.gz]];
  const prev = new Map();
  prev.set(key(start.gx, start.gz), null);

  const doorBlocks = (gx, gz, nx, nz) => {
    for (const d of doors) {
      if (d.open) continue;
      if (d.side === "right" && d.gx === gx && d.gz === gz && nx === gx + 1 && nz === gz) return true;
      if (d.side === "right" && d.gx === gx - 1 && d.gz === gz && nx === gx && nz === gz) return true;
      if (d.side === "bottom" && d.gx === gx && d.gz === gz && nx === gx && nz === gz + 1) return true;
      if (d.side === "bottom" && d.gx === gx && d.gz === gz - 1 && nx === gx && nz === gz) return true;
    }
    return false;
  };

  const neighbors = (gx, gz) => {
    const cell = maze[gz][gx];
    const out = [];
    if (!cell.top && gz > 0 && !doorBlocks(gx, gz, gx, gz - 1)) out.push([gx, gz - 1]);
    if (!cell.bottom && gz < ctx.h - 1 && !doorBlocks(gx, gz, gx, gz + 1)) out.push([gx, gz + 1]);
    if (!cell.left && gx > 0 && !doorBlocks(gx, gz, gx - 1, gz)) out.push([gx - 1, gz]);
    if (!cell.right && gx < ctx.w - 1 && !doorBlocks(gx, gz, gx + 1, gz)) out.push([gx + 1, gz]);
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

export function updateKeyHunt(dt, time, state, players, ctx, maze, exitPos, callbacks) {
  const { doors, keys, traps, spikes } = state;

  for (const k of keys) {
    if (k.collected || !k.mesh) continue;
    k.mesh.rotation.y += dt * 2.5;
    k.mesh.position.y = Math.sin(time * 3 + k.gx) * 0.12;
    for (const p of players) {
      if (p.caught || (p.hp ?? 100) <= 0) continue;
      if (Math.hypot(p.pos.x - k.x, p.pos.z - k.z) < 1.45) {
        k.collected = true;
        k.mesh.visible = false;
        if (!p.keysHeld) p.keysHeld = new Set();
        p.keysHeld.add(k.keyId);
        syncPlayerKeyVisuals(p);
        callbacks.onKey?.(p, k);
      }
    }
  }

  for (const p of players) syncPlayerKeyVisuals(p);

  for (const tr of traps) {
    tr.cooldown = Math.max(0, (tr.cooldown || 0) - dt);
    for (const p of players) {
      if (p.caught || (p.hp ?? 100) <= 0 || tr.cooldown > 0) continue;
      if (Math.hypot(p.pos.x - tr.x, p.pos.z - tr.z) < tr.radius) {
        tr.cooldown = 2.5;
        let bestGx = 0, bestGz = 0, bestD = 0;
        for (let gz = 0; gz < ctx.h; gz++) {
          for (let gx = 0; gx < ctx.w; gx++) {
            if (gx === ctx.w - 1 && gz === ctx.h - 1) continue;
            const c = cellCenter(ctx, gx, gz);
            const d = Math.hypot(c.x - exitPos.x, c.z - exitPos.z);
            if (d > bestD) { bestD = d; bestGx = gx; bestGz = gz; }
          }
        }
        const far = cellCenter(ctx, bestGx, bestGz);
        p.pos.x = far.x;
        p.pos.z = far.z;
        p.invuln = 1.2;
        callbacks.onTrap?.(p);
      }
    }
  }

  for (const sp of spikes) {
    sp.phase += dt * sp.speed;
    sp._hitCd = Math.max(0, (sp._hitCd || 0) - dt);
    const offset = Math.sin(sp.phase) * sp.len * 0.45;
    const sx = sp.axis === "x" ? sp.x + offset : sp.x;
    const sz = sp.axis === "z" ? sp.z + offset : sp.z;
    if (sp.mesh) sp.mesh.position.set(sx, 0, sz);
    if (sp._hitCd > 0) continue;
    for (const p of players) {
      if (p.caught || (p.hp ?? 100) <= 0 || (p.invuln ?? 0) > 0) continue;
      if (Math.hypot(p.pos.x - sx, p.pos.z - sz) < 1.15) {
        sp._hitCd = 0.55;
        callbacks.onSpike?.(p, sp.damage);
        break;
      }
    }
  }
}

export function allDoorsOpen(doors) {
  return doors.length > 0 && doors.every((d) => d.open);
}

export function keysRemaining(keys) {
  return keys.filter((k) => !k.collected).length;
}

export function doorsRemaining(doors) {
  return doors.filter((d) => !d.open).length;
}
