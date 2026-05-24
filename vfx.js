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

export function spawnHitVfx(scene, x, z) {
  spawnVfx(scene, "hit", x, z, { life: 0.22, color: 0xffaa44, lite: true, scale: 0.5 });
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
    parts.torso.position.y += ((parts.baseTorsoY ?? 1.55) - parts.torso.position.y) * k;
    parts.head.position.y += ((parts.baseHeadY ?? 2) - parts.head.position.y) * k;
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
  parts.torso.position.y = (parts.baseTorsoY ?? 1.55) + bob;
  parts.head.position.y = (parts.baseHeadY ?? 2) + bob * 0.45;
  parts.torso.rotation.z = Math.sin(t) * (sprinting ? 0.06 : 0.035);
}
