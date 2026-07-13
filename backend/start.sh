#!/usr/bin/env bash
# ============================================================
# BIOS Backend Startup Script for Render
# ============================================================
# Runs the unified single-process API that merges all 11
# microservices into one FastAPI application (~200MB RAM).
# ============================================================

set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "[start.sh] APP_DIR = $APP_DIR"

SYMLINK="$APP_DIR/backend"

if [ ! -L "$SYMLINK" ] && [ ! -d "$SYMLINK" ]; then
    echo "[start.sh] Creating backend -> . symlink at $SYMLINK"
    ln -sf "$APP_DIR" "$SYMLINK"
    echo "[start.sh] Symlink created."
else
    echo "[start.sh] backend symlink/dir already exists at $SYMLINK"
fi

# Export so child processes can find the backend package
export PYTHONPATH="$APP_DIR:$PYTHONPATH"
echo "[start.sh] PYTHONPATH = $PYTHONPATH"

echo "[start.sh] Starting BIOS Unified API (single-process)..."
exec uvicorn unified_api:app --host 0.0.0.0 --port "${PORT:-10000}"
