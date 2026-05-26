@echo off
chcp 65001 >nul
cd /d "%~dp0"
title FORSAKEN - 迷宮逃脫

echo.
echo  ========================================
echo    FORSAKEN - 迷宮逃脫
echo  ========================================
echo.

:: 優先用本機小伺服器（音樂與模組載入較穩定）
where python >nul 2>&1
if %errorlevel%==0 (
  echo 正在啟動本機伺服器...
  echo 瀏覽器將開啟: http://localhost:8080
  echo 區網房間請另開 lan-server\start.bat（使用 8765，勿與此埠混淆）
  echo 關閉此視窗即可停止遊戲伺服器。
  echo.
  start "" "http://localhost:8080"
  python -m http.server 8080
  goto :eof
)

where py >nul 2>&1
if %errorlevel%==0 (
  echo 正在啟動本機伺服器...
  start "" "http://localhost:8080"
  py -m http.server 8080
  goto :eof
)

echo 未偵測到 Python，改為直接開啟遊戲檔案。
echo 若音樂無法播放，請安裝 Python 後再執行此檔。
echo.
start "" "%~dp0index.html"
pause
