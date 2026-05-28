@echo off
title ContentBridge

set "ROOT=%~dp0"

echo.
echo ========================================
echo   ContentBridge - Multi-Platform Tool
echo ========================================
echo.

echo [1/2] Starting backend (port 4395)...
start "ContentBridge-Backend" cmd /c "cd /d "%ROOT%backend" && npm run dev"

ping -n 4 127.0.0.1 >nul

echo [2/2] Starting frontend (port 5173)...
start "ContentBridge-Frontend" cmd /c "cd /d "%ROOT%frontend" && npm run dev"

ping -n 3 127.0.0.1 >nul
start http://localhost:5173

echo.
echo Done! Open http://localhost:5173
echo.
pause
