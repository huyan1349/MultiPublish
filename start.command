#!/bin/bash
cd "$(dirname "$0")/web/backend"
test -f .env || cp .env.example .env
npm run dev &
sleep 2
cd "$(dirname "$0")/web/frontend"
./node_modules/.bin/vite --port 5173 &
sleep 2
open http://localhost:5173
wait
