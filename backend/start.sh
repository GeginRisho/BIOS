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

# Export parent directory of backend so child processes can resolve "backend.services"
PARENT_DIR="$(dirname "$APP_DIR")"
export PYTHONPATH="$PARENT_DIR:$APP_DIR:$PYTHONPATH"
echo "[start.sh] PYTHONPATH = $PYTHONPATH"

echo "[start.sh] Starting BIOS Unified API (single-process)..."
exec uvicorn unified_api:app --host 0.0.0.0 --port "${PORT:-10000}"
