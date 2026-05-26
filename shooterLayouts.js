/**
 * 槍戰關卡專屬布局 — 每個 shooterLayout 外觀與結構不同。
 * 座標可用 gx/gz（格）或 u/v（0~1 相對地圖，會依 w/h 縮放）。
 */

/** @typedef {{ gx?: number, gz?: number, u?: number, v?: number, tier?: number, scale?: number }} Spot */
/** @typedef {{ u0?: number, v0?: number, u1?: number, v1?: number, tier?: number }} BridgeSpot */

export const SHOOTER_LAYOUTS = {
  /** 400 快速巷戰 — 窄巷掩體、少彈跳 */
  urban_quick: {
    coverMode: "wall_alley",
    coverDensity: 0.55,
    decks: [],
    ladders: [],
    bridges: [],
    pads: [{ u: 0.72, v: 0.28, launchV: -1, power: 1.1 }],
    secretGates: [{ u: 0.5, v: 0.35, dir: "bottom" }],
    props: ["tire_stack"],
    accent: 0x8899aa,
  },

  /** 401 競技場 — 中央圓環、四角矮台 */
  arena_ring: {
    coverMode: "ring_sparse",
    coverDensity: 0.35,
    decks: [
      { u: 0.22, v: 0.22, tier: 1, scale: 0.85 },
      { u: 0.78, v: 0.78, tier: 1, scale: 0.85 },
    ],
    ladders: [],
    bridges: [],
    pads: [{ u: 0.5, v: 0.18 }, { u: 0.5, v: 0.82 }],
    props: ["arena_ring", "banner"],
    accent: 0xff4466,
  },

  /** 404 都市廣場 — 十字廣場 + 側翼高台 */
  urban_plaza: {
    coverMode: "plaza_blocks",
    coverDensity: 0.5,
    decks: [
      { u: 0.5, v: 0.5, tier: 1, scale: 1.05 },
      { u: 0.15, v: 0.5, tier: 2, scale: 0.8 },
      { u: 0.85, v: 0.5, tier: 2, scale: 0.8 },
    ],
    ladders: [
      { u: 0.15, v: 0.5, tierTop: 2 },
      { u: 0.85, v: 0.5, tierTop: 2 },
    ],
    bridges: [{ u0: 0.15, v0: 0.5, u1: 0.85, v1: 0.5, tier: 2 }],
    pads: [{ u: 0.5, v: 0.5 }, { u: 0.28, v: 0.72 }],
    props: ["billboard", "bench"],
    accent: 0x667788,
  },

  /** 402 貨櫃碼頭 — 彩色貨櫃列、碼頭護欄 */
  dock_yard: {
    coverMode: "shipping_rows",
    coverDensity: 0.65,
    decks: [
      { u: 0.35, v: 0.65, tier: 1, scale: 0.9 },
      { u: 0.65, v: 0.35, tier: 1, scale: 0.9 },
    ],
    ladders: [{ u: 0.35, v: 0.65, tierTop: 2 }],
    bridges: [],
    pads: [{ u: 0.5, v: 0.5 }, { u: 0.2, v: 0.8 }],
    props: ["container_wall", "crane"],
    accent: 0xcc4422,
  },

  /** 403 天空競技 — 開闊、稀疏雲台 */
  sky_open: {
    coverMode: "cloud_pillars",
    coverDensity: 0.3,
    decks: [
      { u: 0.3, v: 0.3, tier: 2, scale: 0.75 },
      { u: 0.7, v: 0.7, tier: 2, scale: 0.75 },
      { u: 0.7, v: 0.3, tier: 1, scale: 0.7 },
    ],
    ladders: [
      { u: 0.3, v: 0.3, tierTop: 2 },
      { u: 0.7, v: 0.7, tierTop: 2 },
    ],
    bridges: [{ u0: 0.3, v0: 0.3, u1: 0.7, v1: 0.3, tier: 1 }],
    pads: [{ u: 0.5, v: 0.5 }, { u: 0.3, v: 0.7 }, { u: 0.7, v: 0.3 }],
    props: ["cloud_ring"],
    accent: 0x66ccff,
  },

  /** 405 雙塔擂台 — 兩座高塔 + 垂直長梯 */
  sky_twin_towers: {
    coverMode: "minimal",
    coverDensity: 0.2,
    decks: [
      { u: 0.25, v: 0.25, tier: 3, scale: 0.95 },
      { u: 0.75, v: 0.75, tier: 3, scale: 0.95 },
      { u: 0.25, v: 0.75, tier: 1, scale: 0.8 },
      { u: 0.75, v: 0.25, tier: 1, scale: 0.8 },
    ],
    ladders: [
      { u: 0.25, v: 0.25, tierTop: 3 },
      { u: 0.75, v: 0.75, tierTop: 3 },
    ],
    bridges: [{ u0: 0.25, v0: 0.25, u1: 0.75, v1: 0.75, tier: 3 }],
    pads: [{ u: 0.5, v: 0.5 }, { u: 0.25, v: 0.25 }, { u: 0.75, v: 0.75 }],
    props: ["tower_antenna"],
    accent: 0x4488dd,
  },

  /** 406 大競技 — 超大開闊、遠距狙擊點 */
  arena_sniper_mega: {
    coverMode: "sniper_rocks",
    coverDensity: 0.25,
    decks: [
      { u: 0.12, v: 0.12, tier: 2, scale: 0.9 },
      { u: 0.88, v: 0.88, tier: 2, scale: 0.9 },
      { u: 0.12, v: 0.88, tier: 2, scale: 0.9 },
      { u: 0.88, v: 0.12, tier: 2, scale: 0.9 },
      { u: 0.5, v: 0.5, tier: 1, scale: 1.1 },
    ],
    ladders: [
      { u: 0.12, v: 0.12, tierTop: 2 },
      { u: 0.88, v: 0.88, tierTop: 2 },
    ],
    bridges: [],
    pads: [
      { u: 0.5, v: 0.5 },
      { u: 0.2, v: 0.5 },
      { u: 0.8, v: 0.5 },
      { u: 0.5, v: 0.2 },
      { u: 0.5, v: 0.8 },
    ],
    props: ["sniper_nest", "arena_ring"],
    accent: 0xaa8866,
  },

  /** 407 霓虹迷城 — 霓虹柱、多層跳台 */
  neon_grid: {
    coverMode: "neon_pillars",
    coverDensity: 0.45,
    decks: [
      { u: 0.2, v: 0.5, tier: 2, scale: 0.8 },
      { u: 0.8, v: 0.5, tier: 2, scale: 0.8 },
      { u: 0.5, v: 0.2, tier: 1, scale: 0.85 },
      { u: 0.5, v: 0.8, tier: 1, scale: 0.85 },
    ],
    ladders: [
      { u: 0.2, v: 0.5, tierTop: 2 },
      { u: 0.8, v: 0.5, tierTop: 2 },
    ],
    bridges: [
      { u0: 0.2, v0: 0.5, u1: 0.8, v1: 0.5, tier: 2 },
      { u0: 0.5, v0: 0.2, u1: 0.5, v1: 0.8, tier: 1 },
    ],
    pads: [{ u: 0.5, v: 0.5 }, { u: 0.2, v: 0.2 }, { u: 0.8, v: 0.8 }],
    props: ["neon_sign", "holo_ring"],
    accent: 0xff66cc,
  },

  /** 408 彈跳巷戰 — 多彈跳板、低層窗台 */
  bounce_alley: {
    coverMode: "paint_fence",
    coverDensity: 0.6,
    decks: [
      { u: 0.35, v: 0.35, tier: 1, scale: 0.75 },
      { u: 0.65, v: 0.65, tier: 1, scale: 0.75 },
    ],
    ladders: [],
    bridges: [],
    pads: [
      { u: 0.25, v: 0.5 },
      { u: 0.75, v: 0.5 },
      { u: 0.5, v: 0.25 },
      { u: 0.5, v: 0.75 },
      { u: 0.5, v: 0.5 },
    ],
    props: ["paint_splat", "wood_fence"],
    accent: 0x99aa77,
  },

  /** 409 密道突襲 — 掩體多、少高台 */
  ambush_corridor: {
    coverMode: "dense_crates",
    coverDensity: 0.75,
    decks: [{ u: 0.5, v: 0.5, tier: 1, scale: 0.7 }],
    ladders: [],
    bridges: [],
    pads: [{ u: 0.4, v: 0.6, launchU: 1 }, { u: 0.6, v: 0.4, launchV: -1 }],
    secretGates: [
      { u: 0.35, v: 0.5, dir: "right" },
      { u: 0.65, v: 0.5, dir: "left" },
      { u: 0.5, v: 0.35, dir: "bottom" },
      { u: 0.5, v: 0.65, dir: "top" },
    ],
    props: ["sandbag", "crate_wall"],
    accent: 0x778899,
  },

  /** 410 天梯攻防 — 中央高樓 + 長梯 */
  central_keep: {
    coverMode: "stone_keep",
    coverDensity: 0.4,
    decks: [
      { u: 0.5, v: 0.5, tier: 1, scale: 1.0 },
      { u: 0.5, v: 0.5, tier: 2, scale: 0.85 },
      { u: 0.5, v: 0.5, tier: 3, scale: 0.75 },
    ],
    ladders: [{ u: 0.5, v: 0.5, tierTop: 3 }],
    secretGates: [{ u: 0.5, v: 0.72, dir: "top" }],
    bridges: [],
    pads: [
      { u: 0.5, v: 0.5 },
      { u: 0.18, v: 0.18 },
      { u: 0.82, v: 0.82 },
    ],
    props: ["castle_banner", "flag"],
    accent: 0x5599cc,
  },

  /** 411 漆彈廣場 — 漆彈場圍欄、輪胎、多彈跳 */
  paintball_camp: {
    coverMode: "paintball_field",
    coverDensity: 0.7,
    decks: [
      { u: 0.3, v: 0.3, tier: 1, scale: 0.9 },
      { u: 0.7, v: 0.7, tier: 1, scale: 0.9 },
    ],
    ladders: [{ u: 0.3, v: 0.3, tierTop: 2 }],
    bridges: [],
    pads: [
      { u: 0.2, v: 0.5 },
      { u: 0.8, v: 0.5 },
      { u: 0.5, v: 0.2 },
      { u: 0.5, v: 0.8 },
      { u: 0.35, v: 0.65 },
      { u: 0.65, v: 0.35 },
    ],
    props: ["paint_fence", "tire_stack", "yellow_barrier"],
    accent: 0xddcc33,
  },

  /** 412 立體灰盒 — 對角平台、天橋 */
  greybox_parkour: {
    coverMode: "grey_blocks",
    coverDensity: 0.5,
    decks: [
      { u: 0.2, v: 0.2, tier: 1, scale: 0.85 },
      { u: 0.8, v: 0.8, tier: 2, scale: 0.85 },
      { u: 0.8, v: 0.2, tier: 1, scale: 0.8 },
      { u: 0.2, v: 0.8, tier: 2, scale: 0.8 },
    ],
    ladders: [
      { u: 0.8, v: 0.8, tierTop: 2 },
      { u: 0.2, v: 0.8, tierTop: 2 },
    ],
    bridges: [
      { u0: 0.2, v0: 0.2, u1: 0.8, v1: 0.8, tier: 1 },
      { u0: 0.8, v0: 0.2, u1: 0.2, v1: 0.8, tier: 2 },
    ],
    pads: [
      { u: 0.5, v: 0.5 },
      { u: 0.2, v: 0.2 },
      { u: 0.8, v: 0.8 },
      { u: 0.5, v: 0.15 },
    ],
    props: ["grey_ramp_marker"],
    accent: 0x99aabb,
  },

  /** 413 天空跑酷 — 長天橋、彈跳串聯 */
  sky_runway: {
    coverMode: "minimal",
    coverDensity: 0.22,
    decks: [
      { u: 0.15, v: 0.5, tier: 2, scale: 0.8 },
      { u: 0.85, v: 0.5, tier: 2, scale: 0.8 },
      { u: 0.5, v: 0.15, tier: 1, scale: 0.75 },
      { u: 0.5, v: 0.85, tier: 1, scale: 0.75 },
    ],
    ladders: [
      { u: 0.15, v: 0.5, tierTop: 2 },
      { u: 0.85, v: 0.5, tierTop: 2 },
    ],
    bridges: [
      { u0: 0.15, v0: 0.5, u1: 0.85, v1: 0.5, tier: 2 },
      { u0: 0.5, v0: 0.15, u1: 0.5, v1: 0.85, tier: 1 },
    ],
    pads: [
      { u: 0.15, v: 0.5 },
      { u: 0.85, v: 0.5 },
      { u: 0.5, v: 0.15 },
      { u: 0.5, v: 0.85 },
      { u: 0.5, v: 0.5 },
      { u: 0.35, v: 0.35 },
      { u: 0.65, v: 0.65 },
    ],
    props: ["runway_light", "stripe_bridge"],
    accent: 0x55ddff,
  },

  /** 414 霓虹立體城 — 多層霓虹 + 密道感 */
  neon_spire: {
    coverMode: "neon_spire",
    coverDensity: 0.42,
    decks: [
      { u: 0.35, v: 0.35, tier: 2, scale: 0.8 },
      { u: 0.65, v: 0.65, tier: 2, scale: 0.8 },
      { u: 0.5, v: 0.5, tier: 3, scale: 0.7 },
    ],
    ladders: [
      { u: 0.35, v: 0.35, tierTop: 2 },
      { u: 0.5, v: 0.5, tierTop: 3 },
    ],
    bridges: [{ u0: 0.35, v0: 0.35, u1: 0.65, v1: 0.65, tier: 2 }],
    pads: [
      { u: 0.5, v: 0.5, launchV: -1, power: 1.3 },
      { u: 0.35, v: 0.35, launchU: 1, launchV: -1 },
      { u: 0.65, v: 0.65, launchU: -1, launchV: 1 },
      { u: 0.5, v: 0.2, launchV: -1, power: 1.2 },
      { u: 0.2, v: 0.5, launchU: 1 },
    ],
    secretGates: [
      { u: 0.5, v: 0.25, dir: "bottom" },
      { u: 0.75, v: 0.5, dir: "right" },
    ],
    props: ["neon_spire", "holo_ring"],
    accent: 0xaa44ff,
  },
};

const LAYOUT_PALETTES = {
  urban_quick: { sky: 0x1a2430, floor: 0x3a4a38, fog: 0x1a2430, secret: 0x66cc88, pad: 0x33eeff },
  arena_ring: { sky: 0x2a3848, floor: 0x7a5848, fog: 0x2e3a48, secret: 0xffaa44, pad: 0xff8844 },
  urban_plaza: { sky: 0x283038, floor: 0x5c5e62, fog: 0x283038, secret: 0x88ddff, pad: 0x44aaff },
  dock_yard: { sky: 0x1e2838, floor: 0x4a4038, fog: 0x243038, secret: 0xffcc66, pad: 0xffaa33 },
  sky_open: { sky: 0x88ccff, floor: 0x446688, fog: 0x6699cc, secret: 0xffffff, pad: 0x66ffff },
  sky_twin_towers: { sky: 0x4488dd, floor: 0x335577, fog: 0x5588aa, secret: 0xaaddff, pad: 0x44ddff },
  arena_sniper_mega: { sky: 0x88a8c8, floor: 0xa8b0a0, fog: 0x7898b8, secret: 0x886644, pad: 0xdd9966 },
  neon_grid: { sky: 0x120818, floor: 0x281030, fog: 0x180a20, secret: 0xff44ff, pad: 0xff66cc },
  bounce_alley: { sky: 0x2a3828, floor: 0x5a6a48, fog: 0x2a3828, secret: 0xaaff66, pad: 0x44ff88 },
  ambush_corridor: { sky: 0x101820, floor: 0x2a3038, fog: 0x101820, secret: 0x44ff99, pad: 0x33ccaa },
  central_keep: { sky: 0x3a4a58, floor: 0x5a6068, fog: 0x3a4a58, secret: 0xffdd88, pad: 0x66aaff },
  paintball_camp: { sky: 0x6a9a44, floor: 0x88bb55, fog: 0x5a8833, secret: 0xff66aa, pad: 0xffee22 },
  greybox_parkour: { sky: 0x8899aa, floor: 0x99aabb, fog: 0x778899, secret: 0x334455, pad: 0x55ccff },
  sky_runway: { sky: 0x55bbff, floor: 0x3377aa, fog: 0x4499cc, secret: 0xeeffff, pad: 0x33ffff },
  neon_spire: { sky: 0x0a0518, floor: 0x220a38, fog: 0x150820, secret: 0xff66ff, pad: 0xaa44ff },
};

export function getShooterLayout(level) {
  const key = level?.shooterLayout || level?.mapStyle || "arena_ring";
  const base = SHOOTER_LAYOUTS[key] || SHOOTER_LAYOUTS.arena_ring;
  return {
    ...base,
    palette: { ...LAYOUT_PALETTES[key], accent: base.accent },
  };
}

export function findMazeJunctions(maze, w, h) {
  const out = [];
  for (let gz = 1; gz < h - 1; gz++) {
    for (let gx = 1; gx < w - 1; gx++) {
      const c = maze[gz][gx];
      let n = 0;
      if (!c.left) n++;
      if (!c.right) n++;
      if (!c.top) n++;
      if (!c.bottom) n++;
      if (n >= 3) out.push({ gx, gz });
    }
  }
  return out;
}

/** 格是否為岔路／凹室（避免在主干道中央放平台擋路） */
export function isShooterAlcove(maze, w, h, gx, gz) {
  if (gx < 0 || gz < 0 || gx >= w || gz >= h) return false;
  const c = maze[gz][gx];
  let open = 0;
  if (!c.left) open++;
  if (!c.right) open++;
  if (!c.top) open++;
  if (!c.bottom) open++;
  return open <= 2;
}

export function resolveSpot(ctx, spot) {
  const { w, h } = ctx;
  const gx = spot.gx != null
    ? Math.max(1, Math.min(w - 2, spot.gx))
    : 1 + Math.floor((spot.u ?? 0.5) * Math.max(1, w - 3));
  const gz = spot.gz != null
    ? Math.max(1, Math.min(h - 2, spot.gz))
    : 1 + Math.floor((spot.v ?? 0.5) * Math.max(1, h - 3));
  return { gx, gz, tier: spot.tier ?? 1, scale: spot.scale ?? 1 };
}
