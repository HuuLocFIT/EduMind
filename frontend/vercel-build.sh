#!/bin/bash
set -e

# A scheduled production rebuild must fail instead of publishing fallback/error
# HTML when the configured API is unavailable.
export PRERENDER_REQUIRE_API="${PRERENDER_REQUIRE_API:-true}"

echo "[vercel-build] Installing Chromium system dependencies..."
if command -v yum &> /dev/null; then
  yum install -y -q nss nspr atk at-spi2-atk cups-libs libdrm dbus-libs libxkbcommon libXcomposite libXdamage libXrandr libgbm alsa-lib pango cairo > /dev/null 2>&1 || true
elif command -v apt-get &> /dev/null; then
  apt-get update -qq && apt-get install -y -qq \
    libnss3 libnspr4 libatk1.0-0tty libatk-bridge2.0-0tty \
    libcups2tty libdrm2 libdbus-1-3 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libasound2tty libpango-1.0-0 libcairo2 > /dev/null 2>&1 || true
fi

echo "[vercel-build] Installing Puppeteer Chromium..."
npx puppeteer browsers install chrome 2>&1

echo "[vercel-build] Running nx build + prerender..."
npx nx run user:prerender

# GitHub Actions uploads source maps to Sentry during a code release. Scheduled
# SEO rebuilds only refresh prerendered HTML and must never publish source maps.
if [ "${PRESERVE_SOURCE_MAPS:-false}" = "true" ]; then
  echo "[vercel-build] Preserving source maps temporarily for the GitHub release job..."
else
  echo "[vercel-build] Removing source maps from the public artifact..."
  find dist/apps/user -type f -name '*.map' -delete
fi
