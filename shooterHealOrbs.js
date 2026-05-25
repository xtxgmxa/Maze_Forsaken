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
    color: 0x44ff88,
    transparent: true,
    opacity: 0.92,
  });
  const mat2 = new THREE.MeshBasicMaterial({
    color: 0x22cc66,
    transparent: true,
    opacity: 0.85,
  });
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), mat);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.12), mat);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.7, 16),
    new THREE.MeshBasicMaterial({ color: 0x66ffaa, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.2 })
  );
  glow.position.y = 0.45;
  group.add(v, h, ring, glow);
  group.position.set(x, y + 0.5, z);

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
      o.mesh.position.y = o.y + 0.5 + Math.sin(o.bob) * 0.12;
      o.mesh.rotation.y += dt * 1.5;
    }
    if (o.life <= 0) {
      if (o.mesh && scene) scene.remove(o.mesh);
      orbs.splice(i, 1);
      continue;
    }
    for (const p of players) {
      if (!p || p.caught || (p.hp ?? 0) <= 0) continue;
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
