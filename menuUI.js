/** 主選單分頁／彈出選擇器 */

const PERF_TIP_KEY = "forsaken_perf_tip_v1";

let menuStep = 0;
let pickerGridId = null;
let pickerHomeId = null;

export function initMenuWizard(api) {
  const steps = [...document.querySelectorAll(".menu-step")];
  const tabs = [...document.querySelectorAll(".menu-tab")];
  const btnPrev = document.getElementById("menuPrev");
  const btnNext = document.getElementById("menuNext");
  const btnStart = document.getElementById("btnStart");
  const btnFullscreen = document.getElementById("btnToggleFullscreenMenu");
  const overlay = document.getElementById("pickerOverlay");
  const pickerClose = document.getElementById("pickerClose");
  const coopModal = document.getElementById("coopMobileWarn");

  if (!steps.length) return;

  const goStep = (n) => {
    const prev = menuStep;
    menuStep = Math.max(0, Math.min(steps.length - 1, n));
    steps.forEach((s, i) => s.classList.toggle("active", i === menuStep));
    tabs.forEach((t, i) => t.classList.toggle("active", i === menuStep));
    if (btnPrev) btnPrev.style.display = menuStep === 0 ? "none" : "";
    if (btnNext) btnNext.style.display = menuStep >= steps.length - 1 ? "none" : "";
    if (btnStart) {
      const onFinal = menuStep >= steps.length - 1;
      btnStart.classList.toggle("is-visible", onFinal);
      btnStart.hidden = !onFinal;
    }
    if (btnFullscreen) {
      const onFinal = menuStep >= steps.length - 1;
      btnFullscreen.hidden = !onFinal;
      btnFullscreen.classList.toggle("is-visible", onFinal);
    }
    document.querySelector(".menu-nav-bar")?.classList.toggle(
      "on-final",
      menuStep >= steps.length - 1
    );
    api.playSfx?.(n < prev ? "ui_back" : "ui");
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => goStep(Number(tab.dataset.step)));
  });
  btnPrev?.addEventListener("click", () => goStep(menuStep - 1));
  btnNext?.addEventListener("click", () => goStep(menuStep + 1));

  const pickMap = [
    ["pickLevelBtn", "levelGrid", "levelGridHost", "選擇關卡"],
    ["pickSurvivorBtn", "charGrid", "charGridHost", "選擇倖存者"],
    ["pickSurvivor2Row", "charGrid2", "charGrid2Host", "玩家 2 倖存者"],
    ["pickKillerRow", "killerGrid", "killerGridHost", "選擇獵人"],
  ];
  pickMap.forEach(([btnId, gridId, hostId, title]) => {
    const row = document.getElementById(btnId);
    if (!row) return;
    const open = () => {
      if (row.hidden) return;
      const grid = document.getElementById(gridId);
      if (!grid || !grid.children.length) return;
      openPicker(title, gridId, hostId);
    };
    row.addEventListener("click", open);
    row.addEventListener("touchend", (e) => {
      e.preventDefault();
      open();
    }, { passive: false });
  });

  pickerClose?.addEventListener("click", () => closePicker(api));
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closePicker(api);
  });

  goStep(0);
  updatePickLabels(api);
  return { goStep, updatePickLabels: () => updatePickLabels(api) };
}

/** 首頁效能提示（可勾選不再顯示） */
export function initPerfTipModal() {
  const modal = document.getElementById("perfTipModal");
  const btnOk = document.getElementById("perfTipOk");
  if (!modal || !btnOk) return;

  try {
    if (localStorage.getItem(PERF_TIP_KEY) === "1") return;
  } catch { /* ignore */ }

  const close = () => modal.classList.remove("show");

  btnOk.addEventListener("click", () => {
    const skip = document.getElementById("perfTipDontShow")?.checked;
    if (skip) {
      try {
        localStorage.setItem(PERF_TIP_KEY, "1");
      } catch { /* ignore */ }
    }
    close();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  requestAnimationFrame(() => {
    modal.classList.add("show");
  });
}

function isSmallTouchScreen() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const short = Math.min(w, h);
  const long = Math.max(w, h);
  return short < 520 || long < 640 || (w < 720 && h < 520);
}

/** 手機／小螢幕開始遊戲前警告 */
export function showMobilePlayWarn(opts = {}) {
  const { gameMode = "solo", numLocalPlayers = 1, isShooter = false } = opts;
  const small = isSmallTouchScreen();
  const multiLocal = numLocalPlayers >= 2;
  const coopLike = gameMode === "coop" || gameMode === "versus";
  const needsWarn = small || multiLocal || coopLike || (isShooter && multiLocal);

  if (!needsWarn) return Promise.resolve(true);

  return new Promise((resolve) => {
    const modal = document.getElementById("coopMobileWarn");
    if (!modal) {
      resolve(true);
      return;
    }
    const title = modal.querySelector("h3");
    const body = modal.querySelector("p");
    const sub = modal.querySelector("p[style]");
    if (title) {
      title.textContent = small ? "螢幕較小" : "手機多人同機";
    }
    if (body) {
      if (small && multiLocal) {
        body.innerHTML =
          "目前螢幕偏小，又啟用<strong>多人分割畫面</strong>，HUD 與按鈕會更擠。<strong>建議</strong>用平板或電腦遊玩。";
      } else if (small) {
        body.innerHTML =
          "偵測到螢幕高度或寬度偏小，部分按鈕與文字可能較難閱讀。<strong>建議</strong>橫向全螢幕或使用較大裝置。";
      } else if (coopLike) {
        body.innerHTML =
          "手機雙人同機操作空間有限，合作／對戰模式<strong>不建議</strong>在小螢幕上遊玩。";
      } else {
        body.innerHTML =
          "多人分割畫面會占用大量螢幕空間，手機上較不易操作。";
      }
    }
    if (sub) sub.textContent = "確定仍要繼續？";
    const yes = document.getElementById("coopWarnYes");
    const no = document.getElementById("coopWarnNo");
    const done = (ok) => {
      modal.classList.remove("show");
      yes.onclick = null;
      no.onclick = null;
      resolve(ok);
    };
    modal.classList.add("show");
    yes.onclick = () => done(true);
    no.onclick = () => done(false);
  });
}

/** @deprecated 請用 showMobilePlayWarn */
export function showCoopMobileWarn() {
  return showMobilePlayWarn({ gameMode: "coop" });
}

function openPicker(title, gridId, hostId) {
  const grid = document.getElementById(gridId);
  const content = document.getElementById("pickerContent");
  const overlay = document.getElementById("pickerOverlay");
  if (!grid || !content || !overlay) return;
  pickerGridId = gridId;
  pickerHomeId = hostId;
  const titleEl = document.getElementById("pickerTitle");
  if (titleEl) titleEl.textContent = title;
  content.innerHTML = "";
  content.appendChild(grid);
  grid.classList.remove("picker-hidden");
  overlay.classList.add("show");
}

function closePicker(api) {
  const overlay = document.getElementById("pickerOverlay");
  if (!overlay) return;
  overlay.classList.remove("show");
  if (pickerGridId && pickerHomeId) {
    const grid = document.getElementById(pickerGridId);
    const home = document.getElementById(pickerHomeId);
    if (grid && home) home.appendChild(grid);
  }
  pickerGridId = null;
  pickerHomeId = null;
  api?.playSfx?.("ui_back");
}

function updatePickLabels(api) {
  const level = api.getSelectedLevel?.();
  const c1 = api.getSelectedChar?.();
  const c2 = api.getSelectedChar2?.();
  const k = api.getSelectedKiller?.();
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set("pickLevelLabel", level ? `${level.name}` : "選擇關卡");
  set("pickSurvivorLabel", c1 ? c1.name : "選擇倖存者");
  set("pickSurvivor2Label", c2 ? c2.name : "玩家 2");
  set("pickKillerLabel", k ? k.name : "選擇獵人");
  const hideK = api.shouldHideKiller?.();
  const hideP2 = api.shouldHideP2?.();
  const p2Row = document.getElementById("pickSurvivor2Row");
  const kRow = document.getElementById("pickKillerRow");
  if (p2Row) p2Row.hidden = !!hideP2;
  if (kRow) kRow.hidden = !!hideK;
  api.updateRoleLabel?.();
}
