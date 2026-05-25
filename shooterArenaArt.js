import * as THREE from "three";
import { cellCenter } from "./maze.js";
import { lambertStud } from "./mapTextures.js";
import { getShooterLayout, resolveSpot } from "./shooterLayouts.js";

function cellPassable(maze, w, h, gx, gz) {
  if (gx < 0 || gz < 0 || gx >= w || gz >= h) return false;
  const c = maze[gz][gx];
  return !c.left || !c.right || !c.top || !c.bottom;
}

const TIER_Y = [0, 5.5, 11, 16.5];

function openWall(maze, gx, gz, dir) {
  const c = maze[gz][gx];
  if (dir === "right" && gx < maze[0].length - 1) {
    c.right = false;
    maze[gz][gx + 1].left = false;
  } else if (dir === "bottom" && gz < maze.length - 1) {
    c.bottom = false;
    maze[gz + 1][gx].top = false;
  } else if (dir === "left" && gx > 0) {
    c.left = false;
    maze[gz][gx - 1].right = false;
  } else if (dir === "top" && gz > 0) {
    c.top = false;
    maze[gz - 1][gx].bottom = false;
  }
}

/** 布局指定密道 + 發光門框 */
export function carveLayoutSecretGates(ctx, maze, level) {
  const layout = getShooterLayout(level);
  const gates = layout.secretGates || [];
  const { w, h } = ctx;
  for (const g of gates) {
    const { gx, gz } = resolveSpot(ctx, g);
    if (!cellPassable(maze, w, h, gx, gz)) continue;
    openWall(maze, gx, gz, g.dir || "right");
  }
  return gates;
}

export function buildShooterSecretMarkers(ctx, group, maze, level) {
  const layout = getShooterLayout(level);
  const markers = [];
  const col = layout.palette?.secret ?? 0x44ffaa;
  for (const g of layout.secretGates || []) {
    const { gx, gz } = resolveSpot(ctx, g);
    const c = cellCenter(ctx, gx, gz);
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(ctx.cell * 0.38, 0.12, 6, 16),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 })
    );
    arch.rotation.x = Math.PI / 2;
    arch.position.set(c.x, 1.8, c.z);
    group.add(arch);
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(ctx.cell * 0.7, 2.2, 0.15),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 })
    );
    if (g.dir === "right") glow.position.set(c.x + ctx.cell * 0.45, 1.1, c.z);
    else if (g.dir === "bottom") {
      glow.rotation.y = Math.PI / 2;
      glow.position.set(c.x, 1.1, c.z + ctx.cell * 0.45);
    } else glow.position.set(c.x, 1.1, c.z);
    group.add(glow);
    markers.push({ x: c.x, z: c.z, gx, gz });
  }
  return markers;
}

/** 每關獨特大地標 — 顏色與造型差異明顯 */
export function buildLayoutSignature(ctx, maze, group, level) {
  const layout = getShooterLayout(level);
  const key = level.shooterLayout || "arena_ring";
  const { w, h, cell } = ctx;
  const pal = layout.palette || {};
  const accent = layout.accent ?? 0xffffff;

  const floorPatch = (u, v, rw, rh, color, emissive = 0) => {
    const c = cellCenter(ctx, resolveSpot(ctx, { u, v }).gx, resolveSpot(ctx, { u, v }).gz);
    const patch = new THREE.Mesh(
      new THREE.PlaneGeometry(cell * rw, cell * rh),
      new THREE.MeshLambertMaterial({
        color,
        emissive: emissive || (color >> 1),
        emissiveIntensity: emissive ? 0.35 : 0.12,
      })
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(c.x, 0.03, c.z);
    patch.receiveShadow = true;
    group.add(patch);
  };

  if (key === "urban_quick") {
    floorPatch(0.5, 0.5, w * 0.85, h * 0.85, pal.floor ?? 0x2a3a28);
    for (let i = 0; i < 8; i++) {
      const u = 0.15 + (i % 4) * 0.22;
      const v = 0.2 + Math.floor(i / 4) * 0.55;
      const s = resolveSpot(ctx, { u, v });
      const c = cellCenter(ctx, s.gx, s.gz);
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(cell * 0.15, cell * 1.1, cell * 0.7),
        lambertStud(0x556677, 0x334455, 0.2)
      );
      wall.position.set(c.x, 0.55, c.z);
      group.add(wall);
    }
  } else if (key === "arena_ring") {
    floorPatch(0.5, 0.5, w * 0.7, h * 0.7, pal.floor ?? 0x8a4030);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry((w * cell) * 0.28, 0.55, 12, 48),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    group.add(ring);
  } else if (key === "paintball_camp" || key === "bounce_alley") {
    floorPatch(0.5, 0.5, w * 0.9, h * 0.9, pal.floor ?? 0x6a8a44);
    const fenceCol = key === "paintball_camp" ? 0xffee33 : 0x99aa77;
    for (let gz = 1; gz < h - 1; gz++) {
      for (const gx of [1, w - 2]) {
        const c = cellCenter(ctx, gx, gz);
        const f = new THREE.Mesh(
          new THREE.BoxGeometry(cell * 0.14, cell * 0.9, cell * 0.75),
          lambertStud(fenceCol, fenceCol >> 1, 0.3)
        );
        f.position.set(c.x, 0.45, c.z);
        group.add(f);
      }
    }
  } else if (key === "sky_twin_towers") {
    floorPatch(0.5, 0.5, w * 0.95, h * 0.95, pal.floor ?? 0x224466);
    for (const spot of [{ u: 0.22, v: 0.22 }, { u: 0.78, v: 0.78 }]) {
      const s = resolveSpot(ctx, spot);
      const c = cellCenter(ctx, s.gx, s.gz);
      const th = TIER_Y[3];
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(cell * 1.1, th + 2, cell * 1.1),
        lambertStud(0x4488cc, 0x2266aa, 0.35)
      );
      tower.position.set(c.x, (th + 2) / 2, c.z);
      tower.castShadow = true;
      group.add(tower);
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(cell * 0.55, cell * 0.9, 4),
        lambertStud(0x66ccff, 0x3399dd, 0.5)
      );
      cap.position.set(c.x, th + 2.2, c.z);
      group.add(cap);
    }
  } else if (key === "central_keep") {
    floorPatch(0.5, 0.5, w * 0.75, h * 0.75, pal.floor ?? 0x4a4a55);
    const s = resolveSpot(ctx, { u: 0.5, v: 0.5 });
    const c = cellCenter(ctx, s.gx, s.gz);
    for (let tier = 1; tier <= 3; tier++) {
      const y = TIER_Y[tier];
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(cell * (1.3 - tier * 0.12), 4.8, cell * (1.3 - tier * 0.12)),
        lambertStud(0x778899 - tier * 0x111111, 0x556677, 0.28)
      );
      block.position.set(c.x, y, c.z);
      block.castShadow = true;
      group.add(block);
    }
  } else if (key === "neon_grid" || key === "neon_spire") {
    floorPatch(0.5, 0.5, w * 0.92, h * 0.92, pal.floor ?? 0x180818);
    for (let i = 0; i < 12; i++) {
      const s = resolveSpot(ctx, { u: (i * 0.17) % 1, v: (i * 0.23) % 1 });
      const cc = cellCenter(ctx, s.gx, s.gz);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.2, 3.5, 6),
        new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.75 })
      );
      beam.position.set(cc.x, 1.75, cc.z);
      group.add(beam);
    }
  } else if (key === "dock_yard") {
    floorPatch(0.5, 0.5, w * 0.88, h * 0.88, pal.floor ?? 0x553322);
    const cols = [0xdd3333, 0x2255cc, 0xddcc22];
    for (let i = 0; i < 9; i++) {
      const s = resolveSpot(ctx, { u: 0.12 + (i % 3) * 0.35, v: 0.25 + Math.floor(i / 3) * 0.25 });
      const cc = cellCenter(ctx, s.gx, s.gz);
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(cell * 0.75, cell * 0.55, cell * 0.38),
        lambertStud(cols[i % 3], cols[i % 3], 0.28)
      );
      crate.position.set(cc.x, 0.28, cc.z);
      group.add(crate);
    }
  } else if (key === "arena_sniper_mega") {
    floorPatch(0.5, 0.5, w * 0.98, h * 0.98, pal.floor ?? 0xc9a86c);
    for (const spot of [{ u: 0.1, v: 0.5 }, { u: 0.9, v: 0.5 }, { u: 0.5, v: 0.1 }, { u: 0.5, v: 0.9 }]) {
      const s = resolveSpot(ctx, spot);
      const cc = cellCenter(ctx, s.gx, s.gz);
      const nest = new THREE.Mesh(
        new THREE.CylinderGeometry(cell * 0.5, cell * 0.65, 1.2, 8),
        lambertStud(0x666677, 0x444455, 0.3)
      );
      nest.position.set(cc.x, 0.6, cc.z);
      group.add(nest);
    }
  } else if (key === "ambush_corridor") {
    floorPatch(0.5, 0.5, w * 0.88, h * 0.88, pal.floor ?? 0x2a3038);
  } else if (key === "sky_runway" || key === "sky_open") {
    floorPatch(0.5, 0.5, w * 0.94, h * 0.94, pal.floor ?? 0x335577);
  } else if (key === "greybox_parkour") {
    floorPatch(0.5, 0.5, w * 0.9, h * 0.9, pal.floor ?? 0x888899);
  } else if (key === "urban_plaza") {
    floorPatch(0.5, 0.5, w * 0.8, h * 0.8, pal.floor ?? 0x5a5a60);
  }

  return { layoutKey: key, palette: pal };
}

export function applyShooterLevelAtmosphere(scene, level) {
  const layout = getShooterLayout(level);
  const pal = layout.palette;
  if (!pal) return;
  if (pal.sky != null) scene.background = new THREE.Color(pal.sky);
  if (pal.fog != null && scene.fog) scene.fog.color.set(pal.fog);
}
