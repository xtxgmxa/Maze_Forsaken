function insideAabb(px, pz, x, z, halfW, halfD) {
  return Math.abs(px - x) <= halfW && Math.abs(pz - z) <= halfD;
}

/** 長梯：站在梯上按 W / 跳躍 往上爬，S 往下 */
export function updateShooterLadderClimb(p, dt, state, move) {
  if (!p || !state?.ladders?.length) return false;
  let lad = null;
  for (const l of state.ladders) {
    if (insideAabb(p.pos.x, p.pos.z, l.x, l.z, (l.halfW ?? 0.35) + 0.25, (l.halfD ?? 0.35) + 0.25)) {
      lad = l;
      break;
    }
  }
  if (!lad) {
    p._onLadder = false;
    return false;
  }
  p._onLadder = true;
  const up = (move?.z ?? 0) < -0.2 || (move?.y ?? 0) > 0.05 || (move?.jump ?? false);
  const down = (move?.z ?? 0) > 0.2;
  if (up && p.elev < lad.y1 - 0.25) {
    p.elev = Math.min(lad.y1, p.elev + dt * (lad.climbSpeed ?? 12));
    p._jumpY = 0;
    p.velY = 0;
    p.onGround = true;
    return true;
  }
  if (down && p.elev > 0.2) {
    p.elev = Math.max(lad.y0 ?? 0, p.elev - dt * 13);
    p._jumpY = 0;
    p.onGround = true;
    return true;
  }
  return true;
}
