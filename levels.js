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

    fogNear: 35, fogFar: 120, loops: 4, teleporters: 1, items: 5,

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

export const ALL_LEVELS = [...LEVELS, ...KEY_HUNT_LEVELS, ...PLATFORMER_LEVELS];

export function getLevelTheme(level) {

  return LEVEL_THEMES[(level.id - 1) % LEVEL_THEMES.length];

}


