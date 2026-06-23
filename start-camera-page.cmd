@echo off
setlocal

cd /d "%~dp0"

if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
) else (
  set "NODE_EXE=node"
)

echo Starting camera preview...
echo Leave this window open while using the page.
echo.

"%NODE_EXE%" server.js --open

echo.
echo Server stopped. Press any key to close this window.
pause >nul
