import * as THREE from "three";
import { SHOOTER_TEAMS, isShooterMoleMode } from "./shooterMode.js";

const MARKER_Y = 2.35;

function teamColor(teamId) {
  return SHOOTER_TEAMS[teamId ?? 0]?.color ?? 0xffffff;
}

function disposeMarker(p) {
  if (!p._teamMarker) return;
  p._teamMarker.traverse((c) => {
    c.geometry?.dispose?.();
    if (c.material) {
      if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
      else c.material.dispose?.();
    }
  });
  p.mesh?.remove(p._teamMarker);
  p._teamMarker = null;
  p._hpBarFg = null;
}

export function clearShooterTeamMarkers(players) {
  for (const p of players || []) disposeMarker(p);
}

function buildMarkerMeshes(p, human, playStyle, state) {
  const group = new THREE.Group();
  group.name = "teamMarker";

  const ffa = playStyle === "ffa";
  const moleMode = isShooterMoleMode(state);
  const revealed = !!p._moleRevealed;
  const showMole = moleMode && p.isMole && revealed;
  const hideTeam = moleMode && p.isMole && !revealed;

  const col = ffa ? (p.paintColor ?? 0x88aaff) : teamColor(p.teamId);
  const ringCol = showMole ? 0xff2244 : col;

  const matRing = new THREE.MeshBasicMaterial({
    color: ringCol,
    transparent: true,
    opacity: showMole ? 0.98 : 0.88,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.08, 10, 22), matRing);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = MARKER_Y;
  group.add(ring);

  const hpBg = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.08, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x111118, transparent: true, opacity: 0.9 })
  );
  hpBg.position.y = MARKER_Y + 0.52;
  group.add(hpBg);

  const hpFg = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.06, 0.06),
    new THREE.MeshBasicMaterial({ color: showMole ? 0xff3355 : 0x44ee88, transparent: true, opacity: 0.95 })
  );
  hpFg.position.y = MARKER_Y + 0.52;
  group.add(hpFg);
  p._hpBarFg = hpFg;

  const badgeMat = new THREE.MeshBasicMaterial({
    color: showMole ? 0xff1133 : col,
    transparent: true,
    opacity: 0.96,
  });
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.07), badgeMat);
  badge.position.y = MARKER_Y + 0.28;
  group.add(badge);

  if (showMole) {
    const skull = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffee22 })
    );
    skull.position.y = MARKER_Y + 0.72;
    group.add(skull);
    const tag = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.1, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xff1133 })
    );
    tag.position.y = MARKER_Y + 0.9;
    group.add(tag);
  } else if (!ffa && p.teamId >= 0 && !hideTeam) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
    );
    dot.position.y = MARKER_Y + 0.68;
    group.add(dot);
  } else if (hideTeam && moleMode) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 })
    );
    dot.position.y = MARKER_Y + 0.68;
    group.add(dot);
  }

  const isHuman = p === human || (!p.isAI && ["p1", "p2", "p3", "p4"].includes(p.profile));
  if (isHuman) {
    const you = new THREE.Mesh(
      new THREE.RingGeometry(0.58, 0.78, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    you.rotation.x = -Math.PI / 2;
    you.position.y = MARKER_Y - 0.08;
    group.add(you);
  }

  return group;
}

export function updateShooterMarkerHp(p) {
  const fg = p?._hpBarFg;
  if (!fg) return;
  const maxHp = p.maxHp ?? 140;
  const hp = Math.max(0, Math.min(maxHp, p.hp ?? maxHp));
  const t = maxHp > 0 ? hp / maxHp : 0;
  fg.scale.x = Math.max(0.05, t);
  fg.position.x = -0.29 * (1 - t);
  if (t < 0.35) fg.material.color.setHex(0xff4444);
  else if (t < 0.65) fg.material.color.setHex(0xffcc44);
  else fg.material.color.setHex(p.isMole && p._moleRevealed ? 0xff3355 : 0x44ee88);
}

/** 頭頂隊伍／血量／內鬼標記 */
export function syncShooterTeamMarker(p, human, playStyle = "teams", state = null) {
  if (!p?.mesh) return;
  const down = p._shooterDowned || p._awaitingRespawn || (p.hp ?? 0) <= 0;
  if (down) {
    if (p._teamMarker) p._teamMarker.visible = false;
    return;
  }
  const moleMode = isShooterMoleMode(state);
  const needRebuild = moleMode && p.isMole && p._moleRevealed && !p._teamMarker;
  if (!p._teamMarker || needRebuild) {
    disposeMarker(p);
    p._teamMarker = buildMarkerMeshes(p, human, playStyle, state);
    p.mesh.add(p._teamMarker);
  }
  p._teamMarker.visible = true;
  p._teamMarker.position.y = 0;
  updateShooterMarkerHp(p);
}

export function syncAllShooterTeamMarkers(players, human, playStyle, state) {
  for (const p of players || []) {
    if (!p?.mesh) continue;
    syncShooterTeamMarker(p, human, playStyle, state);
  }
}

export function revealMoleOnHit(target, human, playStyle, state) {
  if (!target?.isMole || target._moleRevealed) return;
  target._moleRevealed = true;
  disposeMarker(target);
  syncShooterTeamMarker(target, human, playStyle, state);
}
