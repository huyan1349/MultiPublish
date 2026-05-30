@echo off
chcp 65001 >nul
title ContentBridge

echo.
echo ================================================
echo      ContentBridge -- 多平台内容发布工具
echo ================================================
echo.

set "ROOT=%~dp0"

echo [1/4] 启动后端 (Express + Prisma)
start "ContentBridge Backend" cmd /k "cd /d "%ROOT%web\backend" && if not exist node_modules (npm install) && npx prisma db push && npm run dev"

echo [2/4] 等待后端就绪...
timeout /t 3 /nobreak >nul

echo [3/4] 启动前端 (Vite + React)
start "ContentBridge Frontend" cmd /k "cd /d "%ROOT%web\frontend" && if not exist node_modules (npm install) && npm run dev"

echo [4/4] 等待前端就绪...
timeout /t 3 /nobreak >nul

start http://localhost:5173

echo.
echo ================================================
echo     后端 : http://localhost:4395
echo     前端 : http://localhost:5173
echo.
echo     浏览器已打开，等待页面加载即可
echo     关闭两个命令行窗口即可停止服务
echo ================================================
echo.

pause
