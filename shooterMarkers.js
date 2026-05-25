import * as THREE from "three";
import { SHOOTER_TEAMS, isShooterMoleMode } from "./shooterMode.js";

const MARKER_Y = 2.15;

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

  const col = ffa ? (p.paintColor ?? 0x88aaff) : teamColor(p.teamId);
  const matRing = new THREE.MeshBasicMaterial({
    color: showMole ? 0xff2244 : col,
    transparent: true,
    opacity: showMole ? 0.95 : 0.82,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 10, 20), matRing);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = MARKER_Y;
  group.add(ring);

  const badgeMat = new THREE.MeshBasicMaterial({
    color: showMole ? 0xff1133 : col,
    transparent: true,
    opacity: 0.95,
  });
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.06), badgeMat);
  badge.position.y = MARKER_Y + 0.38;
  group.add(badge);

  if (showMole) {
    const skull = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xffee44 })
    );
    skull.position.y = MARKER_Y + 0.62;
    group.add(skull);
  } else if (!ffa && p.teamId >= 0) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
    );
    dot.position.y = MARKER_Y + 0.55;
    group.add(dot);
  }

  const isHuman = p === human;
  if (isHuman) {
    const you = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    you.rotation.x = -Math.PI / 2;
    you.position.y = MARKER_Y - 0.05;
    group.add(you);
  }

  return group;
}

/** 頭頂隊伍／內鬼標記（觀戰時也能分辨） */
export function syncShooterTeamMarker(p, human, playStyle = "teams", state = null) {
  if (!p?.mesh) return;
  const down = p._shooterDowned || p._awaitingRespawn || (p.hp ?? 0) <= 0;
  if (down) {
    if (p._teamMarker) p._teamMarker.visible = false;
    return;
  }
  if (!p._teamMarker) {
    disposeMarker(p);
    p._teamMarker = buildMarkerMeshes(p, human, playStyle, state);
    p.mesh.add(p._teamMarker);
  }
  p._teamMarker.visible = true;
  p._teamMarker.position.y = 0;
}

export function syncAllShooterTeamMarkers(players, human, playStyle, state) {
  for (const p of players || []) {
    if (!p?.mesh) continue;
    syncShooterTeamMarker(p, human, playStyle, state);
  }
}

export function revealMoleOnHit(target) {
  if (!target?.isMole || target._moleRevealed) return;
  target._moleRevealed = true;
  disposeMarker(target);
}
