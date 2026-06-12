@echo off
setlocal

set "APP_DIR=%~dp0"
set "APP_URL=http://127.0.0.1:5173"

cd /d "%APP_DIR%"

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Node.js and npm are required to run Albion Market History.
  echo Install Node.js from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { $response=Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%' -TimeoutSec 1; if ($response.Content -match '<title>Albion Market History</title>') { exit 0 }; exit 1 } catch { exit 1 }"
if errorlevel 1 (
  start "Albion Market History Server" /min cmd /c "cd /d ""%APP_DIR%"" && npm start"
)

echo Waiting for Albion Market History to start...
powershell -NoProfile -Command "$url='%APP_URL%'; for ($i=0; $i -lt 60; $i++) { try { $response=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1; if ($response.Content -match '<title>Albion Market History</title>') { exit 0 } } catch {}; Start-Sleep -Milliseconds 500 }; exit 1"
if errorlevel 1 (
  echo The local server did not start within 30 seconds.
  pause
  exit /b 1
)

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if exist "%CHROME%" (
  start "" "%CHROME%" "%APP_URL%"
) else (
  echo Google Chrome was not found. Opening the app in your default browser.
  start "" "%APP_URL%"
)

endlocal
