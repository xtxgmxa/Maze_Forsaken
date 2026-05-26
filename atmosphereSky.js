import * as THREE from "three";
import { getShooterLayout } from "./shooterLayouts.js";

let skyDome = null;
let cloudGroup = null;

const SKY_PRESETS = {
  day: { top: 0x5eb3ff, bottom: 0xb8e4ff, fog: 0xb8d8f0, sun: 0xfff4e0, hemiSky: 0x88ccff, hemiGround: 0x6a7a58, cloud: 0xffffff },
  /** 偏藍紫暮光，避免刺眼橘紅 */
  dusk: { top: 0x6a88aa, bottom: 0x2a3048, fog: 0x3a4458, sun: 0xc8d0e0, hemiSky: 0x7a90b0, hemiGround: 0x3a4048, cloud: 0xd8e4f0 },
  night: { top: 0x0a1028, bottom: 0x1a2848, fog: 0x0e1428, sun: 0x8899cc, hemiSky: 0x223355, hemiGround: 0x0a0818, cloud: 0x334466 },
};

const SHOOTER_PRESET = {
  sky_open: "day", sky_twin_towers: "day", sky_runway: "day", paintball_camp: "day",
  neon_grid: "night", neon_spire: "night",
  arena_ring: "dusk", dock_yard: "dusk", urban_quick: "day",
};

function pickPresetFromSkyColor(skyHex) {
  const r = (skyHex >> 16) & 255;
  const g = (skyHex >> 8) & 255;
  const b = skyHex & 255;
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  const warm = r > g + 18 && r > b + 10;
  if (lum > 0.62) return "day";
  if (warm || lum > 0.28) return "dusk";
  return "night";
}

/** 壓低暖色天空的飽和度，避免刺眼紅橙 */
function softenSkyColor(hex, warmBias = 0.42) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  if (hsl.s > 0.12) hsl.s *= warmBias;
  hsl.l = Math.min(0.72, hsl.l * 0.92 + 0.04);
  c.setHSL(hsl.h, hsl.s, hsl.l);
  return c.getHex();
}

function removeSky(scene) {
  if (skyDome && scene) {
    scene.remove(skyDome);
    skyDome.geometry?.dispose();
    skyDome.material?.dispose();
    skyDome = null;
  }
  if (cloudGroup && scene) {
    scene.remove(cloudGroup);
    cloudGroup.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    cloudGroup = null;
  }
}

/** 麥塊風格方塊雲（多層、有厚度） */
function addBlockClouds(scene, preset, seed = 1) {
  cloudGroup = new THREE.Group();
  cloudGroup.name = "gameClouds";
  const col = preset.cloud ?? 0xffffff;
  const mat = new THREE.MeshLambertMaterial({
    color: col,
    transparent: true,
    opacity: preset === SKY_PRESETS.night ? 0.35 : 0.88,
    fog: true,
  });
  const rng = (n) => {
    const x = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const layouts = [
    [[0, 0, 0], [1.2, 0.55, 0.9], [2.1, 0, 0.3]],
    [[0, 0.2, 0.5], [1, 0.5, 0], [1.8, 0.15, -0.4], [2.6, 0, 0.2]],
    [[-0.4, 0, 0], [0.6, 0.45, 0.2], [1.5, 0.35, -0.2]],
  ];
  const cloudCount = preset === SKY_PRESETS.night ? 6 : 11;
  for (let c = 0; c < cloudCount; c++) {
    const g = new THREE.Group();
    const yaw = rng(c) * Math.PI * 2;
    const dist = 55 + rng(c + 7) * 45;
    const y = 28 + rng(c + 13) * 38;
    const layout = layouts[Math.floor(rng(c + 3) * layouts.length)];
    const scale = 2.8 + rng(c + 19) * 2.2;
    for (const [ox, oy, oz] of layout) {
      const w = 5 + rng(c + ox) * 4;
      const h = 2.2 + rng(c + oy) * 1.6;
      const d = 4 + rng(c + oz) * 3;
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      box.position.set(ox * scale, oy * scale * 0.5, oz * scale);
      box.castShadow = false;
      box.receiveShadow = false;
      g.add(box);
    }
    g.position.set(Math.cos(yaw) * dist, y, Math.sin(yaw) * dist);
    g.rotation.y = yaw;
    cloudGroup.add(g);
  }
  if (preset !== SKY_PRESETS.night) {
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(6, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff8e0, fog: true })
    );
    sun.position.set(-42, 52, -68);
    cloudGroup.add(sun);
  } else {
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(4.5, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xe8f0ff, fog: true })
    );
    moon.position.set(38, 48, -55);
    cloudGroup.add(moon);
  }
  scene.add(cloudGroup);
  scene.userData.cloudGroup = cloudGroup;
}

/** 漸層天空球 + 方塊雲 + 霧／光照 */
export function applyMapAtmosphere(scene, opts = {}) {
  if (!scene) return;
  const skyHex = opts.sky ?? 0x1a1228;
  const fogHex = opts.fog ?? skyHex;
  const presetKey = opts.preset || pickPresetFromSkyColor(skyHex);
  const preset = SKY_PRESETS[presetKey] || SKY_PRESETS.dusk;
  const warmSky = ((skyHex >> 16) & 255) > ((skyHex >> 8) & 255) + 12;
  const soften = warmSky || presetKey === "dusk";
  const topHex = soften ? softenSkyColor(opts.skyTop ?? preset.top) : (opts.skyTop ?? preset.top);
  const bottomHex = soften ? softenSkyColor(opts.skyBottom ?? skyHex, 0.5) : (opts.skyBottom ?? skyHex);
  const fogUse = soften ? softenSkyColor(fogHex, 0.48) : fogHex;
  const top = new THREE.Color(topHex);
  const bottom = new THREE.Color(bottomHex);
  const fogCol = new THREE.Color(fogUse);

  scene.background = bottom.clone();
  scene.fog = new THREE.Fog(fogCol.getHex(), opts.fogNear ?? 18, opts.fogFar ?? 120);

  removeSky(scene);
  const geo = new THREE.SphereGeometry(180, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: top },
      bottomColor: { value: bottom },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y * 0.5 + 0.5;
        h = clamp(h, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, 0.82)), 1.0);
      }
    `,
  });
  skyDome = new THREE.Mesh(geo, mat);
  skyDome.name = "gameSkyDome";
  skyDome.frustumCulled = false;
  skyDome.renderOrder = -10;
  scene.add(skyDome);

  addBlockClouds(scene, preset, opts.seed ?? skyHex);

  const hemi = scene.userData.hemiLight;
  if (hemi) {
    hemi.color.set(opts.hemiSky ?? preset.hemiSky);
    hemi.groundColor.set(opts.hemiGround ?? preset.hemiGround);
    hemi.intensity = opts.hemiIntensity ?? 0.62;
  }
  const dir = scene.userData.shadowLight;
  if (dir) {
    dir.color.set(opts.sunColor ?? preset.sun);
    dir.intensity = opts.sunIntensity ?? 1.28;
  }
  const fill = scene.userData.fillLight;
  if (fill) fill.intensity = opts.fillIntensity ?? 0.32;
}

export function applyClassicLevelAtmosphere(scene, theme, ctx) {
  const sky = theme?.sky ?? 0x1a1228;
  const themeIdx = (theme?.id ?? 0) % 3;
  const preset = ["day", "dusk", "night"][themeIdx];
  applyMapAtmosphere(scene, {
    sky,
    fog: sky,
    preset,
    seed: theme?.id ?? 1,
    fogNear: (ctx?.fogNear ?? 12) * 0.9,
    fogFar: (ctx?.fogFar ?? 55) * 1.6,
  });
}

export function applyShooterMapAtmosphere(scene, level) {
  const layoutKey = level?.shooterLayout || level?.mapStyle || "arena_ring";
  const pal = getShooterLayout(level).palette || {};
  const sky = pal.sky ?? 0x2a3848;
  const fog = pal.fog ?? sky;
  applyMapAtmosphere(scene, {
    sky,
    fog,
    preset: SHOOTER_PRESET[layoutKey] || pickPresetFromSkyColor(sky),
    seed: (level?.id ?? 1) * 17,
    fogNear: 22,
    fogFar: 108,
  });
}
