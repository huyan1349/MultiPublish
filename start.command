#!/bin/bash
set -e

cd "$(dirname "$0")"

ROOT="$(pwd)"
BACKEND="$ROOT/web/backend"
FRONTEND="$ROOT/web/frontend"
EXTENSION="$ROOT/extension"

echo "============================================"
echo "  MultiPublish — 一键启动"
echo "============================================"
echo ""

echo "[1/6] Installing backend dependencies..."
cd "$BACKEND"
test -f .env || cp .env.example .env
npm install

echo "[2/6] Initializing database..."
npx prisma db push

echo "[3/6] Installing frontend dependencies..."
cd "$FRONTEND"
npm install

echo "[4/6] Installing extension dependencies..."
cd "$EXTENSION"
pnpm install

echo "[5/6] Building extension..."
pnpm build

echo "[6/6] Starting services..."
echo ""

cd "$BACKEND"
npm run dev &
BACKEND_PID=$!

sleep 3

cd "$FRONTEND"
npm run dev &
FRONTEND_PID=$!

sleep 3
open http://localhost:5173

echo "============================================"
echo "  Backend  : http://localhost:4395"
echo "  Frontend : http://localhost:5173"
echo "  Extension: $EXTENSION/build/chrome-mv3-prod"
echo "  Load in Chrome: chrome://extensions -> Developer mode -> Load unpacked"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

wait $BACKEND_PID $FRONTEND_PID
