/** 關卡 — 主題色、任務站、獵人時間（預設 3 分鐘在選單設定） */

export const LEVEL_THEMES = [

  { floorA: 0x4a3868, floorB: 0x5e4a82, wall: 0xc8b0e8, sky: 0x1a1228, accent: 0xff4466, deco: 0x66ccff },

  { floorA: 0x2a4048, floorB: 0x355858, wall: 0x88c0c8, sky: 0x0a1820, accent: 0x44ffcc, deco: 0x2288aa },

  { floorA: 0x483828, floorB: 0x5a4838, wall: 0xd8b890, sky: 0x1a1008, accent: 0xffaa44, deco: 0xff8844 },

  { floorA: 0x283848, floorB: 0x384858, wall: 0xa0b8d8, sky: 0x081018, accent: 0x6688ff, deco: 0x4466ff },

  { floorA: 0x3a2848, floorB: 0x4a3860, wall: 0xbb99cc, sky: 0x140a20, accent: 0xff66aa, deco: 0xcc44aa },

  { floorA: 0x1a3828, floorB: 0x2a4838, wall: 0x88cc99, sky: 0x081410, accent: 0x44ff88, deco: 0x33aa66 },

  { floorA: 0x382828, floorB: 0x483030, wall: 0xcc9999, sky: 0x180808, accent: 0xff5544, deco: 0xaa3333 },

  { floorA: 0x202038, floorB: 0x303050, wall: 0x9999cc, sky: 0x050510, accent: 0xaa66ff, deco: 0x7744cc },

  { floorA: 0x3a3020, floorB: 0x4a4030, wall: 0xccb888, sky: 0x141008, accent: 0xff8844, deco: 0xffaa22 },

  { floorA: 0x183838, floorB: 0x284848, wall: 0x88ddcc, sky: 0x061818, accent: 0x22ffaa, deco: 0x44ccaa },

  { floorA: 0x301828, floorB: 0x402030, wall: 0xdd99bb, sky: 0x100610, accent: 0xff2288, deco: 0xff66cc },

  { floorA: 0x282018, floorB: 0x383028, wall: 0xaaa0cc, sky: 0x0a0818, accent: 0x8866ff, deco: 0x5544aa },

];



export const LEVELS = [

  {

    id: 1, name: "覺醒", desc: "入門 · 紫霧 · 6 任務站",

    w: 11, h: 11, cellSize: 9, killerSpeed: 8.5,

    fogNear: 35, fogFar: 120, loops: 4, teleporters: 1, items: 5, bouncePads: 3,

    killerCount: 1, survivorSlots: 1, missions: 6,

  },

  {

    id: 2, name: "迴廊", desc: "13×13 · 青藍 · 8 任務站",

    w: 13, h: 13, cellSize: 9, killerSpeed: 9,

    fogNear: 40, fogFar: 130, loops: 8, teleporters: 2, items: 6,

    killerCount: 1, survivorSlots: 2, missions: 8,

  },

  {

    id: 3, name: "被遺棄", desc: "17×17 · 沙漠 · 12 任務站",

    w: 17, h: 17, cellSize: 9, killerSpeed: 9.5,

    fogNear: 45, fogFar: 145, loops: 12, teleporters: 2, items: 8,

    killerCount: 1, survivorSlots: 3, missions: 12,

  },

  {

    id: 4, name: "雙獵", desc: "15×15 · 2 獵人 · 10 任務站",

    w: 15, h: 15, cellSize: 9, killerSpeed: 8.8,

    fogNear: 42, fogFar: 140, loops: 10, teleporters: 2, items: 7,

    killerCount: 2, survivorSlots: 2, missions: 10,

  },

  {

    id: 5, name: "迷域", desc: "19×19 · 霓虹 · 14 任務站",

    w: 19, h: 19, cellSize: 9, killerSpeed: 10,

    fogNear: 50, fogFar: 160, loops: 16, teleporters: 3, items: 10,

    killerCount: 1, survivorSlots: 4, missions: 14,

  },

  {

    id: 6, name: "獵殺夜", desc: "17×17 · 3 獵人 · 12 任務站",

    w: 17, h: 17, cellSize: 9, killerSpeed: 9.2,

    fogNear: 48, fogFar: 155, loops: 14, teleporters: 3, items: 9,

    killerCount: 3, survivorSlots: 3, missions: 12,

  },

  {

    id: 7, name: "LMS", desc: "21×21 · 血月 · 16 任務站",

    w: 21, h: 21, cellSize: 9, killerSpeed: 10.5,

    fogNear: 55, fogFar: 175, loops: 20, teleporters: 3, items: 12,

    killerCount: 2, survivorSlots: 4, missions: 16,

  },

  {

    id: 8, name: "Spectre", desc: "23×23 · 虛空 · 18 任務站",

    w: 23, h: 23, cellSize: 9, killerSpeed: 11,

    fogNear: 60, fogFar: 190, loops: 24, teleporters: 4, items: 14,

    killerCount: 3, survivorSlots: 4, missions: 18,

  },

  {
    id: 9, name: "熔爐", desc: "25×25 · 熔岩 · 20 任務站",
    w: 25, h: 25, cellSize: 9, killerSpeed: 10.8,
    fogNear: 58, fogFar: 185, loops: 22, teleporters: 4, items: 12,
    killerCount: 2, survivorSlots: 3, missions: 20,
  },
  {
    id: 10, name: "深潮", desc: "27×27 · 海底 · 22 任務站",
    w: 27, h: 27, cellSize: 9, killerSpeed: 11.2,
    fogNear: 62, fogFar: 200, loops: 26, teleporters: 5, items: 14,
    killerCount: 2, survivorSlots: 4, missions: 22,
  },
  {
    id: 11, name: "夢魘", desc: "29×29 · 粉霧 · 24 任務站",
    w: 29, h: 29, cellSize: 9, killerSpeed: 11.5,
    fogNear: 65, fogFar: 210, loops: 28, teleporters: 5, items: 15,
    killerCount: 3, survivorSlots: 4, missions: 24,
  },
  {
    id: 12, name: "終焉", desc: "31×31 · 終極 · 26 任務站",
    w: 31, h: 31, cellSize: 9, killerSpeed: 12,
    fogNear: 70, fogFar: 225, loops: 32, teleporters: 6, items: 16,
    killerCount: 3, survivorSlots: 4, missions: 26,
  },

];

/** 鑰匙逃脫 — 無獵人、多門多鑰匙、陷阱與移動尖刺 */
export const KEY_HUNT_LEVELS = [
  { id: 101, name: "密鑰初探", desc: "11×11 · 8 扇門 · 找鑰匙開路", category: "keyhunt",
    w: 11, h: 11, cellSize: 9, fogNear: 38, fogFar: 125, loops: 6,
    doors: 8, extraKeys: 2, traps: 4, spikes: 3, missions: 0, teleporters: 0, items: 4 },
  { id: 102, name: "回廊密碼", desc: "13×13 · 8 門 · 10 鑰匙", category: "keyhunt",
    w: 13, h: 13, cellSize: 9, fogNear: 42, fogFar: 135, loops: 8,
    doors: 10, extraKeys: 2, traps: 5, spikes: 4, missions: 0, teleporters: 1, items: 5 },
  { id: 103, name: "遺跡機關", desc: "15×15 · 10 門 · 12 鑰匙", category: "keyhunt",
    w: 15, h: 15, cellSize: 9, fogNear: 45, fogFar: 145, loops: 10,
    doors: 12, extraKeys: 3, traps: 6, spikes: 5, missions: 0, teleporters: 1, items: 6 },
  { id: 104, name: "雙鎖迷城", desc: "17×17 · 12 門 · 14 鑰匙", category: "keyhunt",
    w: 17, h: 17, cellSize: 9, fogNear: 48, fogFar: 155, loops: 12,
    doors: 14, extraKeys: 3, traps: 7, spikes: 6, missions: 0, teleporters: 2, items: 7 },
  { id: 105, name: "尖刺寶庫", desc: "19×19 · 14 門 · 16 鑰匙", category: "keyhunt",
    w: 19, h: 19, cellSize: 10, fogNear: 52, fogFar: 165, loops: 14,
    doors: 16, extraKeys: 4, traps: 8, spikes: 7, spikeDamage: 20, missions: 0, teleporters: 2, items: 8 },
  { id: 106, name: "陷阱深淵", desc: "21×21 · 16 門 · 18 鑰匙", category: "keyhunt",
    w: 21, h: 21, cellSize: 10, fogNear: 55, fogFar: 175, loops: 16,
    doors: 18, extraKeys: 4, traps: 10, spikes: 8, missions: 0, teleporters: 3, items: 9 },
  { id: 107, name: "萬鎖迷域", desc: "23×23 · 18 門 · 20 鑰匙", category: "keyhunt",
    w: 23, h: 23, cellSize: 10, fogNear: 58, fogFar: 185, loops: 18,
    doors: 20, extraKeys: 5, traps: 11, spikes: 9, missions: 0, teleporters: 3, items: 10 },
  { id: 108, name: "終極密鑰", desc: "25×25 · 20 門 · 22 鑰匙", category: "keyhunt",
    w: 25, h: 25, cellSize: 10, fogNear: 62, fogFar: 195, loops: 20,
    doors: 22, extraKeys: 5, traps: 12, spikes: 10, spikeDamage: 22, missions: 0, teleporters: 4, items: 12 },
];

/** 平台冒險 — 踩小怪、躲噴火落石、單向門 */
export const PLATFORMER_LEVELS = [
  { id: 201, name: "綠丘初級", desc: "11×11 · 小怪 · 噴火", category: "platformer",
    w: 11, h: 11, cellSize: 9, fogNear: 38, fogFar: 125, loops: 8,
    enemies: 5, fires: 3, rocks: 2, oneWays: 2, items: 5, missions: 4, killerCount: 0 },
  { id: 202, name: "熔岩通道", desc: "13×13 · 落石 · 單向門", category: "platformer",
    w: 13, h: 13, cellSize: 9, fogNear: 42, fogFar: 135, loops: 10,
    enemies: 7, fires: 5, rocks: 4, oneWays: 3, items: 6, missions: 5, killerCount: 0 },
  { id: 203, name: "深坑遺跡", desc: "15×15 · 更多陷阱", category: "platformer",
    w: 15, h: 15, cellSize: 9, fogNear: 45, fogFar: 145, loops: 12,
    enemies: 9, fires: 6, rocks: 5, oneWays: 4, items: 7, missions: 6, killerCount: 0 },
  { id: 204, name: "王城廢墟", desc: "17×17 · 高密度危機", category: "platformer",
    w: 17, h: 17, cellSize: 10, fogNear: 48, fogFar: 155, loops: 14,
    enemies: 11, fires: 8, rocks: 6, oneWays: 5, items: 8, missions: 8, killerCount: 0 },
];

/** 解題闖關 — 連鎖謎題門，答對才開，無獵人 */
export const PUZZLE_LEVELS = [
  { id: 301, name: "謎門試煉", desc: "15×15 · 10 謎題門 · 三層平台", category: "puzzle",
    w: 15, h: 15, cellSize: 10, fogNear: 48, fogFar: 165, loops: 22,
    puzzleDoors: 10, bouncePads: 5, teleporters: 2, items: 5, missions: 0, killerCount: 0 },
  { id: 302, name: "迴廊密碼", desc: "19×19 · 12 謎題門 · 天橋路線", category: "puzzle",
    w: 19, h: 19, cellSize: 10, fogNear: 55, fogFar: 185, loops: 28,
    puzzleDoors: 12, bouncePads: 6, teleporters: 2, items: 6, missions: 0, killerCount: 0 },
  { id: 303, name: "雙層迷城", desc: "23×23 · 14 謎題門 · 彈跳捷徑", category: "puzzle",
    w: 23, h: 23, cellSize: 10, fogNear: 58, fogFar: 200, loops: 32,
    puzzleDoors: 14, bouncePads: 7, teleporters: 3, items: 7, missions: 0, killerCount: 0 },
  { id: 304, name: "終極闖關", desc: "25×25 · 16 謎題門 · 多層迷宮", category: "puzzle",
    w: 25, h: 25, cellSize: 10, fogNear: 62, fogFar: 215, loops: 36,
    puzzleDoors: 16, bouncePads: 8, teleporters: 3, items: 8, missions: 0, killerCount: 0 },
  { id: 305, name: "高塔迴廊", desc: "27×27 · 18 謎題門 · 三樓平台", category: "puzzle",
    w: 27, h: 27, cellSize: 10, fogNear: 65, fogFar: 225, loops: 40,
    puzzleDoors: 18, bouncePads: 9, teleporters: 4, items: 9, missions: 0, killerCount: 0 },
  { id: 306, name: "天空迷城", desc: "29×29 · 20 謎題門 · 彈跳跨層", category: "puzzle",
    w: 29, h: 29, cellSize: 10, fogNear: 68, fogFar: 240, loops: 44,
    puzzleDoors: 20, bouncePads: 10, teleporters: 4, items: 10, missions: 0, killerCount: 0 },
];

/** 槍戰 — 每關 shooterLayout 獨立造型；400–407 為原版，408+ 為新增 */
export const SHOOTER_LEVELS = [
  { id: 400, name: "快速巷戰", desc: "13×13 · 巷弄掩體（原版）", category: "shooter", sizeTier: "small",
    shooterLayout: "urban_quick", mapStyle: "urban", mapSeed: 40001, themeId: 1,
    w: 13, h: 13, cellSize: 9, fogNear: 42, fogFar: 145, loops: 14,
    shooterKills: 8, bouncePads: 0, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 401, name: "競技場", desc: "17×17 · 中央圓環（原版）", category: "shooter", sizeTier: "medium",
    shooterLayout: "arena_ring", mapStyle: "arena", mapSeed: 40101, themeId: 4,
    w: 17, h: 17, cellSize: 10, fogNear: 50, fogFar: 175, loops: 22,
    shooterKills: 10, bouncePads: 2, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 404, name: "都市廣場", desc: "19×19 · 廣場天橋（原版）", category: "shooter", sizeTier: "medium",
    shooterLayout: "urban_plaza", mapStyle: "urban", mapSeed: 40404, themeId: 3,
    w: 19, h: 19, cellSize: 10, fogNear: 52, fogFar: 185, loops: 24,
    shooterKills: 12, bouncePads: 1, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 402, name: "貨櫃碼頭", desc: "21×21 · 貨櫃列（原版）", category: "shooter", sizeTier: "large",
    shooterLayout: "dock_yard", mapStyle: "dock", mapSeed: 40202, themeId: 2,
    w: 21, h: 21, cellSize: 10, fogNear: 55, fogFar: 195, loops: 28,
    shooterKills: 14, bouncePads: 2, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 405, name: "雙塔擂台", desc: "23×23 · 雙塔長梯狙擊", category: "shooter", sizeTier: "large",
    shooterLayout: "sky_twin_towers", mapStyle: "sky", mapSeed: 40505, themeId: 6,
    w: 23, h: 23, cellSize: 10, fogNear: 58, fogFar: 240, loops: 30,
    shooterKills: 15, bouncePads: 3, secretPassages: 2, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 403, name: "天空競技", desc: "25×25 · 雲台開闊（原版）", category: "shooter", sizeTier: "large",
    shooterLayout: "sky_open", mapStyle: "sky", mapSeed: 40303, themeId: 7,
    w: 25, h: 25, cellSize: 10, fogNear: 60, fogFar: 230, loops: 34,
    shooterKills: 16, bouncePads: 3, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 406, name: "Rivals 大競技", desc: "29×29 · 四角狙擊台", category: "shooter", sizeTier: "xlarge",
    shooterLayout: "arena_sniper_mega", mapStyle: "arena", mapSeed: 40606, themeId: 5,
    w: 29, h: 29, cellSize: 10, fogNear: 65, fogFar: 300, loops: 38,
    shooterKills: 20, bouncePads: 4, secretPassages: 2, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 407, name: "霓虹迷城", desc: "31×31 · 霓虹天橋（原版）", category: "shooter", sizeTier: "xlarge",
    shooterLayout: "neon_grid", mapStyle: "neon", mapSeed: 40707, themeId: 9,
    w: 31, h: 31, cellSize: 10, fogNear: 68, fogFar: 320, loops: 42,
    shooterKills: 22, bouncePads: 4, teleporters: 0, items: 0, missions: 0, killerCount: 0 },

  { id: 408, name: "彈跳巷戰", desc: "13×13 新增 · 5 彈跳 · 漆彈圍欄", category: "shooter", sizeTier: "small",
    shooterLayout: "bounce_alley", mapStyle: "urban", mapSeed: 40808, themeId: 1,
    w: 13, h: 13, cellSize: 9, fogNear: 42, fogFar: 150, loops: 16,
    shooterKills: 8, bouncePads: 5, secretPassages: 2, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 409, name: "密道突襲", desc: "15×15 新增 · 沙袋密道", category: "shooter", sizeTier: "small",
    shooterLayout: "ambush_corridor", mapStyle: "arena", mapSeed: 40909, themeId: 4,
    w: 15, h: 15, cellSize: 9, fogNear: 44, fogFar: 158, loops: 18,
    shooterKills: 9, bouncePads: 3, secretPassages: 4, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 410, name: "天梯攻防", desc: "19×19 新增 · 城堡長梯", category: "shooter", sizeTier: "medium",
    shooterLayout: "central_keep", mapStyle: "sky", mapSeed: 41010, themeId: 6,
    w: 19, h: 19, cellSize: 10, fogNear: 52, fogFar: 195, loops: 24,
    shooterKills: 12, bouncePads: 5, secretPassages: 2, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 411, name: "漆彈廣場", desc: "19×19 新增 · 漆彈營地", category: "shooter", sizeTier: "medium",
    shooterLayout: "paintball_camp", mapStyle: "urban", mapSeed: 41111, themeId: 3,
    w: 19, h: 19, cellSize: 10, fogNear: 52, fogFar: 198, loops: 26,
    shooterKills: 12, bouncePads: 6, secretPassages: 2, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 412, name: "立體灰盒", desc: "23×23 新增 · 對角天橋", category: "shooter", sizeTier: "large",
    shooterLayout: "greybox_parkour", mapStyle: "arena", mapSeed: 41212, themeId: 5,
    w: 23, h: 23, cellSize: 10, fogNear: 58, fogFar: 220, loops: 32,
    shooterKills: 15, bouncePads: 7, secretPassages: 3, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 413, name: "天空跑酷", desc: "25×25 新增 · 高空跑道", category: "shooter", sizeTier: "large",
    shooterLayout: "sky_runway", mapStyle: "sky", mapSeed: 41313, themeId: 7,
    w: 25, h: 25, cellSize: 10, fogNear: 60, fogFar: 250, loops: 34,
    shooterKills: 16, bouncePads: 8, secretPassages: 3, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 414, name: "霓虹立體城", desc: "27×27 新增 · 霓虹尖塔", category: "shooter", sizeTier: "xlarge",
    shooterLayout: "neon_spire", mapStyle: "neon", mapSeed: 41414, themeId: 9,
    w: 27, h: 27, cellSize: 10, fogNear: 64, fogFar: 290, loops: 40,
    shooterKills: 18, bouncePads: 10, secretPassages: 5, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 415, name: "狙擊荒原", desc: "27×27 新增 · 極開闊遠狙", category: "shooter", sizeTier: "xlarge",
    shooterLayout: "arena_sniper_mega", mapStyle: "arena", mapSeed: 41515, themeId: 5,
    w: 27, h: 27, cellSize: 10, fogNear: 70, fogFar: 340, loops: 36,
    shooterKills: 18, bouncePads: 6, secretPassages: 2, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 416, name: "碼頭彈跳戰", desc: "21×21 新增 · 8 彈跳板", category: "shooter", sizeTier: "large",
    shooterLayout: "dock_yard", mapStyle: "dock", mapSeed: 41616, themeId: 2,
    w: 21, h: 21, cellSize: 10, fogNear: 55, fogFar: 210, loops: 28,
    shooterKills: 14, bouncePads: 8, secretPassages: 2, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
  { id: 417, name: "雙塔狙擊場", desc: "25×25 新增 · 長梯狙擊", category: "shooter", sizeTier: "large",
    shooterLayout: "sky_twin_towers", mapStyle: "sky", mapSeed: 41717, themeId: 6,
    w: 25, h: 25, cellSize: 10, fogNear: 62, fogFar: 280, loops: 32,
    shooterKills: 16, bouncePads: 7, secretPassages: 3, teleporters: 0, items: 0, missions: 0, killerCount: 0 },
];

export const ALL_LEVELS = [...LEVELS, ...KEY_HUNT_LEVELS, ...PLATFORMER_LEVELS, ...PUZZLE_LEVELS, ...SHOOTER_LEVELS];

export function getLevelTheme(level) {
  if (level.themeId != null) {
    return LEVEL_THEMES[level.themeId % LEVEL_THEMES.length];
  }
  return LEVEL_THEMES[(level.id - 1) % LEVEL_THEMES.length];
}


