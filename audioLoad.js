/**
 * 載入音效檔：支援 Windows 常見的 .mp3.MP3 雙副檔名。
 */

/** @param {string} path */
export function audioPathCandidates(path) {
  if (!path || typeof path !== "string") return [];
  const out = [path];
  if (/^assets\//i.test(path)) {
    out.push(`Maze_Forsaken/${path}`);
    out.push(`./Maze_Forsaken/${path}`);
  } else if (/^\.\/?assets\//i.test(path)) {
    const clean = path.replace(/^\.\//, "");
    out.push(`Maze_Forsaken/${clean}`);
    out.push(`./Maze_Forsaken/${clean}`);
  } else if (/^Maze_Forsaken\/assets\//i.test(path)) {
    out.push(path.replace(/^Maze_Forsaken\//, ""));
    out.push(`./${path.replace(/^Maze_Forsaken\//, "")}`);
  }
  if (/\.mp3$/i.test(path)) {
    out.push(path.replace(/\.mp3$/i, ".mp3.MP3"));
    out.push(path.replace(/\.mp3$/i, ".MP3"));
  }
  return [...new Set(out)];
}

/**
 * @param {AudioContext} actx
 * @param {string} path
 * @returns {Promise<AudioBuffer|null>}
 */
export async function fetchDecodeAudio(actx, path) {
  if (!actx || !path) return null;
  for (const url of audioPathCandidates(path)) {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) continue;
      const ab = await res.arrayBuffer();
      return await actx.decodeAudioData(ab.slice(0));
    } catch {
      /* try next */
    }
  }
  return null;
}
