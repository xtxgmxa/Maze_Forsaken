import { collides, moveWithCollision, shooterLineBlocked } from "./maze.js";

function insideAabb(px, pz, x, z, halfW, halfD) {
  return Math.abs(px - x) <= halfW && Math.abs(pz - z) <= halfD;
}

/** 射線高度落在掩體內側時視為被擋（不可穿箱打到人） */
export function lineHitsShooterCover(px, pz, py, state) {
  if (!state?.platforms?.length) return false;
  for (const pl of state.platforms) {
    if (pl.solidSides === false) continue;
    const hw = pl.halfW ?? 1;
    const hd = pl.halfD ?? 1;
    if (!insideAabb(px, pz, pl.x, pl.z, hw, hd)) continue;
    const top = pl.blockTop ?? pl.y ?? 1;
    const base = pl.baseY ?? 0;
    if (py >= top + 0.3) continue;
    if (py < base - 0.35) continue;
    return true;
  }
  return false;
}

/** 迷宮牆 + 槍戰掩體／平台 */
export function shooterRayBlocked(ctx, maze, x0, z0, y0, x1, z1, y1, vState = null) {
  if (shooterLineBlocked(ctx, maze, x0, z0, y0, x1, z1, y1)) return true;
  if (!vState?.platforms?.length) return false;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const dy = y1 - y0;
  const len3 = Math.hypot(dx, dz, dy);
  if (len3 < 0.05) return false;
  const steps = Math.max(10, Math.ceil(len3 / (ctx.cell * 0.15)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sx = x0 + dx * t;
    const sz = z0 + dz * t;
    const sy = y0 + dy * t;
    if (lineHitsShooterCover(sx, sz, sy, vState)) return true;
  }
  return false;
}

/** 掩體／立柱：腳下高度低於台面時擋住水平移動（不可穿進長方體） */
export function collidesShooterSolid(px, pz, radius, footElev, jumpY, state) {
  if (!state?.platforms?.length) return false;
  const feet = (footElev ?? 0);
  const crest = feet + (jumpY ?? 0);
  const head = crest + 1.55;
  for (const pl of state.platforms) {
    if (pl.solidSides === false) continue;
    const hw = (pl.halfW ?? 1) + radius * 0.72;
    const hd = (pl.halfD ?? 1) + radius * 0.72;
    if (!insideAabb(px, pz, pl.x, pl.z, hw, hd)) continue;
    const top = pl.blockTop ?? pl.y ?? 1;
    // 可站立掩體：腳底接近或高於台面時不擋水平移動（由台面吸附處理）
    if (pl.standable) {
      if (crest >= top - 0.38) continue;
      if ((jumpY ?? 0) > 0.05 && crest >= top - 1.85) continue;
    }
    if (crest >= top - 0.5) continue;
    if ((jumpY ?? 0) > 0.12 && crest >= top - 1.35) continue;
    const base = pl.baseY ?? 0;
    if (head > base + 0.15 && crest < top + 0.15) return true;
  }
  return false;
}

export function moveWithShooterCollision(ctx, maze, pos, vx, vz, dt, jumpY, footElev, colOpts, vState) {
  const r = 0.38;
  const tryX = (x) => {
    if (collidesShooterSolid(x, pos.z, r, footElev, jumpY, vState)) return false;
    return !collides(ctx, maze, x, pos.z, r, jumpY, footElev, colOpts);
  };
  const tryZ = (z) => {
    if (collidesShooterSolid(pos.x, z, r, footElev, jumpY, vState)) return false;
    return !collides(ctx, maze, pos.x, z, r, jumpY, footElev, colOpts);
  };
  const nx = pos.x + vx * dt;
  const nz = pos.z + vz * dt;
  if (tryX(nx)) pos.x = nx;
  if (tryZ(nz)) pos.z = nz;
  const clearH = (footElev ?? 0) + (jumpY ?? 0);
  if (jumpY > 0.48 || clearH > 4) {
    if (tryX(nx) && tryZ(nz)) {
      pos.x = nx;
      pos.z = nz;
    } else if (tryX(nx) && tryZ(pos.z + vz * dt)) {
      pos.x = nx;
      pos.z = pos.z + vz * dt;
    }
  }
}
