import * as THREE from "three";
import { cellCenter } from "./maze.js";
import { lambertStud } from "./mapTextures.js";
import { PAINT_PALETTE } from "./paintballSplats.js";

export const SHOOTER_TEAMS = [
  { id: 0, name: "紅隊", color: 0xff4466 },
  { id: 1, name: "藍隊", color: 0x44aaff },
];

/** playStyle: "teams" 平均分队 | "ffa" 自由混戰每人一色 */
export function assignShooterPlayer(p, index, total, playStyle = "teams") {
  if (playStyle === "ffa") {
    p.teamId = -1;
    p.paintColor = PAINT_PALETTE[index % PAINT_PALETTE.length];
  } else {
    const half = Math.ceil(Math.max(2, total) / 2);
    const teamId = index < half ? 0 : 1;
    p.teamId = teamId;
    p.paintColor = SHOOTER_TEAMS[teamId].color;
  }
  p._shooterColor = p.paintColor;
}

export function isShooterEnemy(a, b, playStyle = "teams") {
  if (!a || !b || a === b) return false;
  if (a.caught || b.caught) return false;
  if ((a.hp ?? 0) <= 0 || (b.hp ?? 0) <= 0) return false;
  if (playStyle === "ffa") return true;
  return (a.teamId ?? 0) !== (b.teamId ?? 0);
}

export const SHOOTER_WEAPONS = [
  { id: "smg", name: "衝鋒槍", slot: 1, damage: 8, fireCd: 0.14, spread: 0.035, speed: 30, color: 0x44ddff, pellets: 1 },
  { id: "rifle", name: "步槍", slot: 2, damage: 18, fireCd: 0.36, spread: 0.008, speed: 34, color: 0xffcc44, pellets: 1 },
  { id: "shotgun", name: "霰彈槍", slot: 3, damage: 7, fireCd: 0.58, spread: 0.2, speed: 26, color: 0xff8844, pellets: 6 },
  { id: "sniper", name: "狙擊槍", slot: 4, damage: 42, fireCd: 1.15, spread: 0.0005, speed: 58, color: 0xff66cc, pellets: 1, headshotKill: true },
];

export function getShooterWeapon(id) {
  return SHOOTER_WEAPONS.find((w) => w.id === id) || SHOOTER_WEAPONS[0];
}

export function getTargetHeadY(target) {
  return (target?.elev ?? 0) + (target?._jumpY ?? 0) + 2.15;
}

export function getShooterEyeY(p) {
  return (p?.elev ?? 0) + (p?._jumpY ?? 0) + 1.62;
}

/** 狙擊爆頭：瞄準線與頭部夾角極小時一擊必殺 */
export function isShooterHeadshot(shooter, target, fireDir) {
  const w = getShooterWeapon(shooter?.weaponId);
  if (!w.headshotKill || !fireDir || !target) return false;
  const head = new THREE.Vector3(target.pos.x, getTargetHeadY(target), target.pos.z);
  const eye = new THREE.Vector3(shooter.pos.x, getShooterEyeY(shooter), shooter.pos.z);
  const toHead = head.clone().sub(eye);
  const dist = toHead.length();
  if (dist > 58) return false;
  toHead.normalize();
  const dir = fireDir.isVector3 ? fireDir : new THREE.Vector3(fireDir.x, fireDir.y, fireDir.z);
  dir.normalize();
  return dir.dot(toHead) > 0.988;
}

export function applyShooterLoadout(p, weaponId = "rifle") {
  const w = getShooterWeapon(weaponId);
  p.weaponId = w.id;
  p.maxHp = 110;
  p.hp = 110;
  p._shooterSpeedMult = w.id === "sniper" ? 0.9 : w.id === "shotgun" ? 0.94 : 1;
  p._shooterColor = p.paintColor ?? w.color;
  p._shooterFireCd = w.fireCd;
  p._shooterDamage = w.damage;
  p._shooterSpread = w.spread;
  p._shooterPellets = w.pellets;
  p._shooterBulletSpeed = w.speed;
  p._shooterHeadshot = !!w.headshotKill;
}

export function cycleShooterWeapon(p, dir = 1) {
  const idx = SHOOTER_WEAPONS.findIndex((w) => w.id === p.weaponId);
  const next = SHOOTER_WEAPONS[(idx + dir + SHOOTER_WEAPONS.length) % SHOOTER_WEAPONS.length];
  applyShooterLoadout(p, next.id);
  return next;
}

export function createShooterState(level = {}, playStyle = "teams") {
  return {
    playStyle: playStyle === "ffa" ? "ffa" : "teams",
    humanKills: 0,
    botKills: 0,
    respawnDelay: 2.2,
    mapStyle: level.mapStyle || "arena",
    levelName: level.name || "槍戰",
  };
}

export function pickRespawnCell(ctx, maze, avoid = []) {
  const { w, h } = ctx;
  for (let t = 0; t < 80; t++) {
    const gx = 1 + Math.floor(Math.random() * Math.max(1, w - 2));
    const gz = 1 + Math.floor(Math.random() * Math.max(1, h - 2));
    const c = cellCenter(ctx, gx, gz);
    if (avoid.some((p) => Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 7)) continue;
    return { x: c.x, z: c.z, gx, gz };
  }
  return cellCenter(ctx, 0, 0);
}

export function respawnShooterPlayer(p, ctx, maze, players) {
  const spot = pickRespawnCell(ctx, maze, players.filter((x) => x !== p));
  p.pos.x = spot.x;
  p.pos.z = spot.z;
  p.elev = 0;
  p._jumpY = 0;
  p.vel = { x: 0, z: 0 };
  p.velY = 0;
  p.onGround = true;
  p.caught = false;
  p.hp = p.maxHp ?? 110;
  p.invuln = 1.6;
  p._respawnUntil = 0;
  if (p.mesh) {
    p.mesh.visible = true;
    p.mesh.position.set(spot.x, 0, spot.z);
  }
}

export function canShooterFire(p, elapsed) {
  return (p._shootCd ?? 0) <= elapsed && !p.caught && (p.hp ?? 0) > 0
    && !(p._respawnUntil > elapsed);
}

export function makeShooterProjectile(p, yaw, pelletOffset = 0, fireDir = null) {
  const spread = (p._shooterSpread ?? 0) * pelletOffset;
  const spd = p._shooterBulletSpeed ?? 30;
  const muzzle = 0.85;
  let dir;
  if (fireDir && (fireDir.isVector3 || fireDir.x != null)) {
    const v = fireDir.isVector3 ? fireDir : { x: fireDir.x, y: fireDir.y, z: fireDir.z };
    dir = new THREE.Vector3(v.x, v.y, v.z);
    if (dir.lengthSq() < 1e-6) dir.set(Math.sin(yaw), 0, Math.cos(yaw));
    else dir.normalize();
    if (spread) {
      const horiz = Math.hypot(dir.x, dir.z) || 1;
      const baseYaw = Math.atan2(dir.x, dir.z) + spread;
      dir.x = Math.sin(baseYaw) * horiz;
      dir.z = Math.cos(baseYaw) * horiz;
      dir.normalize();
    }
  } else {
    const aim = yaw + spread;
    dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
  }
  const eyeY = 1.52 + (p._jumpY ?? 0) + (p.elev ?? 0);
  const fd = { x: dir.x, y: dir.y, z: dir.z };
  return {
    x: p.pos.x + dir.x * muzzle,
    y: eyeY + dir.y * muzzle,
    z: p.pos.z + dir.z * muzzle,
    vx: dir.x * spd,
    vy: dir.y * spd,
    vz: dir.z * spd,
    life: p.weaponId === "sniper" ? 2.2 : 1.4,
    color: p.paintColor ?? p._shooterColor ?? 0x44aaff,
    damage: p._shooterDamage ?? 20,
    fromShooter: true,
    owner: p,
    fireDir: fd,
  };
}

export function fireShooterWeapon(p, yaw, fireDir = null) {
  const n = p._shooterPellets ?? 1;
  const list = [];
  for (let i = 0; i < n; i++) {
    const off = n <= 1 ? 0 : (i / (n - 1) - 0.5) * 2;
    list.push(makeShooterProjectile(p, yaw, off, fireDir));
  }
  return list;
}

const GUN_COLORS = { smg: 0x44ddff, rifle: 0xffcc44, shotgun: 0xff8844, sniper: 0xff66cc };

export function attachShooterGun(p) {
  if (!p?.mesh || p.gunMesh) return;
  const id = p.weaponId || "rifle";
  const gun = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.16, 0.55),
    new THREE.MeshBasicMaterial({ color: GUN_COLORS[id] || 0x888899 })
  );
  body.position.z = 0.08;
  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.42),
    new THREE.MeshBasicMaterial({ color: 0x333344 })
  );
  barrel.position.set(0, 0.02, 0.52);
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.22, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x222233 })
  );
  grip.position.set(0, -0.14, -0.08);
  gun.add(body, barrel, grip);
  gun.position.set(0.38, 1.12, 0.42);
  gun.rotation.y = 0.15;
  p.mesh.add(gun);
  p.gunMesh = gun;
  syncGunVisual(p);
}

export function syncGunVisual(p) {
  if (!p?.gunMesh) return;
  const id = p.weaponId || "rifle";
  const col = GUN_COLORS[id] || 0x888899;
  p.gunMesh.traverse((c) => {
    if (c.material?.color && c !== p.gunMesh.children[2]) c.material.color.setHex(col);
  });
  const sx = id === "shotgun" ? 1.25 : id === "smg" ? 0.82 : id === "sniper" ? 1.15 : 1;
  const sz = id === "shotgun" ? 1.15 : id === "smg" ? 0.88 : id === "sniper" ? 1.35 : 1;
  p.gunMesh.scale.set(sx, 1, sz);
}

export function muzzleFlash(p) {
  p._gunFlash = 0.06;
  p._fpFlash = 0.06;
}

let fpGunMesh = null;

function fpGunMat(color) {
  return new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false });
}

export function attachFpGun(cam, weaponId = "rifle") {
  detachFpGun(cam);
  if (!cam) return;
  const id = weaponId || "rifle";
  const col = GUN_COLORS[id] || 0x888899;
  const gun = new THREE.Group();
  gun.name = "fpGun";
  gun.renderOrder = 999;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.42), fpGunMat(col));
  body.position.z = 0.06;
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.38), fpGunMat(0x222233));
  barrel.position.set(0, 0.02, 0.42);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.12), fpGunMat(0x111122));
  grip.position.set(0, -0.12, -0.06);
  const scope = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.14), fpGunMat(0x445566));
  scope.position.set(0, 0.1, 0.02);
  scope.name = "fpScope";

  gun.add(body, barrel, grip, scope);
  gun.position.set(0.34, -0.24, -0.42);
  gun.rotation.set(0.04, 0.06, 0);
  cam.add(gun);
  fpGunMesh = gun;
  syncFpGunVisual(cam, id);
}

export function detachFpGun(cam) {
  if (fpGunMesh && cam) cam.remove(fpGunMesh);
  fpGunMesh = null;
}

export function setFpGunVisible(visible) {
  if (fpGunMesh) fpGunMesh.visible = visible;
}

export function syncFpGunVisual(cam, weaponId, flash = 0) {
  if (!fpGunMesh) return;
  const id = weaponId || "rifle";
  const col = GUN_COLORS[id] || 0x888899;
  fpGunMesh.traverse((c) => {
    if (!c.material?.color) return;
    if (c.name === "fpScope") {
      c.visible = id === "sniper" || id === "rifle";
      c.material.color.setHex(id === "sniper" ? 0x6688aa : 0x445566);
      return;
    }
    if (c === fpGunMesh.children[2]) c.material.color.setHex(0x111122);
    else if (c === fpGunMesh.children[1]) c.material.color.setHex(0x222233);
    else c.material.color.setHex(flash > 0.2 ? 0xffaa44 : col);
  });
  const sx = id === "shotgun" ? 1.35 : id === "smg" ? 0.88 : id === "sniper" ? 1.08 : 1;
  fpGunMesh.scale.set(sx, 1, id === "shotgun" ? 1.12 : id === "sniper" ? 1.45 : 1);
  if (id === "sniper") {
    fpGunMesh.position.set(0.28, -0.2, -0.38);
  } else {
    fpGunMesh.position.set(0.34, -0.24, -0.42);
  }
}

export function tickGunFlash(p, dt, cam) {
  if (!p) return;
  let flash = 0;
  if ((p._gunFlash ?? 0) > 0) {
    p._gunFlash -= dt;
    flash = Math.max(0, (p._gunFlash ?? 0) / 0.06);
  }
  if ((p._fpFlash ?? 0) > 0) {
    p._fpFlash -= dt;
    flash = Math.max(flash, (p._fpFlash ?? 0) / 0.06);
  }
  if (!p.isAI && cam) syncFpGunVisual(cam, p.weaponId, flash);
}

/** 槍戰掩體：視覺 + 平台碰撞（可跳上去） */
export function buildShooterArena(ctx, maze, scene, level = {}) {
  const { w, h, cell } = ctx;
  const style = level.mapStyle || "arena";
  const group = new THREE.Group();
  group.name = "shooterArena";
  const covers = [];

  const coverMat = {
    arena: lambertStud(0x8899aa, 0x556677, 0.2),
    dock: lambertStud(0xcc4422, 0x882211, 0.25),
    sky: lambertStud(0x99ccff, 0x4488cc, 0.35),
    urban: lambertStud(0x778899, 0x445566, 0.22),
    neon: lambertStud(0xaa44ff, 0xff66cc, 0.38),
  }[style] || lambertStud(0x888899, 0x555566, 0.2);

  const area = w * h;
  const count = Math.min(
    Math.floor(area / 4.5),
    style === "sky" ? Math.floor(area / 16) : style === "neon" ? Math.floor(area / 14) : Math.floor(area / 12)
  );
  for (let i = 0; i < count; i++) {
    const gx = 2 + ((i * 11 + (level.mapSeed ?? 0)) % Math.max(1, w - 4));
    const gz = 2 + ((i * 7 + (level.id ?? 0) * 3) % Math.max(1, h - 4));
    const c = cellCenter(ctx, gx, gz);
    const tall = style === "sky" && i % 4 === 0;
    const hBox = tall ? cell * 0.5 : cell * 0.35;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(cell * 0.55, hBox, cell * 0.55),
      coverMat
    );
    box.position.set(c.x, hBox / 2 + 0.05, c.z);
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);
    covers.push({
      x: c.x,
      z: c.z,
      halfW: cell * 0.3,
      halfD: cell * 0.3,
      y: hBox + 0.05,
    });
  }

  if (style === "dock") {
    const colors = [0xdd3333, 0x3333cc, 0xdddd33];
    for (let i = 0; i < Math.min(w, 12); i++) {
      const gz = 2 + (i * 2) % (h - 3);
      const c = cellCenter(ctx, 2 + (i % 3), gz);
      const col = colors[i % 3];
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(cell * 0.7, cell * 0.45, cell * 0.32),
        lambertStud(col, col, 0.22)
      );
      const ch = cell * 0.45;
      crate.position.set(c.x, ch / 2, c.z);
      crate.castShadow = true;
      crate.receiveShadow = true;
      group.add(crate);
      covers.push({
        x: c.x,
        z: c.z,
        halfW: cell * 0.36,
        halfD: cell * 0.18,
        y: ch,
      });
    }
  }

  if (style === "arena") {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry((w * cell) * 0.22, 0.35, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xff4466, transparent: true, opacity: 0.35 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.15, 0);
    group.add(ring);
  }

  if (style === "neon") {
    for (let i = 0; i < Math.min(8, Math.floor(count / 4)); i++) {
      const gx = 2 + ((i * 9) % Math.max(1, w - 4));
      const gz = 2 + ((i * 13) % Math.max(1, h - 4));
      const c = cellCenter(ctx, gx, gz);
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.55, cell * 0.55, 8),
        lambertStud(0xff66cc, 0xaa44ff, 0.45)
      );
      pillar.position.set(c.x, cell * 0.28, c.z);
      group.add(pillar);
      covers.push({ x: c.x, z: c.z, halfW: cell * 0.28, halfD: cell * 0.28, y: cell * 0.55 });
    }
  }

  scene.add(group);
  return { group, style, covers };
}

export function updateShooterBots(dt, players, ctx, maze, state, api) {
  const style = state.playStyle ?? "teams";
  for (const bot of players) {
    if (!bot.isAI || bot.caught || (bot.hp ?? 0) <= 0) continue;
    if (bot._respawnUntil > api.elapsed) continue;

    let target = null;
    let bd = Infinity;
    for (const other of players) {
      if (!isShooterEnemy(bot, other, style)) continue;
      const d = Math.hypot(other.pos.x - bot.pos.x, other.pos.z - bot.pos.z);
      if (d < bd) { bd = d; target = other; }
    }
    if (!target) continue;

    const wId = getShooterWeapon(bot.weaponId).id;
    const ideal = { smg: 12, rifle: 18, shotgun: 8, sniper: 26 }[wId] ?? 15;
    const minR = ideal * 0.62;
    const maxR = ideal * 1.28;
    const yawTo = Math.atan2(target.pos.x - bot.pos.x, target.pos.z - bot.pos.z);
    bot.yaw = yawTo;

    const fwd = { x: Math.sin(yawTo), z: Math.cos(yawTo) };
    const right = { x: Math.cos(yawTo), z: -Math.sin(yawTo) };
    let mx = 0;
    let mz = 0;
    let sprint = false;

    if (bd < minR) {
      mx = -fwd.x * 0.92;
      mz = -fwd.z * 0.92;
      const strafe = Math.sin(api.elapsed * 1.4 + (bot.pos.x + bot.pos.z) * 0.1) > 0 ? 1 : -1;
      mx += right.x * strafe * 0.35;
      mz += right.z * strafe * 0.35;
    } else if (bd > maxR && bd < 38) {
      mx = fwd.x * 0.55;
      mz = fwd.z * 0.55;
      sprint = bd > ideal * 1.6;
    } else if (bd >= minR && bd <= maxR) {
      const strafe = Math.sin(api.elapsed * 1.1 + bot.pos.x * 0.07) > 0 ? 1 : -1;
      mx = right.x * strafe * 0.62;
      mz = right.z * strafe * 0.62;
      if (Math.random() < 0.012) {
        mx += -fwd.x * 0.25;
        mz += -fwd.z * 0.25;
      }
    } else if (bd > 38) {
      mx = fwd.x * 0.72;
      mz = fwd.z * 0.72;
      sprint = true;
    }

    api.moveEntity(bot, dt, { x: mx, z: mz, sprint });

    const canShoot = bd >= minR * 0.85 && bd <= maxR * 1.15 + (wId === "sniper" ? 18 : 6);
    if (canShoot && bd < 34 && canShooterFire(bot, api.elapsed)) {
      api.fire(bot, bot.yaw);
      muzzleFlash(bot);
      bot._shootCd = api.elapsed + (bot._shooterFireCd ?? 0.25);
    }
  }
}
/** 時間結束：依擊殺積分排名；teams 比隊伍總分，ffa 僅個人排名 */
export function buildShooterEndResults(players, human, playStyle = "teams") {
  const ranked = [...players]
    .filter((p) => p)
    .sort((a, b) => {
      const ak = a._shooterStats?.kills ?? 0;
      const bk = b._shooterStats?.kills ?? 0;
      if (bk !== ak) return bk - ak;
      return (a._shooterStats?.deaths ?? 0) - (b._shooterStats?.deaths ?? 0);
    });
  const teamKills = [0, 0];
  for (const p of ranked) {
    if (p.teamId >= 0) teamKills[p.teamId] += p._shooterStats?.kills ?? 0;
  }

  const humanRank = human ? ranked.indexOf(human) + 1 : 0;
  const humanKills = human?._shooterStats?.kills ?? 0;
  const top = ranked[0];
  const topKills = top?._shooterStats?.kills ?? 0;

  const lineFor = (p, i) => {
    const st = p._shooterStats || { kills: 0, deaths: 0 };
    const tag = playStyle === "ffa"
      ? "混戰"
      : SHOOTER_TEAMS[p.teamId ?? 0]?.name ?? "?";
    return `${i + 1}. ${p.charDef?.name || "?"}（${tag}）${st.kills} 分`;
  };
  const lines = ranked.map(lineFor);

  if (playStyle === "ffa") {
    const youWon = human && human === top;
    let msg = `自由混戰結束！${top?.charDef?.name || "—"} 第一名（${topKills} 分）\n`;
    msg += lines.join("\n");
    if (human) msg += `\n你：第 ${humanRank} 名 · ${humanKills} 分`;
    return { won: youWon, msg, ranked, teamWin: null, humanRank, playStyle };
  }

  let teamWin = null;
  if (teamKills[0] !== teamKills[1]) teamWin = teamKills[0] > teamKills[1] ? 0 : 1;

  if (teamWin != null) {
    const wonTeam = SHOOTER_TEAMS[teamWin];
    const youWin = human && (human.teamId ?? 0) === teamWin;
    let msg = `${wonTeam.name} 總分 ${teamKills[teamWin]} 獲勝！\n`;
    msg += `紅隊 ${teamKills[0]} · 藍隊 ${teamKills[1]}\n`;
    msg += lines.join("\n");
    if (human) msg += `\n你：第 ${humanRank} 名 · ${humanKills} 分${youWin ? " · 勝利隊伍！" : ""}`;
    return { won: !!youWin, msg, ranked, teamWin, humanRank, playStyle };
  }

  const youWon = human && human === top;
  let msg = `時間到！${top?.charDef?.name || "—"} 第一名（${topKills} 分）\n`;
  msg += lines.join("\n");
  if (human) msg += `\n你：第 ${humanRank} 名 · ${humanKills} 分`;
  return { won: youWon, msg, ranked, teamWin: null, humanRank, playStyle };
}

export function onShooterDowned(killer, victim, state, elapsed, spawnHeal) {
  if (killer && killer !== victim) {
    killer._shooterStats = killer._shooterStats || { kills: 0, deaths: 0 };
    killer._shooterStats.kills += 1;
  }
  if (victim) {
    victim._shooterStats = victim._shooterStats || { kills: 0, deaths: 0 };
    victim._shooterStats.deaths += 1;
  }
  if (!killer?.isAI) state.humanKills = (state.humanKills || 0) + 1;
  else if (killer?.isAI && !victim?.isAI) state.botKills = (state.botKills || 0) + 1;
  victim.caught = true;
  if (victim.mesh) victim.mesh.visible = false;
  victim._respawnUntil = elapsed + (state.respawnDelay ?? 2.2);
  if (typeof spawnHeal === "function") {
    spawnHeal(victim.pos.x, victim.pos.z);
  }
  if (!victim.isAI) {
    return `${killer?.charDef?.name || "敵人"} 擊倒了你 · ${Math.ceil(state.respawnDelay)} 秒後重生`;
  }
  return null;
}

export function tickShooterRespawns(players, ctx, maze, elapsed) {
  for (const p of players) {
    if (!p._respawnUntil || elapsed < p._respawnUntil) continue;
    respawnShooterPlayer(p, ctx, maze, players);
    p._respawnUntil = 0;
    p.caught = false;
  }
}
