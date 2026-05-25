/**
 * 槍戰關卡「性格」— 每張圖像 CS / Rivals 一樣有主題區、牆色、迷霧與大地標。
 */
import { getShooterLayout } from "./shooterLayouts.js";

/** @typedef {{ floorA: number, floorB: number, wall: number, wallAlt: number, accent: number, sky: number, fog: number, fogNear?: number, fogFar?: number, tagline: string }} MapIdentity */

const IDENTITIES = {
  urban_quick: {
    tagline: "巷戰 · 窄街掩體",
    floorA: 0x3a4a38, floorB: 0x2e3828, wall: 0x5a6a72, wallAlt: 0x445558, accent: 0x88aa99, sky: 0x1a2430, fog: 0x1a2830,
  },
  arena_ring: {
    tagline: "競技 · 中央圓環",
    floorA: 0x9a5038, floorB: 0x7a3828, wall: 0xaa6644, wallAlt: 0x884422, accent: 0xff6644, sky: 0x2a1810, fog: 0x3a2018,
  },
  urban_plaza: {
    tagline: "廣場 · 十字高台",
    floorA: 0x6a6c70, floorB: 0x4a4c52, wall: 0x888890, wallAlt: 0x666870, accent: 0xaaccff, sky: 0x283038, fog: 0x283038,
  },
  dock_yard: {
    tagline: "碼頭 · 貨櫃列",
    floorA: 0x5a4030, floorB: 0x3a2818, wall: 0x776655, wallAlt: 0x554433, accent: 0xffaa44, sky: 0x1a1408, fog: 0x2a1808,
  },
  sky_open: {
    tagline: "天空 · 雲台開闊",
    floorA: 0x5588bb, floorB: 0x336699, wall: 0x99ccff, wallAlt: 0x6699cc, accent: 0x66ffff, sky: 0x88ccff, fog: 0x99ccee,
  },
  sky_twin_towers: {
    tagline: "雙塔 · 垂直狙擊",
    floorA: 0x335577, floorB: 0x223355, wall: 0x4488cc, wallAlt: 0x2266aa, accent: 0x44ddff, sky: 0x4488dd, fog: 0x5588aa,
  },
  arena_sniper_mega: {
    tagline: "荒原 · 四角狙台",
    floorA: 0xd4b896, floorB: 0xb89870, wall: 0x998866, wallAlt: 0x776644, accent: 0xff8844, sky: 0xc9b080, fog: 0xb8a070,
  },
  neon_grid: {
    tagline: "霓虹 · 網格迷城",
    floorA: 0x281030, floorB: 0x180820, wall: 0xaa44ff, wallAlt: 0x6622aa, accent: 0xff66cc, sky: 0x120818, fog: 0x180a20,
  },
  bounce_alley: {
    tagline: "彈跳 · 巷弄圍欄",
    floorA: 0x6a8a55, floorB: 0x4a6a38, wall: 0x88aa66, wallAlt: 0x668844, accent: 0x44ff88, sky: 0x2a3828, fog: 0x2a3828,
  },
  ambush_corridor: {
    tagline: "密道 · 沙袋走廊",
    floorA: 0x3a4048, floorB: 0x2a3038, wall: 0x556066, wallAlt: 0x3a4550, accent: 0x44ff99, sky: 0x101820, fog: 0x101820,
  },
  central_keep: {
    tagline: "城堡 · 天梯攻防",
    floorA: 0x6a6e78, floorB: 0x4a4e58, wall: 0x8899aa, wallAlt: 0x667788, accent: 0xffdd88, sky: 0x3a4a58, fog: 0x3a4a58,
  },
  paintball_camp: {
    tagline: "漆彈 · 營地圍欄",
    floorA: 0x88bb55, floorB: 0x6a9933, wall: 0xddcc44, wallAlt: 0xaa8822, accent: 0xffee22, sky: 0x6a9a44, fog: 0x5a8833,
  },
  greybox_parkour: {
    tagline: "灰盒 · 跑酷天橋",
    floorA: 0x99aabb, floorB: 0x778899, wall: 0xccddee, wallAlt: 0x99aabb, accent: 0x55ccff, sky: 0x8899aa, fog: 0x778899,
  },
  sky_runway: {
    tagline: "跑道 · 高空加速",
    floorA: 0x4488cc, floorB: 0x2266aa, wall: 0x66bbff, wallAlt: 0x3388dd, accent: 0x33ffff, sky: 0x55bbff, fog: 0x4499cc,
  },
  neon_spire: {
    tagline: "尖塔 · 霓虹立體",
    floorA: 0x2a0a48, floorB: 0x180830, wall: 0xff44ff, wallAlt: 0xaa22cc, accent: 0xaa44ff, sky: 0x0a0518, fog: 0x150820,
  },
};

export function getShooterMapIdentity(level) {
  const key = level?.shooterLayout || "arena_ring";
  const layout = getShooterLayout(level);
  const base = IDENTITIES[key] || IDENTITIES.arena_ring;
  const pal = layout.palette || {};
  return {
    layoutKey: key,
    tagline: base.tagline,
    themeOverride: {
      floorA: pal.floor ?? base.floorA,
      floorB: ((pal.floor ?? base.floorA) & 0xfefefe) >> 1,
      wall: base.wall,
      wallAlt: base.wallAlt,
      accent: layout.accent ?? base.accent,
      deco: pal.secret ?? base.accent,
    },
    atmosphere: {
      sky: pal.sky ?? base.sky,
      fog: pal.fog ?? base.fog,
    },
    shooterPalette: pal,
  };
}

export function applyShooterThemeToLevel(level, theme) {
  const id = getShooterMapIdentity(level);
  return {
    ...theme,
    floorA: id.themeOverride.floorA,
    floorB: id.themeOverride.floorB,
    wall: id.themeOverride.wall,
    wallAlt: id.themeOverride.wallAlt,
    accent: id.themeOverride.accent,
    deco: id.themeOverride.deco,
    sky: id.atmosphere.sky,
  };
}
