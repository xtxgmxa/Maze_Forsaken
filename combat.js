import { playSfx } from "./audio.js";
import { playMeleeWindSfx, playKatanaSwingSfx } from "./gameSounds.js";
import { playAbilityVfx, spawnHitVfx } from "./vfx.js";
import { moveWithCollision } from "./maze.js";

export const ATTACK_WINDUP = 0.12;
export const ATTACK_LUNGE = 0.16;
export const ATTACK_RECOVERY = 0.2;

export function getKillerAimTarget(killer, survivors, yaw, maxDist = 9) {
  let best = null;
  let bestScore = -1;
  for (const s of survivors) {
    if (s.caught) continue;
    const dx = s.pos.x - killer.pos.x;
    const dz = s.pos.z - killer.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > maxDist) continue;
    const ang = Math.atan2(dx, dz);
    let diff = Math.abs(ang - yaw);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    const score = (0.65 - diff) * 12 + (maxDist - dist);
    if (diff < 0.62 && score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  if (best) return best;
  let near = null;
  let bd = Infinity;
  for (const s of survivors) {
    if (s.caught) continue;
    const d = Math.hypot(s.pos.x - killer.pos.x, s.pos.z - killer.pos.z);
    if (d < bd) { bd = d; near = s; }
  }
  return near;
}

function tryApplyHit(killer, a, callbacks) {
  const range = callbacks.meleeRange ?? 4.8;
  const list = callbacks.getTargets?.() || [];
  const primary = a.target;
  if (primary && !list.includes(primary)) list.unshift(primary);

  for (const t of list) {
    if (!t || t.caught) continue;
    const dist = Math.hypot(t.pos.x - killer.pos.x, t.pos.z - killer.pos.z);
    if (dist <= range) {
      a.hitDone = true;
      a.hitTarget = t;
      callbacks.onHit?.(t, killer, a.damage);
      spawnHitVfx(callbacks.scene, t.pos.x, t.pos.z);
      return true;
    }
  }
  return false;
}

export function startKillerAttack(killer, target, scene, callbacks, opts = {}) {
  if (!killer || killer.attackState) return false;
  if ((killer._meleeCd ?? 0) > 0) return false;

  let dirX = Math.sin(killer.yaw || 0);
  let dirZ = Math.cos(killer.yaw || 0);
  if (target) {
    const dx = target.pos.x - killer.pos.x;
    const dz = target.pos.z - killer.pos.z;
    const len = Math.hypot(dx, dz) || 1;
    dirX = dx / len;
    dirZ = dz / len;
    killer.yaw = Math.atan2(dirX, dirZ);
  }

  callbacks.scene = scene;
  killer.attackState = {
    phase: "windup",
    t: 0,
    target,
    damage: opts.damage ?? 34,
    dirX,
    dirZ,
    hitDone: false,
    abId: opts.abId || "slash",
  };
  killer._meleeCd = ATTACK_WINDUP + ATTACK_LUNGE + ATTACK_RECOVERY + 0.12;
  playSfx("swing_wind", 0.03);
  return true;
}

export function updateKillerCombat(killer, dt, ctx, maze, callbacks) {
  const a = killer.attackState;
  if (!a) return false;

  const parts = killer.mesh?.userData?.parts;
  a.t += dt;

  if (a.phase === "windup") {
    killer.vel.x *= 0.35;
    killer.vel.z *= 0.35;
    if (parts?.rightArm) parts.rightArm.rotation.x = -1.35;
    if (parts?.leftArm) parts.leftArm.rotation.x = -0.4;
    if (parts?.weapon) parts.weapon.rotation.x = -0.6;
    if (a.t >= ATTACK_WINDUP) {
      a.phase = "lunge";
      a.t = 0;
      playKatanaSwingSfx(0.04);
      playAbilityVfx(callbacks.scene, killer, a.abId, { lite: true });
    }
    return true;
  }

  if (a.phase === "lunge") {
    moveWithCollision(ctx, maze, killer.pos, a.dirX * 36, a.dirZ * 36, dt);
    if (parts?.rightArm) parts.rightArm.rotation.x = 1.1;
    if (parts?.weapon) parts.weapon.rotation.x = 0.9;
    if (parts?.torso) parts.torso.rotation.x = 0.15;

    if (!a.hitDone) tryApplyHit(killer, a, callbacks);

    if (a.t >= ATTACK_LUNGE) {
      if (!a.hitDone) tryApplyHit(killer, a, callbacks);
      a.phase = "recovery";
      a.t = 0;
    }
    return true;
  }

  if (a.phase === "recovery") {
    killer.vel.x *= 0.8;
    killer.vel.z *= 0.8;
    if (parts?.rightArm) parts.rightArm.rotation.x *= 0.85;
    if (parts?.weapon) parts.weapon.rotation.x *= 0.85;
    if (parts?.torso) parts.torso.rotation.x *= 0.88;
    if (a.t >= ATTACK_RECOVERY) killer.attackState = null;
    return true;
  }

  return false;
}
