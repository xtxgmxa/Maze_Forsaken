import { getShooterWeapon, SHOOTER_TEAMS } from "./shooterMode.js";

export function initShooterStats(p) {
  if (!p._shooterStats) p._shooterStats = { kills: 0, deaths: 0, score: 0 };
  return p._shooterStats;
}

export function teamColorCss(teamId) {
  const c = SHOOTER_TEAMS[teamId ?? 0]?.color ?? 0xffffff;
  return `#${(c >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
}

export function playerColorCss(p) {
  const c = p?.paintColor ?? p?._shooterColor ?? 0x88aaff;
  return `#${(c >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
}

export function resetShooterScoreboardUi() {
  const el = document.getElementById("shooterScoreboard");
  if (el) el.classList.remove("show");
  document.body.classList.remove("scoreboard-open");
}

export function setShooterScoreboardVisible(show) {
  const el = document.getElementById("shooterScoreboard");
  if (!el) return;
  el.classList.toggle("show", !!show);
  el.setAttribute("aria-hidden", show ? "false" : "true");
  document.body.classList.toggle("scoreboard-open", !!show);
}

export function renderShooterScoreboard(players, human, playStyle = "teams") {
  const tbody = document.getElementById("shooterScoreboardBody");
  const teamBar = document.getElementById("shooterScoreboardTeams");
  const title = document.querySelector("#shooterScoreboard h3");
  if (!tbody) return;

  const ffa = playStyle === "ffa";
  const mole = playStyle === "mole";
  const teamKills = [0, 0];
  const rows = [...players]
    .filter((p) => p)
    .sort((a, b) => {
      const ak = a._shooterStats?.kills ?? 0;
      const bk = b._shooterStats?.kills ?? 0;
      if (bk !== ak) return bk - ak;
      return (a._shooterStats?.deaths ?? 0) - (b._shooterStats?.deaths ?? 0);
    });

  for (const p of rows) {
    const k = p._shooterStats?.kills ?? 0;
    if (p.teamId >= 0) teamKills[p.teamId] += k;
    initShooterStats(p).score = k;
  }

  if (title) {
    title.textContent = mole
      ? `無間道戰績 · 紅 ${teamKills[0]} · 藍 ${teamKills[1]}`
      : ffa
        ? `自由混戰戰績 · ${rows.length} 人`
        : `團隊對抗戰績 · ${rows.length} 人`;
  }

  if (teamBar) {
    if (ffa) {
      teamBar.style.display = "none";
      teamBar.innerHTML = "";
    } else {
      teamBar.style.display = "flex";
      teamBar.innerHTML = SHOOTER_TEAMS.map((t, i) =>
        `<span class="sb-team-pill" style="--tc:${teamColorCss(i)}">${t.name} <b>${teamKills[i]}</b> 分</span>`
      ).join("");
    }
  }

  tbody.innerHTML = rows.map((p, i) => {
    const st = initShooterStats(p);
    const kd = st.deaths > 0 ? (st.kills / st.deaths).toFixed(1) : String(st.kills);
    const name = p.charDef?.name || (p.isAI ? "Bot" : "Player");
    const gun = getShooterWeapon(p.weaponId)?.name || "—";
    const you = p === human;
    const dead = (p.hp ?? 0) <= 0 || p._shooterDowned;
    const teamCss = p.teamId >= 0 ? teamColorCss(p.teamId) : playerColorCss(p);
    const hp = Math.round(p.hp ?? 0);
    const moleTag = p.isMole ? ' <span class="sb-mole">內鬼</span>' : "";
    return `<tr class="${you ? "you" : ""} ${dead ? "dead" : ""}" style="--row-team:${teamCss}">
      <td>${i + 1}</td>
      <td class="sb-name">${name}${p.isAI ? ' <span class="sb-bot">AI</span>' : ""}${moleTag}</td>
      <td><b>${st.kills}</b></td>
      <td>${st.deaths}</td>
      <td>${kd}</td>
      <td>${hp}</td>
      <td class="sb-gun">${gun}</td>
    </tr>`;
  }).join("");
}

export function bindShooterScoreboardUi(onToggle) {
  const sbBtn = document.getElementById("btnTouchScoreboard");
  const panel = document.querySelector("#shooterScoreboard .sb-panel");
  const backdrop = document.getElementById("shooterScoreboardBackdrop");
  const closeBtn = document.getElementById("btnScoreboardClose");

  const forceClose = (ev) => {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    onToggle?.(false);
  };

  const openToggle = (ev) => {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    onToggle?.();
  };

  if (sbBtn) {
    sbBtn.onclick = null;
    const toggle = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openToggle(ev);
    };
    sbBtn.addEventListener("pointerdown", (ev) => ev.stopPropagation(), { passive: true });
    sbBtn.addEventListener("pointerup", toggle, { passive: false });
    sbBtn.addEventListener("touchend", toggle, { passive: false });
    sbBtn.addEventListener("click", toggle);
  }
  if (closeBtn) {
    closeBtn.onclick = forceClose;
    closeBtn.addEventListener("touchend", forceClose, { passive: false });
  }
  if (backdrop) {
    backdrop.onclick = forceClose;
    backdrop.addEventListener("touchend", forceClose, { passive: false });
  }
  if (panel) {
    panel.onclick = (ev) => ev.stopPropagation();
    panel.addEventListener("touchend", (ev) => ev.stopPropagation(), { passive: true });
  }
}
