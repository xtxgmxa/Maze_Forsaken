FORSAKEN 音效檔案說明
========================

檔案不存在或載入失敗時，遊戲會自動改用內建合成音，仍可正常遊玩。
GitHub Pages 若偶爾載不到 mp3，多半是網路快取或 CDN 延遲，重新整理或等幾秒再試。

────────────────────────────────────────
一、全模式共用（assets/audio/game-sounds.json）
────────────────────────────────────────

| 檔名 | 遊戲用途 | 內建 fallback |
|------|----------|----------------|
| footstep.mp3 | 走路腳步 | 合成腳步 |
| jump.mp3 | 跳躍起跳 | 合成跳 |
| land.mp3 | 落地 | 合成落地 |
| bounce_pad.mp3 | 踩彈跳板彈起 | 合成傳送感 |
| slide.mp3 | 滑壘（Ctrl） | 合成滑動 |
| katana_swing.mp3 | 武士刀揮砍 | 合成斬擊 |
| katana_parry.mp3 | 武士刀使出格擋（右鍵／開鏡鍵，4 秒格擋開始） | 合成 parry_start |
| parry_deflect.mp3 | 武士刀格擋反彈子彈 | 合成命中 |

────────────────────────────────────────
二、槍戰專用（assets/audio/shooter-sounds.json）
────────────────────────────────────────

| 檔名 | 遊戲用途 | 內建 fallback |
|------|----------|----------------|
| paintball_fire.mp3 | 開火／射擊 | 合成槍聲 |
| paintball_hit_body.mp3 | 打中身體 | 合成命中 |
| paintball_hit_wall.mp3 | 打中牆／掩體 | 合成撞擊 |
| paintball_headshot.mp3 | 爆頭 | 合成爆頭 |
| paintball_pickup_heal.mp3 | 撿綠十字補血 | 合成道具 |

槍戰結算音樂（不在 sfx 資料夾）：
| 檔名 | 用途 |
|------|------|
| assets/audio/music/shooter_win.mp3 | 槍戰勝利 |
| assets/audio/music/shooter_lose.mp3 | 槍戰落敗 |

────────────────────────────────────────
三、背景音樂
────────────────────────────────────────

| 檔名 | 用途 |
|------|------|
| assets/music.mp3 | 主選單／經典模式 BGM |

────────────────────────────────────────
四、僅內建合成、無獨立 mp3 的常見音效
────────────────────────────────────────

這些由 audio.js 程式生成，不必放檔案：
- UI 按鈕（ui / ui_confirm / ui_back）
- 受傷 hurt、命中 hit、擊殺 kill
- 獵人揮刀 swing_wind、能力 ability
- 任務 mission、開門 exit、傳送 teleport
- 經典模式追擊 chase / horror 等

────────────────────────────────────────
五、你先前可能新增／討論過的項目
────────────────────────────────────────

- katana_parry.mp3 … 格擋啟動（已列入 game-sounds.json 的 parryStart）
- parry_deflect.mp3 … 格擋反彈子彈（已列入 game-sounds.json）
- 槍戰 muzzle／漆彈相關 … 目前仍多用 paintball_fire / hit 系列
- 若還要做「專用換彈、空彈、倒數嗶聲」等，可再加欄位到 shooter-sounds.json

格式：mp3、ogg、wav 皆可。副檔名大小寫皆可（例如 slide.MP3）。
若聽不到自訂音：先點一下畫面解鎖音效，再開一局；仍無聲請把檔名改成全小寫 .mp3。
