#!/bin/sh
# Self-heals the recurring Hostinger issue where a freshly deployed Node.js
# app version is missing pieces Hostinger's own deploy sync strips from the
# fresh hbuilds/versions/<id>/nodejs directory - confirmed live on
# 2026-09-04: both node_modules/next and public/ were completely absent from
# the active version, even though the build in hbuilds/source/repository
# produced them correctly. The app crashes at boot with
# "Error: Cannot find module 'next'" and the site 503s until this is fixed
# and the app restarted (or, since this host runs Node under LiteSpeed's
# lsnode.js, until the next request re-spawns the process after the fix).
#
# The fix borrows both from the separate, stable app directory at
# $DOMAIN_ROOT/nodejs - that directory sits outside hbuilds/versions, so
# Hostinger's per-deploy stripping never touches it.
#
# Intended to run unattended as a Hostinger Cron Job (hPanel > Advanced >
# Cron Jobs) every few minutes, so this repair no longer has to be run by
# hand over SSH after every deploy. Safe to run when nothing is broken: it
# no-ops if next/public already exist and versions already match.
#
# Example cron entry (every 5 minutes), pointed at a copy of this script
# kept outside the versioned build directory so the path survives deploys:
#   */5 * * * * /bin/sh /home/u232002055/domains/infinitysportsjo.com/nodejs/scripts/hostinger-repair-next-symlink.sh >> /home/u232002055/domains/infinitysportsjo.com/hostinger-repair.log 2>&1

set -u

DOMAIN_ROOT="/home/u232002055/domains/infinitysportsjo.com"
VERSIONS_DIR="$DOMAIN_ROOT/hbuilds/versions"
STABLE_DIR="$DOMAIN_ROOT/nodejs"
SOURCE_NEXT="$STABLE_DIR/node_modules/next"
SOURCE_PUBLIC="$STABLE_DIR/hostinger-output/public"

ACTIVE_DIR="$(find "$VERSIONS_DIR" -mindepth 2 -maxdepth 2 -type d -name nodejs -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)"

echo "[$(date -Iseconds)] Active deployment: $ACTIVE_DIR"

case "$ACTIVE_DIR" in
  "$VERSIONS_DIR"/*/nodejs) ;;
  *)
    echo "ABORT: active deployment was not found safely"
    exit 1
    ;;
esac

NEEDS_RESTART=0

# --- Repair node_modules/next ---
SOURCE_VERSION="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$SOURCE_NEXT/package.json" 2>/dev/null | head -1)"
REQUIRED_VERSION="$(sed -n 's/.*"next": "\([^"]*\)".*/\1/p' "$ACTIVE_DIR/package.json" 2>/dev/null | head -1)"

echo "Source Next version: $SOURCE_VERSION"
echo "Required Next version: $REQUIRED_VERSION"

if [ -z "$SOURCE_VERSION" ] || [ "$SOURCE_VERSION" != "$REQUIRED_VERSION" ]; then
  echo "SKIP next repair: versions do not match (or source missing)"
elif [ -e "$ACTIVE_DIR/node_modules/next" ] || [ -L "$ACTIVE_DIR/node_modules/next" ]; then
  echo "Next already exists in this deployment"
else
  mkdir -p "$ACTIVE_DIR/node_modules"
  ln -s "$SOURCE_NEXT" "$ACTIVE_DIR/node_modules/next"
  echo "Next symlink created successfully"
  NEEDS_RESTART=1
fi

# --- Repair public/ ---
if [ -e "$ACTIVE_DIR/public" ] || [ -L "$ACTIVE_DIR/public" ]; then
  echo "public/ already exists in this deployment"
elif [ -d "$SOURCE_PUBLIC" ]; then
  ln -s "$SOURCE_PUBLIC" "$ACTIVE_DIR/public"
  echo "public/ symlink created successfully"
  NEEDS_RESTART=1
else
  echo "SKIP public repair: source not found at $SOURCE_PUBLIC"
fi

ls -ld "$ACTIVE_DIR/node_modules/next" "$ACTIVE_DIR/public" 2>&1

if [ "$NEEDS_RESTART" = "1" ]; then
  mkdir -p "$ACTIVE_DIR/tmp"
  touch "$ACTIVE_DIR/tmp/restart.txt"
  echo "Restart triggered"
fi

curl -sS -o /dev/null -w "Website status: %{http_code}\n" https://infinitysportsjo.com
