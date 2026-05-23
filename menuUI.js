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

export function showCoopMobileWarn() {
  return new Promise((resolve) => {
    const modal = document.getElementById("coopMobileWarn");
    if (!modal) {
      resolve(true);
      return;
    }
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

function openPicker(title, gridId, hostId) {
  const grid = document.getElementById(gridId);
  const content = document.getElementById("pickerContent");
  const overlay = document.getElementById("pickerOverlay");
  if (!grid || !content || !overlay) return;
  pickerGridId = gridId;
  pickerHomeId = hostId;
  if (!grid.dataset.pickerHome) grid.dataset.pickerHome = hostId;
  document.getElementById("pickerTitle").textContent = title;
  grid.style.removeProperty("display");
  grid.classList.remove("picker-hidden");
  content.appendChild(grid);
  grid.classList.add("in-picker");
  overlay.classList.add("show");
}

function closePicker(api) {
  const overlay = document.getElementById("pickerOverlay");
  const grid = pickerGridId ? document.getElementById(pickerGridId) : null;
  const home = document.getElementById(pickerHomeId || grid?.dataset.pickerHome);
  if (grid && home) {
    home.appendChild(grid);
    grid.classList.remove("in-picker");
    if (document.body.classList.contains("touch-ui")) {
      grid.classList.add("picker-hidden");
    }
  }
  overlay?.classList.remove("show");
  pickerGridId = null;
  api.playSfx?.("ui");
  updatePickLabels(api);
}

export function updatePickLabels(api) {
  const lv = api.getSelectedLevel?.();
  const ch = api.getSelectedChar?.();
  const ch2 = api.getSelectedChar2?.();
  const k = api.getSelectedKiller?.();
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set("pickLevelLabel", lv ? `${lv.name} (${lv.w}×${lv.h})` : "點此選擇");
  set("pickSurvivorLabel", ch ? ch.name : "點此選擇");
  set("pickSurvivor2Label", ch2 ? ch2.name : "點此選擇");
  set("pickKillerLabel", k ? k.name : "點此選擇");
  api.updateRoleLabel?.();

  const killerRow = document.getElementById("pickKillerRow");
  const surv2Row = document.getElementById("pickSurvivor2Row");
  if (killerRow) killerRow.hidden = api.shouldHideKiller?.() ?? false;
  if (surv2Row) surv2Row.hidden = api.shouldHideP2?.() ?? true;
}
