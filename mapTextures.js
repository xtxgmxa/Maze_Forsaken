import * as THREE from "three";

/** 簡易 Roblox 風格凸點／格線貼圖 */
export function makeStudTexture(hexColor, stud = true) {
  const cvs = document.createElement("canvas");
  cvs.width = 128;
  cvs.height = 128;
  const cx = cvs.getContext("2d");
  const r = (hexColor >> 16) & 255;
  const g = (hexColor >> 8) & 255;
  const b = hexColor & 255;
  const base = `rgb(${r},${g},${b})`;
  const dark = `rgb(${Math.max(0, r - 28)},${Math.max(0, g - 28)},${Math.max(0, b - 28)})`;
  const light = `rgb(${Math.min(255, r + 35)},${Math.min(255, g + 35)},${Math.min(255, b + 35)})`;

  cx.fillStyle = base;
  cx.fillRect(0, 0, 128, 128);
  cx.strokeStyle = dark;
  cx.lineWidth = 2;
  for (let i = 0; i <= 128; i += 32) {
    cx.beginPath();
    cx.moveTo(i, 0);
    cx.lineTo(i, 128);
    cx.stroke();
    cx.beginPath();
    cx.moveTo(0, i);
    cx.lineTo(128, i);
    cx.stroke();
  }
  if (stud) {
    for (let y = 16; y < 128; y += 32) {
      for (let x = 16; x < 128; x += 32) {
        const g2 = cx.createRadialGradient(x, y, 2, x, y, 11);
        g2.addColorStop(0, light);
        g2.addColorStop(1, dark);
        cx.fillStyle = g2;
        cx.beginPath();
        cx.arc(x, y, 10, 0, Math.PI * 2);
        cx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function lambertStud(hex, emHex, intensity = 0.25) {
  return new THREE.MeshLambertMaterial({
    map: makeStudTexture(hex),
    color: 0xffffff,
    emissive: emHex ?? hex,
    emissiveIntensity: intensity,
  });
}
