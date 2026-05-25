import * as THREE from "three";
import { cellCenter, worldToCell } from "./maze.js";
import { lambertStud } from "./mapTextures.js";

/** Rivals 風格四區域（單人模式） */
export const SOLO_REALMS = [
  {
    id: "sanctuary",
    name: "聖域起點",
    color: 0x66ccff,
    floor: 0x3a6a9a,
    emissive: 0x2288cc,
    fog: 0x1a2848,
    sky: 0x4a78b8,
    accent: 0xaaddff,
  },
  {
    id: "foundry",
    name: "熔爐工業",
    color: 0xff8844,
    floor: 0x6a3a28,
    emissive: 0xcc4422,
    fog: 0x281810,
    sky: 0x553322,
    accent: 0xffaa66,
  },
  {
    id: "neon",
    name: "霓虹迴廊",
    color: 0xff66cc,
    floor: 0x4a2868,
    emissive: 0xaa44ff,
    fog: 0x1a1028,
    sky: 0x2a1848,
    accent: 0xff99ee,
  },
  {
    id: "crystal",
    name: "水晶高庭",
    color: 0x44ffcc,
    floor: 0x2a5a58,
    emissive: 0x22aa99,
    fog: 0x142830,
    sky: 0x1a4048,
    accent: 0x88ffee,
  },
];

export function getRealmAt(ctx, x, z) {
  const { gx, gz } = worldToCell(ctx, x, z);
  const midX = ctx.w / 2;
  const midZ = ctx.h / 2;
  const qx = gx < midX ? 0 : 1;
  const qz = gz < midZ ? 0 : 1;
  return SOLO_REALMS[qz * 2 + qx];
}

export function buildRealmZones(ctx, maze, scene, level = {}) {
  const { w, h, cell } = ctx;
  const group = new THREE.Group();
  group.name = "realmZones";

  const midGx = Math.floor(w / 2);
  const midGz = Math.floor(h / 2);

  for (let qz = 0; qz < 2; qz++) {
    for (let qx = 0; qx < 2; qx++) {
      const realm = SOLO_REALMS[qz * 2 + qx];
      const gx0 = qx === 0 ? 0 : midGx;
      const gx1 = qx === 0 ? midGx : w;
      const gz0 = qz === 0 ? 0 : midGz;
      const gz1 = qz === 0 ? midGz : h;

      const floorGeo = new THREE.PlaneGeometry((gx1 - gx0) * cell, (gz1 - gz0) * cell);
      const floorMat = new THREE.MeshLambertMaterial({
        color: realm.floor,
        emissive: realm.emissive,
        emissiveIntensity: 0.35,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      const cx = ((gx0 + gx1) / 2 - w / 2) * cell;
      const cz = ((gz0 + gz1) / 2 - h / 2) * cell;
      floor.position.set(cx, 0.06, cz);
      floor.receiveShadow = true;
      group.add(floor);

      const pillarMat = lambertStud(realm.color, realm.emissive, 0.45);
      const spanX = Math.max(1, gx1 - gx0 - 2);
      const spanZ = Math.max(1, gz1 - gz0 - 2);
      for (let i = 0; i < 6; i++) {
        const gx = Math.min(gx1 - 1, gx0 + 1 + ((i * 7 + qx * 3) % spanX));
        const gz = Math.min(gz1 - 1, gz0 + 1 + ((i * 5 + qz * 2) % spanZ));
        const c = cellCenter(ctx, gx, gz);
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 5.5, 8), pillarMat);
        pillar.position.set(c.x, 2.75, c.z);
        pillar.castShadow = true;
        group.add(pillar);

        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 10, 10),
          new THREE.MeshBasicMaterial({ color: realm.accent, transparent: true, opacity: 0.85 })
        );
        orb.position.set(c.x, 5.8 + (i % 3) * 0.2, c.z);
        group.add(orb);
      }

      const label = makeZoneBanner(realm.name, realm.accent);
      label.position.set(cx, 6.5, cz);
      group.add(label);
    }
  }

  const portals = [];
  const portalPairs = [
    [0, 1], [0, 2], [1, 3], [2, 3], [1, 2],
  ];
  for (const [a, b] of portalPairs) {
    const pa = realmPortalCell(ctx, a, b, w, h);
    const pb = realmPortalCell(ctx, b, a, w, h);
    if (!pa || !pb) continue;
    const ca = cellCenter(ctx, pa.gx, pa.gz);
    const cb = cellCenter(ctx, pb.gx, pb.gz);
    portals.push({ a: ca, b: cb, realmA: SOLO_REALMS[a], realmB: SOLO_REALMS[b] });
    addPortalArch(group, ca, SOLO_REALMS[a]);
    addPortalArch(group, cb, SOLO_REALMS[b]);
  }

  const borderMat = new THREE.MeshBasicMaterial({
    color: 0xaaddff,
    transparent: true,
    opacity: 0.55,
  });
  const bx = (midGx - w / 2) * cell;
  const bz = (midGz - h / 2) * cell;
  const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, h * cell), borderMat);
  vLine.position.set(bx, 0.12, 0);
  const hLine = new THREE.Mesh(new THREE.BoxGeometry(w * cell, 0.2, 0.15), borderMat);
  hLine.position.set(0, 0.12, bz);
  group.add(vLine, hLine);

  scene.add(group);
  return { group, portals, realms: SOLO_REALMS };
}

function realmPortalCell(ctx, fromQ, toQ, w, h) {
  const midGx = Math.floor(w / 2);
  const midGz = Math.floor(h / 2);
  const fx = fromQ % 2;
  const fz = Math.floor(fromQ / 2);
  const tx = toQ % 2;
  const tz = Math.floor(toQ / 2);
  let gx = fx === 0 ? midGx - 1 : midGx;
  let gz = fz === 0 ? midGz - 1 : midGz;
  if (fx !== tx) gx = fx === 0 ? midGx - 1 : midGx;
  if (fz !== tz) gz = fz === 0 ? midGz - 1 : midGz;
  if (gx < 1 || gz < 1 || gx >= w - 1 || gz >= h - 1) return null;
  return { gx, gz };
}

function addPortalArch(group, pos, realm) {
  const g = new THREE.Group();
  const mat = lambertStud(realm.color, realm.emissive, 0.5);
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.2, 0.25), mat);
  l.position.set(-1.1, 2.1, 0);
  const r = l.clone();
  r.position.x = 1.1;
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 0.35), mat);
  top.position.y = 4.2;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.3, 0.1, 10, 24),
    new THREE.MeshBasicMaterial({ color: realm.accent, transparent: true, opacity: 0.75 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.15;
  g.add(l, r, top, ring);
  const light = new THREE.PointLight(realm.color, 1.2, 14);
  light.position.y = 3;
  g.add(light);
  g.position.set(pos.x, 0, pos.z);
  group.add(g);
}

function makeZoneBanner(text, color) {
  const cvs = document.createElement("canvas");
  cvs.width = 256;
  cvs.height = 64;
  const cx = cvs.getContext("2d");
  cx.fillStyle = "rgba(0,0,0,0.45)";
  cx.fillRect(0, 0, 256, 64);
  cx.fillStyle = `#${(color >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
  cx.font = "bold 28px sans-serif";
  cx.textAlign = "center";
  cx.fillText(text, 128, 42);
  const tex = new THREE.CanvasTexture(cvs);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(8, 2, 1);
  return sp;
}

export function applyRealmAtmosphere(scene, realm, baseSky) {
  if (!scene || !realm) return;
  const sky = new THREE.Color(realm.sky);
  scene.background = sky;
  scene.fog = new THREE.Fog(realm.fog, 28, 95);
  const hemi = scene.children.find((c) => c.isHemisphereLight);
  if (hemi) {
    hemi.color.setHex(realm.accent);
    hemi.groundColor.setHex(realm.fog);
    hemi.intensity = 0.85;
  }
  const amb = scene.children.find((c) => c.isAmbientLight);
  if (amb) amb.color.setHex(realm.floor);
}
