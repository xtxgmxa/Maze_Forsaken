import * as THREE from "three";
import { SURVIVORS, KILLERS, buildForsakenCharacter } from "./characters.js";
import { LEVELS, KEY_HUNT_LEVELS, PLATFORMER_LEVELS, getLevelTheme } from "./levels.js";
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
import {
  ITEM_DEFS, addInventoryItem, useInventoryItem,
  getActiveInventoryList, getPassiveList, applyPassive,
} from "./inventory.js";
import { initAudioEngine, playSfx, bindAudioUnlock, loadAudioSettings, getAudioSettings, setAudioSettings, resetAudioSettings, applyAudioSettings } from "./audio.js";
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
  initTouchControls, touchControlsTick, consumeTouchLook, isTouchUiEnabled, applyMobileCameraDefaults,
  syncTouchButtonBindings, updateTouchSkillLabels, updateTouchAbilityCooldowns,
  syncFullscreenButtonLabel, setTouchMissionHighlight, openMobileSettingsPanel,
  updateTouchAttackVisibility, bindMobileAudioElement,
} from "./touchControls.js";
import { initMenuWizard, showCoopMobileWarn, initPerfTipModal } from "./menuUI.js";

let menuUiRef = null;
let gamepadActive = false;
let quizGp = { x: 0.5, y: 0.5, choice: 0, prev: {} };

const MODE_PREVIEW = {
  solo: "assets/characters/survivors/noob.jpg",
  coop: "assets/characters/survivors/builderman.jpg",
  versus: "assets/characters/killers/c00lkidd.jpg",
  keyhunt: "assets/characters/survivors/elliot.jpg",
  platformer: "assets/characters/survivors/chance.jpg",
  practice: "assets/characters/survivors/guest1337.jpg",
  mob: "assets/characters/survivors/dusekkar.jpg",
  hardcore: "assets/characters/killers/slasher.jpg",
};
import {
  generateMaze, createMazeContext, cellCenter, buildMazeMeshes,
  createExitMarker, moveWithCollision, collides, bfsNextStep, worldToCell,
  addMazeLoops, createTeleporters, buildTeleporterMeshes,
  spawnWorldItems, buildItemMeshes,
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
const CAM_PITCH_MIN = -0.15;
const CAM_PITCH_MAX = 1.48;

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
let playAsKiller = false;
let gameState = "menu";
let nearMissionStation = null;

let renderer, scene, camera, camera2;
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
  k.mesh.position.set(k.pos.x, k._jumpY ?? 0, k.pos.z);
  k.mesh.rotation.y = k.yaw ?? Math.atan2(k.vel?.x || 0, k.vel?.z || 1);
}

function updateCrosshair() {
  const ch = document.getElementById("crosshair");
  if (!ch) return;
  const hk = killers.find((k) => !k.isAI);
  const prof = playAsKiller ? "p1" : "killer";
  const aim = !!(
    hk && gameState === "play" &&
    (playAsKiller || gameMode === "versus") &&
    keyDown(keys, prof, "slide")
  );
  ch.classList.toggle("show", aim);
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
  return gameMode === "keyhunt" || gameMode === "platformer";
}

function resetCategoryAfterDedicatedMode(prevMode) {
  if (
    (prevMode === "keyhunt" || prevMode === "platformer") &&
    !isDedicatedSpecialMode()
  ) {
    const catEl = document.getElementById("levelCategory");
    if (catEl && (catEl.value === "keyhunt" || catEl.value === "platformer")) {
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
  const noKiller = isKeyHuntMode() || isPlatformerMode();
  const touch = isTouchUiEnabled();
  const catShown = catSec && catSec.style.display !== "none";
  const shouldShowCat = !dedicated;
  const categoryMismatch = dedicated && levelCategory !== gameMode;

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

function refreshMenuForMode() {
  const dedicatedKh = gameMode === "keyhunt";
  const dedicatedPf = gameMode === "platformer";
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
  } else if (catEl) {
    levelCategory = catEl.value;
    if (levelCategory === "keyhunt" || levelCategory === "platformer") {
      winGoal = "exit";
      if (winEl) winEl.value = "exit";
    } else if (winEl) {
      winGoal = winEl.value;
    }
  }

  const noKiller = isKeyHuntMode() || isPlatformerMode();
  const hideCatDropdown = dedicatedKh || dedicatedPf;
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

  if (noKiller) {
    playerRole = "survivor";
    const roleEl = document.getElementById("playerRole");
    if (roleEl) roleEl.value = "survivor";
    updatePickRoleLabel();
  }

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

  rebuildLevelGrid();

  const modeGrid = document.getElementById("modeGrid");
  [
    { id: "solo", name: "單人", desc: "你 vs AI 獵人 · 滑鼠+WASD" },
    { id: "coop", name: "雙人合作", desc: "2 倖存者 vs AI · P2 方向鍵" },
    { id: "versus", name: "雙人對戰", desc: "1 倖存者 vs 1 獵人（玩家）" },
    { id: "keyhunt", name: "鑰匙逃脫", desc: "無獵人 · 找鑰匙開門 · 陷阱與尖刺" },
    { id: "platformer", name: "平台冒險", desc: "踩小怪 · 噴火落石 · 單向門（無獵人）" },
    { id: "practice", name: "練習模式", desc: "獵人較慢 · 時間較長 · 適合新手" },
    { id: "mob", name: "團隊逃亡", desc: "4 倖存者 · 2 獵人追擊" },
    { id: "hardcore", name: "硬核", desc: "獵人更快 · 任務更少" },
  ].forEach((m, i) => {
    const card = document.createElement("div");
    card.className = "mode-card" + (i === 0 ? " selected" : "");
    card.innerHTML = `<h3>${m.name}</h3><p>${m.desc}</p>`;
    card.onclick = () => {
      document.querySelectorAll(".mode-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      const prevMode = gameMode;
      gameMode = m.id;
      resetCategoryAfterDedicatedMode(prevMode);
      document.getElementById("p2CharSection").style.display =
        m.id === "solo" || m.id === "keyhunt" || m.id === "platformer" ? "none" : "block";
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
    if (isKeyHuntMode() || isPlatformerMode()) return;
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
    shouldHideKiller: () => isKeyHuntMode() || isPlatformerMode(),
    shouldHideP2: () => gameMode === "solo" || gameMode === "keyhunt" || gameMode === "platformer",
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
  const showRole = solo && !isKeyHuntMode() && !isPlatformerMode();
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
  return !!(human && human.caught);
}

function getSpectateTargets() {
  return getAliveSurvivors();
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
  let best = null;
  let bestD = Infinity;
  for (const k of killers) {
    const d = Math.hypot(s.pos.x - k.pos.x, s.pos.z - k.pos.z);
    if (d < bestD) { bestD = d; best = k; }
  }
  return { killer: best, dist: bestD };
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
  if (human) return human.caught ? null : human;
  return survivors.find((s) => !s.caught) || survivors[0];
}

function returnToMenu() {
  hideLoading();
  closeMathQuiz();
  keyHuntState = null;
  keyHuntGroup = null;
  platformerState = null;
  platformerGroup = null;
  document.getElementById("keyHuntBar")?.style.setProperty("display", "none");
  document.getElementById("pausePanel")?.classList.remove("show");
  overlay.classList.remove("show", "win", "lose");
  menu.style.display = "flex";
  hud.classList.remove("show");
  gameState = "menu";
  clickPrompt.classList.remove("show");
  if (musicEl) { musicEl.pause(); musicEl.currentTime = 0; }
  document.exitPointerLock?.();
  clearVfxPool();
  document.getElementById("hudEscHint")?.classList.remove("show");
  document.body.classList.remove("keyhunt-play", "keyhunt-has-keys", "spectating");
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
    renderer.shadowMap.enabled = false;
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
  scene.add(new THREE.AmbientLight(0xbbafd0, 1.15));
  const hemi = new THREE.HemisphereLight(0xddd0f0, 0x443355, 0.65);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.65);
  dir.position.set(15, 40, 12);
  scene.add(dir);
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

function usesExitWin() {
  return isKeyHuntMode() || isPlatformerMode() || winGoal === "exit";
}

function getAliveSurvivors() {
  return survivors.filter((s) => !s.caught && (s.hp ?? 100) > 0);
}

function updatePerfTier() {
  const total = getAliveSurvivors().length + killers.length;
  perfTier = total >= 9 ? "low" : total >= 6 ? "med" : "high";
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

function playerMove(pos, vx, vz, dt, jumpY = 0) {
  const jy = jumpY ?? 0;
  if (keyHuntState?.doors) {
    moveWithDoorCollision(ctx, maze, keyHuntState.doors, pos, vx, vz, dt, jy);
  } else {
    moveWithCollision(ctx, maze, pos, vx, vz, dt, jy);
  }
  if (platformerState?.oneWays?.length) {
    const r = jy > 0.75 ? 0.3 : 0.45;
    if (platformerBlocksMove(platformerState.oneWays, pos.x, pos.z, vx, vz, r)) {
      const nx = pos.x - vx * dt;
      const nz = pos.z - vz * dt;
      if (!platformerBlocksMove(platformerState.oneWays, nx, pos.z, 0, 0, r)) pos.x = nx;
      if (!platformerBlocksMove(platformerState.oneWays, pos.x, nz, 0, 0, r)) pos.z = nz;
    }
  }
}

function catchSurvivor(target, killer, reason = "近身抓住") {
  if (!target || target.caught || elapsed < MATCH_START_GRACE) return;
  target.caught = true;
  target.vel = { x: 0, z: 0 };
  target.velY = 0;
  if (target.mesh) target.mesh.visible = false;
  playSfx("catch");
  spawnHitVfx(scene, target.pos.x, target.pos.z);
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

function spawnDamageNumber(wx, wz, amount) {
  if (!camera || !renderer) return;
  const layer = document.getElementById("damageLayer");
  if (!layer) return;
  const v = new THREE.Vector3(wx, 2.4, wz);
  v.project(camera);
  if (v.z > 1) return;
  const el = document.createElement("div");
  el.className = "dmg-num";
  el.textContent = `-${amount}`;
  const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
  el.style.left = `${sx}px`;
  el.style.top = `${sy}px`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1000);
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

function damageSurvivor(target, killer, amount) {
  if (!target || target.caught || elapsed < MATCH_START_GRACE) return;
  if ((target.invuln ?? 0) > 0.05) return;
  const envKiller = killer || { charDef: { name: "環境" }, pos: target.pos };
  playSfx("hit", 0.06);
  if (!target.isAI) {
    playSfx("hurt", 0.12);
    target._hitFlash = 0.35;
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
  spawnDamageNumber(target.pos.x, target.pos.z, amount);
  if (target.hp <= 0) {
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
    platformer: "平台冒險", practice: "練習", mob: "團隊逃亡", hardcore: "硬核",
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
  if (!isGamepadConnected() || gameState !== "play" || isCoopSplitView()) return;
  const gp = pollGamepad(0);
  if (!gp?.lookX && !gp?.lookY) return;
  const sens = 2.4 * dt;
  camYaw -= gp.lookX * sens;
  camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitch + gp.lookY * sens));
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
  if (!p || p.caught || gameState !== "play") return;
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

  const need = getWinSurvivors();
  if (need.length && need.every(isAtExit)) {
    playSfx("exit");
    spawnHitVfx(scene, exitPos.x, exitPos.z);
    const msg = isKeyHuntMode()
      ? `${selectedLevel.name} 通關！開啟所有門且全員抵達出口！`
      : need.length > 1
        ? `通關！全部 ${need.length} 名倖存者都到達出口！`
        : `${selectedLevel.name} 通關！你到達綠色出口了！`;
    endGame(true, msg);
  }
}

function checkMatchEnd(msgIfLose) {
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
  document.getElementById("mathQuestion").textContent = `[${subjZh}·${diffZh}] ${q.text}`;
  const box = document.getElementById("mathChoices");
  box.innerHTML = "";
  q.choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.textContent = String(c);
    btn.onclick = () => {
      const ok = String(c) === String(station._answer);
      if (ok) {
        station.done = true;
        if (station.mesh) station.mesh.visible = false;
        killerTimer = Math.max(0, killerTimer - KILLER_TIME_MISSION_CUT);
        missionsDone++;
        playSfx("mission");
        showToast(`答對了！獵人時間 -${KILLER_TIME_MISSION_CUT} 秒`, 900);
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
  if (station.done || activeQuiz || gameState !== "play") return;
  activeQuiz = station;
  playSfx("quiz_open");
  document.exitPointerLock?.();
  pointerLocked = false;
  clickPrompt.classList.remove("show");
  quizGp = { x: 0.5, y: 0.72, choice: 0, prev: {} };
  renderQuizQuestion(station);
  document.getElementById("mathQuiz").classList.add("show");
}

function closeMathQuiz() {
  document.getElementById("mathQuiz").classList.remove("show");
  const qptr = document.getElementById("quizGpPointer");
  if (qptr) qptr.style.display = "none";
  activeQuiz = null;
  nearMissionStation = null;
  if (isTouchUiEnabled()) setTouchMissionHighlight(false);
}

function togglePause() {
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

function tryJump(p, profile, gp = null) {
  if (!p || p.caught || p.role === "killer" || p.sliding) return;
  const jumpDown = keyDown(keys, profile, "jump") || !!gp?.jump;
  if (!jumpDown) return;
  if (p._jumpHeld) return;
  p._jumpHeld = true;
  if (p.onGround) {
    p.velY = 16;
    p.onGround = false;
    p.jumpsUsed = 1;
    p._airJumpReady = hasDoubleJumpPassive(p) && elapsed >= (p._djRechargeUntil ?? 0);
    playSfx("jump");
  } else if (canUseAirJump(p) && (p.jumpsUsed ?? 0) < 2) {
    p.velY = 17;
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
    playSfx("jump");
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
  if (p.role === "killer" || p.caught || playAsKiller) return move;
  if (p.slideTimer == null) p.slideTimer = 0;
  if (p.slideCd == null) p.slideCd = 0;

  const SLIDE_DUR = 0.52;
  const SLIDE_SPEED = 19;

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
    p.cloneMesh.position.set(p.pos.x + 2, 0, p.pos.z);
    scene.add(p.cloneMesh);
    setTimeout(() => {
      if (p.cloneMesh) { scene.remove(p.cloneMesh); p.cloneMesh = null; }
    }, 8000);
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
  numSurvivors = sEl ? Math.max(1, Math.min(4, parseInt(sEl.value, 10) || 1)) : selectedLevel.survivorSlots || 1;
  numKillers = kEl ? Math.max(1, Math.min(3, parseInt(kEl.value, 10) || 1)) : selectedLevel.killerCount || 1;
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
  winGoal = document.getElementById("winGoal")?.value || "exit";
  if (isKeyHuntMode() || isPlatformerMode()) winGoal = "exit";
  if (gameMode === "practice") matchTimeSeconds = Math.max(matchTimeSeconds, 240);
  if (gameMode === "hardcore") matchTimeSeconds = Math.min(matchTimeSeconds, 150);
  if (isKeyHuntMode()) matchTimeSeconds = Math.max(matchTimeSeconds, 300);
  if (isPlatformerMode()) matchTimeSeconds = Math.max(matchTimeSeconds, 240);
  if (isKeyHuntMode() || isPlatformerMode()) {
    playerRole = "survivor";
    const roleEl = document.getElementById("playerRole");
    if (roleEl) roleEl.value = "survivor";
  } else {
    playerRole = document.getElementById("playerRole")?.value || "survivor";
  }
  playAsKiller = playerRole === "killer" && gameMode === "solo"
    && !isKeyHuntMode() && !isPlatformerMode();
  matchHumanRole = gameMode === "versus" ? "killer" : playAsKiller ? "killer" : "survivor";
  keyHuntState = null;
  keyHuntGroup = null;

  const theme = getLevelTheme(selectedLevel);
  ctx = createMazeContext(selectedLevel, theme);
  killerTimer = matchTimeSeconds;
  missionsDone = 0;
  camYaw = Math.PI;
  camPitch = 0.42;
  const mobileCam = applyMobileCameraDefaults();
  if (mobileCam != null) camDist = mobileCam;

  clearScene();
  clearVfxPool();
  scene.background = new THREE.Color(theme.sky);
  scene.fog = new THREE.Fog(theme.sky, ctx.fogNear * 1.1, ctx.fogFar * 1.6);

  maze = generateMaze(ctx.w, ctx.h);
  addMazeLoops(maze, ctx.w, ctx.h, ctx.loops);
  gameApi.maze = maze;
  keyHuntState = null;
  platformerState = null;
  if (isKeyHuntMode()) {
    keyHuntState = setupKeyHuntLevel(ctx, maze, selectedLevel);
  }
  if (isPlatformerMode()) {
    platformerState = setupPlatformerLevel(ctx, maze, selectedLevel);
  }
  await yieldFrame();
  buildMazeMeshes(ctx, maze, scene, {
    doorWalls: keyHuntState?.doors || [],
  });
  await yieldFrame();

  exitPos = cellCenter(ctx, ctx.w - 1, ctx.h - 1);
  gameApi.exitPos = exitPos;
  exitGroup = createExitMarker(scene, exitPos);

  teleporters = createTeleporters(ctx, maze, isKeyHuntMode() ? 0 : ctx.teleporters);
  buildTeleporterMeshes(scene, teleporters);
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
  } else {
    missionStations = spawnMissionStations(ctx, maze, ctx.missions);
    missionGroup = buildMissionMeshes(scene, missionStations, { compact: isTouchUiEnabled() });
  }
  await yieldFrame();

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
    numKillers,
  });
  survivors = spawned.survivors;
  killers = spawned.killers;
  playAsKiller = !!spawned.playAsKiller;
  if (!survivors.length) throw new Error("倖存者生成失敗");
  if (!killers.length && !isKeyHuntMode() && !isPlatformerMode()) throw new Error("獵人生成失敗");
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
  snapCameraToPlayer();
  drawMinimap();
  updateAbilityBar();
  updateInventoryBar();
  updateKeyHuntBar();
  syncTouchHudFromPlayer();
  setMissionText();
  musicEl?.play().catch(() => {});

  refreshGameplayHints();
  if (exitGroup) exitGroup.visible = usesExitWin();
  const khBar = document.getElementById("keyHuntBar");
  if (khBar) khBar.style.display = isKeyHuntMode() ? "flex" : "none";
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
  } else if (isPlatformerMode()) {
    modeText = "平台冒險：踩綠色小怪 · 躲噴火與落石 · 藍色箭頭為單向門";
    rules = `<li>空白鍵二段跳可越過矮牆 · 無獵人 · 到達出口通關</li>`;
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
    <li>藍=傳送 · 黃=任務 · 綠=出口 · 紫=陷阱(鑰匙模式)</li>
    <li id="missionDist">尋找綠色光柱出口…</li>`;
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
  if (isKeyHuntMode() || isTouchUiEnabled()) {
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

function endGame(won, message) {
  gameState = "end";
  overlay.classList.add("show");
  overlay.classList.toggle("win", won);
  overlay.classList.toggle("lose", !won);
  clickPrompt.classList.remove("show");
  document.getElementById("overlayTitle").textContent = won ? "任務完成" : "被遺棄了";
  document.getElementById("overlayText").textContent = message;
  document.exitPointerLock?.();
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
    if (gameState === "play" && BLOCK_KEYS.has(e.code)) e.preventDefault();
    keys[e.code] = true;

    if (gameState === "play" && e.code === "KeyE" && nearMissionStation && !playAsKiller && !activeQuiz && !isKeyHuntMode()) {
      e.preventDefault();
      openMathQuiz(nearMissionStation);
      return;
    }
    if (gameState === "play" && e.code === "KeyG" && isKeyHuntMode()) {
      e.preventDefault();
      tryOpenDoorInput();
      return;
    }
    if (gameState === "play" && e.code === "KeyR" && !playAsKiller) {
      e.preventDefault();
      tryUseFirstItem();
      return;
    }
    if (gameState !== "play") return;
    if (!isKeyHuntMode() && !isPlatformerMode()) handleAbilityKeys(e.code, true);
  });
  window.addEventListener("keyup", (e) => {
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
  document.addEventListener("mousemove", (e) => {
    if (!pointerLocked || gameState !== "play") return;
    camYaw -= e.movementX * 0.0022;
    camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitch + e.movementY * 0.0022));
  });
  window.addEventListener("resize", () => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    renderer.setSize(W, H);
    if (!isCoopSplitView()) {
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    }
  });
  renderer.domElement.addEventListener("wheel", (e) => {
    if (gameState !== "play") return;
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
  if (gameState !== "play") return;
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
        code === "KeyE" && nearMissionStation && !playAsKiller && !activeQuiz && !isKeyHuntMode()
      ) openMathQuiz(nearMissionStation);
      else if (!isKeyHuntMode() && !isPlatformerMode()) handleAbilityKeys(code, true);
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
    "solo", "coop", "versus", "mob", "hardcore", "practice",
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

function updateMissionsProximity() {
  nearMissionStation = null;
  const missionBtn = document.getElementById("btnTouchMission");
  const missionBanner = document.getElementById("touchMissionBanner");
  const hideMissionTouchUi = () => {
    if (missionBtn) missionBtn.hidden = true;
    if (missionBanner) missionBanner.hidden = true;
  };
  if (playAsKiller || activeQuiz || isKeyHuntMode()) {
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

  const showMission = !!nearMissionStation && !playAsKiller && !isKeyHuntMode() && !activeQuiz;
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
  if (p.caught) return;
  tickCooldowns(p, dt);
  if (p._jumpY == null) p._jumpY = 0;
  const grav = p.role === "killer" ? 32 : 26;
  p.velY = (p.velY ?? 0) - grav * dt;
  p._jumpY += p.velY * dt;
  if (p._jumpY <= 0) {
    p._jumpY = 0;
    p.velY = 0;
    p.onGround = true;
    if ((p.jumpsUsed ?? 0) >= 2 && hasDoubleJumpPassive(p)) {
      p._djRechargeUntil = Math.max(p._djRechargeUntil ?? 0, elapsed + DOUBLE_JUMP_RECHARGE);
    }
    p.jumpsUsed = 0;
    if (hasDoubleJumpPassive(p) && elapsed >= (p._djRechargeUntil ?? 0)) {
      p._airJumpReady = true;
    }
  } else {
    p.onGround = false;
  }
  const speedMult = getSpeedMult(p);
  const moving = !!(move.x || move.z);
  const wantsSprint = move.sprint && moving;
  const sprinting = updateSprint(p, dt, wantsSprint, moving);
  const isKiller = p.role === "killer";
  let maxSpeed = (isKiller ? KILLER_WALK : WALK_SPEED) * speedMult;
  if (sprinting) maxSpeed = (isKiller ? KILLER_SPRINT : SPRINT_SPEED) * speedMult;
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
      parts.torso.position.y = (parts.baseTorsoY ?? 1.55) * 0.38;
      parts.head.position.y = (parts.baseHeadY ?? 2) * 0.55;
      parts.head.rotation.x = 0.12;
      parts.leftArm.rotation.x = 0.45;
      parts.rightArm.rotation.x = 0.45;
      parts.leftLeg.rotation.x = -0.05;
      parts.rightLeg.rotation.x = 1.25;
      parts.leftLeg.position.z = -0.22;
      parts.rightLeg.position.z = 0.48;
    }
    playerMove(p.pos, p.vel.x, p.vel.z, dt, p._jumpY);
    if (p.mesh) {
      p.mesh.position.set(p.pos.x, p._jumpY, p.pos.z);
      p.mesh.rotation.y = p.yaw;
    }
    return;
  } else if (parts) {
    parts.leftLeg.position.z = 0;
    parts.rightLeg.position.z = 0;
    parts.torso.rotation.x *= 0.82;
    parts.torso.position.y += ((parts.baseTorsoY ?? 1.55) - parts.torso.position.y) * 0.12;
    if (parts.head) parts.head.position.y += ((parts.baseHeadY ?? 2) - parts.head.position.y) * 0.12;
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
    playerMove(p.pos, p.vel.x, p.vel.z, dt, p._jumpY);
    if (p.mesh) p.mesh.rotation.y = Math.atan2(p.vel.x, p.vel.z);
  }
  applyMeshAnim(p, dt);
  if (!p._anim && shouldAnimateEntity(p)) applyLocomotionAnim(p, dt);
  tickEntityUnstuck(p, dt);

  if (p.mesh) {
    p.mesh.position.set(p.pos.x, p._jumpY, p.pos.z);
    if (p.mesh.scale.x !== 1) p.mesh.scale.set(1, 1, 1);
    if (p._hitFlash > 0) {
      p._hitFlash -= dt;
      p.mesh.traverse((c) => {
        if (c.material?.emissive) c.material.emissive.setHex(0xff2244);
        if (c.material) c.material.emissiveIntensity = 0.6;
      });
    } else if (p.role === "survivor") {
      p.mesh.traverse((c) => {
        if (c.material?.emissive) c.material.emissiveIntensity = 0;
      });
    }
  }

  if (p.role === "survivor") {
    p.history.push({ x: p.pos.x, z: p.pos.z });
    if (p.history.length > 60) p.history.shift();
    if (p.cloneMesh) {
      p.cloneMesh.position.x += (p.pos.x + 3 - p.cloneMesh.position.x) * dt * 0.5;
      p.cloneMesh.position.z += (p.pos.z - p.cloneMesh.position.z) * dt * 0.5;
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
  if (!k) return;

  let tx;
  let tz;
  const survivalMode = !usesExitWin();

  if (s._aiRoamTimer == null) s._aiRoamTimer = 0;

  if (distK < 15) {
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
    if (s.caught) return;
    const profile = s.profile;
    const gp = profile === "p1" ? gp0 : gp1;
    const useCam = profile === "p1" || gameMode === "coop";
    const move = getMoveFromProfile(profile, useCam ? camYaw : s.yaw, gp);
    if (!s._gpPrev) s._gpPrev = {};
    const missionLock = nearMissionStation && !activeQuiz && !playAsKiller;
    if (!s.isAI) {
      const ctrlProfile = playAsKiller && s.profile === "p1" ? "p1" : profile;
      if (isKeyHuntMode()) {
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
        openMathQuiz(nearMissionStation);
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
    } else if (s.isAI) updateAISurvivor(s, dt);
    else updateEntity(s, dt, move);
  });

  updateMissionsProximity();
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

  let target = null;
  let bestD = Infinity;
  for (const s of survivors) {
    if (s.caught || isInvisibleToKiller(s)) continue;
    const d = Math.hypot(s.pos.x - k.pos.x, s.pos.z - k.pos.z);
    if (d < bestD) { bestD = d; target = s; }
  }
  if (!target) return;

  if (k._pathTimer === undefined) k._pathTimer = 0;
  k._pathTimer -= dt;
  if (k._pathTimer <= 0) {
    k._pathTimer = 0.4;
    k._pathTarget = bfsNextStep(ctx, maze, k.pos.x, k.pos.z, target.pos.x, target.pos.z);
  }
  let dx = target.pos.x - k.pos.x;
  let dz = target.pos.z - k.pos.z;
  if (k._pathTarget) {
    dx = k._pathTarget.x - k.pos.x;
    dz = k._pathTarget.z - k.pos.z;
  }
  const pathDist = Math.hypot(dx, dz);
  const toSurvivor = Math.hypot(target.pos.x - k.pos.x, target.pos.z - k.pos.z);

  if (!k._lastPos) k._lastPos = { x: k.pos.x, z: k.pos.z };
  const moved = Math.hypot(k.pos.x - k._lastPos.x, k.pos.z - k._lastPos.z);
  if (moved < 0.05) k._stuckT = (k._stuckT || 0) + dt;
  else k._stuckT = 0;
  k._lastPos = { x: k.pos.x, z: k.pos.z };
  if (k._stuckT > 0.5 || (pathDist < 1.2 && toSurvivor > 5)) {
    dx = target.pos.x - k.pos.x;
    dz = target.pos.z - k.pos.z;
    k._pathTarget = null;
    k._pathTimer = 0;
  }

  k._aiAtkCd = (k._aiAtkCd ?? 0) - dt;
  if (toSurvivor < KILLER_MELEE_RANGE + 0.5) {
    tryKillerMeleeAttack(k, target, KILLER_MELEE_DAMAGE);
  } else if (toSurvivor < 12 && k._aiAtkCd <= 0) {
    k._aiAtkCd = perfTier === "low" ? 0.85 : 0.55;
    const slot = toSurvivor < 6 ? 0 : toSurvivor < 10 ? 1 : 2;
    if (perfTier !== "low" || Math.random() < 0.45) tryAbility(k, slot, ctx, gameApi);
  } else if (toSurvivor < 22 && k._aiAtkCd <= 0 && Math.random() < (perfTier === "low" ? 0.05 : 0.12)) {
    k._aiAtkCd = 0.8;
    tryAbility(k, Math.floor(Math.random() * 3), ctx, gameApi);
  }

  const mustChase = pathDist < 2 || k._stuckT > 0.35 || toSurvivor < 14;
  if (mustChase && toSurvivor > 1.2) {
    dx = target.pos.x - k.pos.x;
    dz = target.pos.z - k.pos.z;
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
    m.position.set(pr.x, 1.2, pr.z);
    m.material.color.setHex(pr.color || 0xff2244);
  });
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.life -= dt;
    pr.x += pr.vx * dt;
    pr.z += pr.vz * dt;
    if (pr.life <= 0 || collides(ctx, maze, pr.x, pr.z, 0.2)) {
      projectiles.splice(i, 1);
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

function ensureCoopCamera() {
  if (!camera2) camera2 = new THREE.PerspectiveCamera(68, 1, 0.1, 150);
}

function updateCameraForPlayer(cam, focus, yaw, pitch) {
  if (!cam || !focus) return;
  const pos = focus.pos;
  const pitchOff = pitch * 5;
  const cx = pos.x - Math.sin(yaw) * camDist;
  const cz = pos.z - Math.cos(yaw) * camDist;
  const cy = 3.8 + pitchOff + camDist * 0.15;
  const targetCam = new THREE.Vector3(cx, cy, cz);
  if (cam.position.distanceTo(targetCam) > 35) cam.position.copy(targetCam);
  else cam.position.lerp(targetCam, 0.2);
  cam.lookAt(pos.x, 2.2 + jumpYFor(focus), pos.z);
}

function snapCameraToPlayer() {
  const focus = getCameraFocus();
  if (!focus || !camera) return;
  updateCameraForPlayer(camera, focus, camYaw, camPitch);
}

function updateCamera() {
  if (isCoopSplitView()) return;
  const focus = getCameraFocus();
  if (!focus || !camera) return;
  updateCameraForPlayer(camera, focus, camYaw, camPitch);
}

function renderGameView() {
  if (!renderer || !scene || !camera) return;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const line = document.getElementById("coopSplitLine");

  if (!isCoopSplitView()) {
    if (line) line.style.display = "none";
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    updateCamera();
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
  return p?._jumpY ?? 0;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function drawMinimap() {
  if (!minimapCanvas || !maze) return;
  const ctx2 = minimapCanvas.getContext("2d");
  const w = minimapCanvas.width;
  const h = minimapCanvas.height;
  const pad = 3;
  const cellPx = (w - pad * 2) / ctx.w;

  ctx2.fillStyle = "#0c0814";
  ctx2.fillRect(0, 0, w, h);

  for (let gz = 0; gz < ctx.h; gz++) {
    for (let gx = 0; gx < ctx.w; gx++) {
      const cell = maze[gz][gx];
      const px = pad + gx * cellPx;
      const py = pad + gz * cellPx;
      ctx2.fillStyle = "#3a3050";
      ctx2.fillRect(px, py, cellPx, cellPx);
      ctx2.strokeStyle = "#6a5888";
      ctx2.lineWidth = 0.5;
      if (cell.top) { ctx2.beginPath(); ctx2.moveTo(px, py); ctx2.lineTo(px + cellPx, py); ctx2.stroke(); }
      if (cell.left) { ctx2.beginPath(); ctx2.moveTo(px, py); ctx2.lineTo(px, py + cellPx); ctx2.stroke(); }
    }
  }

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
}

function updateHUD() {
  syncSpectateUi();
  const focus = isSpectating() ? getCameraFocus() : getHumanFocus();
  if (!focus || !exitPos) return;

  const hp = Math.round(focus.hp ?? 100);
  const hpEl = document.getElementById("hudHp");
  if (hpEl) hpEl.textContent = String(hp);
  const hpBar = document.getElementById("hudHpBar");
  if (hpBar) {
    hpBar.style.width = `${hp}%`;
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
  const distExit = Math.hypot(focus.pos.x - exitPos.x, focus.pos.z - exitPos.z);

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

  if (isPlatformerMode() && platformerState) {
    const aliveE = platformerState.enemies.filter((e) => !e.squashed).length;
    document.getElementById("hudObjective").textContent =
      `小怪剩 ${aliveE} · 出口 ${distExit.toFixed(0)}m`;
    document.getElementById("hudKiller").textContent = "平台冒險 · 無獵人";
    warning.classList.remove("show");
    if (distEl) distEl.textContent = `小怪 ${aliveE} · 出口 ${distExit.toFixed(0)}m · HP ${hp}`;
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
  if (touchLook && gameState === "play" && !isCoopSplitView()) {
    const lookK = 0.0048;
    camYaw -= touchLook.dx * lookK;
    camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitch + touchLook.dy * lookK));
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
    if (!isKeyHuntMode() && !isPlatformerMode()) updateKillers(dt);
    updateProjectiles(dt);
    updateWorldItems();
    updateTeleporters();
    syncProjectileMeshes();
    updateMinions(dt);
    updateVfx(dt);
    updateCamera();
    const mapEvery = perfTier === "low" ? 10 : perfTier === "med" ? 6 : 4;
    if (frameCount % mapEvery === 0) drawMinimap();
    animTime += dt;
    checkMatchEnd();
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
      isKeyHunt: isKeyHuntMode,
      isHumanKiller: isHumanKillerControl,
      getTouchProfile: getTouchBindingProfile,
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
