槍戰漆彈音效檔案（可選）



請把音效放在此資料夾，檔名需與 shooter-sounds.json 一致：



  paintball_fire.mp3       — 開火

  paintball_hit_body.mp3   — 打中人

  paintball_hit_wall.mp3   — 打中牆壁

  paintball_headshot.mp3   — 爆頭（可選，沒有則用 hit_body）

  paintball_pickup_heal.mp3 — 撿綠十字補血



全模式共用（game-sounds.json）：



  footstep.mp3             — 腳步聲

  jump.mp3                 — 跳躍起跳

  land.mp3                 — 落地

  bounce_pad.mp3           — 踩彈跳板



路徑設定檔：

  assets/audio/shooter-sounds.json  — 槍戰專用

  assets/audio/game-sounds.json     — 全模式共用



若某欄位留空 "" 或檔案不存在，遊戲會自動用內建合成音。



支援格式：mp3、ogg、wav（瀏覽器可解碼即可）

⚠ Windows 若檔名變成 footstep.mp3.MP3（雙副檔名），請改為 footstep.mp3，
  或在「檔案總管 → 檢視」關閉「隱藏已知檔案的副檔名」後重新命名。

槍戰勝利音樂請放：assets/audio/music/shooter_win.mp3（不是 sfx 資料夾）



背景音樂：assets/music.mp3


