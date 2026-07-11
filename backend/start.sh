#!/usr/bin/env bash
# ============================================================
# BIOS Backend Startup Script for Render
# ============================================================
# On Render, rootDirectory = backend, so the container root
# IS the backend folder. Python absolute imports like
# "backend.services.auth_service.main" require a "backend"
# directory in the Python path. We create a symlink here
# BEFORE starting uvicorn so all subprocess imports work.
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

# Export so child processes (uvicorn microservices) can find the backend package
export PYTHONPATH="$APP_DIR:$PYTHONPATH"
echo "[start.sh] PYTHONPATH = $PYTHONPATH"

echo "[start.sh] Starting BIOS Production Gateway..."
exec uvicorn prod_gateway:app --host 0.0.0.0 --port "${PORT:-10000}"
