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
  if (gameMode === "shooter") return ["arena", "dock", "sky"][v % 3];
  if (gameMode === "puzzle") return id % 2 === 0 ? "puzzle" : "sky";
  if (gameMode === "keyhunt") return ["ruins", "dock", "chase", "arena"][id % 4];
  if (gameMode === "platformer") return ["platform", "sky", "arena"][id % 3];
  if (gameMode === "classic") return "chase";
  return ["chase", "ruins", "arena", "dock", "sky"][v];
}

/** 每關固定種子與主題，避免各模式地圖感覺相同 */
export function enrichLevelForMode(level, gameMode = "solo") {
  if (!level) return level;
  const id = level.id ?? 1;
  let modeSalt = 0;
  for (let i = 0; i < gameMode.length; i++) modeSalt = (modeSalt * 31 + gameMode.charCodeAt(i)) >>> 0;
  const realmTier = gameMode === "solo" ? (id % 3) : gameMode === "practice" ? 1 : 0;
  const playStyle = gameMode === "classic" ? "classic" : gameMode === "solo" ? "realms" : "standard";
  return {
    ...level,
    mapSeed: level.mapSeed ?? (((id * 104729) ^ modeSalt) >>> 0),
    themeId: level.themeId ?? ((id - 1 + modeSalt) % 12),
    mapStyle: getMapStyle(level, gameMode),
    realmTier,
    playStyle,
    flatPlay: playStyle === "classic",
  };
}
