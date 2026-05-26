import * as THREE from "three";

const pool = [];
let maxVfx = 24;

const GEO_RING = new THREE.RingGeometry(0.35, 1.2, 12);
const GEO_SPARK = new THREE.OctahedronGeometry(0.18, 0);
const sharedMats = {
  ring: new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.75,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }),
  spark: new THREE.MeshBasicMaterial({
    color: 0xffff88, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }),
};

export function setVfxBudget(n) {
  maxVfx = Math.max(8, Math.min(32, n));
}

export function spawnVfx(scene, type, x, z, opts = {}) {
  while (pool.length >= maxVfx) {
    const old = pool.shift();
    old.mesh?.parent?.remove(old.mesh);
  }
  const g = new THREE.Group();
  g.position.set(x, opts.y ?? 0.1, z);
  const tint = opts.color ?? 0xffffff;
  sharedMats.ring.color.setHex(tint);

  const ring = new THREE.Mesh(GEO_RING, sharedMats.ring);
  ring.rotation.x = -Math.PI / 2;
  ring.rotation.z = opts.yaw ?? 0;
  ring.position.y = 0.15;
  g.add(ring);

  if (!opts.lite && type !== "dash") {
    sharedMats.spark.color.setHex(tint);
    const spark = new THREE.Mesh(GEO_SPARK, sharedMats.spark);
    spark.position.y = 1.1;
    g.add(spark);
  }

  scene.add(g);
  const vfx = { mesh: g, life: opts.life ?? (opts.lite ? 0.18 : 0.32), scale: opts.scale ?? 0.7, spin: 0.02 };
  pool.push(vfx);
  return vfx;
}

const PROJ_GEO = new THREE.SphereGeometry(0.22, 6, 6);
const projMatCache = new Map();

function projMat(color) {
  if (!projMatCache.has(color)) {
    projMatCache.set(color, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.92, depthWrite: false,
    }));
  }
  return projMatCache.get(color);
}

export function spawnProjectileVfx(scene, x, z, color = 0xff2244) {
  const g = new THREE.Mesh(PROJ_GEO, projMat(color));
  g.position.set(x, 1.15, z);
  scene.add(g);
  pool.push({ mesh: g, life: 99, scale: 1, isProjectile: true });
  return g;
}

export function updateVfx(dt) {
  for (let i = pool.length - 1; i >= 0; i--) {
    const v = pool[i];
    if (v.isProjectile) continue;
    v.life -= dt;
    v.scale += dt * 3.2;
    v.mesh.rotation.y += (v.spin || 0.02) * 40 * dt;
    v.mesh.scale.setScalar(v.scale);
    if (v.life <= 0) {
      v.mesh.parent?.remove(v.mesh);
      pool.splice(i, 1);
    }
  }
}

const VFX_MAP = {
  dash: "dash", roll: "dash", lunge: "dash", inject: "dash", rush: "dash",
  c00lgui: "teleport", blink: "teleport", ritual: "teleport",
  slateskin: "shield", ward: "shield", shield: "shield", protection: "shield", block: "shield",
  ghostburger: "invis", smoke: "invis", cloak: "invis", crouch: "invis",
  corrupt: "corrupt", slash: "slash", nova: "aoe", heal: "heal", trap: "trap",
};

export function playAbilityVfx(scene, p, abId, opts = {}) {
  if (!scene || !p) return;
  const lite = opts.lite !== false;
  if (p.isAI && lite && (p._lastVfxCd ?? 0) > 0) return;
  if (p.isAI) p._lastVfxCd = 0.15;
  const type = VFX_MAP[abId] || (p.role === "killer" ? "slash" : "dash");
  spawnVfx(scene, type, p.pos?.x ?? 0, p.pos?.z ?? 0, {
    yaw: p.yaw ?? 0,
    life: lite ? 0.16 : 0.28,
    color: p.charDef?.accent || (p.role === "killer" ? 0xff2244 : 0x44ccff),
    lite: true,
    scale: lite ? 0.55 : 0.75,
  });
}

export function spawnHitVfx(scene, x, z, opts = {}) {
  const color = opts.color ?? 0xffaa44;
  const scale = opts.scale ?? 0.5;
  const life = opts.life ?? 0.22;
  spawnVfx(scene, "hit", x, z, { life, color, lite: opts.lite !== false, scale });
  if (opts.strong) {
    spawnVfx(scene, "hit", x, z, { life: 0.28, color: 0xff1122, lite: true, scale: scale * 1.35 });
  }
}

const MUZZLE_GEO = new THREE.PlaneGeometry(0.55, 0.55);
const muzzleMatCache = new Map();

function muzzleFlashMat(color) {
  if (!muzzleMatCache.has(color)) {
    muzzleMatCache.set(color, new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }));
  }
  return muzzleMatCache.get(color);
}

/** 漆彈開火：槍口短暫光暈 + 漆霧粒子 */
export function spawnPaintMuzzleFlash(scene, x, y, z, dir, color = 0xffaa66) {
  if (!scene) return;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (dir && (dir.x != null || dir.isVector3)) {
    const v = dir.isVector3 ? dir : new THREE.Vector3(dir.x, dir.y ?? 0, dir.z);
    if (v.lengthSq() > 1e-6) g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), v.clone().normalize());
  }
  const core = new THREE.Mesh(MUZZLE_GEO, muzzleFlashMat(0xfff4d8));
  core.position.z = -0.08;
  g.add(core);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.42, 10),
    muzzleFlashMat(color)
  );
  ring.position.z = -0.12;
  g.add(ring);
  for (let i = 0; i < 5; i++) {
    const blob = new THREE.Mesh(
      new THREE.SphereGeometry(0.06 + Math.random() * 0.05, 5, 5),
      muzzleFlashMat(color)
    );
    blob.position.set(
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.16,
      -0.15 - Math.random() * 0.25
    );
    g.add(blob);
  }
  scene.add(g);
  pool.push({ mesh: g, life: 0.11, scale: 0.55, spin: 0, isMuzzle: true });
}

/** 武士刀格擋反彈子彈 */
export function spawnDeflectVfx(scene, x, y, z, color = 0x88eeff) {
  if (!scene) return;
  const g = new THREE.Group();
  g.position.set(x, y ?? 1.35, z);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.55, 12),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);
  for (let i = 0; i < 6; i++) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 4, 4),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const a = (i / 6) * Math.PI * 2;
    spark.position.set(Math.cos(a) * 0.35, 0.1 + Math.random() * 0.2, Math.sin(a) * 0.35);
    g.add(spark);
  }
  scene.add(g);
  pool.push({ mesh: g, life: 0.2, scale: 0.7, spin: 0.08, isDeflect: true });
}

export function tickDeflectVfx(dt) {
  for (let i = pool.length - 1; i >= 0; i--) {
    const v = pool[i];
    if (!v.isDeflect) continue;
    v.life -= dt;
    v.mesh.rotation.y += v.spin * 12;
    v.mesh.scale.setScalar(v.scale * (1 + (0.2 - v.life) * 2.2));
    if (v.life <= 0) {
      v.mesh.parent?.remove(v.mesh);
      pool.splice(i, 1);
    }
  }
}

export function tickMuzzleFlashes(dt) {
  for (let i = pool.length - 1; i >= 0; i--) {
    const v = pool[i];
    if (!v.isMuzzle) continue;
    v.life -= dt;
    const u = Math.max(0, v.life / 0.11);
    v.mesh.scale.setScalar(v.scale * (0.4 + (1 - u) * 1.8));
    v.mesh.traverse((c) => {
      if (c.material?.opacity != null) c.material.opacity = u * 0.92;
    });
    if (v.life <= 0) {
      v.mesh.parent?.remove(v.mesh);
      pool.splice(i, 1);
    }
  }
}

export function clearVfxPool() {
  for (let i = pool.length - 1; i >= 0; i--) {
    pool[i].mesh?.parent?.remove(pool[i].mesh);
    pool.splice(i, 1);
  }
}

export function applyMeshAnim(p, dt) {
  if (!p._anim) return;
  p._anim.t -= dt;
  if (p._anim.t <= 0) p._anim = null;
}

function lerpRot(pivot, target, dt, speed = 12) {
  if (!pivot) return;
  const k = 1 - Math.exp(-dt * speed);
  pivot.rotation.x += (target - pivot.rotation.x) * k;
}

export function applyLocomotionAnim(p, dt) {
  const parts = p.mesh?.userData?.parts;
  if (!parts) return;
  const speed = Math.hypot(p.vel?.x || 0, p.vel?.z || 0);
  const moving = speed > 0.6;
  const sprinting = speed > 16;
  if (!moving) {
    lerpRot(parts.leftLeg, 0, dt);
    lerpRot(parts.rightLeg, 0, dt);
    lerpRot(parts.leftArm, 0, dt);
    lerpRot(parts.rightArm, 0, dt);
    const k = 1 - Math.exp(-dt * 10);
    parts.torso.position.y += ((parts.baseTorsoY ?? 1.38) - parts.torso.position.y) * k;
    parts.head.position.y += ((parts.baseHeadY ?? 1.14) - parts.head.position.y) * k;
    parts.torso.rotation.z += (0 - parts.torso.rotation.z) * k;
    if (!p.sliding) lerpRot(parts.torso, 0, dt, 8);
    return;
  }
  const rate = sprinting ? 13 : 8.5;
  p._walkPhase = (p._walkPhase || 0) + dt * rate * Math.min(1.6, speed / 14);
  const t = p._walkPhase;
  parts.leftLeg.rotation.x = Math.sin(t) * (sprinting ? 0.62 : 0.4);
  parts.rightLeg.rotation.x = Math.sin(t + Math.PI) * (sprinting ? 0.62 : 0.4);
  parts.leftArm.rotation.x = Math.sin(t + Math.PI) * (sprinting ? 0.48 : 0.32);
  parts.rightArm.rotation.x = Math.sin(t) * (sprinting ? 0.48 : 0.32);
  const bob = Math.abs(Math.sin(t * 2)) * (sprinting ? 0.14 : 0.08);
  parts.torso.position.y = (parts.baseTorsoY ?? 1.38) + bob;
  parts.head.position.y = (parts.baseHeadY ?? 1.14) + bob * 0.12;
  parts.torso.rotation.z = Math.sin(t) * (sprinting ? 0.06 : 0.035);
}
