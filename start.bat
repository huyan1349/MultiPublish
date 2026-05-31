@echo off
chcp 65001 >nul 2>&1
title MultiPublish

echo ============================================
echo   MultiPublish Yi Jian Qi Dong
echo ============================================
echo.

set "ROOT=%~dp0"
set "BACKEND=%ROOT%web\backend"
set "FRONTEND=%ROOT%web\frontend"
set "EXTENSION=%ROOT%extension"

echo [1/6] Installing backend dependencies...
cd /d "%BACKEND%"
if not exist ".env" copy ".env.example" ".env" >nul
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend npm install failed
    pause
    exit /b 1
)

echo [2/6] Initializing database...
call npx prisma db push
if %errorlevel% neq 0 (
    echo [ERROR] Prisma db push failed
    pause
    exit /b 1
)

echo [3/6] Installing frontend dependencies...
cd /d "%FRONTEND%"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend npm install failed
    pause
    exit /b 1
)

echo [4/6] Installing extension dependencies...
cd /d "%EXTENSION%"
call pnpm install
if %errorlevel% neq 0 (
    echo [ERROR] Extension pnpm install failed
    pause
    exit /b 1
)

echo [5/6] Building extension...
call pnpm build
if %errorlevel% neq 0 (
    echo [ERROR] Extension pnpm build failed
    pause
    exit /b 1
)

echo [6/6] Starting services...
echo.

start "MultiPublish-Backend-4395" cmd /k "cd /d "%BACKEND%" && title Backend :4395 && echo Backend starting... http://localhost:4395 && echo. && npm run dev"

timeout /t 3 /nobreak >nul

start "MultiPublish-Frontend-5173" cmd /k "cd /d "%FRONTEND%" && title Frontend :5173 && echo Frontend starting... http://localhost:5173 && echo. && npm run dev"

timeout /t 3 /nobreak >nul
start http://localhost:5173

echo ============================================
echo   Backend  : http://localhost:4395
echo   Frontend : http://localhost:5173
echo   Extension: %EXTENSION%\build\chrome-mv3-prod
echo   Load in Chrome: chrome://extensions -^> Developer mode -^> Load unpacked
echo ============================================
echo.
echo Services started in separate windows.
echo Close each window to stop that service.
echo.

pause
