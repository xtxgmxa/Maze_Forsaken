import * as THREE from "three";
import { cellCenter } from "./maze.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeChoices(answer, genWrong) {
  const wrong = new Set();
  let guard = 0;
  while (wrong.size < 3 && guard < 80) {
    guard++;
    const w = genWrong();
    if (w !== answer && w != null && String(w) !== String(answer)) wrong.add(w);
  }
  return shuffle([...wrong, answer]);
}

/** 國小高年級數學 */
function mathElem() {
  const kind = Math.floor(Math.random() * 5);
  let a, b, answer, text;
  if (kind === 0) {
    a = 50 + Math.floor(Math.random() * 450);
    b = 50 + Math.floor(Math.random() * 450);
    answer = a + b;
    text = `${a} + ${b} = ?`;
  } else if (kind === 1) {
    a = 100 + Math.floor(Math.random() * 400);
    b = 20 + Math.floor(Math.random() * (a - 20));
    answer = a - b;
    text = `${a} − ${b} = ?`;
  } else if (kind === 2) {
    a = 6 + Math.floor(Math.random() * 14);
    b = 6 + Math.floor(Math.random() * 14);
    answer = a * b;
    text = `${a} × ${b} = ?`;
  } else if (kind === 3) {
    b = 2 + Math.floor(Math.random() * 11);
    answer = 2 + Math.floor(Math.random() * 11);
    a = b * answer;
    text = `${a} ÷ ${b} = ?`;
  } else {
    a = 2 + Math.floor(Math.random() * 9);
    b = 2 + Math.floor(Math.random() * 9);
    const c = 10 + Math.floor(Math.random() * 40);
    answer = a * b + c;
    text = `${a} × ${b} + ${c} = ?`;
  }
  const choices = makeChoices(answer, () => answer + (Math.floor(Math.random() * 17) - 8));
  return { text, answer, choices, subject: "math", difficulty: "elem" };
}

/** 國中數學 */
function mathMiddle() {
  const kind = Math.floor(Math.random() * 6);
  let answer, text;
  if (kind === 0) {
    const a = -20 + Math.floor(Math.random() * 40);
    const b = -30 + Math.floor(Math.random() * 60);
    answer = a + b;
    text = `(${a}) + (${b}) = ?`;
  } else if (kind === 1) {
    const a = 2 + Math.floor(Math.random() * 12);
    const x = 2 + Math.floor(Math.random() * 9);
    const c = 5 + Math.floor(Math.random() * 30);
    answer = a * x + c;
    text = `若 x = ${x}，求 ${a}x + ${c} = ?`;
  } else if (kind === 2) {
    const d = 2 + Math.floor(Math.random() * 9);
    const e = 2 + Math.floor(Math.random() * 9);
    const f = 10 + Math.floor(Math.random() * 50);
    answer = d * e - f;
    text = `${d} × ${e} − ${f} = ?`;
  } else if (kind === 3) {
    const p = [2, 3, 4, 5, 6, 8, 10][Math.floor(Math.random() * 7)];
    const n = (1 + Math.floor(Math.random() * 8)) * p;
    answer = n / p;
    text = `${n} ÷ ${p} = ?（可為小數？選整數答案）`;
    answer = Math.round(answer);
    text = `${n} ÷ ${p} = ?`;
  } else if (kind === 4) {
    const base = 2 + Math.floor(Math.random() * 8);
    answer = base * base;
    text = `${base}² = ?`;
  } else {
    const a = 12 + Math.floor(Math.random() * 38);
    const b = 12 + Math.floor(Math.random() * 38);
    const c = 8 + Math.floor(Math.random() * 25);
    answer = a + b - c;
    text = `${a} + ${b} − ${c} = ?`;
  }
  const choices = makeChoices(answer, () => answer + Math.floor(Math.random() * 15) - 7);
  return { text, answer, choices, subject: "math", difficulty: "middle" };
}

const EN_ELEM = [
  { w: "adventure", zh: "冒險" },
  { w: "brave", zh: "勇敢的" },
  { w: "celebrate", zh: "慶祝" },
  { w: "dangerous", zh: "危險的" },
  { w: "environment", zh: "環境" },
  { w: "famous", zh: "有名的" },
  { w: "generous", zh: "慷慨的" },
  { w: "harvest", zh: "收成" },
  { w: "imagine", zh: "想像" },
  { w: "journey", zh: "旅程" },
  { w: "knowledge", zh: "知識" },
  { w: "library", zh: "圖書館" },
  { w: "mystery", zh: "謎" },
  { w: "nervous", zh: "緊張的" },
  { w: "observe", zh: "觀察" },
  { w: "patient", zh: "有耐心的" },
  { w: "quality", zh: "品質" },
  { w: "rescue", zh: "救援" },
  { w: "survive", zh: "存活" },
  { w: "treasure", zh: "寶藏" },
];

const EN_MIDDLE = [
  { w: "ambiguous", zh: "模糊的" },
  { w: "benevolent", zh: "仁慈的" },
  { w: "compromise", zh: "妥協" },
  { w: "deteriorate", zh: "惡化" },
  { w: "eloquent", zh: "雄辯的" },
  { w: "feasible", zh: "可行的" },
  { w: "gregarious", zh: "愛社交的" },
  { w: "hypothesis", zh: "假設" },
  { w: "inevitable", zh: "不可避免的" },
  { w: "jubilant", zh: "喜慶的" },
  { w: "kinetic", zh: "運動的" },
  { w: "legitimate", zh: "合法的" },
  { w: "meticulous", zh: "一絲不苟的" },
  { w: "notorious", zh: "臭名昭著的" },
  { w: "obsolete", zh: "過時的" },
  { w: "paradox", zh: "矛盾" },
  { w: "quintessential", zh: "典型的" },
  { w: "resilient", zh: "有韌性的" },
  { w: "substantial", zh: "大量的" },
  { w: "unanimous", zh: "一致的" },
];

function englishQuiz(difficulty) {
  const pool = difficulty === "middle" ? EN_MIDDLE : EN_ELEM;
  const item = pool[Math.floor(Math.random() * pool.length)];
  const others = pool.filter((x) => x.zh !== item.zh);
  const wrong = shuffle(others).slice(0, 3).map((x) => x.zh);
  const answer = item.zh;
  const choices = shuffle([...wrong, answer]);
  return {
    text: `「${item.w}」的意思是？`,
    answer,
    choices,
    subject: "english",
    difficulty,
  };
}

export function generateMissionQuestion(subject = "math", difficulty = "elem") {
  if (subject === "english") return englishQuiz(difficulty);
  return difficulty === "middle" ? mathMiddle() : mathElem();
}

/** 舊介面相容 */
export function generateMathQuestion() {
  return generateMissionQuestion("math", "elem");
}

export function spawnMissionStations(ctx, maze, count, avoid = []) {
  const stations = [];
  const used = new Set(avoid.map((p) => `${p.gx},${p.gz}`));
  used.add("0,0");
  used.add(`${ctx.w - 1},${ctx.h - 1}`);

  for (let t = 0; t < count * 30 && stations.length < count; t++) {
    const gx = Math.floor(Math.random() * ctx.w);
    const gz = Math.floor(Math.random() * ctx.h);
    const k = `${gx},${gz}`;
    if (used.has(k)) continue;
    used.add(k);
    const c = cellCenter(ctx, gx, gz);
    stations.push({
      gx, gz, x: c.x, z: c.z,
      done: false,
      id: stations.length,
    });
  }
  return stations;
}

export function buildMissionMeshes(scene, stations, opts = {}) {
  const compact = !!opts.compact;
  const group = new THREE.Group();
  stations.forEach((st) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.5, 8),
      new THREE.MeshLambertMaterial({ color: 0xffaa22, emissive: 0x664400, emissiveIntensity: 0.5 })
    );
    base.position.y = 0.25;
    g.add(base);
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9, 0),
      new THREE.MeshLambertMaterial({ color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 0.8 })
    );
    core.position.y = 2.2;
    g.add(core);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.12, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.15;
    if (compact) ring.visible = false;
    g.add(ring);
    if (compact) g.scale.setScalar(0.82);
    g.position.set(st.x, 0, st.z);
    g.userData.station = st;
    st.mesh = g;
    group.add(g);
  });
  scene.add(group);
  return group;
}

export function tickMissionGlow(stations, time) {
  stations.forEach((st) => {
    if (st.done || !st.mesh) return;
    st.mesh.rotation.y = time * 0.8;
    const core = st.mesh.children[1];
    if (core) core.position.y = 2.2 + Math.sin(time * 3) * 0.25;
  });
}
