import * as THREE from "three";
import { getShooterLayout } from "./shooterLayouts.js";

let skyDome = null;

const SKY_PRESETS = {
  day: { top: 0x5eb3ff, bottom: 0xb8e4ff, fog: 0xb8d8f0, sun: 0xfff4e0, hemiSky: 0x88ccff, hemiGround: 0x6a7a58 },
  dusk: { top: 0xff8844, bottom: 0x3a2858, fog: 0x6a4868, sun: 0xffaa66, hemiSky: 0xff9966, hemiGround: 0x4a3848 },
  night: { top: 0x0a1028, bottom: 0x1a2848, fog: 0x0e1428, sun: 0x8899cc, hemiSky: 0x223355, hemiGround: 0x0a0818 },
};

const SHOOTER_PRESET = {
  sky_open: "day", sky_twin_towers: "day", sky_runway: "day", paintball_camp: "day",
  neon_grid: "night", neon_spire: "night",
  arena_ring: "dusk", dock_yard: "dusk", urban_quick: "dusk",
};

function pickPresetFromSkyColor(skyHex) {
  const r = (skyHex >> 16) & 255;
  const g = (skyHex >> 8) & 255;
  const b = skyHex & 255;
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  if (lum > 0.62) return "day";
  if (lum > 0.28) return "dusk";
  return "night";
}

function removeSkyDome(scene) {
  if (skyDome && scene) {
    scene.remove(skyDome);
    skyDome.geometry?.dispose();
    skyDome.material?.dispose();
    skyDome = null;
  }
}

/** 漸層天空球 + 背景色／霧／光照色溫 */
export function applyMapAtmosphere(scene, opts = {}) {
  if (!scene) return;
  const skyHex = opts.sky ?? 0x1a1228;
  const fogHex = opts.fog ?? skyHex;
  const presetKey = opts.preset || pickPresetFromSkyColor(skyHex);
  const preset = SKY_PRESETS[presetKey] || SKY_PRESETS.dusk;
  const top = new THREE.Color(opts.skyTop ?? preset.top);
  const bottom = new THREE.Color(opts.skyBottom ?? skyHex);
  const fogCol = new THREE.Color(fogHex);

  scene.background = bottom.clone();
  scene.fog = new THREE.Fog(fogCol.getHex(), opts.fogNear ?? 18, opts.fogFar ?? 120);

  removeSkyDome(scene);
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
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, 0.85)), 1.0);
      }
    `,
  });
  skyDome = new THREE.Mesh(geo, mat);
  skyDome.name = "gameSkyDome";
  skyDome.frustumCulled = false;
  skyDome.renderOrder = -10;
  scene.add(skyDome);

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
    fogNear: 22,
    fogFar: 108,
  });
}
