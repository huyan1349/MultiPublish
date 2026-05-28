@echo off
chcp 65001 >nul
title ContentBridge — 多平台内容发布工具

echo.
echo   ╔══════════════════════════════════════╗
echo   ║     ContentBridge 一键启动           ║
echo   ║  多平台内容发布工具                   ║
echo   ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: ── 后端 ──
echo [1/2] 启动后端 (端口 3001)...
start "ContentBridge-后端" cmd /c "cd /d backend && npm run dev"

:: ── 等后端先起来 ──
timeout /t 3 /nobreak >nul

:: ── 前端 ──
echo [2/2] 启动前端 (端口 5173)...
start "ContentBridge-前端" cmd /c "cd /d frontend && npm run dev"

:: ── 打开浏览器 ──
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo   ✅ 已启动！浏览器打开 http://localhost:5173
echo.
echo   关闭此窗口不会影响运行中的服务。
echo.

pause
