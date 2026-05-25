import { getShooterWeapon } from "./shooterMode.js";

export function initShooterStats(p) {
  if (!p._shooterStats) p._shooterStats = { kills: 0, deaths: 0 };
  return p._shooterStats;
}

export function recordShooterFrag(killer, victim) {
  if (killer && killer !== victim) {
    initShooterStats(killer).kills += 1;
  }
  if (victim) initShooterStats(victim).deaths += 1;
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
  document.body.classList.toggle("scoreboard-open", !!show);
}

export function renderShooterScoreboard(players, human) {
  const tbody = document.getElementById("shooterScoreboardBody");
  if (!tbody) return;
  const rows = [...players]
    .filter((p) => p)
    .sort((a, b) => {
      const ak = a._shooterStats?.kills ?? 0;
      const bk = b._shooterStats?.kills ?? 0;
      if (bk !== ak) return bk - ak;
      const ad = a._shooterStats?.deaths ?? 0;
      const bd = b._shooterStats?.deaths ?? 0;
      return ad - bd;
    });

  tbody.innerHTML = rows.map((p, i) => {
    const st = initShooterStats(p);
    const kd = st.deaths > 0 ? (st.kills / st.deaths).toFixed(1) : String(st.kills);
    const name = p.charDef?.name || (p.isAI ? "Bot" : "Player");
    const gun = getShooterWeapon(p.weaponId)?.name || "—";
    const hp = Math.max(0, Math.round(p.hp ?? 0));
    const you = p === human || (!p.isAI && human === p);
    const dead = p.caught || hp <= 0;
    return `<tr class="${you ? "you" : ""} ${dead ? "dead" : ""}">
      <td>${i + 1}</td>
      <td class="sb-name">${you ? "▸ " : ""}${name}${p.isAI ? " <span class='sb-bot'>AI</span>" : ""}</td>
      <td>${st.kills}</td>
      <td>${st.deaths}</td>
      <td>${kd}</td>
      <td>${hp}</td>
      <td class="sb-gun">${gun}</td>
    </tr>`;
  }).join("");
}
