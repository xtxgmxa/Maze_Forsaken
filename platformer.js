import * as THREE from "three";
import { cellCenter, worldToCell } from "./maze.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 瑪利歐風格：小怪、噴火、落石、單向門 */
export function setupPlatformerLevel(ctx, maze, level) {
  const w = ctx.w;
  const h = ctx.h;
  const enemies = [];
  const count = level.enemies ?? 6;
  for (let i = 0; i < count; i++) {
    const gx = 1 + Math.floor(Math.random() * (w - 2));
    const gz = 1 + Math.floor(Math.random() * (h - 2));
    const c = cellCenter(ctx, gx, gz);
    const axis = Math.random() > 0.5 ? "x" : "z";
    enemies.push({
      x: c.x,
      z: c.z,
      axis,
      patrol: 2.5 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      speed: 2.2 + Math.random() * 1.2,
      hp: 1,
      mesh: null,
      squashed: false,
    });
  }

  const hazards = [];
  for (let f = 0; f < (level.fires ?? 4); f++) {
    const gx = 1 + Math.floor(Math.random() * (w - 2));
    const gz = 1 + Math.floor(Math.random() * (h - 2));
    const c = cellCenter(ctx, gx, gz);
    hazards.push({
      type: "fire",
      x: c.x,
      z: c.z,
      phase: Math.random() * Math.PI * 2,
      damage: level.hazardDamage ?? 16,
      mesh: null,
    });
  }

  for (let r = 0; r < (level.rocks ?? 3); r++) {
    const gx = 2 + Math.floor(Math.random() * (w - 3));
    const gz = 2 + Math.floor(Math.random() * (h - 3));
    const c = cellCenter(ctx, gx, gz);
    hazards.push({
      type: "rock",
      x: c.x,
      z: c.z,
      y: 6,
      vy: 0,
      interval: 2.8 + Math.random() * 1.5,
      timer: 1 + Math.random() * 2,
      damage: level.hazardDamage ?? 22,
      mesh: null,
    });
  }

  const oneWays = [];
  const passages = [];
  for (let gz = 0; gz < h; gz++) {
    for (let gx = 0; gx < w; gx++) {
      const c = maze[gz][gx];
      if (gx < w - 1 && !c.right) {
        const cc = cellCenter(ctx, gx, gz);
        passages.push({
          side: "right", gx, gz, x: cc.x + ctx.cell * 0.5, z: cc.z,
          dirGx: 1, dirGz: 0,
        });
      }
      if (gz < h - 1 && !c.bottom) {
        const cc = cellCenter(ctx, gx, gz);
        passages.push({
          side: "bottom", gx, gz, x: cc.x, z: cc.z + ctx.cell * 0.5,
          dirGx: 0, dirGz: 1,
        });
      }
    }
  }
  shuffle(passages);
  for (let i = 0; i < Math.min(level.oneWays ?? 4, passages.length); i++) {
    const p = passages[i];
    oneWays.push({ ...p, mesh: null });
  }

  return { enemies, hazards, oneWays };
}

export function buildPlatformerMeshes(scene, state, cellSize) {
  const group = new THREE.Group();
  group.name = "platformer";

  state.enemies.forEach((e) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0x44cc44, emissive: 0x228822, emissiveIntensity: 0.4 })
    );
    body.position.y = 0.55;
    body.scale.set(1.1, 0.85, 1.1);
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    eye.position.set(0.2, 0.75, 0.45);
    g.add(body, eye);
    g.position.set(e.x, 0, e.z);
    e.mesh = g;
    group.add(g);
  });

  state.hazards.forEach((h) => {
    if (h.type === "fire") {
      const g = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.1, 0.2, 10),
        new THREE.MeshLambertMaterial({ color: 0x442211 })
      );
      base.position.y = 0.1;
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 1.4, 8),
        new THREE.MeshLambertMaterial({ color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 0.8 })
      );
      flame.position.y = 0.9;
      g.add(base, flame);
      g.position.set(h.x, 0, h.z);
      h.mesh = g;
      h.flameMesh = flame;
      group.add(g);
    } else if (h.type === "rock") {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55, 0),
        new THREE.MeshLambertMaterial({ color: 0x888899, emissive: 0x333344, emissiveIntensity: 0.2 })
      );
      rock.position.set(h.x, h.y, h.z);
      h.mesh = rock;
      group.add(rock);
    }
  });

  state.oneWays.forEach((ow) => {
    const g = new THREE.Group();
    const bar = new THREE.Mesh(
      ow.side === "right"
        ? new THREE.BoxGeometry(0.25, 2.8, cellSize * 0.7)
        : new THREE.BoxGeometry(cellSize * 0.7, 2.8, 0.25),
      new THREE.MeshLambertMaterial({
        color: 0x44aaff,
        emissive: 0x2266aa,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.75,
      })
    );
    bar.position.y = 1.4;
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.8, 4),
      new THREE.MeshBasicMaterial({ color: 0x88ddff })
    );
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(ow.side === "right" ? 0.5 : 0, 0.5, ow.side === "bottom" ? 0.5 : 0);
    if (ow.side === "bottom") arrow.rotation.z = Math.PI / 2;
    g.add(bar, arrow);
    g.position.set(ow.x, 0, ow.z);
    ow.mesh = g;
    group.add(g);
  });

  scene.add(group);
  return group;
}

/** 單向門：從錯誤方向靠近會擋住 */
export function collidesOneWay(oneWays, x, z, vx, vz, radius = 0.45, jumpY = 0) {
  if ((jumpY ?? 0) > 0.55) return false;
  for (const ow of oneWays) {
    const dx = x - ow.x;
    const dz = z - ow.z;
    if (Math.abs(dx) > 3 && Math.abs(dz) > 3) continue;
    const near = Math.hypot(dx, dz) < 2.2 + radius;
    if (!near) continue;
    const wrongWay =
      (ow.side === "right" && vx < -0.01) ||
      (ow.side === "bottom" && vz < -0.01);
    if (wrongWay) {
      if (ow.side === "right" && Math.abs(dx) < 1.2 + radius && Math.abs(dz) < 2) return true;
      if (ow.side === "bottom" && Math.abs(dz) < 1.2 + radius && Math.abs(dx) < 2) return true;
    }
  }
  return false;
}

export function updatePlatformer(dt, state, players, callbacks) {
  const { enemies, hazards, oneWays } = state;

  for (const e of enemies) {
    if (e.squashed) {
      if (e.mesh) e.mesh.visible = false;
      continue;
    }
    if (e._baseX == null) { e._baseX = e.x; e._baseZ = e.z; }
    e.phase += dt * e.speed;
    const off = Math.sin(e.phase) * e.patrol;
    e.x = e._baseX + (e.axis === "x" ? off : 0);
    e.z = e._baseZ + (e.axis === "z" ? off : 0);
    if (e.mesh) e.mesh.position.set(e.x, 0, e.z);

    for (const p of players) {
      if (p.caught || (p.hp ?? 100) <= 0) continue;
      const dist = Math.hypot(p.pos.x - e.x, p.pos.z - e.z);
      const stomping = (p.velY ?? 0) < -2 && (p._jumpY ?? 0) > 0.35 && dist < 1.35;
      if (stomping) {
        e.squashed = true;
        p.velY = 9;
        p.onGround = false;
        callbacks.onStomp?.(p, e);
        continue;
      }
      if (dist < 1.05 && (p.invuln ?? 0) <= 0) {
        callbacks.onEnemyTouch?.(p, e, 14);
      }
    }
  }

  for (const h of hazards) {
    if (h.type === "fire") {
      h.phase += dt * 4;
      if (h.flameMesh) {
        h.flameMesh.scale.y = 0.85 + Math.sin(h.phase) * 0.25;
        h.flameMesh.material.emissiveIntensity = 0.6 + Math.sin(h.phase) * 0.3;
      }
      const active = Math.sin(h.phase) > -0.35;
      if (!active) continue;
      for (const p of players) {
        if (p.caught || (p.hp ?? 100) <= 0 || (p.invuln ?? 0) > 0) continue;
        if (Math.hypot(p.pos.x - h.x, p.pos.z - h.z) < 1.15) {
          callbacks.onHazard?.(p, h.damage, "噴火");
        }
      }
    } else if (h.type === "rock") {
      h.timer -= dt;
      if (h.timer <= 0 && h.y >= 5.5) {
        h.y = 6;
        h.vy = 0;
        h.timer = h.interval;
      }
      if (h.y < 6) {
        h.vy -= 22 * dt;
        h.y += h.vy * dt;
        if (h.y <= 0.35) {
          h.y = 6;
          h.vy = 0;
          h.timer = h.interval * 0.5;
        }
      }
      if (h.mesh) h.mesh.position.set(h.x, h.y, h.z);
      if (h.y < 2.5) {
        for (const p of players) {
          if (p.caught || (p.hp ?? 100) <= 0 || (p.invuln ?? 0) > 0) continue;
          if (Math.hypot(p.pos.x - h.x, p.pos.z - h.z) < 1.2) {
            callbacks.onHazard?.(p, h.damage, "落石");
            h.y = 6;
            h.timer = h.interval;
          }
        }
      }
    }
  }

  state._oneWays = oneWays;
}

export function platformerBlocksMove(oneWays, x, z, vx, vz, radius, jumpY = 0) {
  return collidesOneWay(oneWays || [], x, z, vx, vz, radius, jumpY);
}
