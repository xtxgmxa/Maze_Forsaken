/** 依模組位置解析資源 URL（GitHub Pages 子路徑也能正確載入） */
export function resolveAsset(relativePath) {
  const p = (relativePath || "").replace(/^\//, "");
  return new URL(p.startsWith("./") ? p : `./${p}`, import.meta.url).href;
}
