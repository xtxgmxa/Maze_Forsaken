import * as THREE from "three";

const pool = [];
let maxVfx = 40;

export function setVfxBudget(n) {
  maxVfx = Math.max(12, Math.min(48, n));
}

function mat(color, opacity = 0.85) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function spawnVfx(scene, type, x, z, opts = {}) {
  if (pool.length >= maxVfx) {
    const old = pool.shift();
    old.mesh?.parent?.remove(old.mesh);
  }
  const g = new THREE.Group();
  g.position.set(x, opts.y ?? 0.1, z);
  const yaw = opts.yaw ?? 0;
  const tint = opts.color ?? 0xffffff;

  const addRing = (r1, r2, color, y = 0.15, rotZ = 0) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r1, r2, 16), mat(color ?? tint, 0.75));
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.z = rotZ;
    ring.position.y = y;
    g.add(ring);
  };

  switch (type) {
    case "dash":
      addRing(0.4, 1.6, 0xffaa44);
      addRing(0.7, 2.0, tint, 0.05);
      break;
    case "teleport":
      addRing(0.5, 2.0, 0x66ffff);
      addRing(0.2, 1.2, tint, 0.3);
      break;
    case "shield":
      g.add(new THREE.Mesh(
        new THREE.SphereGeometry(2.0, 10, 8),
        mat(0x66ccff, 0.18)
      )).position.y = 2;
      addRing(1.2, 2.2, 0x88ddff, 1.2);
      break;
    case "invis":
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), mat(0xcccccc, 0.35));
        puff.position.set((Math.random() - 0.5) * 1.5, 1 + Math.random(), (Math.random() - 0.5) * 1.5);
        g.add(puff);
      }
      break;
    case "corrupt":
      addRing(0.3, 1.4, 0xff0044);
      addRing(0.6, 1.9, tint, 0.25);
      for (let i = 0; i < 3; i++) {
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), mat(tint, 0.9));
        const a = (i / 3) * Math.PI * 2;
        core.position.set(Math.cos(a) * 0.7, 1.2, Math.sin(a) * 0.7);
        g.add(core);
      }
      break;
    case "slash":
      addRing(0.3, 1.5, 0xff1133, 0.25, -yaw);
      addRing(0.5, 2.0, tint, 0.35, -yaw + 0.4);
      break;
    case "aoe":
      addRing(0.4, 2.0, 0xff2244, 0.1);
      addRing(0.8, 2.8, tint, 0.2);
      addRing(1.2, 3.4, 0xffaa00, 0.3);
      break;
    case "beam":
      g.add(new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 10, 6),
        mat(tint, 0.65)
      )).position.y = 5;
      break;
    case "heal":
      addRing(0.3, 1.3, 0x44ff88, 0.2);
      break;
    case "trap":
      addRing(0.2, 1.0, 0xff8800, 0.05);
      break;
    case "hit":
      for (let i = 0; i < 5; i++) {
        const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), mat(0xffff88, 0.9));
        const a = (i / 5) * Math.PI * 2;
        spark.position.set(Math.cos(a) * 0.8, 1.2, Math.sin(a) * 0.8);
        g.add(spark);
      }
      break;
    default:
      addRing(0.3, 1.4, tint);
  }

  scene.add(g);
  const baseScale = opts.scale ?? 1;
  const vfx = { mesh: g, life: opts.life ?? 0.45, scale: baseScale, spin: opts.spin ?? 0.02 };
  pool.push(vfx);
  return vfx;
}

export function spawnProjectileVfx(scene, x, z, color = 0xff2244) {
  if (pool.length >= maxVfx) return null;
  const g = new THREE.Group();
  g.position.set(x, 1.2, z);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), mat(color, 0.9)));
  scene.add(g);
  pool.push({ mesh: g, life: 99, scale: 1, isProjectile: true });
  return g;
}

export function updateVfx(dt) {
  for (let i = pool.length - 1; i >= 0; i--) {
    const v = pool[i];
    if (v.isProjectile) continue;
    v.life -= dt;
    v.scale += dt * 2.8;
    v.mesh.rotation.y += (v.spin || 0.02) * 50 * dt;
    v.mesh.scale.setScalar(v.scale);
    if (v.mesh?.children) {
      v.mesh.children.forEach((c) => {
        if (c.material) c.material.opacity = Math.max(0, v.life * 1.6);
      });
    }
    if (v.life <= 0) {
      v.mesh.parent?.remove(v.mesh);
      pool.splice(i, 1);
    }
  }
}

const VFX_MAP = {
  dash: "dash", roll: "dash", lunge: "dash", inject: "dash", rush: "dash",
  demonic_pursuit: "dash", void_rush: "dash", digital_footprint: "dash",
  c00lgui: "teleport", blink: "teleport", ritual: "teleport",
  slateskin: "shield", ward: "shield", shield: "shield", protection: "shield", block: "shield",
  ghostburger: "invis", smoke: "invis", cloak: "invis", crouch: "invis",
  corrupt: "corrupt", corrupt_energy: "corrupt", mass_infection: "corrupt",
  plasma: "beam", crystal_pitch: "beam",
  pizza: "corrupt", entanglement: "aoe",
  slash: "slash", carving_slash: "slash", stab: "slash", lacerate: "slash", behead: "slash",
  slash_s: "slash", dagger: "slash", hatchet: "slash",
  nova: "aoe", cataclysm: "aoe", infernal_cry: "aoe",
  cola: "dash", pizza: "heal", heal: "heal", dispenser: "heal",
  tripwire: "trap", mine: "trap", sentry: "trap",
  coin: "heal", oneshot: "beam",
};

export function playAbilityVfx(scene, p, abId, opts = {}) {
  const lite = opts.lite === true;
  const yaw = p.yaw ?? 0;
  const x = p.pos?.x ?? 0;
  const z = p.pos?.z ?? 0;
  const tint = p.charDef?.accent || (p.role === "killer" ? 0xff2244 : 0x44ccff);
  const type = VFX_MAP[abId] || (p.role === "killer" ? "slash" : "dash");
  spawnVfx(scene, type, x, z, {
    yaw,
    life: lite ? 0.22 : 0.4,
    spin: lite ? 0.015 : 0.025,
    color: tint,
    scale: lite ? 0.65 : 1,
  });
  if (p.mesh && !lite) {
    p._anim = { t: 0.18, kind: abId };
    if (p.role !== "killer" && (abId === "dash" || abId === "inject" || abId === "lunge")) {
      p.velY = Math.max(p.velY || 0, 7);
    }
  }
}

export function spawnHitVfx(scene, x, z) {
  spawnVfx(scene, "hit", x, z, { life: 0.35 });
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
