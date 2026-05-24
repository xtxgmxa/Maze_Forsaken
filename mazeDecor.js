import * as THREE from "three";
import { cellCenter } from "./maze.js";
import { lambertStud } from "./mapTextures.js";

/** 地圖裝飾：分區地面、樹木、貨櫃、房屋、路燈 — 置於格子內易看見 */
export function buildMazeDecor(ctx, maze, scene, opts = {}) {
  const { w, h, cell, theme: th } = ctx;
  const mapStyle = opts.mapStyle || "chase";
  const group = new THREE.Group();
  group.name = "mazeDecor";
  const dummy = new THREE.Object3D();
  const heavy = opts.skipHeavy;
  const soloLight = opts.soloLight;
  const treeDensity = soloLight ? 12 : mapStyle === "ruins" ? 5 : mapStyle === "puzzle" ? 8 : mapStyle === "dock" ? 9 : 7;
  const zoneEvery = mapStyle === "sky" ? 1 : mapStyle === "arena" ? 2 : 4;

  const zonePalette = [
    { floor: 0x3a9ee8, em: 0x2288cc },
    { floor: 0xe8a040, em: 0xcc7722 },
    { floor: 0x62d85a, em: 0x3aaa44 },
    { floor: 0xe86aaa, em: 0xcc4488 },
    { floor: 0x6a8cff, em: 0x4466dd },
    { floor: 0xffd54a, em: 0xccaa22 },
  ];

  const zoneGeo = new THREE.BoxGeometry(cell * 0.96, 0.14, cell * 0.96);
  const zoneCount = w * h;
  const zoneInst = new THREE.InstancedMesh(
    zoneGeo,
    new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x333333, emissiveIntensity: 0.15 }),
    zoneCount
  );
  let zi = 0;
  for (let gz = 0; gz < h; gz++) {
    for (let gx = 0; gx < w; gx++) {
      const c = cellCenter(ctx, gx, gz);
      const zc = zonePalette[(gx + gz) % zonePalette.length];
      zoneInst.setColorAt(zi, new THREE.Color(zc.floor));
      dummy.position.set(c.x, 0.22, c.z);
      dummy.updateMatrix();
      zoneInst.setMatrixAt(zi++, dummy.matrix);
    }
  }
  zoneInst.count = zi;
  zoneInst.instanceMatrix.needsUpdate = true;
  if (zoneInst.instanceColor) zoneInst.instanceColor.needsUpdate = true;
  zoneInst.frustumCulled = false;
  group.add(zoneInst);

  const addTree = (x, z, scale = 1) => {
    const s = cell * 0.11 * scale;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(s * 0.9, s * 1.1, cell * 0.35, 7),
      new THREE.MeshLambertMaterial({ color: 0x6a4a32 })
    );
    trunk.position.set(x, cell * 0.18, z);
    group.add(trunk);
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(cell * 0.22 * scale, 8, 8),
      lambertStud(0x55ee44, 0x228822, 0.35)
    );
    top.position.set(x, cell * 0.42 * scale, z);
    group.add(top);
  };

  for (let gz = 1; gz < h - 1; gz++) {
    for (let gx = 1; gx < w - 1; gx++) {
      if ((gx * 2 + gz * 3) % treeDensity !== 0) continue;
      const c = cellCenter(ctx, gx, gz);
      addTree(c.x + cell * 0.22, c.z - cell * 0.18, 0.9 + ((gx + gz) % 3) * 0.15);
    }
  }

  const containerColors = [0xdd3333, 0x3355dd, 0xdddd33, 0x9933dd, 0x33ddcc];
  const crateCount = soloLight
    ? Math.min(w * h / 10, 22)
    : mapStyle === "dock" ? Math.min(w * h / 4, 64) : Math.min(w * h / 6, heavy ? 28 : 48);
  for (let i = 0; i < crateCount; i++) {
    const gx = 1 + ((i * 13) % Math.max(1, w - 2));
    const gz = 1 + ((i * 19) % Math.max(1, h - 2));
    const c = cellCenter(ctx, gx, gz);
    const col = containerColors[i % containerColors.length];
    const mat = lambertStud(col, col, 0.2);
    const h1 = cell * 0.32;
    const box = new THREE.Mesh(new THREE.BoxGeometry(cell * 0.5, h1, cell * 0.26), mat);
    box.position.set(c.x, h1 / 2 + 0.1, c.z);
    group.add(box);
    if (i % 2 === 0) {
      const box2 = new THREE.Mesh(new THREE.BoxGeometry(cell * 0.48, h1, cell * 0.24), mat);
      box2.position.set(c.x + cell * 0.08, h1 + 0.1 + h1 / 2, c.z + cell * 0.06);
      group.add(box2);
    }
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(cell * 0.22, cell * 0.2, cell * 0.22),
      lambertStud(0xcc7722, 0x884411, 0.2)
    );
    crate.position.set(c.x - cell * 0.28, cell * 0.12, c.z + cell * 0.2);
    group.add(crate);
  }

  const houseWall = lambertStud(th.wall || 0xccb8a0, th.accent || 0x554466, 0.15);
  const roofMat = lambertStud(th.accent || 0xff5566, th.accent || 0xff4466, 0.35);
  if (soloLight) {
    /* 單人模式減少邊界房屋，避免堵路 */
  } else for (let gz = 0; gz < h; gz++) {
    for (let gx = 0; gx < w; gx++) {
      const onEdge = gx === 0 || gz === 0 || gx === w - 1 || gz === h - 1;
      if (!onEdge || (gx + gz) % 2 !== 0) continue;
      const c = cellCenter(ctx, gx, gz);
      const wx = c.x + (gx === 0 ? -cell * 0.42 : gx === w - 1 ? cell * 0.42 : 0);
      const wz = c.z + (gz === 0 ? -cell * 0.42 : gz === h - 1 ? cell * 0.42 : 0);
      const floors = 1 + ((gx + gz) % 3);
      for (let f = 0; f < floors; f++) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(cell * 0.5, 2.6, cell * 0.5), houseWall);
        body.position.set(wx, 1.35 + f * 2.7, wz);
        group.add(body);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(cell * 0.38, 1.35, 4), roofMat);
        roof.position.set(wx, 3.1 + f * 2.7, wz);
        group.add(roof);
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(cell * 0.12, cell * 0.12, 0.08),
          new THREE.MeshBasicMaterial({ color: 0xaaddff })
        );
        win.position.set(wx + cell * 0.12, 1.8 + f * 2.7, wz + cell * 0.26);
        group.add(win);
      }
    }
  }

  const lampCount = mapStyle === "puzzle" ? Math.min(w + h, 36) : Math.min(w + h, heavy ? 14 : 28);
  for (let i = 0; i < lampCount; i++) {
    const gx = 1 + ((i * 5) % Math.max(1, w - 2));
    const gz = 1 + ((i * 11) % Math.max(1, h - 2));
    const c = cellCenter(ctx, gx, gz);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 3.2, 6),
      new THREE.MeshLambertMaterial({ color: 0x999aaa })
    );
    pole.position.set(c.x + cell * 0.32, 1.6, c.z - cell * 0.32);
    group.add(pole);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffeeaa })
    );
    bulb.position.set(c.x + cell * 0.32, 3.35, c.z - cell * 0.32);
    group.add(bulb);
    if (!heavy && mapStyle !== "arena") {
      const glow = new THREE.PointLight(0xffdd88, 0.28, cell * 2);
      glow.position.copy(bulb.position);
      group.add(glow);
    }
  }

  if (!heavy) {
    const orbMat = new THREE.MeshBasicMaterial({
      color: th.deco || 0x66ccff,
      transparent: true,
      opacity: 0.7,
    });
    for (let i = 0; i < Math.min(w * h / 10, 40); i++) {
      const gx = 2 + ((i * 7) % Math.max(1, w - 4));
      const gz = 2 + ((i * 11) % Math.max(1, h - 4));
      const c = cellCenter(ctx, gx, gz);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), orbMat);
      orb.position.set(c.x, 2.8, c.z);
      group.add(orb);
    }
  }

  scene.add(group);
  return { group };
}
