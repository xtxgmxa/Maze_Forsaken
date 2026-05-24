import { cellCenter } from "./maze.js";
import { createPlayerState } from "./abilities.js";
import { buildForsakenCharacter } from "./characters.js";

export function spawnMatch({
  scene,
  ctx,
  gameMode,
  playerRole,
  selectedChar,
  selectedChar2,
  selectedKiller,
  killerRoster,
  survivorRoster,
  numSurvivors,
  numKillers,
}) {
  if (!scene) throw new Error("spawnMatch: scene 未定義");

  const survivors = [];
  const killers = [];
  const start = cellCenter(ctx, 0, 0);
  const playAsKiller = playerRole === "killer" && gameMode === "solo";

  const addSurvivor = (def, profile, human, gx, gz) => {
    if (!def) return;
    const c = gx != null ? cellCenter(ctx, gx, gz) : start;
    const p = createPlayerState(def, "survivor", profile, human);
    p.isAI = !human;
    p.pos = { x: c.x, z: c.z };
    p.invuln = 3;
    p.caught = false;
    p.hp = 100;
    p.maxHp = 100;
    p.elev = 0;
    p._jumpY = 0;
    p.mesh = buildForsakenCharacter(def);
    p.mesh.position.set(c.x, 0, c.z);
    scene.add(p.mesh);
    survivors.push(p);
  };

  const addKiller = (def, profile, human, gx, gz) => {
    if (!def) return;
    const c = cellCenter(ctx, gx, gz);
    const k = createPlayerState(def, "killer", profile, human);
    k.isAI = !human;
    k.pos = { x: c.x, z: c.z };
    k.elev = 0;
    k._jumpY = 0;
    k.mesh = buildForsakenCharacter(def);
    k.mesh.position.set(c.x, 0, c.z);
    scene.add(k.mesh);
    killers.push(k);
  };

  if (gameMode === "keyhunt" || gameMode === "platformer" || gameMode === "puzzle" || gameMode === "shooter") {
    addSurvivor(selectedChar, "p1", true, 0, 0);
    const botTarget = gameMode === "shooter"
      ? Math.max(4, Math.min(6, numSurvivors + 3))
      : Math.max(1, Math.min(numSurvivors, survivorRoster.length));
    let guard = 0;
    while (survivors.length < botTarget && guard < 500) {
      guard++;
      const def = survivorRoster[(survivors.length + guard) % survivorRoster.length];
      const gx = gameMode === "shooter"
        ? 2 + ((survivors.length * 5) % Math.max(1, ctx.w - 3))
        : 1 + (survivors.length % Math.max(1, ctx.w - 1));
      const gz = gameMode === "shooter"
        ? 2 + ((survivors.length * 7) % Math.max(1, ctx.h - 3))
        : Math.floor(survivors.length / 2) % ctx.h;
      addSurvivor(def, `ai_s${survivors.length}`, false, gx, gz);
    }
  } else if (playAsKiller) {
    const target = Math.max(1, Math.min(numSurvivors, survivorRoster.length));
    let guard = 0;
    while (survivors.length < target && guard < 500) {
      guard++;
      const def = survivorRoster[(survivors.length + guard) % survivorRoster.length];
      const gx = 1 + (survivors.length % Math.max(1, ctx.w - 1));
      const gz = Math.floor(survivors.length / 2) % ctx.h;
      addSurvivor(def, `ai_s${survivors.length}`, false, gx, gz);
    }
    const killerStarts = [[ctx.w - 1, ctx.h - 1], [ctx.w - 1, 0], [0, ctx.h - 1]];
    for (let ki = 0; ki < Math.max(1, numKillers); ki++) {
      const def = ki === 0 ? selectedKiller : killerRoster[(ki + 1) % killerRoster.length];
      const [gx, gz] = killerStarts[ki % killerStarts.length];
      addKiller(def, ki === 0 ? "killer" : `k${ki}`, ki === 0, gx, gz);
    }
  } else {
    addSurvivor(selectedChar, "p1", true, 0, 0);
    if (gameMode === "coop" && selectedChar2) {
      addSurvivor(selectedChar2, "p2", true, 1, 0);
    }
    const target = Math.max(1, Math.min(numSurvivors, survivorRoster.length));
    let guard = 0;
    while (survivors.length < target && guard < 500) {
      guard++;
      const def = survivorRoster[(survivors.length + guard) % survivorRoster.length];
      const gx = 1 + (survivors.length % Math.max(1, ctx.w - 1));
      const gz = Math.floor(survivors.length / 2) % ctx.h;
      addSurvivor(def, `ai_s${survivors.length}`, false, gx, gz);
    }
    const killerStarts = [[ctx.w - 1, ctx.h - 1], [ctx.w - 1, 0], [0, ctx.h - 1]];
    for (let ki = 0; ki < Math.max(1, numKillers); ki++) {
      const def = ki === 0 ? selectedKiller : killerRoster[(ki + 1) % killerRoster.length];
      const [gx, gz] = killerStarts[ki % killerStarts.length];
      const human = gameMode === "versus" && ki === 0;
      addKiller(def, human ? "killer" : `k${ki}`, human, gx, gz);
    }
  }

  return {
    survivors,
    killers,
    playAsKiller: playAsKiller && gameMode !== "keyhunt" && gameMode !== "platformer" && gameMode !== "puzzle",
  };
}