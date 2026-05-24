import * as THREE from "three";
import { cellCenter } from "./maze.js";
import { sampleFloorElev } from "./verticalWorld.js";
const particlePool = [];
let particleGroup = null;
let particleT = 0;

/** 區域飄浮粒子（InstancedMesh，低開銷） */
export function buildZoneParticles(scene, realm) {
  clearZoneParticles(scene);
  if (!realm) return null;
  const n = 28;
  const geo = new THREE.SphereGeometry(0.12, 6, 6);
  const mat = new THREE.MeshBasicMaterial({
    color: realm.accent || realm.color,
    transparent: true,
    opacity: 0.55,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  particlePool.length = 0;
  for (let i = 0; i < n; i++) {
    particlePool.push({
      ox: (Math.random() - 0.5) * 18,
      oy: 1.5 + Math.random() * 5,
      oz: (Math.random() - 0.5) * 18,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.6,
    });
  }
  particleGroup = new THREE.Group();
  particleGroup.name = "zoneParticles";
  particleGroup.add(mesh);
  particleGroup.userData.inst = mesh;
  particleGroup.userData.realm = realm;
  scene.add(particleGroup);
  return particleGroup;
}

export function clearZoneParticles(scene) {
  if (particleGroup && scene) scene.remove(particleGroup);
  particleGroup = null;
  particlePool.length = 0;
}

export function tickZoneParticles(dt, centerX, centerZ) {
  const mesh = particleGroup?.userData?.inst;
  if (!mesh || !particlePool.length) return;
  particleT += dt;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < particlePool.length; i++) {
    const p = particlePool[i];
    const y = p.oy + Math.sin(particleT * p.speed + p.phase) * 0.8;
  const x = centerX + p.ox + Math.sin(particleT * 0.3 + p.phase) * 0.5;
    const z = centerZ + p.oz + Math.cos(particleT * 0.28 + p.phase) * 0.5;
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/** 高台邊緣跳下提示 + 緩降落點 */
export function buildLedgeHints(ctx, verticalState, scene) {
  const group = new THREE.Group();
  group.name = "ledgeHints";
  const hints = [];
  const softDrops = [];
  if (!verticalState?.platforms?.length) return { group, hints, softDrops };

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];
  const hintMat = new THREE.MeshBasicMaterial({
    color: 0x66ffcc,
    transparent: true,
    opacity: 0.85,
  });
  const padMat = new THREE.MeshBasicMaterial({
    color: 0x44aaff,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  for (const pl of verticalState.platforms) {
    if (pl.y < 2.5) continue;
    for (const [dx, dz] of dirs) {
      const ex = pl.x + dx * (pl.halfW + ctx.cell * 0.15);
      const ez = pl.z + dz * (pl.halfD + ctx.cell * 0.15);
      const below = sampleFloorElev(ex, ez, verticalState);
      if (below >= pl.y - 1.2) continue;

      const hx = pl.x + dx * pl.halfW * 0.72;
      const hz = pl.z + dz * pl.halfD * 0.72;
      hints.push({
        x: hx, z: hz, y: pl.y + 0.5,
        dx, dz, fromY: pl.y, toY: Math.max(0, below),
      });

      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.7, 6),
        hintMat.clone()
      );
      arrow.position.set(hx, pl.y + 1.1, hz);
      arrow.rotation.x = Math.PI;
      if (dx !== 0) arrow.rotation.z = dx > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(arrow);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.85, 12),
        padMat
      );
      ring.rotation.x = -Math.PI / 2;
      const tx = hx + dx * ctx.cell * 0.35;
      const tz = hz + dz * ctx.cell * 0.35;
      ring.position.set(tx, Math.max(0.08, below + 0.05), tz);
      group.add(ring);
      softDrops.push({
        x: tx, z: tz, half: ctx.cell * 0.45,
        fromY: pl.y, toY: Math.max(0, below),
      });
    }
  }

  scene.add(group);
  return { group, hints, softDrops };
}

export function tickLedgeHints(player, hints, softDrops, verticalState, dt, onToast) {
  if (!player || player.caught) return;
  const footY = (player.elev ?? 0) + (player._jumpY ?? 0);
  let nearEdge = false;

  for (const h of hints) {
    const d = Math.hypot(player.pos.x - h.x, player.pos.z - h.z);
    if (d < 2.8 && Math.abs(footY - h.fromY) < 2.5) {
      nearEdge = true;
      if (!player._ledgeHintShown && !player.isAI) {
        player._ledgeHintShown = true;
        onToast?.("平台邊緣可跳下 · 朝箭頭方向移動", 1600);
      }
    }
  }
  if (!nearEdge) player._ledgeHintShown = false;

  if (player.velY != null && player.velY < -0.5 && softDrops.length) {
    for (const pad of softDrops) {
      if (Math.hypot(player.pos.x - pad.x, player.pos.z - pad.z) > pad.half) continue;
      if (footY > pad.fromY - 0.3 || footY < pad.toY - 0.8) continue;
      player.velY = Math.max(player.velY, -5.5);
      const land = sampleFloorElev(player.pos.x, player.pos.z, verticalState);
      const target = Math.max(pad.toY, land);
      if (footY <= target + 1.2) {
        player.elev = target;
        player._jumpY = 0;
        player.velY = 0;
        player.onGround = true;
      }
      break;
    }
  }
}

export function setCharacterRim(mesh, accentHex, enabled) {
  if (!mesh) return;
  if (mesh.userData.rimLight) {
    mesh.remove(mesh.userData.rimLight);
    mesh.userData.rimLight = null;
  }
  if (!enabled) return;
  const col = accentHex || 0x88ccff;
  const light = new THREE.PointLight(col, 0.42, 3.8);
  light.position.set(0.3, 2.6, 0.9);
  mesh.add(light);
  mesh.userData.rimLight = light;
}

export function applyPlasticToCharacter(root, accentHex) {
  if (!root) return;
  const accent = accentHex || 0x88ccff;
  root.traverse((c) => {
    if (!c.isMesh || !c.material) return;
    if (c.material.isMeshStandardMaterial) {
      c.material.emissive.setHex(accent);
      c.material.emissiveIntensity = Math.min(0.22, c.material.emissiveIntensity + 0.06);
    }
  });
}

export const REALM_MUSIC_TINT = {
  sanctuary: { freq: 320, gain: 4, warm: 1 },
  foundry: { freq: 180, gain: 5, warm: 1.2 },
  neon: { freq: 1200, gain: 3, warm: 0 },
  crystal: { freq: 800, gain: 3.5, warm: 0.3 },
};
