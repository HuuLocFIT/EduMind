#!/bin/bash
set -e

echo "[vercel-build] Installing Chromium system dependencies..."
apt-get update -qq && apt-get install -y -qq \
  libnss3 libnspr4 libatk1.0-0tty libatk-bridge2.0-0tty \
  libcups2tty libdrm2 libdbus-1-3 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
  libasound2tty libpango-1.0-0 libcairo2 > /dev/null 2>&1

echo "[vercel-build] Running nx build + prerender..."
npx nx run user:prerender
