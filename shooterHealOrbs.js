import * as THREE from "three";

const orbs = [];
const PICKUP_R = 1.85;
const ORB_LIFE = 28;

export function clearShooterHealOrbs(scene) {
  for (const o of orbs) {
    if (o.mesh && scene) scene.remove(o.mesh);
  }
  orbs.length = 0;
}

export function spawnShooterHealOrb(scene, x, z, y = 0) {
  if (!scene) return null;
  const group = new THREE.Group();
  group.name = "shooterHealOrb";

  const mat = new THREE.MeshBasicMaterial({
    color: 0x66ffaa,
    transparent: true,
    opacity: 0.98,
  });
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.35, 0.2), mat);
  const h = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.2, 0.2), mat);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 1.05, 20),
    new THREE.MeshBasicMaterial({ color: 0x88ffcc, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.35 })
  );
  glow.position.y = 0.65;
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8),
    new THREE.MeshBasicMaterial({ color: 0xaaffdd, transparent: true, opacity: 0.55 })
  );
  beacon.position.y = 1.1;
  group.add(v, h, ring, glow, beacon);
  group.position.set(x, y + 0.55, z);

  const orb = { x, z, y, mesh: group, life: ORB_LIFE, bob: Math.random() * Math.PI * 2 };
  orbs.push(orb);
  scene.add(group);
  return orb;
}

export function tickShooterHealOrbs(dt, players, scene, onPickup) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.life -= dt;
    o.bob += dt * 2.2;
    if (o.mesh) {
      o.mesh.position.y = o.y + 0.55 + Math.sin(o.bob) * 0.18;
      const s = 1 + Math.sin(o.bob * 1.4) * 0.08;
      o.mesh.scale.set(s, s, s);
      o.mesh.rotation.y += dt * 1.5;
    }
    if (o.life <= 0) {
      if (o.mesh && scene) scene.remove(o.mesh);
      orbs.splice(i, 1);
      continue;
    }
    for (const p of players) {
      if (!p || (p.hp ?? 0) <= 0 || p._shooterDowned || p._awaitingRespawn) continue;
      const d = Math.hypot(p.pos.x - o.x, p.pos.z - o.z);
      if (d > PICKUP_R) continue;
      const maxHp = p.maxHp ?? 110;
      p.hp = Math.min(maxHp, (p.hp ?? 0) + maxHp * 0.5);
      onPickup?.(p, o);
      if (o.mesh && scene) scene.remove(o.mesh);
      orbs.splice(i, 1);
      break;
    }
  }
}
