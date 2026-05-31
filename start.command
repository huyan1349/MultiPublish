#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/web/backend"
FRONTEND="$ROOT/web/frontend"

echo "===================================="
echo "  MultiPublish — 一键启动"
echo "===================================="
echo ""

# ── Backend ──
echo "[1/5] 配置后端环境..."
cd "$BACKEND"
test -f .env || cp .env.example .env

echo "[2/5] 安装后端依赖..."
npm install --silent

echo "[3/5] 初始化数据库..."
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma db push

echo "[4/5] 安装前端依赖..."
cd "$FRONTEND"
npm install --silent

echo "[5/5] 启动服务..."
cd "$BACKEND"
npm run dev &
sleep 2

cd "$FRONTEND"
npx vite --port 5173 &
sleep 2

echo ""
echo "===================================="
echo "  后端  http://localhost:4395"
echo "  前端  http://localhost:5173"
echo "===================================="

open http://localhost:5173
wait
