import * as THREE from "three";
import { plasticPBR } from "./mapTextures.js";

let robloxFaceTex = null;

function getRobloxFaceTexture() {
  if (robloxFaceTex) return robloxFaceTex;
  const cvs = document.createElement("canvas");
  cvs.width = 128;
  cvs.height = 128;
  const cx = cvs.getContext("2d");
  cx.clearRect(0, 0, 128, 128);
  cx.fillStyle = "#111";
  cx.fillRect(36, 44, 16, 16);
  cx.fillRect(76, 44, 16, 16);
  cx.strokeStyle = "#111";
  cx.lineWidth = 7;
  cx.lineCap = "round";
  cx.beginPath();
  cx.arc(64, 78, 24, 0.12 * Math.PI, 0.88 * Math.PI);
  cx.stroke();
  robloxFaceTex = new THREE.CanvasTexture(cvs);
  robloxFaceTex.colorSpace = THREE.SRGBColorSpace;
  return robloxFaceTex;
}

/** 肖像檔名對照你提供的「forsaken角色圖」資料夾 */
const SK = (f) => `assets/characters/survivors/${f}`;
const KK = (f) => `assets/characters/killers/${f}`;

export const KILLERS = [
  {
    id: "1x1x1x1",
    name: "1x1x1x1",
    role: "Killer",
    desc: "Slash · Mass Infection · Entanglement",
    portrait: KK("1x1x1x1.jpg"),
    torso: 0x111111, legs: 0x0a0a0a, head: 0x111111, shirt: 0x22ff44, accent: 0x33ff66,
    scale: 1.05, extras: ["domino_crown"], weapon: "sword",
  },
  {
    id: "c00lkidd",
    name: "c00lkidd",
    role: "Killer",
    desc: "Corrupt Nature · Walkspeed Override · Pizza Delivery",
    portrait: KK("c00lkidd.jpg"),
    torso: 0xcc1111, legs: 0x880000, head: 0xcc1111, shirt: 0x990000, accent: 0x111111,
    scale: 1.08, extras: ["c00l_shirt"], weapon: "corrupt_blade",
  },
  {
    id: "guest666k",
    name: "Guest 666",
    role: "Killer",
    desc: "Carving Slash · Demonic Pursuit · Infernal Cry",
    portrait: KK("guest666.jpg"),
    torso: 0x222222, legs: 0x111111, head: 0xeeeeee, shirt: 0x660000, accent: 0xff0000,
    extras: ["guest_hat", "red_eyes"], weapon: "cleaver",
  },
  {
    id: "johndoe",
    name: "John Doe",
    role: "Killer",
    desc: "Slash · Corrupt Energy · Digital Footprint",
    portrait: KK("johndoe.jpg"),
    torso: 0xf5cd30, legs: 0xcc9900, head: 0xf5cd30, shirt: 0x2244aa, accent: 0xff0000,
    extras: ["red_eye"], weapon: "knife",
  },
  {
    id: "noli",
    name: "Noli",
    role: "Killer",
    desc: "Stab · Void Rush · Nova",
    portrait: KK("noli.jpg"),
    torso: 0x1a1028, legs: 0x0a0818, head: 0x1a1028, shirt: 0x4a2080, accent: 0xffcc00,
    extras: ["clock_badge"], weapon: "void_blade",
  },
  {
    id: "nosferatu",
    name: "Nosferatu",
    role: "Killer",
    desc: "Lacerate · Bloodhook · Cataclysm",
    portrait: KK("nosferatu.jpg"),
    torso: 0x441122, legs: 0x220811, head: 0x110008, shirt: 0x662244, accent: 0xff2266,
    extras: ["vampire_hood"], weapon: "claws",
  },
  {
    id: "slasher",
    name: "Slasher",
    role: "Killer",
    desc: "Slash · Behead · Gashing Wound",
    portrait: KK("slasher.jpg"),
    torso: 0x225522, legs: 0x113311, head: 0xffffff, shirt: 0x336633, accent: 0xff0000,
    extras: ["fedora"], weapon: "machete",
  },
];

function attachKillerWeapon(rightArm, def, mat, addBox, s) {
  const w = def.weapon || "knife";
  const accent = def.accent || 0xff2244;
  const blade = mat(accent, accent, 0.35);
  const handle = mat(0x332211);
  const wp = new THREE.Group();
  wp.position.set(0.15 * s, -0.55 * s, 0.35 * s);
  if (w === "sword") {
    addBox(wp, 0.12, 1.1, 0.22, blade, 0.55);
    addBox(wp, 0.14, 0.28, 0.24, handle, 0.05);
  } else if (w === "machete" || w === "cleaver") {
    addBox(wp, 0.08, 0.95, 0.35, blade, 0.5);
    addBox(wp, 0.12, 0.25, 0.2, handle, 0.02);
  } else if (w === "claws") {
    addBox(wp, 0.1, 0.35, 0.08, blade, 0.2, 0.1, 0);
    addBox(wp, 0.1, 0.4, 0.08, blade, 0.15, -0.08, 0);
    addBox(wp, 0.1, 0.32, 0.08, blade, 0.1, 0.18, 0);
  } else if (w === "corrupt_blade") {
    addBox(wp, 0.1, 1.0, 0.28, mat(0x111111, 0x33ff44, 0.5), 0.52);
    addBox(wp, 0.14, 0.3, 0.3, mat(0xff0000, 0xff0000, 0.4), 0.48);
  } else if (w === "void_blade") {
    addBox(wp, 0.1, 1.05, 0.2, mat(0x4a2080, 0xffcc00, 0.45), 0.55);
  } else {
    addBox(wp, 0.1, 0.85, 0.18, blade, 0.45);
    addBox(wp, 0.12, 0.22, 0.2, handle, 0.02);
  }
  rightArm.add(wp);
  return wp;
}

export const SURVIVORS = [
  {
    id: "007n7",
    name: "007n7",
    role: "Survivor",
    desc: "Clone · CoolGUI · Inject",
    portrait: SK("007n7.jpg"),
    torso: 0x1a2a6e, legs: 0x111122, head: 0xd4a574, shirt: 0x223388, accent: 0x00ffcc,
    extras: ["hacker_hood"],
  },
  {
    id: "builderman",
    name: "Builderman",
    role: "Survivor",
    desc: "Sentry · Dispenser · Overclock",
    portrait: SK("builderman.jpg"),
    torso: 0x888888, legs: 0x2244aa, head: 0xffffff, shirt: 0x666666, accent: 0xffcc00,
    extras: ["hard_hat"],
  },
  {
    id: "chance",
    name: "Chance",
    role: "Survivor",
    desc: "Coin Flip · One Shot · Reroll",
    portrait: SK("chance.jpg"),
    torso: 0x661122, legs: 0x221111, head: 0xe8c8a0, shirt: 0x881133, accent: 0xffd700,
    extras: ["cards"],
  },
  {
    id: "dusekkar",
    name: "Dusekkar",
    role: "Survivor",
    desc: "Spawn Protection · Plasma Beam · Heal",
    portrait: SK("dusekkar.jpg"),
    torso: 0x444455, legs: 0x333344, head: 0x2244aa, shirt: 0xeeeeee, accent: 0xffdd44,
    extras: ["skull_mask"],
  },
  {
    id: "elliot",
    name: "Elliot",
    role: "Survivor",
    desc: "Pizza Throw · Rush Hour · Support",
    portrait: SK("elliot.jpg"),
    torso: 0xcc2222, legs: 0x333333, head: 0xf5cd30, shirt: 0xcc2222, accent: 0xffffff,
    extras: ["delivery_cap"],
  },
  {
    id: "guest1337",
    name: "Guest 1337",
    role: "Survivor",
    desc: "Block · Charge · Punch",
    portrait: SK("guest1337.jpg"),
    torso: 0x8b7355, legs: 0x4a4035, head: 0xeeddcc, shirt: 0x6b5a45, accent: 0x2244aa,
    extras: [],
  },
  {
    id: "janedoe",
    name: "Jane Doe",
    role: "Survivor",
    desc: "Crystal Pitch · Hatchet · Digital Footprint",
    portrait: SK("janedoe.jpg"),
    torso: 0x1a1a22, legs: 0x111118, head: 0xe8dcc8, shirt: 0x332244, accent: 0xcc88ff,
    extras: ["wide_hat"],
  },
  {
    id: "noob",
    name: "Noob",
    role: "Survivor",
    desc: "Bloxy Cola · Slateskin · Ghostburger",
    portrait: SK("noob.jpg"),
    torso: 0xf5cd30, legs: 0xc4c4c4, head: 0xf5cd30, shirt: 0x2154b9, accent: 0x6b9cff,
    extras: [],
  },
  {
    id: "shedletsky",
    name: "Shedletsky",
    role: "Survivor",
    desc: "Slash · Fried Chicken · Guard",
    portrait: SK("shedletsky.jpg"),
    torso: 0x3366cc, legs: 0x222222, head: 0xffdd55, shirt: 0xffffff, accent: 0xffaa00,
    extras: ["fried_chicken"],
  },
  {
    id: "taph",
    name: "Taph",
    role: "Survivor",
    desc: "Tripwire · Subspace Tripmine · Smoke",
    portrait: SK("taph.jpg"),
    torso: 0x554433, legs: 0x332211, head: 0xddccbb, shirt: 0x443322, accent: 0xffaa00,
    extras: [],
  },
  {
    id: "twotime",
    name: "Two Time",
    role: "Survivor",
    desc: "Sacrificial Dagger · Crouch · Ritual",
    portrait: SK("twotime.jpg"),
    torso: 0x2a1040, legs: 0x1a0828, head: 0xffddaa, shirt: 0x4a2080, accent: 0xffcc00,
    extras: ["clock_badge"],
  },
  {
    id: "veeronica",
    name: "Veeronica",
    role: "Survivor",
    desc: "Vandalism · SK8 · Broadcast",
    portrait: SK("veeronica.jpg"),
    torso: 0xcc2244, legs: 0x222222, head: 0xff88cc, shirt: 0xcc2244, accent: 0xff66aa,
    extras: ["hair_buns", "tv_head"],
  },
];

export function buildForsakenCharacter(def, scale = 1) {
  const s = (def.scale || 1) * scale;
  const root = new THREE.Group();
  root.frustumCulled = false;
  const mat = (color, emissive = 0x000000, ei = 0.1) => plasticPBR(color, emissive, ei);
  const limbW = 0.42;
  const limbH = 0.88;
  const limbD = 0.42;

  const addBox = (parent, w, h, d, material, y, x = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, d * s), material);
    m.position.set(x * s, y * s, z * s);
    parent.add(m);
    return m;
  };

  const pivot = (parent, x, y, z) => {
    const p = new THREE.Group();
    p.position.set(x * s, y * s, z * s);
    parent.add(p);
    return p;
  };

  const hipY = 0.92;
  const torsoY = 1.38;
  const legMat = mat(def.legs);
  const torsoMat = mat(def.torso);
  const armMat = mat(def.shirt ?? def.torso);

  const leftLeg = pivot(root, -0.36, hipY, 0);
  const rightLeg = pivot(root, 0.36, hipY, 0);
  addBox(leftLeg, limbW, limbH, limbD, legMat, -limbH / 2);
  addBox(rightLeg, limbW, limbH, limbD, legMat, -limbH / 2);

  const torso = pivot(root, 0, torsoY, 0);
  addBox(torso, 1.08, 1.14, 0.48, torsoMat, 0.57);
  if (def.shirt != null) addBox(torso, 1.1, 0.88, 0.5, mat(def.shirt), 0.72);
  if (def.accent) addBox(torso, 1.12, 0.16, 0.52, mat(def.accent, def.accent, 0.32), 1.02);

  const leftArm = pivot(torso, -0.62, 0.86, 0);
  const rightArm = pivot(torso, 0.62, 0.86, 0);
  addBox(leftArm, limbW * 0.95, limbH, limbD * 0.95, armMat, -limbH * 0.5);
  addBox(rightArm, limbW * 0.95, limbH, limbD * 0.95, armMat, -limbH * 0.5);
  if (def.accent) {
    addBox(leftArm, limbW, 0.16, limbD, mat(def.accent, def.accent, 0.24), -0.28);
    addBox(rightArm, limbW, 0.16, limbD, mat(def.accent, def.accent, 0.24), -0.28);
  }

  const head = pivot(torso, 0, 1.14, 0);
  addBox(head, 1.0, 1.0, 1.0, mat(def.head), 0.5);

  const stud = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * s, 0.12 * s, 0.1 * s, 8),
    mat(def.head, def.head, 0.08)
  );
  stud.position.y = 1.02 * s;
  head.add(stud);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42 * s, 0.42 * s),
    new THREE.MeshBasicMaterial({ map: getRobloxFaceTexture(), transparent: true, depthWrite: false })
  );
  face.position.set(0, 0.5 * s, 0.51 * s);
  head.add(face);

  const ex = def.extras || [];
  if (ex.includes("red_eyes") || ex.includes("red_eye")) {
    addBox(head, 0.18, 0.12, 0.05, mat(0xff0000, 0xff0000, 0.5), 0.48, -0.22, 0.52);
    if (ex.includes("red_eyes")) addBox(head, 0.18, 0.12, 0.05, mat(0xff0000, 0xff0000, 0.5), 0.48, 0.22, 0.52);
  }
  if (ex.includes("guest_hat")) addBox(head, 1.05, 0.35, 1.05, mat(0xdddddd), 1.02);
  if (ex.includes("hacker_hood")) addBox(head, 1.1, 0.5, 1.1, mat(def.shirt), 0.92);
  if (ex.includes("delivery_cap")) addBox(head, 1.0, 0.25, 1.0, mat(def.accent), 1.02);
  if (ex.includes("hard_hat")) addBox(head, 1.05, 0.3, 1.05, mat(0xffcc00), 1.02);
  if (ex.includes("domino_crown")) addBox(head, 1.1, 0.35, 1.1, mat(0x33ff44, 0x22aa33, 0.4), 1.06);
  if (ex.includes("vampire_hood")) addBox(head, 1.15, 0.6, 1.15, mat(0x220811), 0.9);
  if (ex.includes("skull_mask")) addBox(head, 1.0, 1.0, 1.0, mat(0x2244aa, 0x1133aa, 0.3), 0.48);
  if (ex.includes("fedora")) addBox(head, 1.1, 0.25, 1.1, mat(0x111111), 1.02);
  if (ex.includes("wide_hat")) addBox(head, 1.35, 0.12, 1.35, mat(0x111111), 1.06);
  if (ex.includes("fried_chicken")) addBox(torso, 0.45, 0.35, 0.55, mat(def.accent), 0.5, 0.7, 0.35);
  if (ex.includes("hair_buns")) {
    addBox(head, 0.32, 0.32, 0.32, mat(def.head), 0.58, -0.32, 0.05);
    addBox(head, 0.32, 0.32, 0.32, mat(def.head), 0.58, 0.32, 0.05);
  }
  if (ex.includes("tv_head")) {
    addBox(head, 0.5, 0.38, 0.22, mat(0x222222), 0.48, 0, 0.02);
  }
  if (ex.includes("c00l_shirt")) addBox(torso, 1.3, 0.4, 0.7, mat(0x111111), 0.35);

  let weapon = null;
  if (def.role === "Killer" || def.weapon) {
    weapon = attachKillerWeapon(rightArm, def, mat, addBox, s);
  }

  root.userData.def = def;
  root.userData.parts = {
    torso,
    head,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    weapon,
    baseTorsoY: torsoY * s,
    /** 頭部 pivot 在軀幹上的本地 Y（勿用世界累加高度） */
    baseHeadY: 1.14 * s,
  };
  root.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  cloneCharacterMaterials(root);
  return root;
}

/**
 * plasticPBR 使用全域快取 — 若直接改 opacity/emissive 會讓「同色」角色一起變透明或消失。
 * 建立角色後為每個 mesh 複製一份專用材質。
 */
export function cloneCharacterMaterials(root) {
  if (!root) return;
  root.traverse((c) => {
    if (!c.isMesh || !c.material) return;
    const own = (mat) => {
      if (!mat) return mat;
      if (mat.userData?._charOwned) return mat;
      const m = mat.clone();
      m.userData._charOwned = true;
      m.userData._baseOpacity = mat.opacity ?? 1;
      m.userData._baseTransparent = !!mat.transparent;
      m.userData._baseEI = mat.emissiveIntensity ?? 0.1;
      if (mat.emissive?.getHex) m.userData._baseEmissive = mat.emissive.getHex();
      return m;
    };
    if (Array.isArray(c.material)) c.material = c.material.map(own);
    else c.material = own(c.material);
  });
}

/** 還原受擊閃光／隱形後的材質（僅影響此角色） */
export function restoreSurvivorMaterialState(root) {
  if (!root) return;
  root.traverse((c) => {
    if (!c.isMesh || !c.material) return;
    const mats = Array.isArray(c.material) ? c.material : [c.material];
    for (const mat of mats) {
      if (!mat) continue;
      mat.transparent = mat.userData._baseTransparent ?? false;
      mat.opacity = mat.userData._baseOpacity ?? 1;
      if (mat.emissive && mat.userData._baseEmissive != null) {
        mat.emissive.setHex(mat.userData._baseEmissive);
      }
      mat.emissiveIntensity = mat.userData._baseEI ?? 0.1;
      mat.needsUpdate = true;
    }
  });
}
