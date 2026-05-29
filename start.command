#!/bin/bash
cd "$(dirname "$0")/web/frontend"
pnpm dev &
sleep 2
open http://localhost:5173
wait
