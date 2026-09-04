#!/bin/sh
# Self-heals the recurring Hostinger issue where a freshly deployed Node.js
# app version is missing the `next` package from its own node_modules
# (Hostinger's own npm install step drops it for some deploys), which makes
# the site 503 until `next` is symlinked back in from the stable app root
# and the app is restarted.
#
# Intended to run unattended as a Hostinger Cron Job (hPanel > Advanced >
# Cron Jobs) every few minutes, so this repair no longer has to be run by
# hand over SSH after every deploy. Safe to run when nothing is broken: it
# no-ops if the symlink already exists and versions already match.
#
# Example cron entry (every 5 minutes):
#   */5 * * * * /bin/sh /home/u232002055/domains/infinitysportsjo.com/hbuilds/versions/CURRENT/nodejs/scripts/hostinger-repair-next-symlink.sh >> /home/u232002055/domains/infinitysportsjo.com/hostinger-repair.log 2>&1
# (Hostinger's cron UI may require an absolute path that doesn't change
# between deploys; point it at a copy of this script kept outside the
# versioned build directory, e.g. under $DOMAIN_ROOT/nodejs/scripts/.)

set -u

DOMAIN_ROOT="/home/u232002055/domains/infinitysportsjo.com"
VERSIONS_DIR="$DOMAIN_ROOT/hbuilds/versions"
SOURCE_NEXT="$DOMAIN_ROOT/nodejs/node_modules/next"

ACTIVE_DIR="$(find "$VERSIONS_DIR" -mindepth 2 -maxdepth 2 -type d -name nodejs -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)"

echo "[$(date -Iseconds)] Active deployment: $ACTIVE_DIR"

case "$ACTIVE_DIR" in
  "$VERSIONS_DIR"/*/nodejs) ;;
  *)
    echo "ABORT: active deployment was not found safely"
    exit 1
    ;;
esac

SOURCE_VERSION="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$SOURCE_NEXT/package.json" 2>/dev/null | head -1)"
REQUIRED_VERSION="$(sed -n 's/.*"next": "\([^"]*\)".*/\1/p' "$ACTIVE_DIR/package.json" 2>/dev/null | head -1)"

echo "Source Next version: $SOURCE_VERSION"
echo "Required Next version: $REQUIRED_VERSION"

if [ -z "$SOURCE_VERSION" ] || [ "$SOURCE_VERSION" != "$REQUIRED_VERSION" ]; then
  echo "ABORT: Next versions do not match"
  exit 1
fi

if [ -e "$ACTIVE_DIR/node_modules/next" ] || [ -L "$ACTIVE_DIR/node_modules/next" ]; then
  echo "Next already exists in this deployment"
else
  mkdir -p "$ACTIVE_DIR/node_modules"
  ln -s "$SOURCE_NEXT" "$ACTIVE_DIR/node_modules/next"
  echo "Next symlink created successfully"

  # Only restart when we actually had to repair something - avoids
  # unnecessary restarts on every cron tick.
  mkdir -p "$ACTIVE_DIR/tmp"
  touch "$ACTIVE_DIR/tmp/restart.txt"
  echo "Restart triggered"
fi

ls -ld "$ACTIVE_DIR/node_modules/next"

curl -sS -o /dev/null -w "Website status: %{http_code}\n" https://infinitysportsjo.com
