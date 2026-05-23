/** FORSAKEN 官方招式名稱對照（簡化實作） */

export const SURVIVOR_ABILITIES = {
  noob: [
    { id: "cola", name: "Bloxy Cola", cd: 12, dur: 4, desc: "加速" },
    { id: "slateskin", name: "Slateskin Potion", cd: 18, dur: 3, desc: "護盾" },
    { id: "ghostburger", name: "Ghostburger", cd: 14, dur: 5, desc: "隱身" },
  ],
  elliot: [
    { id: "pizza", name: "Pizza Throw", cd: 12, dur: 0, desc: "恢復體力" },
    { id: "rush", name: "Rush Hour", cd: 10, dur: 4, desc: "衝刺加速" },
    { id: "heal", name: "Support", cd: 18, dur: 0, desc: "治療隊友" },
  ],
  shedletsky: [
    { id: "slash_s", name: "Slash", cd: 10, dur: 0, desc: "短距離反擊" },
    { id: "chicken", name: "Fried Chicken", cd: 14, dur: 0, desc: "恢復" },
    { id: "shield", name: "Guard", cd: 18, dur: 3, desc: "護盾" },
  ],
  builderman: [
    { id: "sentry", name: "Sentry", cd: 16, dur: 8, desc: "障礙" },
    { id: "dispenser", name: "Dispenser", cd: 14, dur: 0, desc: "恢復" },
    { id: "overclock", name: "Overclock", cd: 12, dur: 4, desc: "加速" },
  ],
  "007n7": [
    { id: "clone", name: "Clone", cd: 16, dur: 8, desc: "分身" },
    { id: "c00lgui", name: "CoolGUI", cd: 20, dur: 0, desc: "傳送" },
    { id: "inject", name: "Inject", cd: 12, dur: 3, desc: "極速" },
  ],
  twotime: [
    { id: "dagger", name: "Sacrificial Dagger", cd: 10, dur: 0, desc: "反擊" },
    { id: "crouch", name: "Crouch", cd: 14, dur: 4, desc: "隱身" },
    { id: "ritual", name: "Ritual", cd: 22, dur: 0, desc: "傳送" },
  ],
  guest1337: [
    { id: "block", name: "Block", cd: 12, dur: 2, desc: "格擋" },
    { id: "charge", name: "Charge", cd: 10, dur: 0, desc: "衝鋒" },
    { id: "punch", name: "Punch", cd: 14, dur: 0, desc: "震開" },
  ],
  veeronica: [
    { id: "sk8", name: "SK8", cd: 12, dur: 4, desc: "滑板加速" },
    { id: "blink", name: "Vandalism", cd: 14, dur: 0, desc: "瞬移" },
    { id: "cloak", name: "Broadcast", cd: 16, dur: 5, desc: "隱身" },
  ],
  chance: [
    { id: "coin", name: "Coin Flip", cd: 14, dur: 0, desc: "隨機增益" },
    { id: "oneshot", name: "One Shot", cd: 16, dur: 0, desc: "遠程干擾" },
    { id: "roll", name: "Reroll", cd: 10, dur: 0, desc: "翻滾" },
  ],
  taph: [
    { id: "tripwire", name: "Tripwire", cd: 14, dur: 6, desc: "陷阱" },
    { id: "mine", name: "Subspace Tripmine", cd: 16, dur: 0, desc: "地雷" },
    { id: "smoke", name: "Smoke", cd: 14, dur: 4, desc: "隱身" },
  ],
  dusekkar: [
    { id: "protection", name: "Spawn Protection", cd: 18, dur: 4, desc: "護盾" },
    { id: "plasma", name: "Plasma Beam", cd: 12, dur: 0, desc: "光束" },
    { id: "heal", name: "Heal", cd: 16, dur: 0, desc: "治療" },
  ],
  janedoe: [
    { id: "crystal_pitch", name: "Crystal Pitch", cd: 16, dur: 0, desc: "投擲水晶" },
    { id: "hatchet", name: "Hatchet", cd: 35, dur: 0, desc: "斧擊/暈眩" },
    { id: "footprint", name: "Digital Footprint", cd: 12, dur: 6, desc: "追蹤獵人" },
  ],
};

export const KILLER_ABILITIES = {
  "1x1x1x1": [
    { id: "slash", name: "Slash", cd: 6, dur: 0, desc: "中距離斬擊" },
    { id: "mass_infection", name: "Mass Infection", cd: 12, dur: 0, desc: "腐化彈" },
    { id: "entanglement", name: "Entanglement", cd: 16, dur: 2, desc: "定身" },
  ],
  johndoe: [
    { id: "slash", name: "Slash", cd: 6, dur: 0, desc: "斬擊" },
    { id: "corrupt_energy", name: "Corrupt Energy", cd: 10, dur: 0, desc: "遠程腐化" },
    { id: "digital_footprint", name: "Digital Footprint", cd: 14, dur: 0, desc: "衝刺" },
  ],
  guest666k: [
    { id: "carving_slash", name: "Carving Slash", cd: 7, dur: 0, desc: "斬擊" },
    { id: "demonic_pursuit", name: "Demonic Pursuit", cd: 10, dur: 0, desc: "衝刺" },
    { id: "infernal_cry", name: "Infernal Cry", cd: 18, dur: 4, desc: "範圍減速" },
  ],
  nosferatu: [
    { id: "lacerate", name: "Lacerate", cd: 6, dur: 0, desc: "血刃" },
    { id: "bloodhook", name: "Bloodhook", cd: 11, dur: 0, desc: "遠程鉤" },
    { id: "cataclysm", name: "Cataclysm", cd: 16, dur: 0, desc: "範圍" },
  ],
  noli: [
    { id: "stab", name: "Stab", cd: 6, dur: 0, desc: "刺擊" },
    { id: "void_rush", name: "Void Rush", cd: 9, dur: 0, desc: "虛空衝" },
    { id: "nova", name: "Nova", cd: 15, dur: 0, desc: "爆炸波" },
  ],
  c00lkidd: [
    { id: "corrupt", name: "Corrupt Nature", cd: 9, dur: 0, desc: "遠程彈" },
    { id: "dash", name: "Walkspeed Override", cd: 8, dur: 0, desc: "暴衝" },
    { id: "pizza", name: "Pizza Delivery", cd: 18, dur: 6, desc: "機器人" },
  ],
  slasher: [
    { id: "slash", name: "Slash", cd: 6, dur: 0, desc: "斬擊" },
    { id: "behead", name: "Behead", cd: 12, dur: 0, desc: "遠程重擊" },
    { id: "gashing", name: "Gashing Wound", cd: 14, dur: 3, desc: "流血" },
  ],
};

const RANGED_SLASH = 6.5;
const MELEE_CATCH = 1.7;

export function createPlayerState(charDef, role, profile, isHuman = false) {
  const abList =
    role === "killer"
      ? KILLER_ABILITIES[charDef.id] || KILLER_ABILITIES.c00lkidd
      : SURVIVOR_ABILITIES[charDef.id] || SURVIVOR_ABILITIES.noob;

  return {
    charDef,
    role,
    profile,
    isHuman,
    isAI: !isHuman,
    pos: { x: 0, z: 0 },
    vel: { x: 0, z: 0 },
    stamina: 100,
    sprintMeter: 100,
    sprintExhausted: false,
    sprintRecoverAt: 0,
    yaw: 0,
    mesh: null,
    cooldowns: Object.fromEntries(abList.map((a) => [a.id, 0])),
    effects: { invisible: 0, speedBoost: 0, shield: 0, slow: 0 },
    abilities: abList,
    history: [],
    cloneMesh: null,
    invuln: 0,
    sprintBoost: 0,
    hp: 100,
    caught: false,
    velY: 0,
    onGround: true,
    jumpsMax: 1,
    jumpsUsed: 0,
    hasWallJump: false,
    _pathTimer: 0,
    _gpPrev: {},
    _lastPos: null,
    _stuckT: 0,
    slideTimer: 0,
    slideCd: 0,
    sliding: false,
    slideDir: null,
    _meleeCd: 0,
    _aiAtkCd: 0,
  };
}

export function tickCooldowns(p, dt) {
  for (const k of Object.keys(p.cooldowns))
    if (p.cooldowns[k] > 0) p.cooldowns[k] = Math.max(0, p.cooldowns[k] - dt);
  const e = p.effects;
  if (e.invisible > 0) e.invisible -= dt;
  if (e.speedBoost > 0) e.speedBoost -= dt;
  if (e.shield > 0) e.shield -= dt;
  if (e.slow > 0) e.slow -= dt;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.sprintBoost > 0) p.sprintBoost -= dt;
  if ((p._lastVfxT ?? 0) > 0) p._lastVfxT -= dt;
}

export function tryAbility(p, abIndex, ctx, game) {
  const ab = p.abilities[abIndex];
  if (!ab || p.cooldowns[ab.id] > 0) return false;
  if (p.role === "killer" && !game.getNearestSurvivor?.(p.pos)) return false;
  p.cooldowns[ab.id] = ab.cd;
  applyAbility(p, ab, ctx, game);
  if (!p.isAI) {
    const lite = p.role === "survivor";
    if (!lite || (p._lastVfxT ?? 0) <= 0) {
      game.playVfx?.(p, ab.id, { lite: true });
      p._lastVfxT = lite ? 0.12 : 0;
    }
    if (p.role === "killer") {
      game.showAbilityToast?.(p, ab.desc || ab.name);
    }
  } else if (p.isAI) {
    game.playVfx?.(p, ab.id, { lite: true });
  }
  return true;
}

function applyAbility(p, ab, ctx, game) {
  const { exitPos, projectiles, minions } = game;
  const yaw = p.yaw || 0;

  if (p.role === "survivor") {
    applySurvivorAbility(p, ab, ctx, game, yaw, exitPos);
    return;
  }

  const target = game.getNearestSurvivor?.(p.pos);
  if (!target) return;
  applyKillerAbility(p, ab, target, game, projectiles, minions, yaw);
}

function applySurvivorAbility(p, ab, ctx, game, yaw, exitPos) {
  switch (ab.id) {
    case "ghostburger":
    case "smoke":
    case "cloak":
    case "crouch":
      p.effects.invisible = ab.dur || 4;
      break;
    case "cola":
    case "rush":
    case "inject":
    case "chicken":
    case "sk8":
    case "overclock":
      p.effects.speedBoost = ab.dur || 4;
      break;
    case "slateskin":
    case "ward":
    case "shield":
    case "block":
    case "protection":
      p.effects.shield = ab.dur || 3;
      break;
    case "c00lgui":
    case "ritual": {
      const dx = exitPos.x - p.pos.x;
      const dz = exitPos.z - p.pos.z;
      const len = Math.hypot(dx, dz) || 1;
      p.pos.x += (dx / len) * Math.min(len * 0.5, ctx.w * ctx.cell * 0.4);
      p.pos.z += (dz / len) * Math.min(len * 0.5, ctx.w * ctx.cell * 0.4);
      break;
    }
    case "clone":
      game.spawnClone?.(p);
      break;
    case "blink":
    case "lunge":
    case "dash":
    case "roll":
    case "charge":
    case "punch":
      p.pos.x += Math.sin(yaw) * 6;
      p.pos.z += Math.cos(yaw) * 6;
      p.sprintBoost = 0.35;
      break;
    case "pizza":
    case "dispenser":
    case "heal":
      p.stamina = Math.min(100, p.stamina + 50);
      game.healNearby?.(p, 10);
      break;
    case "coin":
      if (Math.random() > 0.4) p.effects.speedBoost = 4;
      else p.effects.shield = 2;
      break;
    case "oneshot":
    case "plasma":
      game.fireSurvivorShot?.(p, yaw);
      break;
    case "tripwire":
    case "mine":
    case "sentry":
      game.placeTrap?.(p.pos.x, p.pos.z);
      break;
    case "slash_s":
    case "dagger":
    case "hatchet":
      game.survivorMelee?.(p, ab.id === "hatchet" ? 5.5 : 4);
      break;
    case "crystal_pitch":
      game.fireSurvivorShot?.(p, yaw);
      p.effects.shield = 2;
      break;
    case "footprint":
      p.effects.speedBoost = ab.dur || 6;
      break;
    default:
      p.effects.speedBoost = 3;
  }
}

function applyKillerAbility(p, ab, target, game, projectiles, minions, yaw) {
  const dist = Math.hypot(target.pos.x - p.pos.x, target.pos.z - p.pos.z);

  const accent = p.charDef?.accent || 0xff2244;
  const rangedSlash = () => {
    if (dist <= RANGED_SLASH + 1) {
      if (!game.startKillerAttack?.(p, target, { damage: 36, abId: ab.id })) {
        game.tryKillerMelee?.(p, target, 36) || game.hitSurvivor?.(target, p, 36);
      }
    } else if (game.fireKillerShot) {
      game.fireKillerShot(p, target, accent, 1.15);
    } else {
      projectiles.push({
        x: p.pos.x, z: p.pos.z,
        vx: (target.pos.x - p.pos.x) * 1.15,
        vz: (target.pos.z - p.pos.z) * 1.15,
        life: 2.5,
        color: accent,
        damage: 38,
        killerRef: p,
      });
    }
  };

  switch (ab.id) {
    case "slash":
    case "carving_slash":
    case "lacerate":
    case "stab":
      rangedSlash();
      break;
    case "dash":
    case "demonic_pursuit":
    case "void_rush":
    case "digital_footprint": {
      const dx = target.pos.x - p.pos.x;
      const dz = target.pos.z - p.pos.z;
      const len = Math.hypot(dx, dz) || 1;
      p.pos.x += (dx / len) * 9;
      p.pos.z += (dz / len) * 9;
      p.sprintBoost = 1;
      break;
    }
    case "corrupt":
    case "corrupt_energy":
    case "mass_infection":
    case "bloodhook":
    case "behead":
      if (game.fireKillerShot) {
        game.fireKillerShot(p, target, ab.id.includes("mass") ? 0x33ff44 : 0xff2244, 1.15);
      }
      break;
    case "pizza":
      for (let i = 0; i < 2; i++) {
        minions.push({ x: p.pos.x + (i ? 2.5 : -2.5), z: p.pos.z, life: 6, speed: 10 });
      }
      break;
    case "entanglement":
    case "infernal_cry":
    case "gashing":
      if (dist < 12) target.effects.slow = Math.min(ab.dur || 2, 0.85);
      if (game.fireKillerShot && !p.isAI) game.fireKillerShot(p, target, 0xaa44ff, 1.05);
      else if (game.fireKillerShot && Math.random() < 0.5) game.fireKillerShot(p, target, 0xaa44ff, 1.05);
      break;
    case "nova":
    case "cataclysm":
      game.aoeAttack?.(p.pos, 7, p);
      break;
    default:
      rangedSlash();
  }
}

export function getSpeedMult(p) {
  let m = 1;
  if (p.passives?.speed || p._speedShoes) m *= 1.12;
  if (p.effects.speedBoost > 0) m *= 1.4;
  if (p.sprintBoost > 0) m *= 1.25;
  if (p.effects.invisible > 0) m *= 0.92;
  if (p.effects.slow > 0) m *= 0.82;
  return m;
}

export function isInvisibleToKiller(p) {
  return p.effects.invisible > 0;
}

export function hasShield(p) {
  return p.effects.shield > 0;
}

export function consumeShield(p) {
  if (p.effects.shield > 0) {
    p.effects.shield = 0;
    return true;
  }
  return false;
}

export { RANGED_SLASH, MELEE_CATCH };
