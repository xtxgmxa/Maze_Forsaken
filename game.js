import * as THREE from "three";
import { SURVIVORS, KILLERS, buildForsakenCharacter } from "./characters.js";
import {
  LEVELS, KEY_HUNT_LEVELS, PLATFORMER_LEVELS, PUZZLE_LEVELS, SHOOTER_LEVELS, getLevelTheme,
} from "./levels.js";
import {
  setupKeyHuntLevel, buildKeyHuntMeshes, updateKeyHunt,
  allDoorsOpen, keysRemaining, doorsRemaining,
  moveWithDoorCollision, bfsNextStepWithDoors,
  getOpenableDoors, tryOpenDoorAtPlayer, syncPlayerKeyVisuals,
  canOpenDoorFromPlayerSide, getDoorApproachHint, collidesClosedDoor,
} from "./keysMode.js";
import {
  setupPlatformerLevel, buildPlatformerMeshes, updatePlatformer,
  platformerBlocksMove,
} from "./platformer.js";
import { buildMazeDecor } from "./mazeDecor.js";
import {
  buildVerticalWorld, updateVerticalPhysics, updateBouncePads, spawnArenaBouncePads,
  getBounceAirControlMult, worldHeight,
} from "./verticalWorld.js";
import {
  setupPuzzleDoorLevel, buildPuzzleDoorMeshes, getNearPuzzleDoor,
  getLockedPuzzleDoorHint, solvePuzzleDoor, allPuzzleDoorsOpen, puzzleDoorsRemaining,
  getDoorApproach, getDoorMapPos, getNextPuzzleDoor,
  isPuzzleDoorUnlocked,
} from "./puzzleDoorMode.js";
import {
  applyShooterLoadout, getShooterWeapon, cycleShooterWeapon, createShooterState, respawnShooterPlayer,
  canShooterFire, fireShooterWeapon, updateShooterBots, buildShooterArena,
  attachShooterGun, syncGunVisual, muzzleFlash, attachFpGun, detachFpGun, syncFpGunVisual, tickGunFlash, setFpGunVisible,
  assignShooterPlayer, buildShooterEndResults, buildMoleEndResults, onShooterDowned,
  getShooterKillAnnounce, tickShooterRespawns, tryManualShooterRespawn, tickShooterDownedPose,
  setupMoleRound, tickMoleAlerts, isMoleTeamkillViolation, scoreMoleKill, checkMoleRoundEnd,
  isShooterMoleMode, clearShooterDownedState, SHOOTER_TEAMS,
  SHOOTER_WEAPONS, isShooterHeadshot, isShooterEnemy, getTargetHeadY,
} from "./shooterMode.js";
import { loadShooterSounds, preloadShooterSounds, playShooterSfx } from "./shooterSounds.js";
import { clearShooterHealOrbs, spawnShooterHealOrb, tickShooterHealOrbs } from "./shooterHealOrbs.js";
import {
  clearShooterTeamMarkers, syncShooterOverheadLabels, revealMoleOnHit,
} from "./shooterMarkers.js";
import { playShooterResultMusic, stopShooterResultMusic } from "./shooterResultMusic.js";
import {
  initShooterStats, renderShooterScoreboard, setShooterScoreboardVisible, resetShooterScoreboardUi,
  bindShooterScoreboardUi,
} from "./shooterScoreboard.js";
import { getLevelMapSeed, getMapStyle, enrichLevelForMode } from "./mapGen.js";
import { buildRealmZones, getRealmAt, applyRealmAtmosphere } from "./realmZones.js";
import {
  ITEM_DEFS, addInventoryItem, useInventoryItem,
  getActiveInventoryList, getPassiveList, applyPassive,
} from "./inventory.js";
import {
  initAudioEngine, playSfx, bindAudioUnlock, loadAudioSettings, getAudioSettings,
  setAudioSettings, resetAudioSettings, applyAudioSettings, connectMusicElement, setMusicZoneTint,
  stopGameMusic, suspendGameAudio,
} from "./audio.js";
import {
  loadGameSounds, preloadGameSounds, playFootstepSfx, playJumpSfx, playLandSfx, playBouncePadSfx,
} from "./gameSounds.js";
import {
  buildZoneParticles, clearZoneParticles, tickZoneParticles,
  buildLedgeHints, tickLedgeHints, setCharacterRim, applyPlasticToCharacter,
} from "./visualEnhance.js";
import {
  generateMissionQuestion, spawnMissionStations, buildMissionMeshes, tickMissionGlow,
} from "./missions.js";
import {
  loadBindings, getBindings, saveBindings, resetBindings,
  keyDown, pollGamepad, labelFor, setBinding,
  isGamepadConnected, getGamepadActionLabels, gamepadBtnLabel, GP_BTN,
  tickGamepadPresence,
} from "./controls.js";
import {
  initTouchControls, touchControlsTick, consumeTouchLook, isTouchUiEnabled, applyMobileCameraDefaults, updateTouchGunHighlight,
  syncTouchButtonBindings, updateTouchSkillLabels, updateTouchAbilityCooldowns,
  syncFullscreenButtonLabel, setTouchMissionHighlight, openMobileSettingsPanel,
  updateTouchAttackVisibility, bindMobileAudioElement, setTouchPuzzleHighlight,
} from "./touchControls.js";
import { tickGamepadHud, hideGamepadHud } from "./gamepadHud.js";
import {
  assignPaintColor, spawnPaintSplat, spawnPaintAtHit, spawnPaintFromAim, spawnPaintOnBody, clearPaintSplats,
} from "./paintballSplats.js";
import { initMenuWizard, showCoopMobileWarn, initPerfTipModal } from "./menuUI.js";

let menuUiRef = null;
let gamepadActive = false;
let quizGp = { x: 0.5, y: 0.5, choice: 0, prev: {} };

const MODE_PREVIEW = {
  solo: "assets/characters/survivors/noob.jpg",
  classic: "assets/characters/survivors/guest1337.jpg",
  coop: "assets/characters/survivors/builderman.jpg",
  versus: "assets/characters/killers/c00lkidd.jpg",
  keyhunt: "assets/characters/survivors/elliot.jpg",
  platformer: "assets/characters/survivors/chance.jpg",
  puzzle: "assets/characters/survivors/elliot.jpg",
  practice: "assets/characters/survivors/guest1337.jpg",
  mob: "assets/characters/survivors/dusekkar.jpg",
  hardcore: "assets/characters/killers/slasher.jpg",
};
import {
  generateMaze, generateMazeSeeded, createSeededRandom, createMazeContext, cellCenter, buildMazeMeshes,
  createExitMarker, moveWithCollision, collides, bfsNextStep, worldToCell, isCellReachable,
  addMazeLoops, applyMapStyle, createTeleporters, buildTeleporterMeshes,
  spawnWorldItems, buildItemMeshes, shooterLineBlocked,
} from "./maze.js";
import {
  createPlayerState, tickCooldowns, tryAbility,
  getSpeedMult, isInvisibleToKiller, hasShield, consumeShield,
} from "./abilities.js";
import { spawnMatch } from "./match.js";
import {
  startKillerAttack, updateKillerCombat, getKillerAimTarget,
} from "./combat.js";
import {
  playAbilityVfx, updateVfx, applyMeshAnim, applyLocomotionAnim,
  spawnHitVfx, clearVfxPool, spawnProjectileVfx, setVfxBudget,
} from "./vfx.js";

const WALK_SPEED = 10.5;
const SPRINT_SPEED = 22;
const KILLER_WALK = 10.5;
const KILLER_SPRINT = 17;
const KILLER_MELEE_DAMAGE = 34;
const KILLER_MELEE_RANGE = 3.2;
const WARN_DIST = 18;
const SPRINT_DRAIN = 55;
const SPRINT_REGEN = 70;
const SPRINT_EXHAUST_CD = 2;
/** 開局保護秒數（避免路徑判定誤抓） */
const MATCH_START_GRACE = 3;
const KILLER_TIME_CATCH_BONUS = 15;
const KILLER_TIME_MISSION_CUT = 3;
const DEFAULT_MATCH_SECONDS = 180;
const EXIT_RADIUS = 6.5;
const PROJECTILE_DAMAGE = 38;
const ABILITY_HIT_DAMAGE = 36;
const CAM_PITCH_MIN = -0.2;
const CAM_PITCH_MAX = 2.45;
const SHOOTER_PITCH_MIN = -1.58;
const SHOOTER_PITCH_MAX = 1.58;
const SHOOTER_SETTINGS_KEY = "forsaken_shooter";

function loadShooterSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SHOOTER_SETTINGS_KEY) || "{}");
    return {
      fov: Math.max(70, Math.min(115, s.fov ?? 94)),
      scopeFov: Math.max(28, Math.min(65, s.scopeFov ?? 44)),
      invertY: !!s.invertY,
      autoAim: !!s.autoAim,
      autoAimDeg: Math.max(8, Math.min(28, s.autoAimDeg ?? 16)),
    };
  } catch {
    return { fov: 94, scopeFov: 44, invertY: false, autoAim: false, autoAimDeg: 18 };
  }
}

function saveShooterSettings() {
  try {
    localStorage.setItem(SHOOTER_SETTINGS_KEY, JSON.stringify(shooterSettings));
  } catch { /* */ }
}

let shooterSettings = loadShooterSettings();
let shooterAds = false;

let selectedChar = SURVIVORS[0];
let selectedChar2 = SURVIVORS[1];
let selectedKiller = KILLERS[0];
let selectedLevel = LEVELS[0];
let gameMode = "solo"; // solo | coop | versus | keyhunt | ...
let winGoal = "exit"; // exit | survival
let levelCategory = "chase"; // chase | keyhunt
let playerRole = "survivor"; // survivor | killer (solo)
let keyHuntState = null;
let keyHuntGroup = null;
let platformerState = null;
let platformerGroup = null;
let puzzleDoorState = null;
let puzzleDoorGroup = null;
let shooterState = null;
let shooterArenaGroup = null;
let mazeDecorGroup = null;
let realmZonesState = null;
let lastRealmAtmosphereId = null;
let ledgeHintState = null;
let zoneParticleGroup = null;
let shooterScoreboardOpen = false;
let verticalWorldState = null;
let bouncePads = [];
let nearPuzzleDoor = null;
let playAsKiller = false;
let gameState = "menu";
let nearMissionStation = null;

let renderer, scene, camera, camera2, camera3, camera4;
const COOP_SPLIT_GAP = 5;
const DOUBLE_JUMP_RECHARGE = 8;
let ctx, maze, exitPos, exitGroup;
let survivors = [];
let killers = [];
let teleporters = [];
let worldItems = [];
let traps = [];
let matchHumanRole = "survivor";
let numSurvivors = 1;
let numLocalPlayers = 1;
let shooterPlayStyle = "teams";
let numKillers = 1;
let camDist = 11;
const CAM_DIST_MIN = 7;
const CAM_DIST_MAX = 28;
let projectiles = [];
let minions = [];
let vfxMeshes = [];
let elapsed = 0;
let camYaw = 0;
let camPitch = 0.42;
let keys = {};
let pointerLocked = false;
let animTime = 0;
let hasMoved = false;
let frameCount = 0;
let perfTier = "high"; // high | med | low
let minimapDirty = true;
let minimapBaseCanvas = null;
let killerTimer = DEFAULT_MATCH_SECONDS;
let matchTimeSeconds = DEFAULT_MATCH_SECONDS;
let missionStations = [];
let activeQuiz = null;
let missionGroup = null;
let lastChaseSfx = 0;
let lastHorrorSfx = 0;
const ITEM_ZH = {
  smoke: "煙霧彈", bandage: "繃帶", speed: "加速鞋", doublejump: "二段跳",
};

const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const overlay = document.getElementById("overlay");
const warning = document.getElementById("warning");
const clickPrompt = document.getElementById("clickPrompt");
const minimapCanvas = document.getElementById("minimap");
const abilityBar = document.getElementById("abilityBar");

let spectateIndex = 0;

let musicEl;
function initAudio() {
  loadAudioSettings();
  musicEl = new Audio("assets/music.mp3");
  musicEl.loop = true;
  applyAudioSettings(musicEl);
}

const combatCallbacks = {
  meleeRange: KILLER_MELEE_RANGE + 1.6,
  scene: null,
  getTargets() {
    return getAliveSurvivors();
  },
  onHit(target, killer, dmg) {
    damageSurvivor(target, killer, dmg);
  },
};

function syncKillerMesh(k) {
  if (!k?.mesh) return;
  k.mesh.position.set(k.pos.x, worldHeight(k), k.pos.z);
  k.mesh.rotation.y = k.yaw ?? Math.atan2(k.vel?.x || 0, k.vel?.z || 1);
}

function updateCrosshair() {
  const ch = document.getElementById("crosshair");
  const scopeOv = document.getElementById("scopeOverlay");
  if (!ch) return;
  if (isSpectating()) {
    ch.classList.remove("show", "sniper", "sniper-scope");
    if (scopeOv) scopeOv.classList.remove("show");
    return;
  }
  const hk = killers.find((k) => !k.isAI);
  const prof = playAsKiller ? "p1" : "killer";
  const killerAim = !!(
    hk && gameState === "play" &&
    (playAsKiller || gameMode === "versus") &&
    keyDown(keys, prof, "slide")
  );
  const shooterAim = isShooterMode() && gameState === "play" && !isShooterSplitView();
  ch.classList.toggle("show", killerAim || shooterAim);
  const human = getHumanSurvivor();
  const sniper = shooterAim && getShooterWeapon(human?.weaponId)?.id === "sniper";
  ch.classList.toggle("sniper", sniper);
  ch.classList.toggle("sniper-scope", sniper && shooterAds);
  if (scopeOv) scopeOv.classList.toggle("show", sniper && shooterAds);
}

// ─── Menu ───────────────────────────────────────────────────────────────────
function hex(n) {
  return "#" + n.toString(16).padStart(6, "0");
}

function makeCharCard(def, gridSelector, onSelect, selectedId, playerSlot = "p1") {
  const card = document.createElement("div");
  const sel = def.id === selectedId;
  card.className = "char-card" + (sel ? ` selected selected-${playerSlot}` : "");
  card.dataset.playerSlot = playerSlot;
  if (def.portrait) {
    const img = document.createElement("img");
    img.src = def.portrait;
    img.alt = def.name;
    img.loading = "lazy";
    card.appendChild(img);
  }
  const info = document.createElement("div");
  info.className = "char-info";
  info.innerHTML = `<h3>${def.name}</h3><span class="role">${def.role}</span><p>${def.desc}</p>`;
  card.appendChild(info);
  card.onclick = () => {
    document.querySelectorAll(`${gridSelector} .char-card`).forEach((c) => {
      c.classList.remove("selected", "selected-p1", "selected-p2", "selected-killer");
    });
    card.classList.add("selected", `selected-${playerSlot}`);
    onSelect(def);
    playSfx("ui");
    menuUiRef?.updatePickLabels?.();
    updateMenuPreview();
  };
  return card;
}

function getLevelsForMenu() {
  if (gameMode === "keyhunt" || levelCategory === "keyhunt") return KEY_HUNT_LEVELS;
  if (gameMode === "platformer" || levelCategory === "platformer") return PLATFORMER_LEVELS;
  if (gameMode === "puzzle") return PUZZLE_LEVELS;
  if (gameMode === "shooter") return SHOOTER_LEVELS;
  return LEVELS;
}

function rebuildLevelGrid() {
  const levelGrid = document.getElementById("levelGrid");
  if (!levelGrid) return;
  const list = getLevelsForMenu();
  levelGrid.innerHTML = "";
  list.forEach((lv, i) => {
    const card = document.createElement("div");
    card.className = "level-card" + (i === 0 ? " selected" : "");
    card.innerHTML = `<h3>${lv.name}</h3><p>${lv.desc}</p>`;
      card.onclick = () => {
      document.querySelectorAll(".level-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedLevel = lv;
      updateMenuPreview();
      const ns = document.getElementById("numSurvivors");
      const nk = document.getElementById("numKillers");
      if (ns) ns.value = String(lv.survivorSlots || (gameMode === "keyhunt" ? 1 : 1));
      if (nk && !isKeyHuntMode()) nk.value = String(lv.killerCount || 1);
      playSfx("ui");
      menuUiRef?.updatePickLabels?.();
    };
    levelGrid.appendChild(card);
  });
  selectedLevel = list[0];
  menuUiRef?.updatePickLabels?.();
}

function isDedicatedSpecialMode() {
  return gameMode === "keyhunt" || gameMode === "platformer" || gameMode === "puzzle" || gameMode === "shooter";
}

function getMapMoveScale() {
  if (!ctx) return 1;
  if (isShooterMode()) return 1;
  const area = ctx.w * ctx.h;
  if (area >= 676) return 1.32;
  if (area >= 529) return 1.22;
  if (area >= 400) return 1.14;
  return 1;
}

function getKillerAITarget(k) {
  const candidates = [];
  for (const s of survivors) {
    if (s.caught || isInvisibleToKiller(s)) continue;
    const d = Math.hypot(s.pos.x - k.pos.x, s.pos.z - k.pos.z);
    candidates.push({ entity: s, x: s.pos.x, z: s.pos.z, d, isClone: false });
    if (s.cloneMesh && (s._cloneUntil ?? 0) > elapsed) {
      const cx = s._clonePos?.x ?? s.cloneMesh.position.x;
      const cz = s._clonePos?.z ?? s.cloneMesh.position.z;
      const dc = Math.hypot(cx - k.pos.x, cz - k.pos.z);
      candidates.push({ entity: s, x: cx, z: cz, d: dc * 0.68, isClone: true });
    }
  }
  candidates.sort((a, b) => a.d - b.d);
  return candidates[0] || null;
}

function resetCategoryAfterDedicatedMode(prevMode) {
  if (
    (prevMode === "keyhunt" || prevMode === "platformer" || prevMode === "puzzle" || prevMode === "shooter") &&
    !isDedicatedSpecialMode()
  ) {
    const catEl = document.getElementById("levelCategory");
    if (catEl && (catEl.value === "keyhunt" || catEl.value === "platformer" || catEl.value === "puzzle" || catEl.value === "shooter")) {
      catEl.value = "chase";
      levelCategory = "chase";
    }
  }
}

function checkMenuUiConsistency() {
  const warn = document.getElementById("menuStateWarn");
  if (!warn) return false;
  if (menu.style.display === "none") {
    warn.style.display = "none";
    return false;
  }
  const dedicated = isDedicatedSpecialMode();
  const catSec = document.getElementById("levelCategorySection");
  const noKiller = isKeyHuntMode() || isPlatformerMode() || isPuzzleDoorMode() || isShooterMode();
  const touch = isTouchUiEnabled();
  const catShown = catSec && catSec.style.display !== "none";
  const shouldShowCat = false;
  const categoryMismatch = false;

  let killerOk = true;
  if (touch) {
    const killerRow = document.getElementById("pickKillerRow");
    killerOk = noKiller ? !killerRow || killerRow.hidden : !!(killerRow && !killerRow.hidden);
  } else {
    const killerGrid = document.getElementById("killerGrid");
    const hasKillers = !!(killerGrid && killerGrid.children.length > 0);
    killerOk = noKiller ? true : hasKillers;
  }

  const bad = catShown !== shouldShowCat || categoryMismatch || !killerOk;
  warn.style.display = bad ? "block" : "none";
  return bad;
}

function syncPlayerCountOptions() {
  const ns = document.getElementById("numSurvivors");
  const nk = document.getElementById("numKillers");
  const nkLabel = nk?.closest("label");
  const lp = document.getElementById("numLocalPlayers");
  const lpLabel = document.getElementById("numLocalPlayersLabel");
  if (!ns) return;
  const isSh = isShooterMode();
  const maxS = isSh ? 12 : 4;
  const curLocal = Math.min(4, Math.max(1, parseInt(lp?.value, 10) || numLocalPlayers || 1));
  const curTotal = Math.min(maxS, Math.max(isSh ? curLocal : 1, parseInt(ns.value, 10) || (isSh ? 6 : 1)));
  const label = ns.closest("label");
  if (label) {
    const t = label.childNodes[0];
    if (t?.nodeType === Node.TEXT_NODE) t.textContent = isSh ? "總人數（含電腦） " : "倖存者 ";
  }
  if (lpLabel) lpLabel.style.display = isSh ? "" : "none";
  if (lp) {
    lp.innerHTML = "";
    for (let i = 1; i <= 4; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = i === 1
        ? "1（單人 + 電腦）"
        : `${i}（同機 ${i}P 分割 · 手把②~④）`;
      lp.appendChild(opt);
    }
    lp.value = String(curLocal);
  }
  ns.innerHTML = "";
  for (let i = (isSh ? curLocal : 1); i <= maxS; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    if (isSh && i >= 9) opt.textContent = `${i} 人（較吃效能）`;
    else if (isSh) opt.textContent = `${i} 人（${i - curLocal} 電腦）`;
    else opt.textContent = String(i);
    ns.appendChild(opt);
  }
  ns.value = String(Math.max(isSh ? curLocal : 1, curTotal));
  if (nkLabel) nkLabel.style.display = isSh ? "none" : "";
}

function refreshMenuForMode() {
  const dedicatedKh = gameMode === "keyhunt";
  const dedicatedPf = gameMode === "platformer";
  const dedicatedPuzzle = gameMode === "puzzle";
  const dedicatedShooter = gameMode === "shooter";
  const catEl = document.getElementById("levelCategory");
  const winEl = document.getElementById("winGoal");

  if (dedicatedKh) {
    levelCategory = "keyhunt";
    winGoal = "exit";
    if (catEl) catEl.value = "keyhunt";
    if (winEl) winEl.value = "exit";
  } else if (dedicatedPf) {
    levelCategory = "platformer";
    winGoal = "exit";
    if (catEl) catEl.value = "platformer";
    if (winEl) winEl.value = "exit";
  } else if (dedicatedPuzzle) {
    levelCategory = "puzzle";
    winGoal = "exit";
    if (catEl) catEl.value = "puzzle";
    if (winEl) winEl.value = "exit";
  } else if (dedicatedShooter) {
    levelCategory = "shooter";
    winGoal = "survival";
    if (catEl) catEl.value = "shooter";
    if (winEl) winEl.value = "survival";
  } else if (gameMode === "solo" || gameMode === "classic" || gameMode === "coop" || gameMode === "versus" || gameMode === "practice" || gameMode === "mob" || gameMode === "hardcore") {
    levelCategory = "chase";
    if (winEl) winGoal = winEl.value;
  } else if (catEl) {
    levelCategory = catEl.value;
    if (levelCategory === "keyhunt" || levelCategory === "platformer") {
      winGoal = "exit";
      if (winEl) winEl.value = "exit";
    } else if (winEl) {
      winGoal = winEl.value;
    }
  }

  const noKiller = isKeyHuntMode() || isPlatformerMode() || isPuzzleDoorMode() || isShooterMode();
  const hideCatDropdown = true;
  const hideWinDropdown =
    hideCatDropdown || levelCategory === "keyhunt" || levelCategory === "platformer";

  const winSec = document.getElementById("winGoalSection");
  const catSec = document.getElementById("levelCategorySection");
  if (catSec) catSec.style.display = hideCatDropdown ? "none" : "";
  if (winSec) winSec.style.display = hideWinDropdown ? "none" : "";

  const nkEl = document.getElementById("numKillers");
  const nkLabel = nkEl?.closest("label") || document.querySelector("label[for='numKillers']");
  if (nkLabel) nkLabel.style.display = noKiller ? "none" : "";
  const killerLbl = document.getElementById("killerPickLabel");
  const killerGrid = document.getElementById("killerGrid");
  if (killerLbl) killerLbl.style.display = noKiller ? "none" : "";
  if (killerGrid) {
    killerGrid.style.display = noKiller ? "none" : (isTouchUiEnabled() ? "" : "grid");
  }
  const killerGridLabel = document.getElementById("killerGridLabel");
  if (killerGridLabel) killerGridLabel.style.display = noKiller ? "none" : "";
  const roleSec = document.getElementById("rolePickSection");
  if (roleSec) roleSec.style.display = noKiller ? "none" : "";

  if (noKiller) {
    playerRole = "survivor";
    const roleEl = document.getElementById("playerRole");
    if (roleEl) roleEl.value = "survivor";
    updatePickRoleLabel();
  }

  const psLabel = document.getElementById("shooterPlayStyleLabel");
  if (psLabel) psLabel.style.display = dedicatedShooter ? "" : "none";

  syncPlayerCountOptions();
  rebuildLevelGrid();
  refreshRoleUI();
  checkMenuUiConsistency();
  menuUiRef?.updatePickLabels?.();
  updateMenuPreview();
}

function initMenu() {
  loadBindings();

  const catEl = document.getElementById("levelCategory");
  if (catEl) {
    catEl.onchange = () => {
      levelCategory = catEl.value;
      if (levelCategory === "keyhunt" || levelCategory === "platformer") {
        winGoal = "exit";
        const w = document.getElementById("winGoal");
        if (w) w.value = "exit";
      }
      if (!isDedicatedSpecialMode()) rebuildLevelGrid();
      refreshMenuForMode();
    };
  }
  const winEl = document.getElementById("winGoal");
  if (winEl) {
    winEl.onchange = () => {
      winGoal = winEl.value;
      refreshMenuForMode();
    };
  }
  const localEl = document.getElementById("numLocalPlayers");
  if (localEl && !localEl.dataset.bound) {
    localEl.dataset.bound = "1";
    localEl.addEventListener("change", () => {
      syncPlayerCountOptions();
      playSfx("ui");
    });
  }
  const survEl = document.getElementById("numSurvivors");
  if (survEl && !survEl.dataset.shBound) {
    survEl.dataset.shBound = "1";
    survEl.addEventListener("change", () => {
      if (isShooterMode()) syncPlayerCountOptions();
    });
  }

  rebuildLevelGrid();

  const modeGrid = document.getElementById("modeGrid");
  [
    { id: "solo", name: "單人", desc: "四區域大圖 · 你 vs AI · Rivals 風格", featured: true },
    { id: "classic", name: "經典迷宮", desc: "簡易平面追逐 · 無高台 · 懷舊版" },
    { id: "puzzle", name: "解題闖關", desc: "謎題門連鎖 · 答對開門 · 無獵人", featured: true },
    { id: "coop", name: "雙人合作", desc: "2 倖存者 vs AI · P2 方向鍵" },
    { id: "versus", name: "雙人對戰", desc: "1 倖存者 vs 1 獵人（玩家）" },
    { id: "keyhunt", name: "鑰匙逃脫", desc: "無獵人 · 找鑰匙開門 · 陷阱與尖刺" },
    { id: "platformer", name: "平台冒險", desc: "踩小怪 · 噴火落石 · 單向門（無獵人）" },
    { id: "practice", name: "練習模式", desc: "獵人較慢 · 時間較長 · 適合新手" },
    { id: "mob", name: "團隊逃亡", desc: "4 倖存者 · 2 獵人追擊" },
    { id: "hardcore", name: "硬核", desc: "獵人更快 · 任務更少" },
    { id: "shooter", name: "槍戰模式", desc: "團隊或自由混戰 · 最多 12 人 · 漆彈射擊", featured: true },
  ].forEach((m, i) => {
    const card = document.createElement("div");
    card.className = "mode-card" + (i === 0 ? " selected" : "") + (m.featured ? " featured" : "") + (m.wip ? " wip" : "");
    card.innerHTML = `<h3>${m.name}${m.wip ? " <span class='wip-tag'>開發中</span>" : ""}</h3><p>${m.desc}</p>`;
    card.onclick = () => {
      document.querySelectorAll(".mode-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      const prevMode = gameMode;
      gameMode = m.id;
      resetCategoryAfterDedicatedMode(prevMode);
      document.getElementById("p2CharSection").style.display =
        m.id === "solo" || m.id === "classic" || m.id === "keyhunt" || m.id === "platformer" || m.id === "puzzle" || m.id === "shooter" ? "none" : "block";
      refreshMenuForMode();
      updateMenuPreview();
      playSfx("ui");
    };
    modeGrid.appendChild(card);
  });

  const mountGrid = (id, hostId) => {
    const g = document.getElementById(id);
    const h = document.getElementById(hostId);
    if (g && h) {
      g.classList.remove("picker-hidden");
      h.appendChild(g);
    }
  };
  mountGrid("levelGrid", "levelGridHost");
  mountGrid("charGrid", "charGridHost");
  mountGrid("charGrid2", "charGrid2Host");
  mountGrid("killerGrid", "killerGridHost");

  const roleEl = document.getElementById("playerRole");
  if (roleEl) {
    roleEl.onchange = () => {
      playerRole = roleEl.value;
      refreshRoleUI();
    };
  }
  refreshRoleUI();

  const grid = document.getElementById("charGrid");
  if (grid) {
    SURVIVORS.forEach((ch) => {
      grid.appendChild(makeCharCard(ch, "#charGrid", (c) => { selectedChar = c; }, selectedChar.id, "p1"));
    });
  }

  const grid2 = document.getElementById("charGrid2");
  if (grid2) {
    SURVIVORS.forEach((ch) => {
      grid2.appendChild(makeCharCard(ch, "#charGrid2", (c) => { selectedChar2 = c; }, selectedChar2.id, "p2"));
    });
  }

  const killerGrid = document.getElementById("killerGrid");
  if (killerGrid) {
    KILLERS.forEach((k) => {
      killerGrid.appendChild(
        makeCharCard(k, "#killerGrid", (c) => { selectedKiller = c; }, selectedKiller.id, "killer")
      );
    });
  }

  document.getElementById("btnOpenDoor")?.addEventListener("click", () => {
    if (gameState === "play") tryOpenDoorInput();
  });

  document.getElementById("btnStart").onclick = () => {
    startGame().catch((err) => {
      console.error(err);
      hideLoading();
      alert(`開始遊戲失敗：${err.message || err}`);
      returnToMenu();
    });
  };
  document.getElementById("btnRetry").onclick = () => returnToMenu();
  document.getElementById("btnSettings").onclick = () => openSettings();
  document.getElementById("btnCloseSettings").onclick = () => closeSettings();
  document.getElementById("btnSaveControls").onclick = () => saveSettingsFromUI();
  document.getElementById("btnResetControls").onclick = () => {
    resetBindings();
    resetAudioSettings(musicEl);
    renderSettingsForm();
    syncTouchButtonBindings(getBindings);
  };
  document.getElementById("btnResume")?.addEventListener("click", () => togglePause());
  document.getElementById("btnQuitMenu")?.addEventListener("click", () => returnToMenu());
  document.getElementById("btnSpectatePrev")?.addEventListener("click", () => cycleSpectate(-1));
  document.getElementById("btnSpectateNext")?.addEventListener("click", () => cycleSpectate(1));
  document.getElementById("btnTouchMission")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (nearPuzzleDoor && isPuzzleDoorMode()) openMathQuiz(nearPuzzleDoor);
    else if (nearMissionStation) openMathQuiz(nearMissionStation);
  });
  document.getElementById("btnTouchMission")?.addEventListener("touchend", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (nearPuzzleDoor && isPuzzleDoorMode()) openMathQuiz(nearPuzzleDoor);
    else if (nearMissionStation) openMathQuiz(nearMissionStation);
  });
  bindShooterScoreboardUi((force) => {
    if (!isShooterMode()) return;
    if (force === false) showShooterScoreboard(false);
    else showShooterScoreboard(!shooterScoreboardOpen);
  });
  document.getElementById("btnCloseQuiz")?.addEventListener("click", () => closeMathQuiz());
  document.getElementById("btnRefreshQuiz")?.addEventListener("click", () => {
    if (activeQuiz) renderQuizQuestion(activeQuiz);
    playSfx("ui");
  });
  document.getElementById("quizSubject")?.addEventListener("change", () => {
    if (activeQuiz) renderQuizQuestion(activeQuiz);
  });
  document.getElementById("quizDifficulty")?.addEventListener("change", () => {
    if (activeQuiz) renderQuizQuestion(activeQuiz);
  });

  try {
    renderSettingsForm();
  } catch (err) {
    console.warn("設定面板載入失敗，已重置按鍵", err);
    resetBindings();
    renderSettingsForm();
  }

  const togglePickRole = () => {
    if (isKeyHuntMode() || isPlatformerMode() || isPuzzleDoorMode() || isShooterMode()) return;
    const sel = document.getElementById("playerRole");
    if (!sel) return;
    sel.value = sel.value === "killer" ? "survivor" : "killer";
    playerRole = sel.value;
    updatePickRoleLabel();
    refreshRoleUI();
    playSfx("ui");
  };
  document.getElementById("pickRoleRow")?.addEventListener("click", togglePickRole);
  document.getElementById("pickRoleRow")?.addEventListener("touchend", (e) => {
    e.preventDefault();
    togglePickRole();
  }, { passive: false });

  menuUiRef = initMenuWizard({
    playSfx,
    getSelectedLevel: () => selectedLevel,
    getSelectedChar: () => selectedChar,
    getSelectedChar2: () => selectedChar2,
    getSelectedKiller: () => selectedKiller,
    shouldHideKiller: () => isKeyHuntMode() || isPlatformerMode() || isPuzzleDoorMode() || isShooterMode(),
    shouldHideP2: () => gameMode === "solo" || gameMode === "keyhunt" || gameMode === "platformer" || gameMode === "puzzle" || gameMode === "shooter",
    updateRoleLabel: updatePickRoleLabel,
  });

  const bindPauseBtn = (btn) => {
    if (!btn) return;
    let touchHandled = false;
    const openPause = (e) => {
      e.preventDefault();
      e.stopPropagation();
      initAudioEngine();
      togglePause();
    };
    btn.addEventListener("touchend", (e) => {
      touchHandled = true;
      openPause(e);
    }, { passive: false });
    btn.addEventListener("click", (e) => {
      if (touchHandled) {
        touchHandled = false;
        return;
      }
      openPause(e);
    });
  };
  bindPauseBtn(document.getElementById("btnHudPause"));
  document.getElementById("btnPauseMobileSettings")?.addEventListener("click", () => {
    document.getElementById("pausePanel")?.classList.remove("show");
    if (gameState === "paused") gameState = "play";
    openMobileSettingsPanel();
  });

  refreshMenuForMode();
  updateMenuPreview();
  document.querySelectorAll(".menu-tab, #menuPrev, #menuNext").forEach((el) => {
    el.addEventListener("click", () => requestAnimationFrame(updateMenuPreview));
  });
  initPerfTipModal();
}

function updatePickRoleLabel() {
  const el = document.getElementById("pickRoleLabel");
  const sel = document.getElementById("playerRole");
  const v = sel?.value || playerRole || "survivor";
  if (el) {
    el.textContent = v === "killer" ? "殺手（有普攻鍵）" : "倖存者（逃亡）";
  }
}

function refreshRoleUI() {
  const solo = gameMode === "solo";
  const sec = document.getElementById("rolePickSection");
  const pickRole = document.getElementById("pickRoleRow");
  const showRole = solo && !isKeyHuntMode() && !isPlatformerMode() && !isPuzzleDoorMode() && !isShooterMode();
  if (sec) sec.style.display = showRole && !isTouchUiEnabled() ? "block" : "none";
  if (pickRole) pickRole.hidden = !showRole || !isTouchUiEnabled();
  if (showRole && isTouchUiEnabled()) updatePickRoleLabel();
  const asKiller = solo && playerRole === "killer";
  const survLabel = document.getElementById("survivorPickLabel");
  const charGrid = document.getElementById("charGrid");
  if (survLabel) survLabel.style.display = asKiller ? "none" : "block";
  if (charGrid && !isTouchUiEnabled()) charGrid.style.display = asKiller ? "none" : "grid";
  const p2Row = document.getElementById("pickSurvivor2Row");
  const p2Sec = document.getElementById("p2CharSection");
  const showP2 = gameMode === "coop" || gameMode === "versus";
  if (p2Row) p2Row.hidden = !showP2;
  if (p2Sec) p2Sec.style.display = showP2 ? "block" : "none";
  menuUiRef?.updatePickLabels?.();
}

function updatePlayUiLayout() {
  const playing = gameState === "play" || gameState === "paused";
  const kh = isKeyHuntMode();
  const p = playing ? getHumanFocus() : null;
  const hasKeys = !!(kh && p?.keysHeld?.size);
  document.body.classList.toggle("keyhunt-play", kh && playing);
  document.body.classList.toggle("keyhunt-has-keys", hasKeys);
  const inv = document.getElementById("inventoryBar");
  if (inv) inv.classList.toggle("layout-left", kh && playing);
}

function getHumanSurvivor() {
  return survivors.find((s) => !s.isAI && s.profile === "p1")
    || survivors.find((s) => !s.isAI);
}

function isSpectating() {
  if (playAsKiller || gameMode === "versus" || gameState !== "play") return false;
  const human = getHumanSurvivor();
  if (isShooterMode()) return !!(human && human._awaitingRespawn);
  return !!(human && human.caught);
}

function getSpectateTargets() {
  if (isShooterMode()) {
    const human = getHumanSurvivor();
    return survivors.filter((s) => isShooterCombatActive(s) && s !== human);
  }
  return getAliveSurvivors();
}

function isShooterCombatActive(p) {
  return p && !isShooterPlayerDown(p);
}

function getCameraFocus() {
  if (isSpectating()) {
    const targets = getSpectateTargets();
    if (targets.length) {
      spectateIndex = ((spectateIndex % targets.length) + targets.length) % targets.length;
      return targets[spectateIndex];
    }
  }
  return getHumanFocus();
}

function cycleSpectate(dir) {
  const targets = getSpectateTargets();
  if (!targets.length) return;
  spectateIndex = (spectateIndex + dir + targets.length) % targets.length;
  const focus = getCameraFocus();
  if (focus?.yaw != null) camYaw = focus.yaw;
  updateSpectateBanner();
  playSfx("ui", 0.08);
}

function updateSpectateBanner() {
  const banner = document.getElementById("spectateBanner");
  const label = document.getElementById("spectateLabel");
  const focus = getCameraFocus();
  if (!banner || !label) return;
  if (!isSpectating() || !focus) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  const idx = getSpectateTargets().indexOf(focus);
  const total = getSpectateTargets().length;
  label.textContent = `觀戰：${focus.charDef?.name || "倖存者"}${total > 1 ? ` (${idx + 1}/${total})` : ""}`;
  const sub = document.getElementById("spectateHint");
  if (sub) {
    sub.textContent = total > 1
      ? (isTouchUiEnabled() ? "點 ‹ › 切換視角" : "[ ] 或 ← → 切換視角")
      : "觀戰中 · ESC 暫停";
  }
}

function syncSpectateUi() {
  const on = isSpectating();
  document.body.classList.toggle("spectating", on);
  updateSpectateBanner();
}

function getNearestKiller(s) {
  const pos = s?.pos ?? s;
  let best = null;
  let bestD = Infinity;
  for (const k of killers) {
    const d = Math.hypot(pos.x - k.pos.x, pos.z - k.pos.z);
    if (d < bestD) { bestD = d; best = k; }
  }
  return { killer: best, dist: bestD };
}

/** 007n7 等分身：獨立走位引開獵人 */
function tickCloneDecoy(p, dt) {
  if (!p.cloneMesh || !p._clonePos || (p._cloneUntil ?? 0) <= elapsed) return;

  p._cloneAiT = (p._cloneAiT ?? 0) - dt;
  const { killer, dist: kDist } = getNearestKiller({ pos: p._clonePos });
  let mx = 0;
  let mz = 0;
  const mapScale = getMapMoveScale();
  const speed = SPRINT_SPEED * 0.88 * mapScale;

  if (killer && kDist < 24) {
    const dx = p._clonePos.x - killer.pos.x;
    const dz = p._clonePos.z - killer.pos.z;
    const len = Math.hypot(dx, dz) || 1;
    mx = dx / len;
    mz = dz / len;
    if (kDist < 10) {
      const strafe = Math.sin(elapsed * 3.8 + p._clonePos.x * 0.1) > 0 ? 1 : -1;
      const yaw = Math.atan2(mx, mz);
      mx = mx * 0.55 + Math.cos(yaw) * strafe * 0.45;
      mz = mz * 0.55 - Math.sin(yaw) * strafe * 0.45;
    }
  } else {
    if (p._cloneAiT <= 0) {
      p._cloneAiT = 0.6 + Math.random() * 1.4;
      const away = Math.atan2(p._clonePos.x - p.pos.x, p._clonePos.z - p.pos.z);
      p._cloneWanderYaw = away + (Math.random() - 0.5) * 1.6;
    }
    mx = Math.sin(p._cloneWanderYaw);
    mz = Math.cos(p._cloneWanderYaw);
  }

  const pdx = p._clonePos.x - p.pos.x;
  const pdz = p._clonePos.z - p.pos.z;
  const pd = Math.hypot(pdx, pdz);
  if (pd < 7) {
    mx += (pdx / (pd || 1)) * 0.55;
    mz += (pdz / (pd || 1)) * 0.55;
  }

  const mlen = Math.hypot(mx, mz) || 1;
  mx /= mlen;
  mz /= mlen;
  p._cloneYaw = Math.atan2(mx, mz);
  playerMove(p._clonePos, mx * speed, mz * speed, dt, 0, 0);

  const cy = worldHeight({ pos: p._clonePos, elev: 0, _jumpY: 0 });
  p.cloneMesh.position.set(p._clonePos.x, cy, p._clonePos.z);
  p.cloneMesh.rotation.y = p._cloneYaw;
  p.cloneMesh.visible = true;

  const proxy = {
    mesh: p.cloneMesh,
    vel: { x: mx * speed, z: mz * speed },
    yaw: p._cloneYaw,
    role: "survivor",
    onGround: true,
    _jumpY: 0,
    sliding: false,
    attackState: null,
  };
  applyLocomotionAnim(proxy, dt);
}

function aiSurvivorIndex(s) {
  const alive = getAliveSurvivors();
  const idx = alive.indexOf(s);
  return idx >= 0 ? idx : 0;
}

function pickAiRoamTarget(s) {
  const seed = String(s.profile || s.charDef?.id || "ai")
    .split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const gx = 1 + ((seed * 13 + Math.floor(elapsed * 0.4)) % Math.max(1, ctx.w - 2));
  const gz = 1 + ((seed * 17 + Math.floor(elapsed * 0.27)) % Math.max(1, ctx.h - 2));
  const c = cellCenter(ctx, gx, gz);
  return { x: c.x, z: c.z };
}

function aiSpreadGoal(s, baseX, baseZ, ring = 11) {
  const n = Math.max(1, getAliveSurvivors().length);
  const idx = aiSurvivorIndex(s);
  const angle = (idx / n) * Math.PI * 2 + elapsed * 0.08;
  return {
    x: baseX + Math.cos(angle) * ring,
    z: baseZ + Math.sin(angle) * ring,
  };
}

function aiSeparationBias(s) {
  let sx = 0;
  let sz = 0;
  for (const other of survivors) {
    if (other === s || other.caught) continue;
    const dx = s.pos.x - other.pos.x;
    const dz = s.pos.z - other.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 5 && d > 0.05) {
      const push = (5 - d) * 0.45;
      sx += (dx / d) * push;
      sz += (dz / d) * push;
    }
  }
  return { x: sx, z: sz };
}

function getHumanFocus() {
  if (playAsKiller) {
    return killers.find((k) => !k.isAI) || killers[0];
  }
  const human = getHumanSurvivor();
  if (human) {
    if (isShooterMode()) {
      if (human._awaitingRespawn) return null;
      if (isShooterPlayerDown(human)) return null;
      return human;
    }
    return human.caught ? null : human;
  }
  return survivors.find((s) => !s.caught) || survivors[0];
}

/** 相機／HUD 用：槍戰模式優先鎖定本人，避免 focus 為 null 導致畫面與計時卡住 */
function resolvePlayFocus() {
  if (playAsKiller) {
    return killers.find((k) => !k.isAI) || killers[0];
  }
  const human = getHumanSurvivor();
  if (isShooterMode()) {
    if (human?._awaitingRespawn) {
      const watch = getCameraFocus();
      if (watch) return watch;
      return survivors.find((s) => isShooterCombatActive(s)) || human;
    }
    if (human && !isShooterPlayerDown(human)) return human;
    return human || survivors.find((s) => isShooterCombatActive(s)) || survivors[0];
  }
  return getCameraFocus() || human || survivors.find((s) => !s.caught) || survivors[0];
}

function returnToMenu() {
  hideLoading();
  stopShooterResultMusic();
  stopGameMusic(musicEl);
  suspendGameAudio();
  gameState = "menu";
  closeMathQuiz();
  keyHuntState = null;
  keyHuntGroup = null;
  platformerState = null;
  platformerGroup = null;
  puzzleDoorState = null;
  puzzleDoorGroup = null;
  shooterState = null;
  shooterArenaGroup = null;
  verticalWorldState = null;
  mazeDecorGroup = null;
  bouncePads = [];
  nearPuzzleDoor = null;
  document.getElementById("keyHuntBar")?.style.setProperty("display", "none");
  document.getElementById("pausePanel")?.classList.remove("show");
  overlay.classList.remove("show", "win", "lose");
  menu.style.display = "flex";
  hud.classList.remove("show");
  clickPrompt.classList.remove("show");
  document.exitPointerLock?.();
  clearVfxPool();
  clearShooterTeamMarkers(survivors);
  hideGamepadHud();
  document.getElementById("hudEscHint")?.classList.remove("show");
  document.body.classList.remove(
    "keyhunt-play", "keyhunt-has-keys", "spectating", "shooter-play", "shooter-end-ui", "scoreboard-open"
  );
  refreshMenuForMode();
}

function openSettings() {
  document.getElementById("settingsPanel").classList.add("show");
  renderSettingsForm();
}

function closeSettings() {
  document.getElementById("settingsPanel").classList.remove("show");
}

function renderSettingsForm() {
  const form = document.getElementById("controlsForm");
  const b = getBindings();
  const audio = getAudioSettings();
  const musicPct = Math.round((audio.music ?? 0.28) * 100);
  const sfxPct = Math.round((audio.sfx ?? 1) * 100);
  const profiles = [
    { id: "p1", name: "玩家 1（倖存者）" },
    { id: "p2", name: "玩家 2（合作倖存者）" },
    { id: "killer", name: "獵人（對戰模式）" },
  ];
  const actions = [
    ["up", "上"], ["down", "下"], ["left", "左"], ["right", "右"],
    ["sprint", "衝刺"], ["jump", "跳躍"], ["slide", "滑壘 Ctrl"], ["ab1", "招式 Q/1"], ["ab2", "招式 E/2"], ["ab3", "招式 F/3"],
    ["zoomIn", "視角拉近 Z"], ["zoomOut", "視角拉遠 X"],
  ];
  form.innerHTML = `
    <div class="bind-section audio-section">
      <h4>音量</h4>
      <label class="vol-row">背景音樂
        <span class="vol-control">
          <input type="range" id="setMusicVol" min="0" max="100" value="${musicPct}" />
          <span id="setMusicVolVal">${musicPct}%</span>
        </span>
      </label>
      <label class="vol-row">音效
        <span class="vol-control">
          <input type="range" id="setSfxVol" min="0" max="100" value="${sfxPct}" />
          <span id="setSfxVolVal">${sfxPct}%</span>
        </span>
      </label>
    </div>
    <div class="bind-section">
      <h4>槍戰視野</h4>
      <label class="vol-row">視野寬度 (FOV)
        <span class="vol-control">
          <input type="range" id="setShooterFov" min="75" max="110" value="${shooterSettings.fov}" />
          <span id="setShooterFovVal">${shooterSettings.fov}°</span>
        </span>
      </label>
      <label class="vol-row">狙擊開鏡視野
        <span class="vol-control">
          <input type="range" id="setScopeFov" min="30" max="60" value="${shooterSettings.scopeFov}" />
          <span id="setScopeFovVal">${shooterSettings.scopeFov}°</span>
        </span>
      </label>
      <label class="vol-row" style="margin-top:8px">
        <input type="checkbox" id="setInvertY" ${shooterSettings.invertY ? "checked" : ""} />
        反轉上下視角（滑鼠／觸控）
      </label>
      <label class="vol-row" style="margin-top:6px">
        <input type="checkbox" id="setAutoAim" ${shooterSettings.autoAim ? "checked" : ""} />
        手機槍戰自動瞄準＋鎖定開火（可關閉）
      </label>
    </div>
    ${profiles
    .map(
      (pr) => `
    <div class="bind-section"><h4>${pr.name}</h4>
    ${actions
      .map(
        ([act, label]) => `
      <label>${label}
        <button type="button" class="bind-btn" data-profile="${pr.id}" data-action="${act}">
          ${labelFor(b[pr.id][act])}
        </button>
      </label>`
      )
      .join("")}
    </div>`
    )
    .join("")}`;

  const syncVolLabels = () => {
    const mv = document.getElementById("setMusicVol");
    const sv = document.getElementById("setSfxVol");
    const mvl = document.getElementById("setMusicVolVal");
    const svl = document.getElementById("setSfxVolVal");
    if (mvl && mv) mvl.textContent = `${mv.value}%`;
    if (svl && sv) svl.textContent = `${sv.value}%`;
  };
  document.getElementById("setMusicVol")?.addEventListener("input", (e) => {
    setAudioSettings({ music: Number(e.target.value) / 100 }, musicEl);
    syncVolLabels();
  });
  document.getElementById("setSfxVol")?.addEventListener("input", (e) => {
    setAudioSettings({ sfx: Number(e.target.value) / 100 }, musicEl);
    syncVolLabels();
  });

  const sf = document.getElementById("setShooterFov");
  const ss = document.getElementById("setScopeFov");
  const inv = document.getElementById("setInvertY");
  const syncShooterLabels = () => {
    const sfl = document.getElementById("setShooterFovVal");
    const ssl = document.getElementById("setScopeFovVal");
    if (sfl && sf) sfl.textContent = `${sf.value}°`;
    if (ssl && ss) ssl.textContent = `${ss.value}°`;
  };
  sf?.addEventListener("input", (e) => {
    shooterSettings.fov = Number(e.target.value);
    saveShooterSettings();
    syncShooterLabels();
    updateShooterFov();
  });
  ss?.addEventListener("input", (e) => {
    shooterSettings.scopeFov = Number(e.target.value);
    saveShooterSettings();
    syncShooterLabels();
    updateShooterFov();
  });
  inv?.addEventListener("change", (e) => {
    shooterSettings.invertY = e.target.checked;
    saveShooterSettings();
  });
  document.getElementById("setAutoAim")?.addEventListener("change", (e) => {
    shooterSettings.autoAim = e.target.checked;
    saveShooterSettings();
  });

  form.querySelectorAll(".bind-btn").forEach((btn) => {
    btn.onclick = () => {
      btn.textContent = "按下按鍵…";
      const handler = (e) => {
        e.preventDefault();
        setBinding(btn.dataset.profile, btn.dataset.action, e.code);
        btn.textContent = labelFor(e.code);
        window.removeEventListener("keydown", handler);
      };
      window.addEventListener("keydown", handler, { once: false });
    };
  });
}

function saveSettingsFromUI() {
  const mv = document.getElementById("setMusicVol");
  const sv = document.getElementById("setSfxVol");
  if (mv || sv) {
    setAudioSettings({
      music: Number(mv?.value ?? 28) / 100,
      sfx: Number(sv?.value ?? 100) / 100,
    }, musicEl);
  }
  saveBindings();
  syncTouchButtonBindings(getBindings);
  closeSettings();
}

// ─── Renderer（效能優先）────────────────────────────────────────────────────
function initRenderer() {
  if (!camera) {
    camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 150);
  }
  if (!scene) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1228);
  }
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (!renderer.domElement.parentElement) {
      document.body.appendChild(renderer.domElement);
    }
    const el = renderer.domElement;
    el.style.position = "fixed";
    el.style.inset = "0";
    el.style.zIndex = "1";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.display = "block";
    el.style.pointerEvents = isTouchUiEnabled() ? "none" : "auto";
  }
}

function updateCanvasPointerEvents() {
  if (!renderer) return;
  renderer.domElement.style.pointerEvents = isTouchUiEnabled() ? "none" : "auto";
}

function ensureGraphics() {
  try {
    initRenderer();
    if (!scene) throw new Error("3D 場景建立失敗");
    if (!renderer) throw new Error("WebGL 渲染器建立失敗");
    if (!camera) throw new Error("攝影機建立失敗");
  } catch (err) {
    console.error(err);
    throw new Error("無法啟動 3D 引擎，請更新顯示卡驅動或使用 Chrome / Edge 再試");
  }
}

function setupLights() {
  if (!scene) return;
  scene.add(new THREE.AmbientLight(0xd4dcff, 1.28));
  const hemi = new THREE.HemisphereLight(0xc8e8ff, 0x4e6078, 0.92);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xfff8ee, 1.05);
  dir.position.set(18, 42, 14);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.near = 2;
  dir.shadow.camera.far = 90;
  const sh = 38;
  dir.shadow.camera.left = -sh;
  dir.shadow.camera.right = sh;
  dir.shadow.camera.top = sh;
  dir.shadow.camera.bottom = -sh;
  dir.shadow.bias = -0.0008;
  dir.target.position.set(0, 0, 0);
  scene.add(dir);
  scene.add(dir.target);
  scene.userData.shadowLight = dir;
}

function clearScene() {
  ensureGraphics();
  const kids = [...scene.children];
  for (const child of kids) scene.remove(child);
  setupLights();
}

function isKeyHuntMode() {
  return gameMode === "keyhunt" || levelCategory === "keyhunt";
}

function isPlatformerMode() {
  return gameMode === "platformer" || levelCategory === "platformer";
}

function isPuzzleDoorMode() {
  return gameMode === "puzzle" || levelCategory === "puzzle";
}

function isShooterMode() {
  return gameMode === "shooter" || levelCategory === "shooter";
}

/** 槍戰倒地／等待重生：不應使用 chase 模式的 caught 擋移動 */
function isShooterPlayerDown(p) {
  if (!p) return false;
  if (p._awaitingRespawn) return true;
  if (p._shooterDowned && (p.hp ?? 0) <= 0) return true;
  return false;
}

function isClassicMode() {
  return gameMode === "classic";
}

function clampCamPitch(pitch) {
  let min = isShooterMode() ? SHOOTER_PITCH_MIN : CAM_PITCH_MIN;
  let max = isShooterMode() ? SHOOTER_PITCH_MAX : CAM_PITCH_MAX;
  if (!isShooterMode()) {
    const focus = getHumanSurvivor() || getCameraFocus();
    const eh = focus ? worldHeight(focus) : 0;
    max = Math.max(max, 2.55 + Math.min(0.35, eh * 0.04));
    min = Math.min(min, -0.12);
  }
  return Math.max(min, Math.min(max, pitch));
}

function applyLookPitch(delta, sens = 0.0022) {
  const mul = isShooterMode()
    ? (shooterSettings.invertY ? 1 : -1)
    : 1;
  camPitch = clampCamPitch(camPitch + mul * delta * sens);
}

function getShooterActiveFov() {
  const p = getHumanSurvivor();
  const w = getShooterWeapon(p?.weaponId);
  if (w.id === "sniper" && shooterAds) return shooterSettings.scopeFov;
  return shooterSettings.fov;
}

function updateShooterFov() {
  if (!camera || !isShooterMode()) return;
  const fov = getShooterActiveFov();
  if (Math.abs(camera.fov - fov) > 0.05) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}

function getShooterAimYaw() {
  if (!camera) return camYaw;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return Math.atan2(dir.x, dir.z);
}

function getShooterAutoAimTarget(p, baseYaw) {
  if (!p || !shooterSettings.autoAim || !isTouchUiEnabled()) return null;
  const style = shooterState?.playStyle ?? shooterPlayStyle;
  const maxAng = (shooterSettings.autoAimDeg ?? 18) * (Math.PI / 180);
  const maxDist = 26;
  let bestOther = null;
  let bestAng = maxAng;
  for (const other of survivors) {
    if (!isShooterEnemy(p, other, style, shooterState)) continue;
    if (!isShooterCombatActive(other)) continue;
    const dx = other.pos.x - p.pos.x;
    const dz = other.pos.z - p.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > maxDist || dist < 0.5) continue;
    const tyaw = Math.atan2(dx, dz);
    let d = tyaw - baseYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const ang = Math.abs(d);
    if (ang < bestAng) {
      bestAng = ang;
      bestOther = other;
    }
  }
  return bestOther;
}

function applyShooterAutoAim(p, baseYaw) {
  const other = getShooterAutoAimTarget(p, baseYaw);
  if (!other) return baseYaw;
  return Math.atan2(other.pos.x - p.pos.x, other.pos.z - p.pos.z);
}

function tickShooterAutoFire() {
  if (!isShooterMode() || gameState !== "play" || !isTouchUiEnabled() || !shooterSettings.autoAim) return;
  if (isSpectating()) return;
  const locals = isShooterSplitView() ? getLocalHumanPlayers() : [getHumanSurvivor()].filter(Boolean);
  for (const human of locals) {
    if (!human || isShooterPlayerDown(human)) continue;
    const { yaw } = getPlayerCamAngles(human);
    if (!getShooterAutoAimTarget(human, yaw)) continue;
    if (canShooterFire(human, elapsed, shooterState)) tryShooterFire(human);
  }
}

function getShooterLabelViewports(W, H) {
  const human = getHumanSurvivor();
  const locals = isSpectating() ? [] : getLocalHumanPlayers();
  if (!isShooterSplitView() || locals.length < 2) {
    const viewer = locals[0] || human;
    if (viewer && camera) {
      const ang = getPlayerCamAngles(viewer);
      updateCameraForPlayer(camera, viewer, ang.yaw, ang.pitch);
    }
    return [{ viewer, camera, x: 0, y: 0, w: W, h: H }];
  }
  ensureSplitCameras(locals.length);
  const cams = [camera, camera2, camera3, camera4];
  if (locals.length === 2) {
    const halfH = Math.floor((H - COOP_SPLIT_GAP) / 2);
    const bottomH = H - halfH - COOP_SPLIT_GAP;
    const a1 = getPlayerCamAngles(locals[0]);
    const a2 = getPlayerCamAngles(locals[1]);
    updateCameraForPlayer(cams[0], locals[0], a1.yaw, a1.pitch);
    updateCameraForPlayer(cams[1], locals[1], a2.yaw, a2.pitch);
    return [
      { viewer: locals[0], camera: cams[0], x: 0, y: halfH + COOP_SPLIT_GAP, w: W, h: halfH },
      { viewer: locals[1], camera: cams[1], x: 0, y: 0, w: W, h: bottomH },
    ];
  }
  const halfW = Math.floor(W / 2);
  const halfH = Math.floor(H / 2);
  const slots = [
    { x: 0, y: halfH, w: halfW, h: halfH },
    { x: halfW, y: halfH, w: W - halfW, h: halfH },
    { x: 0, y: 0, w: halfW, h: halfH },
    { x: halfW, y: 0, w: W - halfW, h: halfH },
  ];
  return locals.slice(0, 4).map((viewer, i) => {
    const ang = getPlayerCamAngles(viewer);
    updateCameraForPlayer(cams[i], viewer, ang.yaw, ang.pitch);
    return { viewer, camera: cams[i], ...slots[i] };
  });
}

function getShooterAimDirForPlayer(p) {
  const human = p || getHumanSurvivor();
  const { yaw, pitch } = getPlayerCamAngles(human);
  let baseYaw = yaw;
  if (human === getHumanSurvivor() && camera && !isShooterSplitView()) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    baseYaw = Math.atan2(dir.x, dir.z);
    if (!isTouchUiEnabled() || !shooterSettings.autoAim) return dir.normalize();
  }
  if (human && isShooterMode() && isTouchUiEnabled() && shooterSettings.autoAim) {
    const aimYaw = applyShooterAutoAim(human, baseYaw);
    if (aimYaw !== baseYaw) {
      const cosP = Math.cos(pitch);
      return new THREE.Vector3(
        Math.sin(aimYaw) * cosP, Math.sin(pitch), Math.cos(aimYaw) * cosP
      ).normalize();
    }
  }
  const cosP = Math.cos(pitch);
  return new THREE.Vector3(
    Math.sin(baseYaw) * cosP, Math.sin(pitch), Math.cos(baseYaw) * cosP
  ).normalize();
}

function getShooterAimDir() {
  return getShooterAimDirForPlayer(getHumanSurvivor());
}

function syncShooterPlayerVisibility() {
  if (!isShooterMode()) return;
  const human = getHumanSurvivor();
  const locals = getLocalHumanPlayers();
  const spectating = isSpectating();
  const split = isShooterSplitView();
  const showFp = human && !spectating && !isShooterPlayerDown(human) && !split;
  setFpGunVisible(showFp);
  for (const s of survivors) {
    if (!s.mesh) continue;
    if (s._shooterDowned) {
      const hideAt = s._shooterBodyHideAt;
      s.mesh.visible = hideAt == null || elapsed < hideAt;
      continue;
    }
    if (!split && s === human && !spectating) s.mesh.visible = false;
    else s.mesh.visible = true;
  }
}

function showHitMarker() {
  const ch = document.getElementById("crosshair");
  if (!ch) return;
  ch.classList.add("hit");
  clearTimeout(showHitMarker._t);
  showHitMarker._t = setTimeout(() => ch.classList.remove("hit"), 120);
}

function invalidateMinimapBase() {
  minimapBaseCanvas = null;
  minimapDirty = true;
}

function rebuildMinimapBase() {
  if (!minimapCanvas || !maze) return;
  minimapBaseCanvas = document.createElement("canvas");
  minimapBaseCanvas.width = minimapCanvas.width;
  minimapBaseCanvas.height = minimapCanvas.height;
  const ctx2 = minimapBaseCanvas.getContext("2d");
  const w = minimapBaseCanvas.width;
  const h = minimapBaseCanvas.height;
  const pad = 3;
  const cellPx = (w - pad * 2) / ctx.w;
  ctx2.fillStyle = "#0c0814";
  ctx2.fillRect(0, 0, w, h);
  for (let gz = 0; gz < ctx.h; gz++) {
    for (let gx = 0; gx < ctx.w; gx++) {
      const cell = maze[gz][gx];
      const px = pad + gx * cellPx;
      const py = pad + gz * cellPx;
      ctx2.fillStyle = ((gx + gz) % 3 === 0) ? "#3a4860" : "#3a3050";
      ctx2.fillRect(px, py, cellPx, cellPx);
      ctx2.strokeStyle = "#6a5888";
      ctx2.lineWidth = 0.5;
      if (cell.top) { ctx2.beginPath(); ctx2.moveTo(px, py); ctx2.lineTo(px + cellPx, py); ctx2.stroke(); }
      if (cell.left) { ctx2.beginPath(); ctx2.moveTo(px, py); ctx2.lineTo(px, py + cellPx); ctx2.stroke(); }
    }
  }
  minimapDirty = false;
}

function usesExitWin() {
  if (isShooterMode()) return false;
  return isKeyHuntMode() || isPlatformerMode() || isPuzzleDoorMode() || winGoal === "exit";
}

function getAliveSurvivors() {
  return survivors.filter((s) => {
    if ((s.hp ?? 100) <= 0) return false;
    if (isShooterMode()) return !isShooterPlayerDown(s);
    return !s.caught;
  });
}

function updatePerfTier() {
  const total = getAliveSurvivors().length + killers.length;
  if (isShooterMode()) {
    const n = survivors.length;
    perfTier = n >= 10 ? "low" : n >= 7 ? "med" : "high";
  } else {
    perfTier = total >= 9 ? "low" : total >= 6 ? "med" : "high";
  }
  setVfxBudget(perfTier === "low" ? 16 : perfTier === "med" ? 26 : 38);
}

function shouldAnimateEntity(p) {
  if (!p?.isAI) return true;
  if (perfTier === "high") return true;
  const skip = perfTier === "med" ? 2 : 3;
  return frameCount % skip === 0;
}

function getWinSurvivors() {
  return survivors.filter((s) => !s.caught && (s.hp ?? 100) > 0);
}

function getCollisionOpts() {
  if (isShooterMode()) {
    return { vaultClear: 1.65, vaultJumpMin: 0.22 };
  }
  if (isPlatformerMode()) {
    return { vaultClear: 2.0, vaultJumpMin: 0.32 };
  }
  if (isPuzzleDoorMode()) {
    return { vaultClear: 2.55, vaultJumpMin: 0.22, radiusScale: 0.82 };
  }
  if (gameMode === "solo" || gameMode === "practice") {
    return { vaultClear: 2.45, vaultJumpMin: 0.26, radiusScale: 0.9 };
  }
  if (isClassicMode()) {
    return { vaultClear: 2.2, vaultJumpMin: 0.3 };
  }
  return { vaultClear: 2.5, vaultJumpMin: 0.22, radiusScale: 0.88 };
}

function applyFallSafety(p) {
  if (!p || p.caught) return;
  const wh = worldHeight(p);
  if (wh >= -3) {
    if (p.onGround) {
      p._safeX = p.pos.x;
      p._safeZ = p.pos.z;
      p._safeElev = p.elev ?? 0;
    }
    return;
  }
  const sx = p._safeX ?? cellCenter(ctx, 0, 0).x;
  const sz = p._safeZ ?? cellCenter(ctx, 0, 0).z;
  p.pos.x = sx;
  p.pos.z = sz;
  p.elev = p._safeElev ?? 0;
  p._jumpY = 0;
  p.velY = 0;
  p.onGround = true;
  p._bounceArc = null;
  if (!p.isAI) showToast("掉出平台，已送回安全位置", 1400);
}

function playerMove(pos, vx, vz, dt, jumpY = 0, footElev = 0) {
  const jy = jumpY ?? 0;
  const fe = footElev ?? 0;
  if (keyHuntState?.doors) {
    moveWithDoorCollision(ctx, maze, keyHuntState.doors, pos, vx, vz, dt, jy);
  } else if (puzzleDoorState?.doors) {
    moveWithCollision(ctx, maze, pos, vx, vz, dt, jy, fe, getCollisionOpts());
  } else {
    moveWithCollision(ctx, maze, pos, vx, vz, dt, jy, fe, getCollisionOpts());
  }
  if (platformerState?.oneWays?.length) {
    const r = jy > 0.75 ? 0.3 : 0.45;
    if (platformerBlocksMove(platformerState.oneWays, pos.x, pos.z, vx, vz, r, jy)) {
      const nx = pos.x - vx * dt;
      const nz = pos.z - vz * dt;
      if (!platformerBlocksMove(platformerState.oneWays, nx, pos.z, 0, 0, r, jy)) pos.x = nx;
      if (!platformerBlocksMove(platformerState.oneWays, pos.x, nz, 0, 0, r, jy)) pos.z = nz;
    }
  }
}

function catchSurvivor(target, killer, reason = "近身抓住") {
  if (!target || target.caught || elapsed < MATCH_START_GRACE) return;
  target.caught = true;
  target.vel = { x: 0, z: 0 };
  target.velY = 0;
  if (target.mesh) target.mesh.visible = false;
  playSfx("kill", 0.12);
  spawnHitVfx(scene, target.pos.x, target.pos.z);
  spawnKillPopup(target.pos.x, target.pos.z, target.charDef?.name);
  killerTimer += KILLER_TIME_CATCH_BONUS;
  gameApi.showAbilityToast?.(killer, `抓住了 ${target.charDef.name}！+${KILLER_TIME_CATCH_BONUS}s`);
  const human = getHumanSurvivor();
  checkMatchEnd(`${killer.charDef.name} ${reason}了 ${target.charDef.name}！`);
  if (target === human && gameState === "play" && getSpectateTargets().length > 0) {
    spectateIndex = 0;
    const watch = getCameraFocus();
    if (watch?.yaw != null) camYaw = watch.yaw;
    showToast("你已陣亡 · 進入觀戰模式 · [ ] 切換視角", 2400);
    syncSpectateUi();
  }
}

function spawnDamageNumber(wx, wz, amount, opts = {}) {
  if (!camera || !renderer) return;
  const layer = document.getElementById("damageLayer");
  if (!layer) return;
  const v = new THREE.Vector3(wx, opts.y ?? 2.35, wz);
  v.project(camera);
  if (v.z > 1) return;
  const el = document.createElement("div");
  let cls = "dmg-num";
  if (opts.headshot) cls += " dmg-head";
  if (opts.onYou) cls += " dmg-you";
  if (opts.onEnemy && !opts.onYou) cls += " dmg-enemy";
  el.className = cls;
  el.textContent = opts.headshot ? `爆頭 -${amount}` : `-${Math.round(amount)}`;
  const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
  el.style.left = `${sx}px`;
  el.style.top = `${sy}px`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), opts.headshot ? 1400 : 1100);
}

function spawnKillPopup(wx, wz, victimName) {
  if (!camera || !renderer) return;
  const layer = document.getElementById("damageLayer");
  if (layer) {
    const v = new THREE.Vector3(wx, 2.8, wz);
    v.project(camera);
    if (v.z <= 1) {
      const el = document.createElement("div");
      el.className = "kill-popup";
      el.innerHTML = `<span class="kill-main">KILL</span><span class="kill-sub">${victimName || ""}</span>`;
      el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
      el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
      layer.appendChild(el);
      setTimeout(() => el.remove(), 1100);
    }
  }
  if (playAsKiller || gameMode === "versus") {
    const banner = document.getElementById("killBanner");
    if (banner) {
      banner.classList.remove("show");
      void banner.offsetWidth;
      banner.classList.add("show");
      setTimeout(() => banner.classList.remove("show"), 1100);
    }
  }
}

function tryKillerMeleeAttack(killer, target, amount = KILLER_MELEE_DAMAGE, abId = "slash") {
  if (!killer || !target || target.caught || elapsed < MATCH_START_GRACE) return false;
  const dist = Math.hypot(target.pos.x - killer.pos.x, target.pos.z - killer.pos.z);
  if (dist > KILLER_MELEE_RANGE + 2) return false;
  return startKillerAttack(killer, target, scene, combatCallbacks, { damage: amount, abId });
}

function tryKillerBasicAttack(killer) {
  if (!killer || elapsed < MATCH_START_GRACE || killer.attackState) return false;
  const target = getKillerAimTarget(killer, getAliveSurvivors(), camYaw, 10);
  if (!target) return false;
  return startKillerAttack(killer, target, scene, combatCallbacks, { damage: KILLER_MELEE_DAMAGE, abId: "slash" });
}

function restartMoleRound(winTeam) {
  if (!shooterState || !ctx || !maze) return;
  for (const p of survivors) {
    clearShooterDownedState(p);
    respawnShooterPlayer(p, ctx, maze, survivors);
    p.caught = false;
    p._awaitingRespawn = false;
  }
  const mole = setupMoleRound(survivors, shooterState);
  shooterState.moleCanShoot = false;
  shooterState.moleAnnounced = false;
  const human = getHumanSurvivor();
  if (human?.isMole) {
    showToast("你是內鬼！30 秒警報前勿開槍，之後可暗殺隊友換高分。", 4000, "kill");
  } else {
    showToast("新一局無間道！找出並擊殺內鬼。", 2800);
  }
  if (mole && !mole.isAI) {
    /* human mole got private hint above */
  }
}

function eliminateShooterForTeamkill(p, reason) {
  if (!p || !isShooterMode() || !shooterState) return;
  p.hp = 0;
  p.caught = false;
  p._shooterDowned = true;
  p._shooterDownedAt = elapsed;
  p._shooterDownedYaw = p.yaw ?? p.mesh?.rotation?.y ?? 0;
  p._shooterBodyHideAt = elapsed + 5.5;
  p._awaitingRespawn = false;
  p.vel = { x: 0, z: 0 };
  p.velY = 0;
  if (p.mesh) {
    p.mesh.visible = true;
    p.mesh.rotation.x = 0;
  }
  if (!p.isAI) syncShooterRespawnUi();
  showToast(reason || `${p.charDef?.name || "玩家"} 誤傷隊友，立刻淘汰！`, 1400, "kill");
}

function damageSurvivor(target, killer, amount, opts = {}) {
  if (!target || elapsed < MATCH_START_GRACE) return;
  if (isShooterMode() ? isShooterPlayerDown(target) : target.caught) return;
  if ((target.invuln ?? 0) > 0.05) return;
  const headshot = !!opts.headshot;
  const envKiller = killer || { charDef: { name: "環境" }, pos: target.pos };
  if (isShooterMode() && killer && target && isMoleTeamkillViolation(killer, target, shooterState)) {
    eliminateShooterForTeamkill(killer, `${killer.charDef?.name || "玩家"} 射擊隊友！立刻淘汰`);
    return;
  }
  if (isShooterMode() && killer && target?.isMole && !killer.isMole) {
    const ps = shooterState?.playStyle ?? shooterPlayStyle;
    revealMoleOnHit(target, getHumanSurvivor(), ps, shooterState);
    if (target._moleRevealed) showToast("內鬼身分曝光！頭頂出現標記", 1200, "kill");
  }
  if (isShooterMode()) {
    playShooterSfx(headshot ? "headshot" : "hitBody", playSfx, 0.05);
    target._hitFlash = headshot ? 0.48 : 0.4;
    target._hitFlashColor = headshot ? 0xff2244 : 0xffffff;
    target._hitFlashHead = !!headshot;
    spawnHitVfx(scene, target.pos.x, target.pos.z);
    if (killer && !killer.isAI) {
      showHitMarker();
      if (headshot) showToast("爆頭！", 700, "default");
    }
  } else {
    playSfx("hit", 0.06);
  }
  if (!target.isAI) {
    playSfx("hurt", 0.12);
    if (!isShooterMode()) target._hitFlash = 0.35;
    if (killer?.pos) {
      const dx = target.pos.x - killer.pos.x;
      const dz = target.pos.z - killer.pos.z;
      const len = Math.hypot(dx, dz) || 1;
      target.pos.x += (dx / len) * 1.2;
      target.pos.z += (dz / len) * 1.2;
      target.invuln = Math.max(target.invuln ?? 0, 0.15);
    }
  }
  if (hasShield(target) && consumeShield(target)) {
    if (!target.isAI) showToast("護盾擋住了攻擊！");
    return;
  }
  target.hp = Math.max(0, (target.hp ?? 100) - amount);
  if (isShooterMode()) {
    const human = getHumanSurvivor();
    const myHit = killer && human && killer === human;
    if (myHit) {
      spawnDamageNumber(target.pos.x, target.pos.z, amount, {
        headshot,
        onYou: false,
        onEnemy: true,
        y: getTargetHeadY(target),
      });
    }
  } else {
    spawnDamageNumber(target.pos.x, target.pos.z, amount);
  }
  if (target.hp <= 0) {
    if (isShooterMode() && shooterState) {
      onShooterDowned(killer, target, shooterState, elapsed, (x, z) => {
        spawnShooterHealOrb(scene, x, z, worldHeight(target));
        if (killer && !killer.isAI) showToast("擊倒！地上出現綠色補血包", 1100);
      });
      const human = getHumanSurvivor();
      syncShooterRespawnUi();
      const victimToast = !target.isAI
        ? `${killer?.charDef?.name || "敵人"} 擊倒了你 · 按「重生」復活`
        : null;
      const killAnnounce = getShooterKillAnnounce(killer, target, human);
      if (victimToast) showToast(victimToast, 1200, "kill");
      else if (killAnnounce) {
        showToast(killAnnounce, killer === human ? 1100 : 820, "kill");
      }
      if (isShooterMoleMode(shooterState)) {
        scoreMoleKill(killer, target, shooterState);
        const round = checkMoleRoundEnd(survivors, shooterState);
        if (round) {
          showToast(`${round.reason} · ${SHOOTER_TEAMS[round.winTeam]?.name || "隊伍"} +3 分`, 3200, "kill");
          restartMoleRound(round.winTeam);
        }
      }
      return;
    }
    if (isKeyHuntMode()) {
      target.caught = true;
      const human = survivors.find((s) => !s.isAI);
      if (!target.isAI || !human) {
        endGame(false, target.isAI ? "隊友體力歸零…" : "體力歸零，任務失敗！");
      }
      return;
    }
    catchSurvivor(target, envKiller, "擊倒");
  }
}

let toastQueue = "";
let toastTimer = null;

function hexColor(n) {
  return "#" + (n ?? 0xff4466).toString(16).padStart(6, "0").slice(-6);
}

function updateMenuPreview() {
  const step = document.querySelector(".menu-step.active")?.dataset.step;

  const names = {
    solo: "單人追擊", coop: "雙人合作", versus: "雙人對戰", keyhunt: "鑰匙逃脫",
    platformer: "平台冒險", puzzle: "解題闖關", shooter: "槍戰模式", practice: "練習", mob: "團隊逃亡", hardcore: "硬核",
  };
  let src = "";
  let caption = "";
  const lv = selectedLevel || LEVELS[0];
  const theme = getLevelTheme(lv);
  const bg = `linear-gradient(145deg, ${hexColor(theme.floorA)} 0%, ${hexColor(theme.floorB)} 40%, ${hexColor(theme.accent)}55 100%)`;
  if (step === "0") {
    src = MODE_PREVIEW[gameMode] || selectedChar?.portrait || SURVIVORS[0].portrait;
    caption = `${names[gameMode] || gameMode} · ${selectedChar?.name || "倖存者"}`;
  } else if (step === "1") {
    src = selectedChar?.portrait || SURVIVORS[0].portrait;
    caption = `${lv.name || "—"} · ${lv.desc || ""}`;
  }
  const showDesktop = !isTouchUiEnabled() && (step === "0" || step === "1");
  const fillInline = (wrapId, imgId, capId, on) => {
    const wrap = document.getElementById(wrapId);
    const img = document.getElementById(imgId);
    const cap = document.getElementById(capId);
    if (wrap) wrap.hidden = !on;
    if (on && wrap && img) {
      img.src = src;
      img.alt = caption;
      wrap.style.background = bg;
    }
    if (cap) cap.textContent = caption;
  };
  fillInline("menuInlinePreview", "menuInlinePreviewImg", "menuInlinePreviewCap", showDesktop && step === "0");
  fillInline("menuInlinePreviewL", "menuInlinePreviewImgL", "menuInlinePreviewCapL", showDesktop && step === "1");
}

function refreshGameplayHints() {
  const hint = document.getElementById("controls-hint");
  const cph = document.getElementById("clickPromptHint");
  const gp = isGamepadConnected();
  gamepadActive = gp;
  const gpl = getGamepadActionLabels(isKeyHuntMode());

  if (hint && gameState === "play") {
    if (isTouchUiEnabled()) return;
    if (gp) {
      if (isKeyHuntMode()) {
        hint.textContent =
          `手把：${gpl.move}移動 · ${gpl.look}視角 · ${gpl.jump}跳 · ${gpl.openDoor}開門 · ${gpl.useItem}道具 · 身上鑰匙見左下`;
      } else if (isPlatformerMode()) {
        hint.textContent = `手把：${gpl.move}移動 · ${gpl.look}視角 · ${gpl.jump}跳 · ${gpl.ab1}/${gpl.ab2}/${gpl.ab3}招式`;
      } else if (playAsKiller) {
        hint.textContent =
          `手把：${gpl.move}移動 · ${gpl.look}視角 · ${gpl.sprint}衝刺 · ${gpl.ab1}/${gpl.ab2}/${gpl.ab3}招式 · 右搖桿瞄準+攻擊鍵`;
      } else {
        hint.textContent =
          `手把：${gpl.move}移動 · ${gpl.look}視角 · ${gpl.jump}跳 · ${gpl.slide}滑壘 · ${gpl.sprint}衝刺 · ${gpl.ab1}/${gpl.ab2}/${gpl.ab3}招式 · ${gpl.interact}任務`;
      }
    } else if (isShooterMode()) {
      hint.textContent = "槍戰：WASD · 滑鼠瞄準 · 左鍵射擊 · 1~4 換槍 · Tab 戰績 · 狙擊右鍵開鏡 · ESC 暫停";
      const esc = document.getElementById("hudEscHint");
      if (esc) esc.textContent = "Tab 戰績 · ESC 暫停";
    } else if (isKeyHuntMode()) {
      hint.textContent = "鑰匙逃脫：撿鑰匙(左下顯示) · G 開門 · R 道具 · 全員到出口";
    } else if (playAsKiller) {
      hint.textContent = "WASD · Shift · Ctrl瞄準+左鍵斬擊 · Q/E/F招式";
    } else {
      hint.textContent = "WASD · Shift衝刺 · 空白跳 · Ctrl滑壘 · Q/E/F · E任務 · ESC暫停";
    }
  }

  if (cph && gameState === "play" && !isTouchUiEnabled()) {
    if (gp) {
      cph.textContent = isKeyHuntMode()
        ? `${gpl.move}移動 · ${gpl.look}轉向 · ${gpl.openDoor}開門`
        : `${gpl.move}移動 · ${gpl.look}轉向 · ${gpl.jump}跳`;
    }
  }
}

function applyGamepadCamera(dt) {
  if (!isGamepadConnected() || gameState !== "play") return;
  const sens = 2.4 * dt;
  const inv = shooterSettings.invertY ? -1 : 1;

  if (isShooterSplitView()) {
    const locals = getLocalHumanPlayers();
    locals.forEach((p, i) => {
      const gp = pollGamepad(i);
      if (!gp?.lookX && !gp?.lookY) return;
      const { yaw, pitch } = getPlayerCamAngles(p);
      const ny = yaw - gp.lookX * sens;
      const np = Math.max(
        isShooterMode() ? SHOOTER_PITCH_MIN : CAM_PITCH_MIN,
        Math.min(isShooterMode() ? SHOOTER_PITCH_MAX : CAM_PITCH_MAX, pitch + gp.lookY * sens * inv)
      );
      if (p.profile === "p1") {
        if (!isTouchUiEnabled() || i > 0) {
          camYaw = ny;
          camPitch = np;
        }
      } else {
        p._camYaw = ny;
        p._camPitch = np;
        p.yaw = ny;
      }
    });
    return;
  }

  if (isCoopSplitView()) return;
  const gp = pollGamepad(0);
  if (!gp?.lookX && !gp?.lookY) return;
  camYaw -= gp.lookX * sens;
  applyLookPitch(gp.lookY, sens);
}

function updateQuizGamepad() {
  const quizEl = document.getElementById("mathQuiz");
  if (!quizEl?.classList.contains("show") || !activeQuiz) return;
  const gp = pollGamepad(0);
  const ptr = document.getElementById("quizGpPointer");
  const hint = document.getElementById("quizGpHint");
  const choices = [...document.querySelectorAll("#mathChoices button")];
  if (!gp || !choices.length) {
    if (hint) hint.style.display = isGamepadConnected() ? "block" : "none";
    return;
  }
  if (hint) {
    hint.style.display = "block";
    hint.textContent = `右搖桿移動游標 · ${gamepadBtnLabel(GP_BTN.A)} 確認答案`;
  }

  const box = document.querySelector("#mathQuiz .quiz-box");
  if (!box) return;
  const rect = box.getBoundingClientRect();
  const speed = 0.85 * (1 / 60);
  quizGp.x = Math.max(0.06, Math.min(0.94, quizGp.x + gp.lookX * speed));
  quizGp.y = Math.max(0.12, Math.min(0.88, quizGp.y + gp.lookY * speed));

  if (ptr) {
    ptr.style.display = "block";
    ptr.style.left = `${rect.left + quizGp.x * rect.width}px`;
    ptr.style.top = `${rect.top + quizGp.y * rect.height}px`;
  }

  let best = 0;
  let bestD = Infinity;
  choices.forEach((btn, i) => {
    btn.classList.remove("gp-hover");
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const px = rect.left + quizGp.x * rect.width;
    const py = rect.top + quizGp.y * rect.height;
    const d = Math.hypot(cx - px, cy - py);
    if (d < bestD) { bestD = d; best = i; }
  });
  quizGp.choice = best;
  choices[best]?.classList.add("gp-hover");

  const prev = quizGp.prev;
  if (gp.confirm && !prev.confirm) choices[best]?.click();
  if (gp.dpadUp && !prev.dpadUp) quizGp.choice = (best - 1 + choices.length) % choices.length;
  if (gp.dpadDown && !prev.dpadDown) quizGp.choice = (best + 1) % choices.length;
  if ((gp.dpadUp && !prev.dpadUp) || (gp.dpadDown && !prev.dpadDown)) {
    choices.forEach((b) => b.classList.remove("gp-hover"));
    choices[quizGp.choice]?.classList.add("gp-hover");
  }

  quizGp.prev = {
    confirm: !!gp.confirm,
    dpadUp: !!gp.dpadUp,
    dpadDown: !!gp.dpadDown,
  };
}

function showToast(text, ms = 320, kind = "default") {
  const el = document.getElementById("abilityToast");
  if (!el || !text) return;
  if (toastTimer && ms < 500) {
    toastQueue = text;
    return;
  }
  toastQueue = text;
  const toastKind = kind;
  if (toastTimer) return;
  const show = () => {
    el.textContent = toastQueue;
    toastQueue = "";
    el.dataset.toastKind = toastKind;
    el.classList.add("show");
    toastTimer = setTimeout(() => {
      el.classList.remove("show");
      el.dataset.toastKind = "default";
      toastTimer = null;
      if (toastQueue) show();
    }, ms);
  };
  show();
}

const STUCK_UNSTICK_SEC = 3;

function isWalkableAt(x, z, doors = null) {
  if (collides(ctx, maze, x, z, 0.36, 0)) return false;
  if (doors?.length && collidesClosedDoor(doors, x, z, 0.36, ctx.cell)) return false;
  return true;
}

function findUnstuckSpot(pos) {
  const doors = keyHuntState?.doors || null;
  const { gx, gz } = worldToCell(ctx, pos.x, pos.z);
  const queue = [{ gx, gz, d: 0 }];
  const seen = new Set([`${gx},${gz}`]);
  while (queue.length) {
    const { gx: cx, gz: cz, d } = queue.shift();
    if (d > 14) break;
    const c = cellCenter(ctx, cx, cz);
    if (isWalkableAt(c.x, c.z, doors)) return { x: c.x, z: c.z };
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= ctx.w || nz >= ctx.h) continue;
      const key = `${nx},${nz}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ gx: nx, gz: nz, d: d + 1 });
    }
  }
  return null;
}

function tickEntityUnstuck(p, dt) {
  if (!p || gameState !== "play") return;
  if (isShooterMode() ? isShooterPlayerDown(p) : p.caught) return;
  const spd = Math.hypot(p.vel?.x ?? 0, p.vel?.z ?? 0);
  const moved = p._unstuckPrev
    ? Math.hypot(p.pos.x - p._unstuckPrev.x, p.pos.z - p._unstuckPrev.z)
    : 1;
  p._unstuckPrev = { x: p.pos.x, z: p.pos.z };
  if (spd > 0.8 && moved < 0.03) p._stuckSec = (p._stuckSec || 0) + dt;
  else p._stuckSec = Math.max(0, (p._stuckSec || 0) - dt * 1.5);
  if ((p._stuckSec || 0) < STUCK_UNSTICK_SEC) return;
  const spot = findUnstuckSpot(p.pos);
  if (spot) {
    p.pos.x = spot.x;
    p.pos.z = spot.z;
    p.vel = { x: 0, z: 0 };
    p.velY = 0;
    p._jumpY = 0;
    p.onGround = true;
    if (p.mesh) p.mesh.position.set(spot.x, 0, spot.z);
    if (!p.isAI) showToast("卡住已自動脫困", 500, "default");
  }
  p._stuckSec = 0;
}

function isAtExit(s) {
  if (!s || !exitPos) return false;
  const dist = Math.hypot(s.pos.x - exitPos.x, s.pos.z - exitPos.z);
  if (dist < EXIT_RADIUS) return true;
  const cell = worldToCell(ctx, s.pos.x, s.pos.z);
  return cell.gx === ctx.w - 1 && cell.gz === ctx.h - 1;
}

function checkExitWin() {
  if (!usesExitWin()) return;
  const alive = getAliveSurvivors();
  if (!alive.length) return;

  if (playAsKiller) {
    for (const s of alive) {
      if (isAtExit(s)) {
        playSfx("warn");
        endGame(false, "有倖存者逃脫了！你輸了。");
        return;
      }
    }
    return;
  }

  if (isKeyHuntMode() && keyHuntState && !allDoorsOpen(keyHuntState.doors)) return;
  if (isPuzzleDoorMode() && puzzleDoorState && !allPuzzleDoorsOpen(puzzleDoorState.doors)) return;

  const need = getWinSurvivors();
  if (need.length && need.every(isAtExit)) {
    playSfx("exit");
    spawnHitVfx(scene, exitPos.x, exitPos.z);
    const msg = isKeyHuntMode()
      ? `${selectedLevel.name} 通關！開啟所有門且全員抵達出口！`
      : isPuzzleDoorMode()
        ? `${selectedLevel.name} 闖關成功！解開所有謎題門並抵達出口！`
        : need.length > 1
        ? `通關！全部 ${need.length} 名倖存者都到達出口！`
        : `${selectedLevel.name} 通關！你到達綠色出口了！`;
    endGame(true, msg);
  }
}

function checkMatchEnd(msgIfLose) {
  if (isShooterMode() && shooterState) {
    if (killerTimer <= 0) {
      const human = survivors.find((s) => !s.isAI);
      const res = isShooterMoleMode(shooterState)
        ? buildMoleEndResults(survivors, human, shooterState)
        : buildShooterEndResults(survivors, human, shooterState?.playStyle ?? shooterPlayStyle);
      endGame(res.won, res.msg, { shooter: true, ...res });
      return;
    }
    return;
  }
  const alive = getAliveSurvivors();
  if (alive.length === 0) {
    if (playAsKiller) {
      endGame(true, msgIfLose || "所有倖存者都被擊倒！殺手勝利！");
    } else {
      endGame(false, msgIfLose || "所有倖存者都被抓住了…");
    }
    return;
  }
  if (killerTimer <= 0) {
    if (usesExitWin()) {
      const need = getWinSurvivors();
      if (need.every(isAtExit)) {
        playSfx("exit");
        endGame(true, "時間到前全員抵達出口！");
      } else if (playAsKiller) {
        endGame(true, `時間到！仍有 ${alive.length} 名倖存者未到出口。`);
      } else {
        endGame(false, `時間到！尚有倖存者未到達出口（需全員抵達）。`);
      }
    } else {
      playSfx("exit");
      if (playAsKiller) {
        endGame(true, `時間到！仍有 ${alive.length} 名倖存者存活，你輸了。`);
      } else {
        endGame(true, `撐滿 ${matchTimeSeconds} 秒！${alive.length} 名倖存者存活，倖存勝利！`);
      }
    }
  }
}

let missionsDone = 0;

function getQuizPrefs() {
  const subject = document.getElementById("quizSubject")?.value || "math";
  const difficulty = document.getElementById("quizDifficulty")?.value || "elem";
  return { subject, difficulty };
}

function renderQuizQuestion(station) {
  const { subject, difficulty } = getQuizPrefs();
  const q = generateMissionQuestion(subject, difficulty);
  station._answer = q.answer;
  const subjZh = subject === "english" ? "英文" : "數學";
  const diffZh = difficulty === "middle" ? "國中" : "國小高年級";
  document.getElementById("mathQuestion").textContent = station._isPuzzleDoor
    ? `[謎門 #${station.label}] ${q.text}`
    : `[${subjZh}·${diffZh}] ${q.text}`;
  const box = document.getElementById("mathChoices");
  box.innerHTML = "";
  q.choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.textContent = String(c);
    btn.onclick = () => {
      const ok = String(c) === String(station._answer);
      if (ok) {
        if (station._isPuzzleDoor) {
          solvePuzzleDoor(station, maze, ctx);
          if (station.mesh) station.mesh.visible = false;
          playSfx("mission");
          showToast(`解鎖 #${station.label} 號謎門！`, 900);
        } else {
          station.done = true;
          if (station.mesh) station.mesh.visible = false;
          killerTimer = Math.max(0, killerTimer - KILLER_TIME_MISSION_CUT);
          missionsDone++;
          playSfx("mission");
          showToast(`答對了！獵人時間 -${KILLER_TIME_MISSION_CUT} 秒`, 900);
        }
      } else {
        playSfx("mission_fail");
        showToast("答錯了，再試一題！", 800);
      }
      closeMathQuiz();
      checkMatchEnd();
    };
    box.appendChild(btn);
  });
}

function openMathQuiz(station) {
  if ((station.done && !station._isPuzzleDoor) || (station._isPuzzleDoor && station.open) || activeQuiz || gameState !== "play") return;
  if (station._isPuzzleDoor && !isPuzzleDoorUnlocked(station, puzzleDoorState?.doors)) return;
  activeQuiz = station;
  playSfx("quiz_open");
  document.exitPointerLock?.();
  pointerLocked = false;
  clickPrompt.classList.remove("show");
  quizGp = { x: 0.5, y: 0.72, choice: 0, prev: {} };
  const title = document.querySelector("#mathQuiz h3");
  if (title) title.textContent = station._isPuzzleDoor ? `🔐 謎題門 #${station.label}` : "⚡ 發電任務";
  renderQuizQuestion(station);
  document.getElementById("mathQuiz").classList.add("show");
}

function closeMathQuiz() {
  document.getElementById("mathQuiz").classList.remove("show");
  const qptr = document.getElementById("quizGpPointer");
  if (qptr) qptr.style.display = "none";
  activeQuiz = null;
  nearMissionStation = null;
  nearPuzzleDoor = null;
  if (isTouchUiEnabled()) setTouchMissionHighlight(false);
}

function syncShooterRespawnUi() {
  const human = getHumanSurvivor();
  const waiting = !!(human && human._awaitingRespawn);
  document.body.classList.toggle("shooter-awaiting-respawn", waiting);
  const touchBtn = document.getElementById("btnTouchRespawn");
  const deskBtn = document.getElementById("btnRespawn");
  if (touchBtn) touchBtn.hidden = !waiting || !isTouchUiEnabled();
  if (deskBtn) deskBtn.hidden = !waiting || isTouchUiEnabled();
  if (waiting) {
    const targets = getSpectateTargets();
    if (targets.length) {
      spectateIndex = Math.min(spectateIndex, targets.length - 1);
      if (spectateIndex < 0) spectateIndex = 0;
      const focus = targets[spectateIndex];
      if (focus?.yaw != null) camYaw = focus.yaw;
    }
    syncSpectateUi();
  }
}

function tryShooterRespawnInput() {
  const human = getHumanSurvivor();
  if (!human?._awaitingRespawn || !ctx || !maze) return false;
  if (tryManualShooterRespawn(human, ctx, maze, survivors)) {
    syncShooterRespawnUi();
    showToast("已重生！", 700);
    playSfx("teleport", 0.1);
    return true;
  }
  return false;
}

function bindShooterRespawnUi() {
  const touchBtn = document.getElementById("btnTouchRespawn");
  const deskBtn = document.getElementById("btnRespawn");
  const fire = (ev) => {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    tryShooterRespawnInput();
  };
  if (touchBtn) {
    touchBtn.onclick = null;
    touchBtn.addEventListener("touchend", fire, { passive: false });
    touchBtn.addEventListener("click", fire);
  }
  if (deskBtn) deskBtn.onclick = fire;
}

function showShooterScoreboard(open) {
  if (!isShooterMode()) return;
  shooterScoreboardOpen = !!open;
  setShooterScoreboardVisible(open);
  if (open) {
    renderShooterScoreboard(survivors, getHumanSurvivor(), shooterState?.playStyle ?? shooterPlayStyle);
  }
  if (open && document.pointerLockElement) document.exitPointerLock?.();
  else if (!open && gameState === "play" && !isTouchUiEnabled()) {
    renderer?.domElement?.requestPointerLock?.();
  }
}

function togglePause() {
  if (shooterScoreboardOpen) {
    showShooterScoreboard(false);
    return;
  }
  if (document.getElementById("mathQuiz")?.classList.contains("show")) {
    closeMathQuiz();
    return;
  }
  if (gameState !== "play" && gameState !== "paused") return;
  const pausePanel = document.getElementById("pausePanel");
  if (gameState === "paused" && pausePanel.classList.contains("show")) {
    gameState = "play";
    pausePanel.classList.remove("show");
    clickPrompt.classList.add("show");
  } else if (gameState === "play") {
    gameState = "paused";
    pausePanel.classList.add("show");
    document.exitPointerLock?.();
  }
}

function hasDoubleJumpPassive(p) {
  return !!(p.passives?.doublejump || p.jumpsMax >= 2);
}

function canUseAirJump(p) {
  return hasDoubleJumpPassive(p) && p._airJumpReady && elapsed >= (p._djRechargeUntil ?? 0);
}

function tryShooterFire(p) {
  if (!p || !isShooterMode() || !canShooterFire(p, elapsed, shooterState)) return;
  const { yaw, pitch } = getPlayerCamAngles(p);
  if (camera && p.profile === "p1" && !isShooterSplitView()) {
    updateCameraForPlayer(camera, p, yaw, pitch);
  }
  const aimDir = getShooterAimDirForPlayer(p);
  p._lastFireDir = aimDir.clone();
  const aimYaw = Math.atan2(aimDir.x, aimDir.z);
  const eyeY = 1.52 + worldHeight(p);
  spawnPaintFromAim(
    scene, ctx, maze,
    p.pos.x + aimDir.x * 0.85,
    eyeY + aimDir.y * 0.85,
    p.pos.z + aimDir.z * 0.85,
    aimDir.x, aimDir.y, aimDir.z,
    p.paintColor ?? p._shooterColor,
    p.mesh
  );
  for (const pr of fireShooterWeapon(p, aimYaw, aimDir)) {
    pr.color = p.paintColor ?? pr.color;
    projectiles.push(pr);
  }
  playShooterSfx("fire", playSfx, 0.03);
  muzzleFlash(p);
  if (!p.isAI && camera) syncFpGunVisual(camera, p.weaponId, 1);
  p._shootCd = elapsed + (p._shooterFireCd ?? 0.28);
}

function tryShooterWeaponSwitch(slot) {
  const p = getHumanFocus();
  if (!p || !isShooterMode()) return;
  const w = SHOOTER_WEAPONS.find((x) => x.slot === slot);
  if (!w || p.weaponId === w.id) return;
  if (w.id !== "sniper") shooterAds = false;
  document.body.classList.toggle("shooter-ads", shooterAds);
  applyShooterLoadout(p, w.id);
  syncGunVisual(p);
  if (!p.isAI && camera) syncFpGunVisual(camera, w.id);
  if (!p.isAI && isTouchUiEnabled()) updateTouchGunHighlight(w.slot);
  playSfx("ui");
  showToast(`裝備：${w.name}`, 450);
}

function tryJump(p, profile, gp = null) {
  if (!p || p.role === "killer" || p.sliding) return;
  if (isShooterMode() ? isShooterPlayerDown(p) : p.caught) return;
  const jumpDown = keyDown(keys, profile, "jump") || !!gp?.jump;
  if (!jumpDown) return;
  if (p._jumpHeld) return;
  p._jumpHeld = true;
  if (p.onGround) {
    p.velY = isShooterMode() ? 19 : verticalWorldState ? 24 : 16;
    p.onGround = false;
    p.jumpsUsed = 1;
    p._airJumpReady = hasDoubleJumpPassive(p) && elapsed >= (p._djRechargeUntil ?? 0);
    playJumpSfx();
  } else if (canUseAirJump(p) && (p.jumpsUsed ?? 0) < 2) {
    p.velY = verticalWorldState ? 19 : 17;
    p.jumpsUsed = 2;
    p._airJumpReady = false;
    p._djRechargeUntil = elapsed + DOUBLE_JUMP_RECHARGE;
    const useCam = profile === "p1" || gameMode === "coop";
    const yaw = useCam ? camYaw : (p.yaw ?? camYaw);
    const hop = 12;
    p.vel.x = Math.sin(yaw) * hop;
    p.vel.z = Math.cos(yaw) * hop;
    p.pos.x += Math.sin(yaw) * 0.65;
    p.pos.z += Math.cos(yaw) * 0.65;
    playJumpSfx();
    if (!p.isAI) showToast(`二段跳已使用 · ${DOUBLE_JUMP_RECHARGE} 秒後恢復`, 550, "default");
  }
}

function getSlideDirection(move, profile) {
  let dx = move.x;
  let dz = move.z;
  if (!dx && !dz) {
    const useCam = profile === "p1" || gameMode === "coop";
    const yaw = useCam ? camYaw : (getHumanFocus()?.yaw ?? camYaw);
    dx = Math.sin(yaw);
    dz = Math.cos(yaw);
  }
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len };
}

function applySlideInput(p, profile, move, dt, gp = null) {
  if (p.role === "killer" || playAsKiller) return move;
  if (isShooterMode() ? isShooterPlayerDown(p) : p.caught) return move;
  if (p.slideTimer == null) p.slideTimer = 0;
  if (p.slideCd == null) p.slideCd = 0;

  const shSlide = isShooterMode();
  const SLIDE_DUR = shSlide ? 0.88 : 0.52;
  const SLIDE_SPEED = (shSlide ? 28 : 19) * getMapMoveScale();

  if (p.slideTimer > 0) {
    p.slideTimer = Math.max(0, p.slideTimer - dt);
    p.sliding = true;
    p.invuln = Math.max(p.invuln ?? 0, 0.14);
    const sx = p.slideDir?.x ?? 0;
    const sz = p.slideDir?.z ?? 0;
    const len = Math.hypot(sx, sz) || 1;
    const t = p.slideTimer / SLIDE_DUR;
    return {
      x: sx / len,
      z: sz / len,
      sprint: false,
      dodge: true,
      slideSpeed: SLIDE_SPEED * Math.max(0.35, t),
    };
  }
  p.sliding = false;

  const wantSlide = keyDown(keys, profile, "slide") || !!gp?.slide;
  const onCd = p.slideCd > 0 && elapsed < p.slideCd;
  if (
    p.onGround && wantSlide && !onCd &&
    !p._slideKeyHeld && p.slideTimer <= 0
  ) {
    p._slideKeyHeld = true;
    p.slideDir = getSlideDirection(move, profile);
    p.slideTimer = SLIDE_DUR;
    p.slideCd = elapsed + 1.15;
    p.sliding = true;
    p.invuln = 0.28;
    p._jumpY = 0.06;
    playSfx("slide", 0.28);
    return {
      x: p.slideDir.x,
      z: p.slideDir.z,
      sprint: false,
      dodge: true,
      slideSpeed: SLIDE_SPEED,
    };
  }
  if (!wantSlide) p._slideKeyHeld = false;
  return move;
}

// ─── Game start ─────────────────────────────────────────────────────────────
const gameApi = {
  maze: null,
  exitPos: null,
  survivors: [],
  projectiles: [],
  minions: [],
  getNearestSurvivor(pos) {
    let best = null, bd = Infinity;
    for (const s of survivors) {
      const d = Math.hypot(s.pos.x - pos.x, s.pos.z - pos.z);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  },
  spawnClone(p) {
    if (p.cloneMesh) scene.remove(p.cloneMesh);
    p.cloneMesh = buildForsakenCharacter(p.charDef);
    const ox = p.pos.x + Math.sin((p.yaw ?? 0) + 0.6) * 3.2;
    const oz = p.pos.z + Math.cos((p.yaw ?? 0) + 0.6) * 3.2;
    p._clonePos = { x: ox, z: oz };
    p._cloneVel = { x: 0, z: 0 };
    p._cloneYaw = p.yaw ?? 0;
    p._cloneAiT = 0;
    p._cloneWanderYaw = (p.yaw ?? 0) + Math.PI * 0.5;
    p.cloneMesh.position.set(ox, worldHeight({ pos: p._clonePos, elev: 0, _jumpY: 0 }), oz);
    scene.add(p.cloneMesh);
    p._cloneUntil = elapsed + 8;
    if (!p.isAI) showToast("分身出動！會跑開引開獵人", 900);
  },
  healNearby(p, range) {
    for (const s of survivors) {
      if (Math.hypot(s.pos.x - p.pos.x, s.pos.z - p.pos.z) < range)
        s.stamina = Math.min(100, s.stamina + 30);
    }
  },
  showAbilityToast(p, name) {
    if (!p || p.isAI) return;
    if (p.role === "killer" && !playAsKiller) return;
    const who = p.charDef?.name || "";
    showToast(who ? `${who}：${name}` : String(name), 260);
  },
  allowAiVfx() {
    if (perfTier === "low") return Math.random() < 0.1;
    if (perfTier === "med") return Math.random() < 0.22;
    return Math.random() < 0.32;
  },
  playVfx(p, abId, opts = {}) {
    if (!scene || !p) return;
    if (p.isAI && !this.allowAiVfx()) return;
    playAbilityVfx(scene, p, abId, { lite: true, ...opts });
  },
  hitSurvivor(target, killer, dmg) {
    damageSurvivor(target, killer, dmg || PROJECTILE_DAMAGE);
  },
  tryKillerMelee(killer, target, dmg = KILLER_MELEE_DAMAGE) {
    return tryKillerMeleeAttack(killer, target, dmg);
  },
  startKillerAttack(killer, target, opts = {}) {
    return startKillerAttack(killer, target, scene, combatCallbacks, opts);
  },
  aoeAttack(pos, radius, killer) {
    playSfx("aoe");
    playAbilityVfx(scene, { pos: { x: pos.x, z: pos.z }, yaw: 0 }, "nova");
    for (const s of getAliveSurvivors()) {
      if (Math.hypot(s.pos.x - pos.x, s.pos.z - pos.z) < radius) {
        damageSurvivor(s, killer, 40);
      }
    }
  },
  placeTrap(x, z) {
    traps.push({ x, z, life: 8 });
  },
  fireSurvivorShot(p, yaw) {
    playSfx("projectile");
    projectiles.push({
      x: p.pos.x, z: p.pos.z,
      vx: Math.sin(yaw) * 14,
      vz: Math.cos(yaw) * 14,
      life: 1.8,
      color: 0x44aaff,
      damage: 0,
      fromSurvivor: true,
    });
  },
  fireKillerShot(killer, target, color = 0xff2244, speed = 1.1) {
    playSfx("projectile");
    projectiles.push({
      x: killer.pos.x, z: killer.pos.z,
      vx: (target.pos.x - killer.pos.x) * speed,
      vz: (target.pos.z - killer.pos.z) * speed,
      life: 3,
      color,
      damage: PROJECTILE_DAMAGE,
      fromSurvivor: false,
      killerRef: killer,
    });
  },
  survivorMelee(p, range) {
    for (const k of killers) {
      if (Math.hypot(k.pos.x - p.pos.x, k.pos.z - p.pos.z) < range) {
        k.pos.x += (k.pos.x - p.pos.x) * 0.3;
        k.pos.z += (k.pos.z - p.pos.z) * 0.3;
      }
    }
  },
};

function readMatchConfig() {
  const sEl = document.getElementById("numSurvivors");
  const kEl = document.getElementById("numKillers");
  const tEl = document.getElementById("matchTime");
  const psEl = document.getElementById("shooterPlayStyle");
  const maxSurv = isShooterMode() ? 12 : 4;
  const psv = psEl?.value;
  shooterPlayStyle = psv === "ffa" ? "ffa" : psv === "mole" ? "mole" : "teams";
  const lpEl = document.getElementById("numLocalPlayers");
  numLocalPlayers = isShooterMode() && lpEl
    ? Math.min(4, Math.max(1, parseInt(lpEl.value, 10) || 1))
    : 1;
  numSurvivors = sEl
    ? Math.max(1, Math.min(maxSurv, parseInt(sEl.value, 10) || (isShooterMode() ? 6 : 1)))
    : selectedLevel.survivorSlots || 1;
  if (isShooterMode()) numSurvivors = Math.max(numSurvivors, numLocalPlayers);
  numKillers = isShooterMode()
    ? 0
    : kEl ? Math.max(1, Math.min(3, parseInt(kEl.value, 10) || 1)) : selectedLevel.killerCount || 1;
  matchTimeSeconds = tEl ? parseInt(tEl.value, 10) : DEFAULT_MATCH_SECONDS;
  killerTimer = matchTimeSeconds;
  if (gameMode === "coop") numSurvivors = Math.max(numSurvivors, 2);
  if (gameMode === "mob") {
    numSurvivors = Math.max(numSurvivors, 4);
    numKillers = Math.max(numKillers, 2);
  }
  if (gameMode === "practice") numKillers = 1;
}

function showLoading(msg) {
  let el = document.getElementById("gameLoading");
  if (!el) {
    el = document.createElement("div");
    el.id = "gameLoading";
    el.style.cssText =
      "position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(10,6,20,0.85);color:#eeddff;font-size:1.2rem;font-weight:bold";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = "flex";
  return el;
}

function hideLoading() {
  const el = document.getElementById("gameLoading");
  if (el) el.style.display = "none";
}

const yieldFrame = () => new Promise((r) => requestAnimationFrame(r));

let startInProgress = false;

async function startGame() {
  if (startInProgress) return;
  if (isTouchUiEnabled() && (gameMode === "coop" || gameMode === "versus")) {
    const ok = await showCoopMobileWarn();
    if (!ok) {
      playSfx("ui_back");
      return;
    }
    playSfx("ui_confirm");
  }
  startInProgress = true;
  try {
    await runStartGame();
  } finally {
    startInProgress = false;
  }
}

async function runStartGame() {
  document.getElementById("pausePanel")?.classList.remove("show");
  shooterScoreboardOpen = false;
  setShooterScoreboardVisible(false);
  ensureGraphics();
  refreshMenuForMode();
  if (checkMenuUiConsistency() && !isTouchUiEnabled()) {
    console.warn("選單狀態檢查未通過，仍嘗試開始（可重新整理頁面）");
  }
  const warn = document.getElementById("menuStateWarn");
  if (warn) warn.style.display = "none";

  if (!selectedChar) selectedChar = SURVIVORS[0];
  if (!selectedChar2) selectedChar2 = SURVIVORS[1] || SURVIVORS[0];
  if (!selectedKiller) selectedKiller = KILLERS[0];

  menu.style.display = "none";
  hud.classList.add("show");
  document.getElementById("controls-hint").style.display = "block";
  clickPrompt.classList.add("show");
  overlay.classList.remove("show", "win", "lose");
  gameState = "loading";
  showLoading("正在建立迷宮…");
  await yieldFrame();
  const loadStep = (msg) => showLoading(msg);

  elapsed = 0;
  animTime = 0;
  hasMoved = false;
  frameCount = 0;
  spectateIndex = 0;
  document.body.classList.remove("spectating");
  camDist = 11;
  projectiles = [];
  minions = [];
  traps = [];
  if (scene) {
    vfxMeshes.forEach((m) => { if (m) scene.remove(m); });
  }
  vfxMeshes = [];
  gameApi.projectiles = projectiles;
  gameApi.minions = minions;

  readMatchConfig();
  selectedLevel = enrichLevelForMode(selectedLevel, gameMode);
  winGoal = document.getElementById("winGoal")?.value || "exit";
  if (isKeyHuntMode() || isPlatformerMode()) winGoal = "exit";
  if (gameMode === "practice") matchTimeSeconds = Math.max(matchTimeSeconds, 240);
  if (gameMode === "hardcore") matchTimeSeconds = Math.min(matchTimeSeconds, 150);
  if (isKeyHuntMode()) matchTimeSeconds = Math.max(matchTimeSeconds, 300);
  if (isPlatformerMode()) matchTimeSeconds = Math.max(matchTimeSeconds, 240);
  if (isPuzzleDoorMode()) matchTimeSeconds = Math.max(matchTimeSeconds, 360);
  if (isShooterMode()) matchTimeSeconds = Math.max(matchTimeSeconds, 300);
  if (isKeyHuntMode() || isPlatformerMode() || isPuzzleDoorMode() || isShooterMode()) {
    playerRole = "survivor";
    const roleEl = document.getElementById("playerRole");
    if (roleEl) roleEl.value = "survivor";
  } else {
    playerRole = document.getElementById("playerRole")?.value || "survivor";
  }
  playAsKiller = playerRole === "killer" && (gameMode === "solo" || gameMode === "classic")
    && !isKeyHuntMode() && !isPlatformerMode() && !isPuzzleDoorMode() && !isShooterMode();
  matchHumanRole = gameMode === "versus" ? "killer" : playAsKiller ? "killer" : "survivor";
  keyHuntState = null;
  keyHuntGroup = null;

  const theme = getLevelTheme(selectedLevel);
  ctx = createMazeContext(selectedLevel, theme);
  killerTimer = matchTimeSeconds;
  missionsDone = 0;
  camYaw = Math.PI;
  camPitch = isShooterMode() ? 0 : 0.42;
  camDist = isShooterMode() ? 0 : 11;
  const mobileCam = applyMobileCameraDefaults();
  if (mobileCam != null && !isShooterMode()) camDist = mobileCam;
  if (isShooterMode()) perfTier = "high";

  if (camera) detachFpGun(camera);
  clearPaintSplats(scene);
  lastRealmAtmosphereId = null;
  ledgeHintState = null;
  clearZoneParticles(scene);
  clearScene();
  clearVfxPool();
  scene.background = new THREE.Color(theme.sky);
  scene.fog = new THREE.Fog(theme.sky, ctx.fogNear * 0.95, ctx.fogFar * 1.85);

  const mapSeed = getLevelMapSeed(selectedLevel, gameMode);
  const mapRng = createSeededRandom(mapSeed);
  const mapStyle = getMapStyle(selectedLevel, gameMode);
  maze = generateMazeSeeded(ctx.w, ctx.h, mapSeed);
  const loopCount = isClassicMode()
    ? Math.min(ctx.loops ?? 4, 4)
    : gameMode === "solo" || gameMode === "practice"
      ? Math.max(ctx.loops ?? 6, Math.floor((ctx.w * ctx.h) / 28))
      : ctx.loops;
  addMazeLoops(maze, ctx.w, ctx.h, loopCount, mapRng);
  if (!isClassicMode() && (gameMode === "solo" || gameMode === "practice")) {
    addMazeLoops(maze, ctx.w, ctx.h, Math.floor(loopCount * 0.5), mapRng);
  }
  applyMapStyle(maze, ctx.w, ctx.h, mapStyle, mapRng);
  invalidateMinimapBase();
  gameApi.maze = maze;
  keyHuntState = null;
  platformerState = null;
  puzzleDoorState = null;
  shooterState = null;
  if (isKeyHuntMode()) {
    keyHuntState = setupKeyHuntLevel(ctx, maze, selectedLevel);
  }
  if (isPlatformerMode()) {
    platformerState = setupPlatformerLevel(ctx, maze, selectedLevel);
  }
  if (isPuzzleDoorMode()) {
    puzzleDoorState = setupPuzzleDoorLevel(ctx, maze, selectedLevel);
  }
  if (isShooterMode()) {
    shooterState = createShooterState(selectedLevel, shooterPlayStyle);
  }
  await yieldFrame();
  loadStep("正在建立場景…");
  buildMazeMeshes(ctx, maze, scene, {
    doorWalls: keyHuntState?.doors || puzzleDoorState?.doors || [],
  });
  const richMap = isPuzzleDoorMode() || isShooterMode() || selectedLevel.w * selectedLevel.h >= 400;
  const decor = buildMazeDecor(ctx, maze, scene, {
    level: selectedLevel,
    theme,
    mapStyle,
    skipHeavy: isShooterMode() || isPuzzleDoorMode() || isClassicMode() || gameMode === "solo" || (!richMap && selectedLevel.w * selectedLevel.h > 320),
    soloLight: gameMode === "solo" || isClassicMode(),
  });
  mazeDecorGroup = decor.group;
  realmZonesState = null;
  if (gameMode === "solo") {
    realmZonesState = buildRealmZones(ctx, maze, scene, selectedLevel);
  }
  if (isShooterMode()) {
    loadStep("正在布置槍戰競技場…");
    const arena = buildShooterArena(ctx, maze, scene, selectedLevel);
    shooterArenaGroup = arena.group;
    bouncePads = spawnArenaBouncePads(
      ctx, maze, arena.group, Math.min(8, selectedLevel.bouncePads ?? 4)
    );
    verticalWorldState = {
      group: arena.group,
      platforms: arena.covers,
      stairs: [],
      bridges: [],
      bouncePads,
    };
  } else {
    shooterArenaGroup = null;
    verticalWorldState = buildVerticalWorld(ctx, maze, scene, {
      ...selectedLevel,
      flatPlay: isClassicMode() || selectedLevel.flatPlay,
      verticalDensity: isPuzzleDoorMode() ? 9 : isClassicMode() ? 99 : (gameMode === "solo" ? 6 : 5),
      realmTier: isClassicMode() ? 0 : (selectedLevel.realmTier ?? 0),
    });
    bouncePads = verticalWorldState.bouncePads;
    if (!isClassicMode() && verticalWorldState?.platforms?.length) {
      ledgeHintState = buildLedgeHints(ctx, verticalWorldState, scene);
    } else {
      ledgeHintState = null;
    }
  }
  await yieldFrame();
  loadStep("正在放置出口與道具…");

  exitPos = cellCenter(ctx, ctx.w - 1, ctx.h - 1);
  gameApi.exitPos = exitPos;
  exitGroup = createExitMarker(scene, exitPos);

  teleporters = createTeleporters(ctx, maze, isKeyHuntMode() || isClassicMode() ? 0 : ctx.teleporters);
  buildTeleporterMeshes(scene, teleporters);
  if (realmZonesState?.portals?.length) {
    for (const rp of realmZonesState.portals) {
      teleporters.push({ a: rp.a, b: rp.b, realm: true });
    }
    buildTeleporterMeshes(scene, realmZonesState.portals.map((rp) => ({ a: rp.a, b: rp.b })));
  }
  if (!isClassicMode() && (selectedLevel.realmTier ?? 0) >= 1 && verticalWorldState?.platforms?.length) {
    const hiPlats = verticalWorldState.platforms.filter((pl) => pl.y >= 5);
    if (hiPlats.length) {
      const hi = hiPlats[Math.floor(hiPlats.length * 0.5)];
      const mid = cellCenter(ctx, Math.floor(ctx.w / 2), Math.floor(ctx.h / 2));
      const realmPair = { a: mid, b: { x: hi.x, z: hi.z }, id: teleporters.length, realm: true };
      teleporters.push(realmPair);
      buildTeleporterMeshes(scene, [realmPair]);
      showToast("傳送門可前往高層領域（Rivals 風格）", 2200);
    }
  }
  worldItems = spawnWorldItems(ctx, maze, ctx.items);
  buildItemMeshes(scene, worldItems);
  if (isKeyHuntMode()) {
    keyHuntGroup = buildKeyHuntMeshes(scene, keyHuntState, ctx.cell);
    missionStations = [];
    missionGroup = null;
  } else if (isPlatformerMode()) {
    platformerGroup = buildPlatformerMeshes(scene, platformerState, ctx.cell);
    missionStations = spawnMissionStations(ctx, maze, ctx.missions ?? 4);
    missionGroup = buildMissionMeshes(scene, missionStations, { compact: isTouchUiEnabled() });
  } else if (isPuzzleDoorMode()) {
    puzzleDoorGroup = buildPuzzleDoorMeshes(scene, puzzleDoorState, ctx.cell, ctx);
    missionStations = [];
    missionGroup = null;
  } else if (isShooterMode()) {
    missionStations = [];
    missionGroup = null;
    puzzleDoorGroup = null;
  } else {
    missionStations = spawnMissionStations(ctx, maze, ctx.missions);
    missionGroup = buildMissionMeshes(scene, missionStations, { compact: isTouchUiEnabled() });
  }
  await yieldFrame();
  loadStep("正在生成角色…");

  if (!scene) throw new Error("場景未就緒，無法加入角色");

  const spawned = spawnMatch({
    scene,
    ctx,
    gameMode,
    playerRole,
    selectedChar,
    selectedChar2,
    selectedKiller,
    killerRoster: KILLERS,
    survivorRoster: SURVIVORS,
    numSurvivors,
    numLocalPlayers,
    numKillers,
  });
  survivors = spawned.survivors;
  killers = spawned.killers;
  playAsKiller = !!spawned.playAsKiller;
  for (const s of survivors) {
    s._safeX = s.pos.x;
    s._safeZ = s.pos.z;
    s._safeElev = s.elev ?? 0;
  }
  if (!survivors.length) throw new Error("倖存者生成失敗");
  if (!killers.length && !isKeyHuntMode() && !isPlatformerMode() && !isPuzzleDoorMode() && !isShooterMode()) {
    throw new Error("獵人生成失敗");
  }
  updatePerfTier();
  for (const s of survivors) {
    if (s.mesh) {
      applyPlasticToCharacter(s.mesh, s.charDef?.accent);
      setCharacterRim(s.mesh, s.charDef?.accent, !s.isAI && perfTier !== "low");
    }
  }
  for (const k of killers) {
    if (k.mesh) {
      applyPlasticToCharacter(k.mesh, k.charDef?.accent);
      setCharacterRim(k.mesh, k.charDef?.accent, !k.isAI && perfTier !== "low");
    }
  }
  if (isShooterMode()) {
    clearShooterHealOrbs(scene);
    loadShooterSounds().then(() => preloadShooterSounds());
    preloadGameSounds();
    if (isShooterMoleMode(shooterState)) {
      const mole = setupMoleRound(survivors, shooterState);
      const human = getHumanSurvivor();
      if (human?.isMole) {
        showToast("你是內鬼！警報前不能開槍，之後可暗殺隊友為隊伍換高分。", 4200, "kill");
      } else {
        showToast("無間道：找出並擊殺內鬼！誤傷隊友者立刻淘汰。", 3200);
      }
    }
    const playStyle = shooterState.playStyle ?? shooterPlayStyle;
    survivors.forEach((s, i) => {
      clearShooterDownedState(s);
      s.caught = false;
      initShooterStats(s);
      assignShooterPlayer(s, i, survivors.length, playStyle);
      const startGun = !s.isAI ? "rifle" : ["smg", "rifle", "shotgun", "sniper"][i % 4];
      applyShooterLoadout(s, startGun);
      attachShooterGun(s);
      if (s.mesh) s.mesh.position.set(s.pos.x, worldHeight(s), s.pos.z);
    });
    document.body.classList.add("shooter-play");
    const sbBtn = document.getElementById("btnTouchScoreboard");
    if (sbBtn) sbBtn.hidden = !isTouchUiEnabled();
    const touchAb = document.getElementById("touchRowAbilities");
    if (touchAb) touchAb.hidden = true;
    const mmLabel = document.querySelector("#minimap-wrap label");
    if (mmLabel) mmLabel.textContent = "雷達";
    invalidateMinimapBase();
    drawShooterRadar();
    const styleZh = playStyle === "ffa" ? "自由混戰" : playStyle === "mole" ? "無間道" : "團隊對抗";
    showToast(
      `${selectedLevel.name} · ${styleZh} · ${survivors.length} 人 · 時間到比積分 · 戰績可點開`,
      2800
    );
    if (!isTouchUiEnabled()) renderer.domElement.requestPointerLock?.();
    const humanShooter = survivors.find((s) => !s.isAI);
    if (camera) {
      camera.fov = shooterSettings.fov;
      camera.near = 0.08;
      camera.updateProjectionMatrix();
    }
    if (humanShooter && camera) attachFpGun(camera, humanShooter.weaponId || "rifle");
    if (humanShooter) {
      const teamLine = playStyle === "ffa"
        ? "自由混戰（每人不同色）"
        : `${SHOOTER_TEAMS[humanShooter.teamId ?? 0]?.name || "隊伍"} · 同色環＝隊友`;
      showToast(`你屬於：${teamLine} · 誤射隊友會立刻淘汰`, 3600);
    }
    const locals = getLocalHumanPlayers();
    if (locals.length >= 2) {
      for (const lp of locals) {
        if (lp.profile !== "p1") {
          lp._camYaw = lp.yaw ?? Math.PI;
          lp._camPitch = 0;
        }
      }
      const botCount = Math.max(0, survivors.length - locals.length);
      showToast(
        `${locals.length}P 分割（${locals.length === 2 ? "上下" : "四格"}）· 另 ${botCount} 電腦 · P1 鍵鼠／手把① · RT 開火`,
        4200
      );
    }
    syncShooterRespawnUi();
    bindShooterRespawnUi();
  } else {
    clearShooterTeamMarkers(survivors);
    showShooterScoreboard(false);
    resetShooterScoreboardUi();
    syncShooterRespawnUi();
    const sbBtn = document.getElementById("btnTouchScoreboard");
    if (sbBtn) sbBtn.hidden = true;
    if (camera) {
      camera.fov = 68;
      camera.near = 0.1;
      camera.updateProjectionMatrix();
    }
    document.body.classList.remove("shooter-play", "shooter-ads");
    shooterAds = false;
    const touchAb = document.getElementById("touchRowAbilities");
    if (touchAb) touchAb.hidden = false;
    if (camera) detachFpGun(camera);
  }
  gameApi.survivors = survivors;

  if (isKeyHuntMode()) {
    for (const s of survivors) {
      if (!s.isAI) {
        s.boltCharges = 1;
        addInventoryItem(s, "bolt", 1);
      }
    }
  }

  gameState = "play";
  hideLoading();
  document.getElementById("pausePanel")?.classList.remove("show");
  snapCameraToPlayer();
  updateCamera();
  updateHUD();
  drawMinimap();
  updateAbilityBar();
  updateInventoryBar();
  updateKeyHuntBar();
  syncTouchHudFromPlayer();
  setMissionText();
  initAudioEngine().then(() => {
    connectMusicElement(musicEl);
    preloadGameSounds();
  });
  musicEl?.play().catch(() => {});

  refreshGameplayHints();
  if (exitGroup) exitGroup.visible = usesExitWin();
  const khBar = document.getElementById("keyHuntBar");
  if (khBar) khBar.style.display = isKeyHuntMode() || isPuzzleDoorMode() ? "flex" : "none";
  updatePlayUiLayout();
  document.getElementById("hudEscHint")?.classList.add("show");
  if (isTouchUiEnabled()) {
    const cph = document.getElementById("clickPromptHint");
    if (cph) {
      cph.textContent = isHumanKillerControl()
        ? "左下搖桿移動 · 右半滑動視角 · 攻擊鍵普攻 · 右上暫停選單"
        : "左下搖桿移動 · 右半滑動轉向 · 右下按鈕操作 · 右上暫停選單";
    }
  }
  refreshGameplayHints();
  updateAbilityBar();
}

function tryUseFirstItem() {
  const p = getHumanFocus();
  if (!p) return;
  const list = getActiveInventoryList(p);
  if (!list.length) {
    showToast("沒有可使用的道具", 500);
    return;
  }
  const [type] = list[0];
  if (useInventoryItem(p, type)) {
    playSfx("item");
    showToast(`使用 ${ITEM_DEFS[type]?.name || type}`, 600, "item");
    updateInventoryBar();
  }
}

function updateKeyHuntDoorHints() {
  if (!keyHuntState || playAsKiller) return;
  const p = getHumanFocus();
  if (!p || p.isAI) return;
  for (const d of keyHuntState.doors) {
    if (d.open) continue;
    if (Math.hypot(p.pos.x - d.x, p.pos.z - d.z) > 3.2) continue;
    if (canOpenDoorFromPlayerSide(p, d, ctx)) continue;
    if (elapsed - (p._doorHintT ?? 0) < 5) return;
    p._doorHintT = elapsed;
    showToast(getDoorApproachHint(d), 950, "door");
    return;
  }
}

function tryOpenDoorInput() {
  if (!keyHuntState || playAsKiller) return;
  const p = getHumanFocus();
  if (!p || p.caught) return;
  const opened = tryOpenDoorAtPlayer(p, keyHuntState.doors, maze, ctx);
  if (opened?.wrongSide) {
    showToast(opened.hint || getDoorApproachHint(opened.door), 1000, "door");
    return;
  }
  if (opened) {
    playSfx("mission");
    showToast(
      opened.usedBolt ? "破門撬強行打開了門！" : `已開啟 #${opened.label} 號門！`,
      800,
      "door"
    );
    updateInventoryBar();
    minimapDirty = true;
  } else {
    const near = getOpenableDoors(p, keyHuntState.doors, 4);
    if (!near.length) {
      const hasKey = keyHuntState.doors.some((d) => !d.open && playerHasKeyFrom(p, d.keyId));
      showToast(hasKey ? "靠近門再按 G 開門" : "需要對應編號的鑰匙", 700, "door");
    }
  }
}

function playerHasKeyFrom(p, keyId) {
  return p.keysHeld?.has(keyId);
}

function updateKeyHuntBar() {
  const bar = document.getElementById("keyHuntBar");
  const held = document.getElementById("heldKeysHud");
  const btn = document.getElementById("btnOpenDoor");
  if (isPuzzleDoorMode() && puzzleDoorState && bar) {
    bar.style.display = "flex";
    const left = puzzleDoorsRemaining(puzzleDoorState.doors);
    const total = puzzleDoorState.doors.length;
    if (held) {
      held.textContent = `謎題門 ${total - left}/${total} 已解鎖 · 按順序解題 · E 答題開門 · 綠色彈跳床可捷徑`;
    }
    if (btn) btn.style.display = "none";
    return;
  }
  if (!bar || !isKeyHuntMode()) return;
  const p = getHumanFocus();
  if (held && p) {
    const ids = [...(p.keysHeld || [])].sort((a, b) => a - b);
    let line = ids.length
      ? `身上鑰匙：${ids.map((id) => `#${id + 1}`).join(" · ")}`
      : "身上尚無鑰匙";
    if (gamepadActive) {
      const gpl = getGamepadActionLabels(true);
      line += `\n${gpl.openDoor} 開門 · ${gpl.useItem} 使用道具`;
    } else {
      line += "\nG 開門 · R 使用道具";
    }
    held.textContent = line;
  }
  if (btn) {
    const can = p && getOpenableDoors(p, keyHuntState.doors, 3.5).length > 0;
    btn.disabled = !can;
    btn.classList.toggle("ready", can);
  }
  updatePlayUiLayout();
}

function updateInventoryBar() {
  const bar = document.getElementById("inventoryBar");
  if (!bar) return;
  const p = getHumanFocus();
  if (!p || playAsKiller) {
    bar.innerHTML = "";
    bar.style.display = "none";
    return;
  }
  bar.style.display = "flex";
  const passives = getPassiveList(p);
  const active = getActiveInventoryList(p);
  const b = getBindings()[p.profile === "p2" ? "p2" : "p1"] || getBindings().p1;
  const useKey = gamepadActive
    ? getGamepadActionLabels(true).useItem
    : labelFor(b.useItem || "KeyR");
  let html = "";
  passives.forEach((type) => {
    const def = ITEM_DEFS[type];
    html += `<div class="inv-slot passive" title="${def?.desc || ""}">
      <span class="inv-name">${def?.name || type}</span><span class="inv-tag">常駐</span></div>`;
  });
  active.forEach(([type, count]) => {
    const def = ITEM_DEFS[type];
    html += `<button type="button" class="inv-slot use" data-item="${type}" title="${def?.desc || ""}">
      <span class="inv-name">${def?.name || type}</span><span class="inv-count">×${count}</span>
      <span class="inv-use">${useKey} 使用</span></button>`;
  });
  if (!html) html = `<span class="inv-empty">尚未取得道具</span>`;
  bar.innerHTML = html;
  bar.querySelectorAll("button[data-item]").forEach((btn) => {
    btn.onclick = () => {
      const t = btn.dataset.item;
      if (t === "bolt" && isKeyHuntMode()) {
        tryOpenDoorInput();
        updateInventoryBar();
        return;
      }
      if (useInventoryItem(p, t)) {
        playSfx("item");
        showToast(`使用 ${ITEM_DEFS[t]?.name || t}`, 600, "item");
        updateInventoryBar();
      }
    };
  });
}

function setMissionText() {
  const list = document.getElementById("missionList");
  let modeText;
  let rules;
  if (isKeyHuntMode()) {
    const kh = keyHuntState;
    modeText = "鑰匙逃脫：起點有鑰匙與破門撬 · 按 G 開門 · 全員到出口";
    rules = `
    <li>門 ${kh ? doorsRemaining(kh.doors) : "?"} · 鑰匙 ${kh ? keysRemaining(kh.keys) : "?"} · 編號需對應 · 破門撬可開一扇</li>
    <li>限時 ${Math.round(matchTimeSeconds / 60)} 分 · 陷阱 · 尖刺 · HP 歸零失敗</li>`;
  } else if (isPuzzleDoorMode()) {
    const pd = puzzleDoorState;
    modeText = "解題闖關：依序解開謎題門 · 答對才開 · 綠色彈跳床可捷徑";
    rules = `
    <li>謎門 ${pd ? puzzleDoorsRemaining(pd.doors) : "?"} 扇待解 · 須先解開前一扇才能挑戰下一扇</li>
    <li>無獵人 · 全員抵達綠色出口通關 · 彩色地面／貨櫃／二～三樓平台與天橋可走</li>`;
  } else if (isPlatformerMode()) {
    modeText = "平台冒險：踩綠色小怪 · 躲噴火與落石 · 藍色箭頭為單向門";
    rules = `<li>空白鍵二段跳可越過矮牆 · 無獵人 · 到達出口通關</li>`;
  } else if (isShooterMode()) {
    const shStyle = shooterPlayStyle === "ffa"
      ? "自由混戰（見人就打）"
      : shooterPlayStyle === "mole"
        ? "無間道（內鬼模式）"
        : "團隊對抗（紅藍均分）";
    modeText = `槍戰：${shStyle} · 時間結束比積分（擊殺=1分）`;
    rules = `<li>擊倒敵人掉落綠十字 · 靠近補 50% HP · 戰績可看全員名單 · 1~4 換槍</li>`;
  } else if (playAsKiller) {
    modeText = `扮演 ${selectedKiller?.name}：擊倒所有倖存者`;
    rules = `<li>無終點模式：時間到仍有倖存者則你輸</li>`;
  } else if (gameMode === "mob") {
    modeText = "團隊逃亡：可使用角色 Q/E/F 招式 · 4 倖存者協力";
    rules = `<li>全員到出口或撐到時間結束 · 2 名獵人追擊</li>`;
  } else if (gameMode === "hardcore") {
    modeText = "硬核：可使用招式 · 獵人更快 · 任務更少";
    rules = `<li>限時較短 · 需更謹慎使用技能冷卻</li>`;
  } else if (usesExitWin()) {
    modeText = gameMode === "coop"
      ? "有終點：全部倖存者（含 AI）都到出口才贏"
      : "有終點：場上所有倖存者都到達出口才贏";
    rules = `<li>被抓或 HP 歸零出局 · 時間到需全員在出口才贏</li>`;
  } else {
    modeText = "無終點：撐到時間結束仍有倖存者即勝 · 獵人需擊倒所有人";
    rules = `<li>不必到出口 · 限時內存活即勝</li>`;
  }
  list.innerHTML = `
    <li class="active">關卡：${selectedLevel.name}（${selectedLevel.w}×${selectedLevel.h}）</li>
    <li>${modeText}</li>
    ${rules}
    ${isShooterMode()
      ? "<li>雷達：紅/藍點為隊伍 · 白箭頭為你的朝向 · Tab 或點「戰績」看積分</li>"
      : "<li>藍=傳送 · 黃=任務 · 綠=出口 · 紫=陷阱(鑰匙模式)</li>"}
    <li id="missionDist">${isShooterMode() ? "左搖桿移動 · 右半滑動瞄準 · 開火鍵射擊" : "尋找綠色光柱出口…"}</li>`;
}

function abilityCdFillPct(p, ab) {
  const cd = p.cooldowns[ab.id] ?? 0;
  if (cd <= 0) return 100;
  const max = ab.cd || 1;
  return Math.max(0, Math.min(100, (1 - cd / max) * 100));
}

function isHumanKillerControl() {
  const humanKiller = killers.find((k) => !k.isAI);
  if (!humanKiller) return false;
  if (isKeyHuntMode() || isPlatformerMode()) return false;
  return playAsKiller || gameMode === "versus";
}

function getTouchBindingProfile() {
  if (gameMode === "versus") return "killer";
  if (playAsKiller) return "p1";
  const p = getHumanFocus();
  return p?.profile === "p2" ? "p2" : "p1";
}

function syncTouchHudFromPlayer() {
  if (!isTouchUiEnabled()) return;
  updateTouchAttackVisibility(isHumanKillerControl());
  syncTouchButtonBindings(getBindings, getTouchBindingProfile());
  const p = playAsKiller || gameMode === "versus"
    ? killers.find((k) => !k.isAI)
    : getHumanFocus();
  if (!p?.abilities) return;
  updateTouchSkillLabels(p.abilities);
  const slots = p.abilities.map((ab) => ({
    cd: p.cooldowns?.[ab.id] ?? 0,
    fill: abilityCdFillPct(p, ab),
  }));
  updateTouchAbilityCooldowns(slots);
}

function updateAbilityBar() {
  if (!abilityBar) return;
  if (isKeyHuntMode() || isTouchUiEnabled() || isShooterMode()) {
    abilityBar.innerHTML = "";
    abilityBar.style.display = "none";
    return;
  }
  abilityBar.style.display = "flex";
  const p = playAsKiller ? killers.find((k) => !k.isAI) : getHumanFocus();
  if (!p) return;
  const profile = playAsKiller ? "p1" : p.profile === "p2" ? "p2" : "p1";
  const b = getBindings()[profile] || getBindings().p1;
  const gpLabels = gamepadActive ? getGamepadActionLabels(isKeyHuntMode()) : null;
  const meleeHint = playAsKiller
    ? `<div class="ab-slot" title="Ctrl瞄準+左鍵斬擊"><span class="ab-key">${gpLabels ? `${gpLabels.look}+攻擊` : "Ctrl+左鍵"}</span><span class="ab-name">普攻</span></div>`
    : "";
  const touch = isTouchUiEnabled();
  abilityBar.innerHTML = meleeHint + p.abilities
    .map(
      (ab, i) => {
        const key = gpLabels
          ? gpLabels[["ab1", "ab2", "ab3"][i]]
          : labelFor(b[["ab1", "ab2", "ab3"][i]]);
        const cd = p.cooldowns[ab.id];
        const fill = abilityCdFillPct(p, ab);
        const keyLabel = touch ? `技${i + 1}` : key;
        return `<div class="ab-slot ${cd > 0 ? "cd" : ""}" title="${ab.desc}">
          <span class="ab-key">${keyLabel}</span>
          <span class="ab-name">${touch ? (ab.name || ab.desc) : (ab.desc || ab.name)}</span>
          <div class="ab-cd-bar"><div class="ab-cd-fill" style="width:${fill}%"></div></div>
          ${cd > 0 ? `<span class="ab-cd">${cd.toFixed(1)}s</span>` : ""}
        </div>`;
      }
    )
    .join("");
}

function endGame(won, message, opts = {}) {
  gameState = "end";
  stopGameMusic(musicEl);
  document.exitPointerLock?.();

  if (opts.shooter) {
    document.body.classList.add("shooter-end-ui");
    overlay.classList.add("show", "shooter-end");
    overlay.classList.toggle("win", won);
    overlay.classList.toggle("lose", !won);
    clickPrompt.classList.remove("show");
    const title = opts.shortTitle || (won ? "勝利" : "落敗");
    const sub = opts.shortSub || message || "";
    document.getElementById("overlayTitle").textContent = title;
    document.getElementById("overlayText").textContent = sub;
    renderShooterScoreboard(survivors, getHumanSurvivor(), opts.playStyle ?? shooterPlayStyle);
    showShooterScoreboard(true);
    const audio = getAudioSettings();
    playShooterResultMusic(won, audio.music ?? 0.28);
    return;
  }

  stopShooterResultMusic();
  showShooterScoreboard(false);
  resetShooterScoreboardUi();
  document.body.classList.remove("shooter-end-ui");
  overlay.classList.add("show");
  overlay.classList.toggle("win", won);
  overlay.classList.toggle("lose", !won);
  clickPrompt.classList.remove("show");
  document.getElementById("overlayTitle").textContent = won ? "任務完成" : "未能通關";
  document.getElementById("overlayText").textContent = message;
}

// ─── Input ──────────────────────────────────────────────────────────────────
const BLOCK_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "ShiftLeft", "ShiftRight", "ControlLeft", "Space", "KeyQ", "KeyE", "KeyF",
  "KeyI", "KeyJ", "KeyK", "KeyL", "KeyU", "KeyO", "KeyP",
  "KeyG", "KeyR",
  "Numpad1", "Numpad2", "Numpad3",
]);

function setupInput() {
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape") {
      if (gameState === "play" || gameState === "paused") {
        e.preventDefault();
        togglePause();
      }
      return;
    }
    if (gameState === "play" && isSpectating()) {
      if (e.code === "BracketLeft" || e.code === "ArrowLeft") {
        e.preventDefault();
        cycleSpectate(-1);
        return;
      }
      if (e.code === "BracketRight" || e.code === "ArrowRight") {
        e.preventDefault();
        cycleSpectate(1);
        return;
      }
    }
    if (gameState === "play" && isShooterMode() && e.code === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      showShooterScoreboard(true);
      return;
    }
    if (gameState === "play" && BLOCK_KEYS.has(e.code)) e.preventDefault();
    keys[e.code] = true;

    if (gameState === "play" && e.code === "KeyE" && nearPuzzleDoor && !playAsKiller && !activeQuiz && isPuzzleDoorMode()) {
      e.preventDefault();
      openMathQuiz(nearPuzzleDoor);
      return;
    }
    if (gameState === "play" && e.code === "KeyE" && nearMissionStation && !playAsKiller && !activeQuiz && !isKeyHuntMode() && !isPuzzleDoorMode()) {
      e.preventDefault();
      openMathQuiz(nearMissionStation);
      return;
    }
    if (gameState === "play" && e.code === "KeyG" && isKeyHuntMode()) {
      e.preventDefault();
      tryOpenDoorInput();
      return;
    }
    if (gameState === "play" && e.code === "KeyR" && isShooterMode()) {
      e.preventDefault();
      tryShooterRespawnInput();
      return;
    }
    if (gameState === "play" && e.code === "KeyR" && !playAsKiller && !isShooterMode()) {
      e.preventDefault();
      tryUseFirstItem();
      return;
    }
    if (gameState === "play" && isShooterMode()) {
      if (e.code === "Digit1" || e.code === "Numpad1") { tryShooterWeaponSwitch(1); return; }
      if (e.code === "Digit2" || e.code === "Numpad2") { tryShooterWeaponSwitch(2); return; }
      if (e.code === "Digit3" || e.code === "Numpad3") { tryShooterWeaponSwitch(3); return; }
      if (e.code === "Digit4" || e.code === "Numpad4") { tryShooterWeaponSwitch(4); return; }
    }
    if (gameState !== "play") return;
    if (!isKeyHuntMode() && !isPlatformerMode() && !isShooterMode()) handleAbilityKeys(e.code, true);
  });
  window.addEventListener("keyup", (e) => {
    if (gameState === "play" && isShooterMode() && e.code === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      showShooterScoreboard(false);
      return;
    }
    keys[e.code] = false;
    if (e.code === "Space" || e.code === "Numpad0") {
      survivors.forEach((s) => { s._jumpHeld = false; });
    }
    if (e.code === "ControlLeft") {
      survivors.forEach((s) => {
        s._slideKeyHeld = false;
        if (s.slideTimer <= 0) s.sliding = false;
      });
    }
  });
  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === renderer.domElement;
    clickPrompt.classList.toggle("hidden", pointerLocked);
    if (pointerLocked) clickPrompt.classList.remove("show");
  });
  renderer.domElement.addEventListener("mousedown", (e) => {
    initAudioEngine();
    if (gameState !== "play") return;
    const humanKiller = killers.find((k) => !k.isAI);
    if (e.button === 0 && isShooterMode()) {
      const human = getHumanFocus();
      if (human) {
        e.preventDefault();
        tryShooterFire(human);
        if (!pointerLocked) renderer.domElement.requestPointerLock?.();
      }
      return;
    }
    if (e.button === 2 && isShooterMode()) {
      e.preventDefault();
      const human = getHumanSurvivor();
      if (human && getShooterWeapon(human.weaponId)?.id === "sniper") {
        shooterAds = true;
        document.body.classList.add("shooter-ads");
        updateShooterFov();
        updateCrosshair();
      }
      return;
    }
    if (e.button === 0 && humanKiller && (playAsKiller || gameMode === "versus")) {
      e.preventDefault();
      tryKillerBasicAttack(humanKiller);
      if (!pointerLocked) renderer.domElement.requestPointerLock?.();
      return;
    }
    if (e.button === 0 && !document.getElementById("mathQuiz")?.classList.contains("show")) {
      renderer.domElement.requestPointerLock?.();
    }
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button === 2 && shooterAds) {
      shooterAds = false;
      document.body.classList.remove("shooter-ads");
      updateShooterFov();
      updateCrosshair();
    }
  });
  renderer.domElement.addEventListener("contextmenu", (e) => {
    if (isShooterMode()) e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!pointerLocked || gameState !== "play") return;
    camYaw -= e.movementX * 0.0022;
    applyLookPitch(e.movementY, 0.0022);
  });
  window.addEventListener("resize", () => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    renderer.setSize(W, H);
    if (!isSplitScreenView()) {
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    }
  });
  renderer.domElement.addEventListener("wheel", (e) => {
    if (gameState !== "play" || isShooterMode()) return;
    e.preventDefault();
    camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist + e.deltaY * 0.012));
  }, { passive: false });

  let pinchStart = 0;
  renderer.domElement.addEventListener("touchstart", (e) => {
    if (!isTouchUiEnabled() || gameState !== "play") return;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStart = Math.hypot(dx, dy);
    }
  }, { passive: true });
  renderer.domElement.addEventListener("touchmove", (e) => {
    if (!isTouchUiEnabled() || gameState !== "play" || e.touches.length !== 2) return;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const d = Math.hypot(dx, dy);
    if (pinchStart > 0) {
      camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist + (pinchStart - d) * 0.018));
    }
    pinchStart = d;
  }, { passive: true });
}

function handleZoomKeys() {
  if (gameState !== "play" || isShooterMode()) return;
  const zp = playAsKiller ? "killer" : "p1";
  if (keyDown(keys, zp, "zoomIn") || keyDown(keys, "p1", "zoomIn")) {
    camDist = Math.max(CAM_DIST_MIN, camDist - 12 * 0.016);
  }
  if (keyDown(keys, zp, "zoomOut") || keyDown(keys, "p1", "zoomOut")) {
    camDist = Math.min(CAM_DIST_MAX, camDist + 12 * 0.016);
  }
}

function abilityBlockedByMission(profile, code) {
  if (playAsKiller || !nearMissionStation || activeQuiz) return false;
  const b = getBindings()[profile] || getBindings().p1;
  return ["ab1", "ab2", "ab3"].some((k) => b[k] === code);
}

const touchKeyPrev = {};

function pollTouchVirtualKeys() {
  if (!isTouchUiEnabled() || gameState !== "play") {
    for (const k in touchKeyPrev) delete touchKeyPrev[k];
    return;
  }
  const codes = new Set([...Object.keys(keys), ...Object.keys(touchKeyPrev)]);
  for (const code of codes) {
    const now = !!keys[code];
    const was = !!touchKeyPrev[code];
    if (now && !was) {
      if (code === "KeyG" && isKeyHuntMode()) tryOpenDoorInput();
      else if (code === "KeyR" && !playAsKiller) tryUseFirstItem();
      else if (
        code === "KeyE" && nearPuzzleDoor && !playAsKiller && !activeQuiz && isPuzzleDoorMode()
      ) openMathQuiz(nearPuzzleDoor);
      else if (
        code === "KeyE" && nearMissionStation && !playAsKiller && !activeQuiz && !isKeyHuntMode() && !isPuzzleDoorMode()
      ) openMathQuiz(nearMissionStation);
      else if (!isKeyHuntMode() && !isPlatformerMode() && !isShooterMode()) handleAbilityKeys(code, true);
    }
    if (now) touchKeyPrev[code] = true;
    else delete touchKeyPrev[code];
  }
}

function handleAbilityKeys(code, down) {
  if (!down) return;
  if (activeQuiz) return;
  const tryProfile = (player, profile) => {
    if (abilityBlockedByMission(profile, code)) return;
    const b = getBindings()[profile];
    const idx = ["ab1", "ab2", "ab3"].findIndex((k) => b[k] === code);
    if (idx >= 0 && tryAbility(player, idx, ctx, gameApi)) {
      playSfx(player.role === "killer" ? "swing_wind" : "ability", 0.06);
    }
  };
  const survivorModes = new Set([
    "solo", "classic", "coop", "versus", "mob", "hardcore", "practice",
  ]);
  for (const s of survivors) {
    if (!s.isAI && !s.caught && !playAsKiller && survivorModes.has(gameMode)) {
      tryProfile(s, s.profile === "p2" ? "p2" : "p1");
    }
  }
  for (const k of killers) {
    if (!k.isAI) {
      const kp = playAsKiller ? "p1" : "killer";
      tryProfile(k, kp);
    }
  }
}

function getMoveFromProfile(profile, yaw, gp) {
  let ix = 0, iz = 0;
  if (keyDown(keys, profile, "up")) iz += 1;
  if (keyDown(keys, profile, "down")) iz -= 1;
  if (keyDown(keys, profile, "left")) ix += 1;
  if (keyDown(keys, profile, "right")) ix -= 1;

  if (gp) {
    ix += gp.move.x;
    iz += gp.move.z;
  }

  if (!ix && !iz) return { x: 0, z: 0, sprint: false };

  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const wx = ix * cos + iz * sin;
  const wz = -ix * sin + iz * cos;
  const len = Math.hypot(wx, wz) || 1;
  const sprint = keyDown(keys, profile, "sprint") || gp?.sprint;
  return { x: wx / len, z: wz / len, sprint };
}

function updateSprint(p, dt, wantsSprint, moving) {
  if (p.sprintExhausted) {
    if (elapsed >= p.sprintRecoverAt) {
      p.sprintExhausted = false;
      p.sprintMeter = 100;
    }
    return false;
  }
  if (wantsSprint && moving && p.sprintMeter > 0) {
    p.sprintMeter = Math.max(0, p.sprintMeter - SPRINT_DRAIN * dt);
    if (p.sprintMeter <= 0) {
      p.sprintMeter = 0;
      p.sprintExhausted = true;
      p.sprintRecoverAt = elapsed + SPRINT_EXHAUST_CD;
      return false;
    }
    return true;
  }
  if (!wantsSprint && moving) {
    p.sprintMeter = Math.min(100, p.sprintMeter + SPRINT_REGEN * dt);
  }
  return false;
}

function updatePuzzleDoorProximity() {
  nearPuzzleDoor = null;
  if (!isPuzzleDoorMode() || !puzzleDoorState || playAsKiller || activeQuiz) {
    const hint = document.getElementById("missionInteractHint");
    if (hint && isPuzzleDoorMode()) hint.style.display = "none";
    if (isTouchUiEnabled()) {
      setTouchMissionHighlight(false);
      setTouchPuzzleHighlight(false);
    }
    return;
  }
  const p = getHumanFocus();
  if (!p || p.caught) return;
  nearPuzzleDoor = getNearPuzzleDoor(p, puzzleDoorState.doors, ctx);
  const hint = document.getElementById("missionInteractHint");
  if (hint) {
    if (nearPuzzleDoor) {
      hint.style.display = "block";
      hint.textContent = gamepadActive
        ? `按 ${getGamepadActionLabels(false).interact} 解 #${nearPuzzleDoor.label} 號謎門（選答案）`
        : isTouchUiEnabled()
          ? `發光 ? 門前 · 按 E 或右下「解題」· #${nearPuzzleDoor.label}`
          : `靠近發光的 ? 門 · 按 E 解題（選答案）· #${nearPuzzleDoor.label}`;
    } else {
      const lockHint = getLockedPuzzleDoorHint(p, puzzleDoorState.doors, ctx);
      if (lockHint) {
        hint.style.display = "block";
        hint.textContent = lockHint;
      } else {
        hint.style.display = "none";
      }
    }
  }
  if (isTouchUiEnabled()) {
    setTouchPuzzleHighlight(
      !!nearPuzzleDoor,
      nearPuzzleDoor ? `謎題門 #${nearPuzzleDoor.label} · 點右下「解題」` : ""
    );
    setTouchMissionHighlight(false);
  }
}

function updateMissionsProximity() {
  nearMissionStation = null;
  const missionBtn = document.getElementById("btnTouchMission");
  const missionBanner = document.getElementById("touchMissionBanner");
  const hideMissionTouchUi = () => {
    if (missionBtn) missionBtn.hidden = true;
    if (missionBanner) missionBanner.hidden = true;
  };
  if (playAsKiller || activeQuiz || isKeyHuntMode() || isPuzzleDoorMode() || isShooterMode()) {
    const hint = document.getElementById("missionInteractHint");
    if (hint) hint.style.display = "none";
    hideMissionTouchUi();
    return;
  }
  const p = getHumanFocus();
  if (!p || p.caught || p.role === "killer") return;
  for (const st of missionStations) {
    if (st.done) continue;
    const missionRange = isTouchUiEnabled() ? 3.6 : 2.8;
    if (Math.hypot(p.pos.x - st.x, p.pos.z - st.z) < missionRange) {
      nearMissionStation = st;
      break;
    }
  }
  const hint = document.getElementById("missionInteractHint");
  if (hint) {
    hint.style.display = nearMissionStation ? "block" : "none";
    if (nearMissionStation) {
      const gpl = getGamepadActionLabels(false);
      hint.textContent = gamepadActive
        ? `按 ${gpl.interact} 解任務 · 右搖桿移動游標 · ${gpl.confirm} 選答案`
        : "按 E 解任務（此時 Q/E/F 招式關閉）";
    }
  }

  const showMission = !!nearMissionStation && !playAsKiller && !isKeyHuntMode() && !isPuzzleDoorMode() && !activeQuiz;
  if (missionBtn) missionBtn.hidden = true;
  if (missionBanner) missionBanner.hidden = true;
  if (isTouchUiEnabled()) setTouchMissionHighlight(showMission);
  if (showMission && p && !p.isAI && !p._missionToastShown) {
    p._missionToastShown = true;
    showToast("靠近發電站！點右側「技2 · 任務」答題", 1400, "mission");
  }
  if (p && !showMission) {
    p._missionToastShown = false;
    if (isTouchUiEnabled()) setTouchMissionHighlight(false);
  }
}

function updateEntity(p, dt, move) {
  if (isShooterMode() ? isShooterPlayerDown(p) : p.caught) return;
  tickCooldowns(p, dt);
  if (p.elev == null) p.elev = 0;
  if (p._jumpY == null) p._jumpY = 0;

  if (verticalWorldState) {
    updateVerticalPhysics(p, dt, verticalWorldState);
    applyFallSafety(p);
  } else {
    const grav = isShooterMode() ? 36 : p.role === "killer" ? 32 : 26;
    p.velY = (p.velY ?? 0) - grav * dt;
    p._jumpY += p.velY * dt;
    if (p._jumpY <= 0) {
      p._jumpY = 0;
      p.velY = 0;
      p.onGround = true;
      if (!isShooterMode()) {
        if ((p.jumpsUsed ?? 0) >= 2 && hasDoubleJumpPassive(p)) {
          p._djRechargeUntil = Math.max(p._djRechargeUntil ?? 0, elapsed + DOUBLE_JUMP_RECHARGE);
        }
        p.jumpsUsed = 0;
        if (hasDoubleJumpPassive(p) && elapsed >= (p._djRechargeUntil ?? 0)) {
          p._airJumpReady = true;
        }
      }
    } else {
      p.onGround = false;
    }
  }
  if (p.onGround) {
    if (!isShooterMode()) {
      if ((p.jumpsUsed ?? 0) >= 2 && hasDoubleJumpPassive(p)) {
        p._djRechargeUntil = Math.max(p._djRechargeUntil ?? 0, elapsed + DOUBLE_JUMP_RECHARGE);
      }
      p.jumpsUsed = 0;
      if (hasDoubleJumpPassive(p) && elapsed >= (p._djRechargeUntil ?? 0)) {
        p._airJumpReady = true;
      }
    }
  }
  const speedMult = getSpeedMult(p);
  const moving = !!(move.x || move.z);
  const wantsSprint = move.sprint && moving;
  const sprinting = updateSprint(p, dt, wantsSprint, moving);
  const isKiller = p.role === "killer";
  const mapScale = getMapMoveScale();
  const classSpd = p._shooterSpeedMult ?? 1;
  const walkBase = isShooterMode() ? WALK_SPEED * 0.72 : WALK_SPEED;
  const sprintBase = isShooterMode() ? SPRINT_SPEED * 0.75 : SPRINT_SPEED;
  const airMult = getBounceAirControlMult(p);
  let maxSpeed = (isKiller ? KILLER_WALK : walkBase) * speedMult * mapScale * classSpd * airMult;
  if (sprinting) maxSpeed = (isKiller ? KILLER_SPRINT : sprintBase) * speedMult * mapScale * classSpd * airMult;
  if (gameMode === "practice" && isKiller && p.isAI) maxSpeed *= 0.82;
  if (gameMode === "hardcore" && isKiller) maxSpeed *= 1.12;
  const parts = p.mesh?.userData?.parts;
  if (move.dodge && p.sliding && p.slideDir) {
    const spd = (move.slideSpeed ?? 18) * speedMult;
    p.vel.x = p.slideDir.x * spd;
    p.vel.z = p.slideDir.z * spd;
    p._jumpY = Math.max(p._jumpY ?? 0, 0.05);
    p.yaw = Math.atan2(p.slideDir.x, p.slideDir.z);
    if (parts) {
      parts.torso.rotation.x = 0.55;
      parts.torso.position.y = (parts.baseTorsoY ?? 1.38) * 0.92;
      parts.head.position.y = (parts.baseHeadY ?? 1.14) * 0.96;
      parts.head.rotation.x = 0.12;
      parts.leftArm.rotation.x = 0.45;
      parts.rightArm.rotation.x = 0.45;
      parts.leftLeg.rotation.x = -0.05;
      parts.rightLeg.rotation.x = 1.25;
      parts.leftLeg.position.z = -0.22;
      parts.rightLeg.position.z = 0.48;
    }
    playerMove(p.pos, p.vel.x, p.vel.z, dt, p._jumpY ?? 0, p.elev ?? 0);
    if (p.mesh) {
      p.mesh.position.set(p.pos.x, worldHeight(p), p.pos.z);
      p.mesh.rotation.y = p.yaw;
    }
    return;
  } else if (parts) {
    parts.leftLeg.position.z = 0;
    parts.rightLeg.position.z = 0;
    parts.torso.rotation.x *= 0.82;
    parts.torso.position.y += ((parts.baseTorsoY ?? 1.38) - parts.torso.position.y) * 0.12;
    if (parts.head) parts.head.position.y += ((parts.baseHeadY ?? 1.14) - parts.head.position.y) * 0.12;
  }

  if (p.role === "killer" && p.attackState) {
    maxSpeed *= 0.55;
  }

  if (moving) {
    hasMoved = true;
    p.vel.x = move.x * maxSpeed;
    p.vel.z = move.z * maxSpeed;
    p.yaw = Math.atan2(move.x, move.z);
  } else {
    p.vel.x *= 0.5;
    p.vel.z *= 0.5;
    p.stamina = Math.min(100, p.stamina + 40 * dt);
  }

  const spd = Math.hypot(p.vel.x, p.vel.z);
  if (spd > 0.05) {
    playerMove(p.pos, p.vel.x, p.vel.z, dt, p._jumpY ?? 0, p.elev ?? 0);
  }
  if (isShooterMode() && !p.isAI) {
    p.yaw = camYaw;
  } else if (spd > 0.05 && p.mesh) {
    p.mesh.rotation.y = Math.atan2(p.vel.x, p.vel.z);
  }

  const canStep = isShooterMode() ? !isShooterPlayerDown(p) : !p.caught;
  if (p.onGround && spd > 1.4 && canStep && !p.sliding) {
    p._stepCd = (p._stepCd ?? 0) - dt;
    const stepGap = sprinting ? 0.28 : 0.38;
    if (p._stepCd <= 0) {
      if (!p.isAI) playFootstepSfx(0.09);
      else if (isShooterMode()) playFootstepSfx(0.14);
      p._stepCd = stepGap * (8 / Math.max(4, spd));
    }
  }
  const wasAir = p._wasInAir;
  const inAir = !p.onGround || (p._jumpY ?? 0) > 0.2 || (p.velY ?? 0) > 0.4 || (p._bounceAirTime ?? 0) > 0;
  p._wasInAir = inAir;
  if (wasAir && p.onGround && (p._jumpY ?? 0) <= 0.08 && Math.abs(p.velY ?? 0) < 1.2) {
    playLandSfx(0.1);
  }

  applyMeshAnim(p, dt);
  if (!p._anim && shouldAnimateEntity(p)) applyLocomotionAnim(p, dt);
  tickEntityUnstuck(p, dt);

  if (isShooterMode() && p.weaponId) tickGunFlash(p, dt, camera);

  if (p.mesh) {
    p.mesh.position.set(p.pos.x, worldHeight(p), p.pos.z);
    if (p.mesh.scale.x !== 1) p.mesh.scale.set(1, 1, 1);
    if (p._hitFlash > 0) {
      p._hitFlash -= dt;
      const maxFlash = p._hitFlashHead ? 0.48 : 0.4;
      const flashCol = p._hitFlashColor ?? (p._hitFlashHead ? 0xff2244 : 0xffffff);
      const t = Math.min(1, p._hitFlash / maxFlash);
      const pulse = isShooterMode()
        ? 1.1 + t * 3.2 + Math.sin(t * Math.PI) * 1.5
        : 0.35 + t * 0.55;
      p.mesh.traverse((c) => {
        if (c === p.gunMesh) return;
        const mat = c.material;
        if (!mat) return;
        if (mat.emissive) mat.emissive.setHex(flashCol);
        if (mat.emissiveIntensity != null) {
          mat.emissiveIntensity = isShooterMode() ? pulse : 0.6;
        }
      });
    } else if (p.role === "survivor") {
      p.mesh.traverse((c) => {
        if (c === p.gunMesh) return;
        if (c.material?.emissive) c.material.emissiveIntensity = 0;
      });
    }
  }

  if (p.role === "survivor") {
    p.history.push({ x: p.pos.x, z: p.pos.z });
    if (p.history.length > 60) p.history.shift();
    if (p.cloneMesh) {
      if ((p._cloneUntil ?? 0) <= elapsed) {
        scene.remove(p.cloneMesh);
        p.cloneMesh = null;
        p._clonePos = null;
      } else {
        tickCloneDecoy(p, dt);
      }
    }
    const invisible = p.effects.invisible > 0;
    const selfView = invisible && !p.isAI;
    p.mesh.visible = true;
    p.mesh.traverse((c) => {
      if (!c.material) return;
      if (selfView) {
        c.material.transparent = true;
        c.material.opacity = 0.48;
        if (c.material.emissive) {
          c.material.emissive.setHex(0x4466aa);
          c.material.emissiveIntensity = 0.35;
        }
      } else if (invisible && p.isAI) {
        c.material.transparent = true;
        c.material.opacity = 0.12;
      } else {
        c.material.transparent = false;
        c.material.opacity = 1;
        if (c.material.emissive) c.material.emissiveIntensity = 0;
      }
    });
  }
}

function updateAISurvivorKeyHunt(s, dt) {
  if (s.caught) return;
  let tx = exitPos.x;
  let tz = exitPos.z;
  const doors = keyHuntState?.doors || [];
  const step = bfsNextStepWithDoors(ctx, maze, doors, s.pos.x, s.pos.z, tx, tz)
    || bfsNextStep(ctx, maze, s.pos.x, s.pos.z, tx, tz);
  let mx = 0, mz = 0;
  if (step) {
    mx = step.x - s.pos.x;
    mz = step.z - s.pos.z;
  } else {
    mx = tx - s.pos.x;
    mz = tz - s.pos.z;
  }
  const len = Math.hypot(mx, mz) || 1;
  updateEntity(s, dt, { x: mx / len, z: mz / len, sprint: false });
}

function updateAISurvivorPlatformer(s, dt) {
  if (s.caught) return;
  const step = bfsNextStep(ctx, maze, s.pos.x, s.pos.z, exitPos.x, exitPos.z);
  let mx = exitPos.x - s.pos.x;
  let mz = exitPos.z - s.pos.z;
  if (step) {
    mx = step.x - s.pos.x;
    mz = step.z - s.pos.z;
  }
  const len = Math.hypot(mx, mz) || 1;
  updateEntity(s, dt, { x: mx / len, z: mz / len, sprint: true });
}

function updateAISurvivor(s, dt) {
  if (s.caught) return;
  if (isKeyHuntMode()) {
    updateAISurvivorKeyHunt(s, dt);
    return;
  }
  if (isPlatformerMode()) {
    updateAISurvivorPlatformer(s, dt);
    return;
  }
  const { killer: k, dist: distK } = getNearestKiller(s);
  if (!k && !isPuzzleDoorMode()) return;

  let tx;
  let tz;
  const survivalMode = !usesExitWin();

  if (s._aiRoamTimer == null) s._aiRoamTimer = 0;

  if (distK < 15 && k) {
    tx = s.pos.x + (s.pos.x - k.pos.x) * 2.5;
    tz = s.pos.z + (s.pos.z - k.pos.z) * 2.5;
    s._aiRoamTimer = 0;
  } else if (survivalMode) {
    s._aiRoamTimer -= dt;
    if (!s._aiRoam || s._aiRoamTimer <= 0
      || Math.hypot(s.pos.x - s._aiRoam.x, s.pos.z - s._aiRoam.z) < 4) {
      s._aiRoam = pickAiRoamTarget(s);
      s._aiRoamTimer = 7 + (aiSurvivorIndex(s) % 4) * 2;
    }
    tx = s._aiRoam.x;
    tz = s._aiRoam.z;
  } else {
    const distExit = Math.hypot(s.pos.x - exitPos.x, s.pos.z - exitPos.z);
    if (distExit > 14) {
      const spread = aiSpreadGoal(s, exitPos.x, exitPos.z, 10 + (aiSurvivorIndex(s) % 3) * 3);
      tx = spread.x;
      tz = spread.z;
    } else {
      tx = exitPos.x;
      tz = exitPos.z;
    }
  }

  const sep = aiSeparationBias(s);
  tx += sep.x * 3;
  tz += sep.z * 3;

  const step = bfsNextStep(ctx, maze, s.pos.x, s.pos.z, tx, tz);
  let mx = 0;
  let mz = 0;
  if (step) {
    mx = step.x - s.pos.x;
    mz = step.z - s.pos.z;
  } else {
    mx = tx - s.pos.x;
    mz = tz - s.pos.z;
  }
  const len = Math.hypot(mx, mz) || 1;
  const sprint = distK < 12 && s.sprintMeter > 15;
  updateEntity(s, dt, { x: mx / len, z: mz / len, sprint });
  const abChance = perfTier === "low" ? 0.00035 : perfTier === "med" ? 0.0008 : 0.0015;
  if (Math.random() < abChance) tryAbility(s, Math.floor(Math.random() * 3), ctx, gameApi);
}

function updateWorldItems() {
  for (const it of worldItems) {
    if (it.taken) continue;
    for (const s of getAliveSurvivors()) {
      if (Math.hypot(s.pos.x - it.x, s.pos.z - it.z) < 1.4) {
        it.taken = true;
        if (it.mesh) it.mesh.visible = false;
        playSfx("item");
        addInventoryItem(s, it.type);
        const def = ITEM_DEFS[it.type];
        const msg = def?.passive
          ? `獲得常駐：${def.name}`
          : `獲得 ${def?.name || it.type}（按 R 或點下方按鈕使用）`;
        if (!s.isAI) showToast(msg, 900);
        updateInventoryBar();
      }
    }
  }
}

function updateTeleporters() {
  const now = performance.now();
  for (const tp of teleporters) {
    const useTp = (ent) => {
      if (ent._tpUntil && now < ent._tpUntil) return false;
      const da = Math.hypot(ent.pos.x - tp.a.x, ent.pos.z - tp.a.z);
      const db = Math.hypot(ent.pos.x - tp.b.x, ent.pos.z - tp.b.z);
      if (da < 2.2) {
        ent.pos.x = tp.b.x;
        ent.pos.z = tp.b.z;
        ent._pathTarget = null;
        ent._pathTimer = 0;
        ent._tpUntil = now + 2000;
        if (ent.role === "survivor") ent.invuln = 1.2;
        playSfx("teleport", 0.35);
        return true;
      }
      if (db < 2.2) {
        ent.pos.x = tp.a.x;
        ent.pos.z = tp.a.z;
        ent._pathTarget = null;
        ent._pathTimer = 0;
        ent._tpUntil = now + 2000;
        if (ent.role === "survivor") ent.invuln = 1.2;
        playSfx("teleport", 0.35);
        return true;
      }
      return false;
    };
    for (const s of getAliveSurvivors()) useTp(s);
    for (const k of killers) {
      if (useTp(k)) k._stuckT = 0;
    }
  }
}

function tickInvuln(dt) {
  for (const s of survivors) {
    if (s.invuln > 0) s.invuln -= dt;
  }
}

function updateSurvivors(dt) {
  tickInvuln(dt);
  const gp0 = pollGamepad(0);
  const gp1 = pollGamepad(1);

  survivors.forEach((s) => {
    if (!isShooterMode() && s.caught) return;
    if (isShooterMode() && isShooterPlayerDown(s)) return;
    const profile = s.profile;
    const gp = profile === "p1" ? gp0 : gp1;
    const useCam = profile === "p1" || gameMode === "coop" || isShooterSplitView();
    const { yaw: moveYaw } = getPlayerCamAngles(s);
    const move = getMoveFromProfile(profile, useCam ? moveYaw : s.yaw, gp);
    if (!s._gpPrev) s._gpPrev = {};
    const missionLock = (nearMissionStation || nearPuzzleDoor) && !activeQuiz && !playAsKiller;
    if (!s.isAI) {
      const ctrlProfile = playAsKiller && s.profile === "p1" ? "p1" : profile;
      if (isShooterMode() && gp) {
        const shootBtn = gp.sprint || gp.confirm;
        if (shootBtn && !s._gpShootHeld) tryShooterFire(s);
        s._gpShootHeld = !!shootBtn;
      } else if (isKeyHuntMode()) {
        if (gp?.openDoor && !s._gpOpenDoor) {
          s._gpOpenDoor = true;
          tryOpenDoorInput();
        }
        if (!gp?.openDoor) s._gpOpenDoor = false;
        if (gp?.useItem && !s._gpUseItem) {
          s._gpUseItem = true;
          tryUseFirstItem();
        }
        if (!gp?.useItem) s._gpUseItem = false;
      } else if (!isPlatformerMode() && missionLock && gp?.interact && !s._gpInteract) {
        s._gpInteract = true;
        if (nearPuzzleDoor) openMathQuiz(nearPuzzleDoor);
        else openMathQuiz(nearMissionStation);
      } else if (!gp?.interact) {
        s._gpInteract = false;
      }
    }
    if (!isKeyHuntMode() && !isPlatformerMode() && !missionLock) {
      if (gp?.ab1 && !s._gpPrev.ab1) tryAbility(s, 0, ctx, gameApi);
      if (gp?.ab2 && !s._gpPrev.ab2) tryAbility(s, 1, ctx, gameApi);
      if (gp?.ab3 && !s._gpPrev.ab3) tryAbility(s, 2, ctx, gameApi);
    }
    s._gpPrev = { ab1: !!gp?.ab1, ab2: !!gp?.ab2, ab3: !!gp?.ab3 };
    if (!s.isAI) {
      const ctrlProfile = playAsKiller && s.profile === "p1" ? "p1" : profile;
      if (keyDown(keys, ctrlProfile, "openDoor") && !s._openDoorHeld) {
        s._openDoorHeld = true;
        tryOpenDoorInput();
      }
      if (!keyDown(keys, ctrlProfile, "openDoor")) s._openDoorHeld = false;
      if (!keyDown(keys, ctrlProfile, "jump") && !gp?.jump) s._jumpHeld = false;
      if (!keyDown(keys, ctrlProfile, "slide") && !gp?.slide) {
        s._slideKeyHeld = false;
        if (s.slideTimer <= 0) s.sliding = false;
      }
      tryJump(s, ctrlProfile, gp);
      const slidMove = applySlideInput(s, ctrlProfile, move, dt, gp);
      updateEntity(s, dt, slidMove);
    } else if (s.isAI && !isShooterMode()) updateAISurvivor(s, dt);
    else if (!s.isAI) updateEntity(s, dt, move);
  });

  updateMissionsProximity();
  updatePuzzleDoorProximity();
  updatePuzzleWaypointHud();
  tickPuzzleDoorBeacons();
  checkExitWin();
  if (frameCount % 8 === 0) {
    updateKeyHuntBar();
    updateInventoryBar();
  }
}

function updateOneKiller(k, dt) {
  if (k._meleeCd > 0) k._meleeCd -= dt;

  if (updateKillerCombat(k, dt, ctx, maze, combatCallbacks)) {
    syncKillerMesh(k);
    if (!k.isAI) {
      const slow = k.attackState?.phase === "recovery" ? 0.5 : 0.25;
      const gp = pollGamepad(0);
      const ctrlProfile = playAsKiller ? "p1" : "killer";
      const move = getMoveFromProfile(ctrlProfile, camYaw, gp);
      updateEntity(k, dt, {
        x: move.x * slow,
        z: move.z * slow,
        sprint: false,
      });
      syncKillerMesh(k);
    }
    applyLocomotionAnim(k, dt * 0.35);
    return;
  }

  if (!k.isAI) {
    updateCrosshair();
    const gp = pollGamepad(0);
    const ctrlProfile = playAsKiller ? "p1" : "killer";
    const move = getMoveFromProfile(ctrlProfile, camYaw, gp);
    if (!k._gpPrev) k._gpPrev = {};
    if (gp?.ab1 && !k._gpPrev.ab1) tryAbility(k, 0, ctx, gameApi);
    if (gp?.ab2 && !k._gpPrev.ab2) tryAbility(k, 1, ctx, gameApi);
    if (gp?.ab3 && !k._gpPrev.ab3) tryAbility(k, 2, ctx, gameApi);
    k._gpPrev = { ab1: !!gp?.ab1, ab2: !!gp?.ab2, ab3: !!gp?.ab3 };
    updateEntity(k, dt, move);
    syncKillerMesh(k);
    return;
  }

  const chase = getKillerAITarget(k);
  if (!chase) return;
  const target = chase.entity;
  const chaseX = chase.x;
  const chaseZ = chase.z;

  if (k._pathTimer === undefined) k._pathTimer = 0;
  k._pathTimer -= dt;
  if (k._pathTimer <= 0) {
    k._pathTimer = 0.4;
    k._pathTarget = bfsNextStep(ctx, maze, k.pos.x, k.pos.z, chaseX, chaseZ);
  }
  let dx = chaseX - k.pos.x;
  let dz = chaseZ - k.pos.z;
  if (k._pathTarget) {
    dx = k._pathTarget.x - k.pos.x;
    dz = k._pathTarget.z - k.pos.z;
  }
  const pathDist = Math.hypot(dx, dz);
  const toSurvivor = Math.hypot(target.pos.x - k.pos.x, target.pos.z - k.pos.z);
  const toChase = Math.hypot(chaseX - k.pos.x, chaseZ - k.pos.z);

  if (!k._lastPos) k._lastPos = { x: k.pos.x, z: k.pos.z };
  const moved = Math.hypot(k.pos.x - k._lastPos.x, k.pos.z - k._lastPos.z);
  if (moved < 0.05) k._stuckT = (k._stuckT || 0) + dt;
  else k._stuckT = 0;
  k._lastPos = { x: k.pos.x, z: k.pos.z };
  if (k._stuckT > 0.5 || (pathDist < 1.2 && toChase > 5)) {
    dx = chaseX - k.pos.x;
    dz = chaseZ - k.pos.z;
    k._pathTarget = null;
    k._pathTimer = 0;
  }

  k._aiAtkCd = (k._aiAtkCd ?? 0) - dt;
  if (!chase.isClone && toSurvivor < KILLER_MELEE_RANGE + 0.5) {
    tryKillerMeleeAttack(k, target, KILLER_MELEE_DAMAGE);
  } else if (chase.isClone && toChase < 2.8 && k._aiAtkCd <= 0) {
    k._aiAtkCd = perfTier === "low" ? 0.9 : 0.55;
    playSfx("swing_wind", 0.05);
    spawnHitVfx(scene, chaseX, chaseZ);
  } else if (toSurvivor < 12 && k._aiAtkCd <= 0) {
    k._aiAtkCd = perfTier === "low" ? 0.85 : 0.55;
    const slot = toSurvivor < 6 ? 0 : toSurvivor < 10 ? 1 : 2;
    if (perfTier !== "low" || Math.random() < 0.45) tryAbility(k, slot, ctx, gameApi);
  } else if (toSurvivor < 22 && k._aiAtkCd <= 0 && Math.random() < (perfTier === "low" ? 0.05 : 0.12)) {
    k._aiAtkCd = 0.8;
    tryAbility(k, Math.floor(Math.random() * 3), ctx, gameApi);
  }

  const mustChase = pathDist < 2 || k._stuckT > 0.35 || toSurvivor < 14;
  if (mustChase && toChase > 1.2) {
    dx = chaseX - k.pos.x;
    dz = chaseZ - k.pos.z;
  }
  const moveDist = Math.hypot(dx, dz);
  if (moveDist > 0.2) {
    const len = moveDist || 1;
    updateEntity(k, dt, { x: dx / len, z: dz / len, sprint: toSurvivor < 14 });
  }
}

function updateKillers(dt) {
  for (const k of killers) updateOneKiller(k, dt);
}

function syncProjectileMeshes() {
  if (!scene) return;
  while (vfxMeshes.length > projectiles.length) {
    const m = vfxMeshes.pop();
    if (m) scene.remove(m);
  }
  while (vfxMeshes.length < projectiles.length) {
    const pr = projectiles[vfxMeshes.length];
    const m = spawnProjectileVfx(scene, pr.x, pr.z, pr.color || 0xff2244);
    vfxMeshes.push(m);
  }
  projectiles.forEach((pr, i) => {
    const m = vfxMeshes[i];
    if (!m) return;
    m.position.set(pr.x, pr.y ?? 1.2, pr.z);
    m.material.color.setHex(pr.color || 0xff2244);
  });
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.life -= dt;
    const prevX = pr.x;
    const prevZ = pr.z;
    const prevY = pr.y ?? 1.2;
    pr.x += pr.vx * dt;
    pr.z += pr.vz * dt;
    if (pr.vy != null) pr.y = (pr.y ?? 1.2) + pr.vy * dt;

    let hit = pr.life <= 0;
    let hitType = "wall";
    if (!hit && pr.y != null && pr.y <= 0.1) {
      hit = true;
      hitType = "floor";
      pr.y = 0.1;
    }
    if (!hit && collides(ctx, maze, pr.x, pr.z, 0.2, 0, 0, { vaultClear: 99 })) {
      hit = true;
      hitType = "wall";
    }

    if (hit) {
      if (hitType === "wall" && pr.fromShooter) playShooterSfx("hitWall", playSfx, 0.06);
      projectiles.splice(i, 1);
      continue;
    }
    if (pr.fromShooter && pr.owner) {
      const style = shooterState?.playStyle ?? shooterPlayStyle;
      const moleMode = isShooterMoleMode(shooterState);
      for (const s of survivors) {
        if (s === pr.owner || isShooterPlayerDown(s) || (s.hp ?? 0) <= 0) continue;
        if (!moleMode && !isShooterEnemy(pr.owner, s, style, shooterState)) continue;
        if (moleMode && !isShooterCombatActive(s)) continue;
        if (Math.hypot(s.pos.x - pr.x, s.pos.z - pr.z) < 1.35) {
          const hitY = worldHeight(s) + 1.05;
          if (shooterLineBlocked(ctx, maze, prevX, prevZ, prevY, s.pos.x, hitY, s.pos.z)) continue;
          projectiles.splice(i, 1);
          let dmg = pr.damage || 22;
          let headshot = false;
          if (pr.owner && pr.fireDir && isShooterHeadshot(pr.owner, s, pr.fireDir)) {
            dmg = 999;
            headshot = true;
          }
          const col = pr.owner.paintColor ?? pr.color ?? 0xff4466;
          spawnPaintOnBody(scene, s, pr.owner.pos.x, pr.owner.pos.z, worldHeight(s), col);
          damageSurvivor(s, pr.owner, dmg, { headshot });
          continue;
        }
      }
      continue;
    }
    for (const s of getAliveSurvivors()) {
      if (pr.fromSurvivor) continue;
      if (Math.hypot(s.pos.x - pr.x, s.pos.z - pr.z) < 1.4) {
        projectiles.splice(i, 1);
        const killer = pr.killerRef || killers[0] || { charDef: { name: "Killer" } };
        gameApi.hitSurvivor(s, killer, pr.damage || PROJECTILE_DAMAGE);
        return;
      }
    }
  }
}

function updateMinions(dt) {
  for (let i = minions.length - 1; i >= 0; i--) {
    const m = minions[i];
    m.life -= dt;
    if (m.life <= 0) { minions.splice(i, 1); continue; }
    let target = survivors[0];
    let bd = Infinity;
    for (const s of survivors) {
      const d = Math.hypot(s.pos.x - m.x, s.pos.z - m.z);
      if (d < bd) { bd = d; target = s; }
    }
    const dx = target.pos.x - m.x;
    const dz = target.pos.z - m.z;
    const len = Math.hypot(dx, dz) || 1;
    m.x += (dx / len) * m.speed * dt;
    m.z += (dz / len) * m.speed * dt;
    if (elapsed >= MATCH_START_GRACE && bd < 1.3) {
      const killer = killers[0] || { charDef: { name: "Killer" } };
      damageSurvivor(target, killer, 28);
      minions.splice(i, 1);
    }
  }
}

function isCoopSplitView() {
  return gameMode === "coop" && !playAsKiller && gameState === "play" && !isSpectating();
}

function getLocalHumanPlayers() {
  return survivors.filter((s) => !s.isAI && ["p1", "p2", "p3", "p4"].includes(s.profile));
}

function isShooterSplitView() {
  return isShooterMode() && gameState === "play" && !isSpectating() && getLocalHumanPlayers().length >= 2;
}

function isSplitScreenView() {
  return isCoopSplitView() || isShooterSplitView();
}

function getSplitGamepadSlots() {
  if (isShooterSplitView()) return getLocalHumanPlayers().length;
  if (isCoopSplitView()) return 2;
  return isGamepadConnected() ? 1 : 0;
}

function ensureCoopCamera() {
  if (!camera2) camera2 = new THREE.PerspectiveCamera(68, 1, 0.1, 150);
}

function ensureSplitCameras(n = 4) {
  ensureCoopCamera();
  if (n >= 3 && !camera3) camera3 = new THREE.PerspectiveCamera(68, 1, 0.1, 150);
  if (n >= 4 && !camera4) camera4 = new THREE.PerspectiveCamera(68, 1, 0.1, 150);
}

function getPlayerCamAngles(p) {
  if (!p || p.profile === "p1") return { yaw: camYaw, pitch: camPitch };
  return { yaw: p._camYaw ?? p.yaw ?? 0, pitch: p._camPitch ?? 0 };
}

function updateCameraForPlayer(cam, focus, yaw, pitch) {
  if (!cam || !focus) return;
  if (isShooterMode()) {
    const eyeY = 1.62 + jumpYFor(focus);
    if (!isSpectating()) {
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const fx = Math.sin(yaw) * cosP;
      const fy = sinP;
      const fz = Math.cos(yaw) * cosP;
      cam.position.set(focus.pos.x, eyeY, focus.pos.z);
      cam.lookAt(
        focus.pos.x + fx * 20,
        eyeY + fy * 20,
        focus.pos.z + fz * 20
      );
      return;
    }
    const dist = 9;
    const cx = focus.pos.x - Math.sin(yaw) * dist;
    const cz = focus.pos.z - Math.cos(yaw) * dist;
    cam.position.set(cx, eyeY + 2.8, cz);
    cam.lookAt(focus.pos.x, eyeY + 0.4, focus.pos.z);
    return;
  }
  const lerpK = 0.2;
  const dist = camDist;
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const lookY = 1.85 + jumpYFor(focus);
  const cx = focus.pos.x - Math.sin(yaw) * cosP * dist;
  const cz = focus.pos.z - Math.cos(yaw) * cosP * dist;
  const cy = lookY + sinP * dist * 1.05 + Math.max(0, cosP) * 2.4;
  const targetCam = new THREE.Vector3(cx, cy, cz);
  if (cam.position.distanceTo(targetCam) > 35) cam.position.copy(targetCam);
  else cam.position.lerp(targetCam, lerpK);
  cam.lookAt(focus.pos.x, lookY, focus.pos.z);
}

function snapCameraToPlayer() {
  const focus = getCameraFocus();
  if (!focus || !camera) return;
  updateCameraForPlayer(camera, focus, camYaw, camPitch);
}

function updateCamera() {
  if (isSplitScreenView()) return;
  const focus = getCameraFocus();
  if (!focus || !camera) return;
  const { yaw, pitch } = getPlayerCamAngles(focus);
  updateCameraForPlayer(camera, focus, yaw, pitch);
}

function renderShooterSplitView(W, H) {
  const locals = getLocalHumanPlayers();
  const line = document.getElementById("coopSplitLine");
  if (locals.length < 2) {
    if (line) line.style.display = "none";
    renderer.setScissorTest(false);
    updateCamera();
    renderer.setViewport(0, 0, W, H);
    renderer.render(scene, camera);
    return;
  }
  ensureSplitCameras(locals.length);
  const bg = scene.background?.isColor ? scene.background.getHex() : 0x1a1228;
  const cams = [camera, camera2, camera3, camera4];
  renderer.setScissorTest(true);

  if (locals.length === 2) {
    document.body.classList.add("split-2p-v");
    document.body.classList.remove("split-2p-h");
    if (line) line.style.display = "block";
    const halfH = Math.floor((H - COOP_SPLIT_GAP) / 2);
    const bottomH = H - halfH - COOP_SPLIT_GAP;
    const [p1, p2] = locals;
    const a1 = getPlayerCamAngles(p1);
    const a2 = getPlayerCamAngles(p2);
    updateCameraForPlayer(camera, p1, a1.yaw, a1.pitch);
    camera.aspect = W / halfH;
    camera.updateProjectionMatrix();
    renderer.setViewport(0, halfH + COOP_SPLIT_GAP, W, halfH);
    renderer.setScissor(0, halfH + COOP_SPLIT_GAP, W, halfH);
    renderer.setClearColor(bg);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    renderer.setViewport(0, halfH, W, COOP_SPLIT_GAP);
    renderer.setScissor(0, halfH, W, COOP_SPLIT_GAP);
    renderer.setClearColor(0x000000);
    renderer.clear(true, true, true);
    updateCameraForPlayer(camera2, p2, a2.yaw, a2.pitch);
    camera2.aspect = W / bottomH;
    camera2.updateProjectionMatrix();
    renderer.setViewport(0, 0, W, bottomH);
    renderer.setScissor(0, 0, W, bottomH);
    renderer.setClearColor(bg);
    renderer.clear(true, true, true);
    renderer.render(scene, camera2);
  } else {
    document.body.classList.remove("split-2p-v");
    if (line) line.style.display = "none";
    const halfW = Math.floor(W / 2);
    const halfH = Math.floor(H / 2);
    const slots = [
      { x: 0, y: halfH, w: halfW, h: halfH },
      { x: halfW, y: halfH, w: W - halfW, h: halfH },
      { x: 0, y: 0, w: halfW, h: halfH },
      { x: halfW, y: 0, w: W - halfW, h: halfH },
    ];
    for (let i = 0; i < locals.length && i < 4; i++) {
      const p = locals[i];
      const cam = cams[i];
      const ang = getPlayerCamAngles(p);
      updateCameraForPlayer(cam, p, ang.yaw, ang.pitch);
      const s = slots[i];
      cam.aspect = s.w / s.h;
      cam.updateProjectionMatrix();
      renderer.setViewport(s.x, s.y, s.w, s.h);
      renderer.setScissor(s.x, s.y, s.w, s.h);
      renderer.setClearColor(bg);
      renderer.clear(true, true, true);
      renderer.render(scene, cam);
    }
  }
  renderer.setScissorTest(false);
}

function renderGameView() {
  if (!renderer || !scene || !camera) return;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const line = document.getElementById("coopSplitLine");

  if (isShooterSplitView()) {
    const nLocal = getLocalHumanPlayers().length;
    document.body.classList.toggle("split-2p", nLocal === 2);
    document.body.classList.toggle("split-4p", nLocal >= 3);
    renderShooterSplitView(W, H);
    return;
  }
  document.body.classList.remove("split-2p", "split-2p-v", "split-2p-h", "split-4p");

  if (!isCoopSplitView()) {
    if (line) line.style.display = "none";
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    if (survivors.length && (gameState === "play" || gameState === "paused" || gameState === "loading")) {
      updateCamera();
    }
    renderer.render(scene, camera);
    return;
  }

  const p1 = survivors.find((s) => s.profile === "p1" && !s.caught);
  const p2 = survivors.find((s) => s.profile === "p2" && !s.caught);
  if (!p1 || !p2) {
    if (line) line.style.display = "none";
    renderer.setScissorTest(false);
    updateCamera();
    renderer.render(scene, camera);
    return;
  }

  if (line) line.style.display = "block";
  ensureCoopCamera();
  const halfW = Math.floor((W - COOP_SPLIT_GAP) / 2);
  const rightW = W - halfW - COOP_SPLIT_GAP;
  const bg = scene.background?.isColor ? scene.background.getHex() : 0x1a1228;

  renderer.setScissorTest(true);
  updateCameraForPlayer(camera, p1, camYaw, camPitch);
  camera.aspect = halfW / H;
  camera.updateProjectionMatrix();
  renderer.setViewport(0, 0, halfW, H);
  renderer.setScissor(0, 0, halfW, H);
  renderer.setClearColor(bg);
  renderer.clear(true, true, true);
  renderer.render(scene, camera);

  renderer.setViewport(halfW, 0, COOP_SPLIT_GAP, H);
  renderer.setScissor(halfW, 0, COOP_SPLIT_GAP, H);
  renderer.setClearColor(0x000000);
  renderer.clear(true, true, true);

  updateCameraForPlayer(camera2, p2, p2.yaw ?? Math.PI, camPitch);
  camera2.aspect = rightW / H;
  camera2.updateProjectionMatrix();
  const x0 = halfW + COOP_SPLIT_GAP;
  renderer.setViewport(x0, 0, rightW, H);
  renderer.setScissor(x0, 0, rightW, H);
  renderer.setClearColor(bg);
  renderer.clear(true, true, true);
  renderer.render(scene, camera2);

  renderer.setScissorTest(false);
}

function jumpYFor(p) {
  return worldHeight(p);
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function paintColorCss(c) {
  return `#${((c ?? 0xffffff) >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
}

function drawShooterRadar() {
  if (!minimapCanvas || !maze || !isShooterMode()) return;
  if (!minimapBaseCanvas) rebuildMinimapBase();
  const ctx2 = minimapCanvas.getContext("2d");
  const w = minimapCanvas.width;
  const pad = 3;
  const cellPx = (w - pad * 2) / ctx.w;
  ctx2.drawImage(minimapBaseCanvas, 0, 0);

  const toMap = (wx, wz) => [
    pad + ((wx + (ctx.w * ctx.cell) / 2) / ctx.cell) * cellPx,
    pad + ((wz + (ctx.h * ctx.cell) / 2) / ctx.cell) * cellPx,
  ];

  const human = getHumanSurvivor();
  for (const s of survivors) {
    if (isShooterPlayerDown(s)) continue;
    const [px, py] = toMap(s.pos.x, s.pos.z);
    const isYou = s === human;
    ctx2.fillStyle = paintColorCss(s.paintColor ?? s.charDef?.accent ?? 0xffffff);
    ctx2.strokeStyle = isYou ? "#ffffff" : "#00000088";
    ctx2.lineWidth = isYou ? 2 : 1;
    ctx2.beginPath();
    ctx2.arc(px, py, isYou ? 5 : 4, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.stroke();
    if (isYou) {
      const face = camYaw;
      ctx2.save();
      ctx2.translate(px, py);
      ctx2.rotate(-face);
      ctx2.fillStyle = "#ffffff";
      ctx2.beginPath();
      ctx2.moveTo(0, -8);
      ctx2.lineTo(4, 3);
      ctx2.lineTo(-4, 3);
      ctx2.closePath();
      ctx2.fill();
      ctx2.restore();
    }
  }
}

function drawMinimap() {
  if (!minimapCanvas || !maze || isShooterMode()) return;
  if (!minimapBaseCanvas) rebuildMinimapBase();
  const ctx2 = minimapCanvas.getContext("2d");
  const w = minimapCanvas.width;
  const pad = 3;
  const cellPx = (w - pad * 2) / ctx.w;
  ctx2.drawImage(minimapBaseCanvas, 0, 0);

  const toMap = (wx, wz) => [
    pad + ((wx + (ctx.w * ctx.cell) / 2) / ctx.cell) * cellPx,
    pad + ((wz + (ctx.h * ctx.cell) / 2) / ctx.cell) * cellPx,
  ];

  const [ex, ey] = toMap(exitPos.x, exitPos.z);
  ctx2.fillStyle = "#33ff99";
  ctx2.beginPath();
  ctx2.arc(ex, ey, 4, 0, Math.PI * 2);
  ctx2.fill();

  for (const k of killers) {
    const [kx, ky] = toMap(k.pos.x, k.pos.z);
    ctx2.fillStyle = "#ff3344";
    ctx2.beginPath();
    ctx2.arc(kx, ky, 3, 0, Math.PI * 2);
    ctx2.fill();
  }

  teleporters.forEach((tp) => {
    const [ax, ay] = toMap(tp.a.x, tp.a.z);
    ctx2.fillStyle = "#66ccff";
    ctx2.fillRect(ax - 2, ay - 2, 4, 4);
  });

  missionStations.forEach((st) => {
    if (st.done) return;
    const [mx, my] = toMap(st.x, st.z);
    ctx2.fillStyle = "#ffaa22";
    ctx2.fillRect(mx - 3, my - 3, 6, 6);
  });

  const colors = ["#ffdd44", "#44ddff"];
  const human = getCameraFocus();
  survivors.forEach((s, i) => {
    if (s.caught) return;
    const [px, py] = toMap(s.pos.x, s.pos.z);
    const isYou = s === human || (!isSpectating() && s.profile === "p1" && !s.isAI);
    ctx2.fillStyle = colors[i] || "#fff";
    ctx2.beginPath();
    ctx2.arc(px, py, isYou ? 4 : 3, 0, Math.PI * 2);
    ctx2.fill();
    if (isYou) {
      const face = s === human && !playAsKiller ? camYaw : (s.yaw ?? 0);
      ctx2.save();
      ctx2.translate(px, py);
      ctx2.rotate(-face);
      ctx2.fillStyle = "#ffffff";
      ctx2.beginPath();
      ctx2.moveTo(0, -7);
      ctx2.lineTo(4, 2);
      ctx2.lineTo(-4, 2);
      ctx2.closePath();
      ctx2.fill();
      ctx2.strokeStyle = "#ffdd44";
      ctx2.lineWidth = 1.2;
      ctx2.stroke();
      ctx2.restore();
    }
  });

  if (keyHuntState?.doors) {
    keyHuntState.doors.forEach((d) => {
      if (d.open) return;
      const [dx, dy] = toMap(d.x, d.z);
      ctx2.fillStyle = `#${(d.color >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
      ctx2.fillRect(dx - 2, dy - 2, 4, 4);
    });
  }
  if (puzzleDoorState?.doors) {
    ctx2.font = "bold 11px system-ui, sans-serif";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    const pFocus = getHumanFocus();
    const pc = pFocus ? worldToCell(ctx, pFocus.pos.x, pFocus.pos.z) : { gx: 0, gz: 0 };
    puzzleDoorState.doors.forEach((d) => {
      if (d.open) return;
      const mp = getDoorMapPos(ctx, d);
      const ac = worldToCell(ctx, mp.x, mp.z);
      const locked = d.requires >= 0 && !puzzleDoorState.doors[d.requires]?.open;
      const reachable = !locked && isCellReachable(ctx, maze, pc.gx, pc.gz, ac.gx, ac.gz);
      const [dx, dy] = toMap(mp.x, mp.z);
      ctx2.fillStyle = locked ? "#665577" : reachable ? "#ffdd55" : "#aa8833";
      ctx2.strokeStyle = "#221133";
      ctx2.lineWidth = 2;
      ctx2.strokeText("?", dx, dy);
      ctx2.fillText("?", dx, dy);
    });
  }
}

function updatePuzzleWaypointHud() {
  const el = document.getElementById("puzzleWaypoint");
  if (!el) return;
  if (!isPuzzleDoorMode() || !puzzleDoorState || playAsKiller || activeQuiz) {
    el.hidden = true;
    return;
  }
  const p = getHumanFocus();
  if (!p || p.caught) {
    el.hidden = true;
    return;
  }
  const target = getNextPuzzleDoor(puzzleDoorState.doors);
  if (!target) {
    el.hidden = true;
    return;
  }
  const ap = getDoorApproach(ctx, target);
  const ac = worldToCell(ctx, ap.x, ap.z);
  const pc = worldToCell(ctx, p.pos.x, p.pos.z);
  const reachable = isCellReachable(ctx, maze, pc.gx, pc.gz, ac.gx, ac.gz);
  const best = Math.hypot(ap.x - p.pos.x, ap.z - p.pos.z);
  const dx = ap.x - p.pos.x;
  const dz = ap.z - p.pos.z;
  const ang = Math.atan2(dx, dz) - camYaw;
  const deg = ((ang * 180) / Math.PI + 360) % 360;
  const arrow =
    deg < 22.5 || deg >= 337.5 ? "↑" :
    deg < 67.5 ? "↗" :
    deg < 112.5 ? "→" :
    deg < 157.5 ? "↘" :
    deg < 202.5 ? "↓" :
    deg < 247.5 ? "↙" :
    deg < 292.5 ? "←" : "↖";
  el.hidden = false;
  el.textContent = reachable
    ? `${arrow} #${target.label} · ${best.toFixed(0)}m`
    : `#${target.label} 需繞路 · ${best.toFixed(0)}m`;
  el.title = reachable
    ? "跟著小地圖黃色 ? 與發光門 · 靠近按 E"
    : "橘色 ? = 目前路被擋 · 請找其他通道繞過去";
  const obj = document.getElementById("hudObjective");
  if (obj && best > 6) {
    obj.dataset.puzzleDist = String(Math.round(best));
  }
}

function tickPuzzleDoorBeacons() {
  if (!isPuzzleDoorMode() || !puzzleDoorState?.doors) return;
  const t = elapsed * 3;
  const next = getNextPuzzleDoor(puzzleDoorState.doors);
  for (const d of puzzleDoorState.doors) {
    if (!d.mesh || d.open) continue;
    const active = d === next;
    const pulse = active ? 0.55 + Math.sin(t) * 0.35 : 0.2;
    d.mesh.scale.setScalar(0.94 + pulse * 0.1);
    if (d.beacon) d.beacon.intensity = active ? 1.6 + Math.sin(t) * 0.9 : 0.25;
    d.mesh.traverse((c) => {
      if (c.material?.emissive) {
        c.material.emissiveIntensity = active ? 0.7 + Math.sin(t) * 0.35 : 0.35;
      }
    });
  }
}

function updateHUD() {
  syncSpectateUi();
  const focus = isSpectating() ? getCameraFocus() : resolvePlayFocus();
  if (!focus) return;
  if (!exitPos && usesExitWin()) return;

  const maxHp = Math.max(1, focus.maxHp ?? 100);
  const hp = Math.round(focus.hp ?? maxHp);
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const hpEl = document.getElementById("hudHp");
  if (hpEl) hpEl.textContent = isShooterMode() ? `${hp}/${maxHp}` : String(hp);
  const hpBar = document.getElementById("hudHpBar");
  if (hpBar) {
    hpBar.style.width = `${hpPct}%`;
    hpBar.style.background =
      hp > 60 ? "linear-gradient(90deg,#9a1520,#e82238)" :
      hp > 30 ? "linear-gradient(90deg,#7a1018,#cc3344)" :
      "linear-gradient(90deg,#4a0810,#aa1122)";
  }

  const timerEl = document.getElementById("hudTimer");
  if (timerEl) timerEl.textContent = formatTime(elapsed);
  const roundLbl = document.getElementById("hudRoundLabel");
  if (roundLbl) roundLbl.textContent = formatTime(elapsed);

  const kt = document.getElementById("hudKillerTimer");
  if (kt) {
    const m = Math.floor(Math.max(0, killerTimer) / 60);
    const s = Math.max(0, Math.ceil(killerTimer)) % 60;
    kt.textContent = `獵人剩餘 ${m}:${String(s).padStart(2, "0")}`;
  }

  const ca = document.getElementById("hudCaught");
  if (ca) {
    ca.textContent = `倖存 ${getAliveSurvivors().length}/${survivors.length} · 任務 ${missionsDone}/${missionStations.length}`;
  }

  document.getElementById("hudChar").textContent = focus.charDef?.name || "—";

  let distK = 99;
  for (const k of killers) {
    const d = Math.hypot(focus.pos.x - k.pos.x, focus.pos.z - k.pos.z);
    if (d < distK) distK = d;
  }
  const distExit = exitPos
    ? Math.hypot(focus.pos.x - exitPos.x, focus.pos.z - exitPos.z)
    : 99;

  if (isShooterMode() && shooterState) {
    const gun = getShooterWeapon(focus.weaponId);
    const myScore = focus._shooterStats?.kills ?? 0;
    const tLeft = `${Math.floor(Math.max(0, killerTimer) / 60)}:${String(Math.max(0, Math.ceil(killerTimer)) % 60).padStart(2, "0")}`;
    const styleTag = shooterState.playStyle === "ffa"
      ? "自由混戰"
      : shooterState.playStyle === "mole"
        ? "無間道"
        : "團隊對抗";
    document.getElementById("hudObjective").textContent =
      focus._awaitingRespawn
        ? "已擊倒 · 按 R 或「重生」按鈕復活"
        : `【${shooterState.levelName}】${styleTag} · 積分 ${myScore} · ${gun.name}`;
    document.getElementById("hpBarWrap").style.display = "block";
    document.getElementById("hudKiller").textContent =
      shooterState.playStyle === "ffa" ? `槍戰 · ${survivors.length} 人混戰` : "槍戰 · 紅藍隊";
    document.getElementById("hudKillerTimer").textContent = `剩餘 ${tLeft}`;
    warning.classList.remove("show");
    const distElEarly = document.getElementById("missionDist");
    if (distElEarly) {
      distElEarly.textContent = isTouchUiEnabled()
        ? `${gun.name} · 積分 ${myScore} · 點戰績看名單`
        : `${gun.name} · 積分 ${myScore} · Tab 戰績 · 綠十字補血`;
    }
    const ca = document.getElementById("hudCaught");
    if (ca) {
      ca.textContent = `存活 ${getAliveSurvivors().length}/${survivors.length} · 擊殺積分`;
    }
    document.getElementById("hudChar").textContent = focus.charDef?.name || "—";
    const mapLabel = document.getElementById("hudMapName");
    if (mapLabel && selectedLevel) {
      mapLabel.textContent = `${selectedLevel.name} · ${selectedLevel.desc || ""}`.slice(0, 48);
    }
    document.getElementById("hudPhase").textContent =
      focus._awaitingRespawn ? "等待重生" : `槍戰 · ${selectedLevel?.name || "競技"}`;
    return;
  }

  if (playAsKiller) {
    document.getElementById("hudObjective").textContent =
      `擊倒倖存者 ${survivors.length - getAliveSurvivors().length}/${survivors.length}`;
    document.getElementById("hpBarWrap").style.display = "none";
  } else {
    document.getElementById("hpBarWrap").style.display = "block";
    document.getElementById("hudObjective").textContent =
      isAtExit(focus) ? "已到達出口！" :
      distExit < 8 ? "衝向綠色出口！" : `出口 ${distExit.toFixed(0)}m`;
  }

  document.getElementById("hudKiller").textContent =
    killers.length ? `獵人 ${killers.map((k) => k.charDef.name).join(", ")} · ${distK.toFixed(0)}m` : "—";

  const djBar = document.getElementById("hudDjBar");
  const djFill = document.getElementById("hudDjFill");
  if (djBar && djFill) {
    const djUntil = focus._djRechargeUntil ?? 0;
    if (!playAsKiller && hasDoubleJumpPassive(focus) && elapsed < djUntil) {
      djBar.style.display = "block";
      const pct = 1 - (djUntil - elapsed) / DOUBLE_JUMP_RECHARGE;
      djFill.style.width = `${Math.max(0, Math.min(100, pct * 100))}%`;
    } else {
      djBar.style.display = "none";
    }
  }

  const sprintEl = document.getElementById("hudSprint");
  if (sprintEl) {
    if (focus.role === "killer") {
      sprintEl.textContent = `移速 ${focus.sprintMeter != null ? Math.round(focus.sprintMeter) : 100}%`;
    } else if (hasDoubleJumpPassive(focus) && elapsed < (focus._djRechargeUntil ?? 0)) {
      sprintEl.textContent = `二段跳恢復 ${Math.max(0, (focus._djRechargeUntil - elapsed)).toFixed(1)}s`;
    } else {
      sprintEl.textContent = focus.sprintExhausted
        ? `衝刺冷卻 ${Math.max(0, (focus.sprintRecoverAt || 0) - elapsed).toFixed(1)}s`
        : `衝刺 ${Math.round(focus.sprintMeter ?? 100)}%${hasDoubleJumpPassive(focus) ? " · 二段跳就緒" : ""}`;
    }
  }

  const distEl = document.getElementById("missionDist");
  if (distEl) {
    distEl.textContent = playAsKiller
      ? `最近倖存 ${distK.toFixed(0)}m · 獵人時間倒數中`
      : `出口 ${distExit.toFixed(0)}m · 獵人 ${distK.toFixed(0)}m · HP ${hp}`;
  }

  const mapLabel = document.getElementById("hudMapName");
  if (mapLabel && selectedLevel) {
    if (gameMode === "solo" && realmZonesState && focus) {
      const realm = getRealmAt(ctx, focus.pos.x, focus.pos.z);
      mapLabel.textContent = `${realm.name} · ${selectedLevel.name}`.slice(0, 52);
      if (realm.id !== lastRealmAtmosphereId) {
        lastRealmAtmosphereId = realm.id;
        applyRealmAtmosphere(scene, realm, getLevelTheme(selectedLevel).sky);
        setMusicZoneTint(realm.id);
        if (zoneParticleGroup) clearZoneParticles(scene);
        zoneParticleGroup = buildZoneParticles(scene, realm);
        if (!focus.isAI) showToast(`進入 ${realm.name}`, 1200);
      }
    } else {
      mapLabel.textContent = isClassicMode()
        ? `經典 · ${selectedLevel.name}`
        : `${selectedLevel.name} · ${selectedLevel.desc || ""}`.slice(0, 48);
    }
  }

  if (isPuzzleDoorMode() && puzzleDoorState) {
    const left = puzzleDoorsRemaining(puzzleDoorState.doors);
    const total = puzzleDoorState.doors.length;
    document.getElementById("hudObjective").textContent =
      left > 0
        ? `謎題門 ${total - left}/${total} · 跟著 ? 與箭頭 · 靠近發光門按 E 解題`
        : `全員前往出口 · 謎題已解完`;
    document.getElementById("hudKiller").textContent = "解題闖關 · 無獵人";
    warning.classList.remove("show");
    if (distEl) distEl.textContent = `謎門剩 ${left} · 出口 ${distExit.toFixed(0)}m · HP ${hp}`;
    return;
  }

  if (isPlatformerMode() && platformerState) {
    const aliveE = platformerState.enemies.filter((e) => !e.squashed).length;
    document.getElementById("hudObjective").textContent =
      `小怪剩 ${aliveE} · 出口 ${distExit.toFixed(0)}m`;
    document.getElementById("hudKiller").textContent = "平台冒險 · 無獵人";
    warning.classList.remove("show");
    if (distEl) distEl.textContent = `小怪 ${aliveE} · 出口 ${distExit.toFixed(0)}m · HP ${hp}`;
    return;
  }

  if (isPuzzleDoorMode() && puzzleDoorState) {
    const left = puzzleDoorsRemaining(puzzleDoorState.doors);
    const total = puzzleDoorState.doors.length;
    document.getElementById("hudObjective").textContent =
      left > 0
        ? `謎題門 ${total - left}/${total} · 跟著 ? 與箭頭 · 靠近發光門按 E 解題`
        : `全員前往出口 · 謎題已解完`;
    document.getElementById("hudKiller").textContent = "解題闖關 · 無獵人";
    warning.classList.remove("show");
    if (distEl) distEl.textContent = `謎門剩 ${left} · 出口 ${distExit.toFixed(0)}m · HP ${hp}`;
    return;
  }

  if (isKeyHuntMode() && keyHuntState) {
    const keysL = keysRemaining(keyHuntState.keys);
    const doorsL = doorsRemaining(keyHuntState.doors);
    document.getElementById("hudObjective").textContent =
      doorsL > 0 ? `開啟所有門（剩 ${doorsL}）· 鑰匙 ${keysL}` :
      isAtExit(focus) ? "已到達出口！" : `全員前往出口 · 鑰匙 ${keysL}`;
    document.getElementById("hudKiller").textContent = "無獵人 · 鑰匙逃脫";
    document.getElementById("hudKillerTimer").textContent =
      `剩餘 ${Math.floor(Math.max(0, killerTimer) / 60)}:${String(Math.max(0, Math.ceil(killerTimer)) % 60).padStart(2, "0")}`;
    warning.classList.remove("show");
    if (distEl) {
      distEl.textContent = `門 ${doorsL} · 鑰匙 ${keysL} · 出口 ${distExit.toFixed(0)}m · HP ${hp}`;
    }
    return;
  }

  if (!playAsKiller && gameState === "play" && distK < WARN_DIST) {
    if (elapsed - lastChaseSfx > 2.2) {
      playSfx("chase", 0.5);
      lastChaseSfx = elapsed;
    }
    if (distK < 12 && elapsed - lastHorrorSfx > 3.5) {
      playSfx("horror", 0.9);
      lastHorrorSfx = elapsed;
    }
  }
  warning.classList.toggle("show", !playAsKiller && distK < WARN_DIST && gameState === "play");
  document.getElementById("hudPhase").textContent =
    playAsKiller ? `扮演殺手 · ${selectedLevel.name}` :
    distK < WARN_DIST ? "NOW, RUN!" : `關卡 ${selectedLevel.name}`;

  const arrow = document.getElementById("compassArrow");
  if (arrow && !playAsKiller) {
    const dx = exitPos.x - focus.pos.x;
    const dz = exitPos.z - focus.pos.z;
    arrow.style.transform = `rotate(${Math.atan2(dx, dz) - camYaw}rad)`;
  }

  if (exitGroup) exitGroup.rotation.y += 0.015;
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  try {
  loopFrame(now);
  } catch (err) {
    console.error("遊戲迴圈錯誤", err);
    if (gameState === "play" || gameState === "paused") {
      showToast(`遊戲發生錯誤：${err?.message || err}`, 5000);
      gameState = "paused";
      document.getElementById("pausePanel")?.classList.add("show");
    }
  }
}

function loopFrame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  frameCount++;

  touchControlsTick(keys);
  pollTouchVirtualKeys();
  tickGamepadPresence((connected) => {
    gamepadActive = connected;
    if (gameState === "play") {
      refreshGameplayHints();
      updateAbilityBar();
      updateInventoryBar();
    }
  });
  const touchLook = consumeTouchLook();
  if (touchLook && gameState === "play" && !isCoopSplitView() && !isShooterSplitView()) {
    const lookK = 0.0048;
    camYaw -= touchLook.dx * lookK;
    applyLookPitch(touchLook.dy, lookK);
  }
  applyGamepadCamera(dt);
  updateQuizGamepad();

  if (gameState === "play") {
    if (frameCount % 45 === 0) refreshGameplayHints();
    updatePerfTier();
    if (pointerLocked || hasMoved || elapsed > 1.5 || isTouchUiEnabled()) {
      clickPrompt.classList.remove("show");
    }
    elapsed += dt;
    killerTimer -= dt;
    tickMissionGlow(missionStations, animTime);
    updateSurvivors(dt);
    if (ledgeHintState?.hints?.length && verticalWorldState) {
      const ledgeFocus = getHumanSurvivor() || survivors[0];
      if (ledgeFocus) {
        tickLedgeHints(
          ledgeFocus, ledgeHintState.hints, ledgeHintState.softDrops,
          verticalWorldState, dt, (msg, ms) => showToast(msg, ms)
        );
      }
    }
    if (gameMode === "solo" && zoneParticleGroup) {
      const pf = getHumanSurvivor() || survivors[0];
      if (pf) tickZoneParticles(dt, pf.pos.x, pf.pos.z);
    }
    handleZoomKeys();
    if (keyHuntState) {
      updateKeyHuntDoorHints();
      updateKeyHunt(dt, animTime, keyHuntState, getAliveSurvivors(), ctx, maze, exitPos, {
        onKey(p, k) {
          if (!p.isAI) {
            playSfx("item");
            showToast(`取得鑰匙 #${k.label}`, 800, "key");
            updateKeyHuntBar();
          }
        },
        onTrap(p) {
          if (!p.isAI) {
            playSfx("teleport", 0.4);
            showToast("陷阱！被傳送到迷宮遠處…", 900);
          }
        },
        onSpike(p, dmg) {
          damageSurvivor(p, { charDef: { name: "尖刺" } }, dmg);
          if (!p.isAI) showToast("移動尖刺！注意閃避", 500);
        },
      });
      if (frameCount % 30 === 0) setMissionText();
    }
    if (platformerState) {
      updatePlatformer(dt, platformerState, getAliveSurvivors(), {
        onStomp(p) {
          if (!p.isAI) showToast("踩扁小怪！", 500);
        },
        onEnemyTouch(p, e, dmg) {
          damageSurvivor(p, { charDef: { name: "小怪" } }, dmg);
        },
        onHazard(p, dmg, name) {
          damageSurvivor(p, { charDef: { name } }, dmg);
          if (!p.isAI) showToast(`${name}！`, 500);
        },
      });
    }
    if (isShooterMode() && shooterState) {
      tickShooterAutoFire();
      syncShooterOverheadLabels({
        players: survivors,
        viewports: getShooterLabelViewports(window.innerWidth, window.innerHeight),
        playStyle: shooterState?.playStyle ?? shooterPlayStyle,
        state: shooterState,
        active: gameState === "play",
      });
      if (shooterScoreboardOpen) {
        renderShooterScoreboard(survivors, getHumanSurvivor(), shooterState?.playStyle ?? shooterPlayStyle);
      }
      tickShooterHealOrbs(dt, survivors, scene, (p) => {
        playShooterSfx("pickupHeal", playSfx, 0.12);
        if (!p.isAI) showToast("補血 +50% HP", 900);
      });
      tickShooterRespawns(survivors, ctx, maze, elapsed);
      tickMoleAlerts(shooterState, elapsed, (msg, ms) => showToast(msg, ms, "kill"));
      for (const s of survivors) {
        if (s._shooterDowned) tickShooterDownedPose(s, elapsed, worldHeight);
      }
      syncShooterPlayerVisibility();
      syncShooterRespawnUi();
      updateShooterBots(dt, survivors, ctx, maze, shooterState, {
        elapsed,
        moveEntity: updateEntity,
        fire: (bot, yaw) => {
          const dir = new THREE.Vector3(Math.sin(yaw), 0.04, Math.cos(yaw));
          bot._lastFireDir = dir;
          const eyeY = 1.52 + worldHeight(bot);
          spawnPaintFromAim(
            scene, ctx, maze,
            bot.pos.x + dir.x * 0.85, eyeY + dir.y * 0.85, bot.pos.z + dir.z * 0.85,
            dir.x, dir.y, dir.z, bot.paintColor ?? bot._shooterColor, bot.mesh
          );
          for (const pr of fireShooterWeapon(bot, yaw, dir)) {
            pr.color = bot.paintColor ?? pr.color;
            projectiles.push(pr);
          }
          muzzleFlash(bot);
          if (Math.random() < 0.35) playSfx("shoot", 0.06);
        },
      });
    }
    if (!isKeyHuntMode() && !isPlatformerMode() && !isShooterMode()) updateKillers(dt);
    updateBouncePads(bouncePads, getAliveSurvivors(), verticalWorldState, dt, (p) => {
      playBouncePadSfx(0.15);
      if (!p.isAI) showToast("彈跳板！空中可移動調整落點", 650);
    });
    updateProjectiles(dt);
    updateWorldItems();
    updateTeleporters();
    syncProjectileMeshes();
    updateMinions(dt);
    updateVfx(dt);
    if (isShooterMode()) {
      updateShooterFov();
      const sh = scene?.userData?.shadowLight;
      const focus = getHumanSurvivor() || getCameraFocus();
      if (sh && focus) {
        sh.position.set(focus.pos.x + 16, 40, focus.pos.z + 12);
        sh.target.position.set(focus.pos.x, 0, focus.pos.z);
        sh.target.updateMatrixWorld();
      }
    }
    if (isShooterMode()) {
      if (frameCount % 3 === 0) drawShooterRadar();
    } else {
      const mapEvery = perfTier === "low" ? 10 : perfTier === "med" ? 6 : 4;
      if (frameCount % mapEvery === 0) drawMinimap();
    }
    animTime += dt;
    checkMatchEnd();
  }
  if (gameState === "play") {
    if (gamepadActive) tickGamepadHud(getSplitGamepadSlots());
    else hideGamepadHud();
  } else {
    hideGamepadHud();
  }
  if (gameState === "play" || gameState === "paused") {
    updateHUD();
    updateCrosshair();
    if (frameCount % 12 === 0) {
      updateAbilityBar();
      if (isTouchUiEnabled()) syncTouchHudFromPlayer();
    }
  }
  renderGameView();
}

function boot() {
  initAudio();
  bindMobileAudioElement(musicEl);
  bindAudioUnlock();
  initMenu();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (gameState === "menu" || gameState === "end")) {
      stopGameMusic(musicEl);
      stopShooterResultMusic();
    }
  });
  window.addEventListener("pagehide", () => {
    stopGameMusic(musicEl);
    stopShooterResultMusic();
  });
  try {
    ensureGraphics();
    setupLights();
  } catch (err) {
    console.error(err);
  }
  setupInput();
  const touch = initTouchControls({
    keys,
    getBindings,
    getContext: () => ({
      gameState,
      playAsKiller,
      getShooterSettings: () => shooterSettings,
      setShooterAutoAim: (on) => {
        shooterSettings.autoAim = !!on;
        saveShooterSettings();
      },
      isKeyHunt: isKeyHuntMode,
      isShooterMode,
      isHumanKiller: isHumanKillerControl,
      getTouchProfile: getTouchBindingProfile,
      getShooterWeaponSlot: () => {
        const h = getHumanSurvivor();
        const w = getShooterWeapon(h?.weaponId);
        return w?.slot ?? 2;
      },
      onShooterFire: () => {
        if (gameState !== "play" || !isShooterMode()) return;
        const h = getHumanSurvivor();
        if (h && !isShooterPlayerDown(h)) tryShooterFire(h);
      },
      onShooterScope: () => {
        if (gameState !== "play" || !isShooterMode()) return;
        const h = getHumanSurvivor();
        if (!h || getShooterWeapon(h.weaponId)?.id !== "sniper") return;
        shooterAds = !shooterAds;
        document.body.classList.toggle("shooter-ads", shooterAds);
        updateShooterFov();
        updateCrosshair();
        updateTouchGunHighlight(getShooterWeapon(h.weaponId)?.slot ?? 4);
      },
      onShooterWeapon: (slot) => tryShooterWeaponSwitch(slot),
      onKillerAttack: () => {
        if (gameState !== "play") return;
        const k = killers.find((kk) => !kk.isAI);
        if (k) tryKillerBasicAttack(k);
      },
      updateTouchSkillLabels: () => syncTouchHudFromPlayer(),
      clearJumpHeld: () => {
        survivors.forEach((s) => { s._jumpHeld = false; });
      },
      clearSlideHeld: () => {
        survivors.forEach((s) => {
          s._slideKeyHeld = false;
          if (s.slideTimer <= 0) s.sliding = false;
        });
      },
    }),
  });
  gamepadActive = isGamepadConnected();
  if (touch?.enabled) {
    syncTouchButtonBindings(getBindings);
    updateCanvasPointerEvents();
  }
  initMobileUi();
  loop(performance.now());
}

function initMobileUi() {
  if (!isTouchUiEnabled()) return;
  document.body.classList.add("mobile-menu");
  document.querySelectorAll(".menu-nav-btn[data-short]").forEach((btn) => {
    btn.textContent = btn.dataset.short || btn.textContent;
  });
  updateCanvasPointerEvents();
  syncTouchButtonBindings(getBindings);
  syncFullscreenButtonLabel();
  initMobileHud();
  refreshMenuForMode();
  menuUiRef?.updatePickLabels?.();

}

function initMobileHud() {
  const pause = document.getElementById("btnHudPause");
  if (pause) pause.hidden = false;
}

boot();
