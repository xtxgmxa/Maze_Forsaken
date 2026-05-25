/** 關卡迷宮種子 — 同模式不同關卡會生成不同路線 */
export function getLevelMapSeed(level, gameMode = "solo") {
  const id = level?.id ?? 1;
  let salt = 0;
  for (let i = 0; i < gameMode.length; i++) salt = (salt * 31 + gameMode.charCodeAt(i)) >>> 0;
  return ((id * 9973) ^ (salt * 17) ^ (level.mapSeed ?? 0)) >>> 0;
}

export function getMapStyle(level, gameMode) {
  if (level?.mapStyle) return level.mapStyle;
  const id = level?.id ?? 1;
  const v = id % 5;
  if (gameMode === "shooter") return ["arena", "dock", "sky", "urban", "neon"][v % 5];
  if (gameMode === "puzzle") return id % 2 === 0 ? "puzzle" : "sky";
  if (gameMode === "keyhunt") return ["ruins", "dock", "chase", "arena"][id % 4];
  if (gameMode === "platformer") return ["platform", "sky", "arena"][id % 3];
  if (gameMode === "classic") return "chase";
  return ["chase", "ruins", "arena", "dock", "sky"][v];
}

/** 確保 w/h 為有效整數（避免 GitHub Pages／手機上關卡資料缺欄位導致 maze 為空） */
export function normalizeLevelDimensions(level) {
  const w = Math.max(3, Math.min(64, Math.floor(Number(level?.w)) || 11));
  const h = Math.max(3, Math.min(64, Math.floor(Number(level?.h)) || 11));
  return {
    ...level,
    w,
    h,
    cellSize: Math.max(6, Math.floor(Number(level?.cellSize)) || 9),
  };
}

/** 每關固定種子與主題，避免各模式地圖感覺相同 */
export function enrichLevelForMode(level, gameMode = "solo") {
  if (!level) return normalizeLevelDimensions({ id: 1, name: "預設" });
  const base = normalizeLevelDimensions(level);
  const id = base.id ?? 1;
  let modeSalt = 0;
  for (let i = 0; i < gameMode.length; i++) modeSalt = (modeSalt * 31 + gameMode.charCodeAt(i)) >>> 0;
  const realmTier = gameMode === "solo" ? (id % 3) : gameMode === "practice" ? 1 : 0;
  const playStyle = gameMode === "classic" ? "classic" : gameMode === "solo" ? "realms" : "standard";
  return {
    ...base,
    mapSeed: base.mapSeed ?? (((id * 104729) ^ modeSalt) >>> 0),
    themeId: base.themeId ?? ((id - 1 + modeSalt) % 12),
    mapStyle: getMapStyle(base, gameMode),
    realmTier,
    playStyle,
    flatPlay: playStyle === "classic",
  };
}
