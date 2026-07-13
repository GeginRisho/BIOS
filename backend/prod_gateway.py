import os
import sys
import time
import asyncio
import subprocess
import logging
import httpx
import websockets
from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.background import BackgroundTask

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prod_gateway")

# Ensure parent directory is in sys.path so "backend" package imports resolve correctly
backend_dir_global = os.path.dirname(os.path.abspath(__file__))
parent_dir_global = os.path.dirname(backend_dir_global)
for p in (backend_dir_global, parent_dir_global):
    if p not in sys.path:
        sys.path.insert(0, p)

app = FastAPI(title="BIOS Production Gateway Proxy")

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# On Render free tier (512MB RAM) only launch the two core services.
# Set BIOS_FULL_MODE=true as a Render env var to enable all services.
_full_mode = os.environ.get("BIOS_FULL_MODE", "false").lower() == "true"

SERVICES = [
    {"name": "auth_service",     "port": 8001, "prefix": "/api/v1/auth"},
    {"name": "business_service", "port": 8002, "prefix": "/api/v1/businesses"},
] + ([
    {"name": "kg_service",           "port": 8003, "prefix": "/api/v1/graph"},
    {"name": "twin_service",         "port": 8004, "prefix": "/api/v1/twin"},
    {"name": "crawler_service",      "port": 8005, "prefix": "/api/v1/crawler"},
    {"name": "prediction_service",   "port": 8007, "prefix": "/api/v1/predictions"},
    {"name": "simulation_service",   "port": 8008, "prefix": "/api/v1/simulations"},
    {"name": "agent_service",        "port": 8009, "prefix": "/api/v1/agents"},
    {"name": "search_service",       "port": 8010, "prefix": "/api/v1/search"},
    {"name": "notification_service", "port": 8011, "prefix": "/api/v1/notifications"},
    {"name": "report_service",       "port": 8012, "prefix": "/api/v1/reports"},
] if _full_mode else [])

processes = []
client = httpx.AsyncClient(timeout=30.0)

import threading

def log_stream(name, stream):
    try:
        for line in iter(stream.readline, ''):
            if not line:
                break
            logger.info(f"[{name}] {line.strip()}")
    except Exception as e:
        logger.error(f"Error reading log stream for {name}: {str(e)}")
    finally:
        stream.close()

def start_services():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(backend_dir)
    python_exe = sys.executable or "python"

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    sep = ";" if os.name == "nt" else ":"

    # PYTHONPATH includes parent_dir so "import backend.X" resolves directly.
    cwd_dir = backend_dir
    current_pythonpath = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = f"{backend_dir}{sep}{parent_dir}{sep}{current_pythonpath}"

    logger.info(f"CWD for microservices: {cwd_dir}")
    logger.info(f"PYTHONPATH: {env['PYTHONPATH']}")
    logger.info(f"Using DATABASE_URL: {os.environ.get('DATABASE_URL') is not None}")

    for svc in SERVICES:
        name = svc["name"]
        port = svc["port"]
        logger.info(f"Launching microservice {name} on port {port}...")

        cmd = [
            python_exe,
            "-m",
            "uvicorn",
            f"backend.services.{name}.main:app",
            "--port",
            str(port),
            "--host",
            "127.0.0.1",
        ]

        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=env,
            cwd=cwd_dir,
            text=True,
            bufsize=1,
        )
        processes.append((name, proc))
        t = threading.Thread(target=log_stream, args=(name, proc.stdout), daemon=True)
        t.start()

    logger.info("All microservice processes launched.")

# Track whether services are booted
_services_ready = False

@app.on_event("startup")
async def startup_event():
    logger.info("Gateway starting up — launching microservices in background...")
    # Run start_services in a thread so uvicorn can accept health-check
    # connections immediately (Render times out if we block here)
    t = threading.Thread(target=_boot_services, daemon=True)
    t.start()
    logger.info("Gateway accepting connections. Microservices booting in background.")

def _boot_services():
    global _services_ready
    try:
        start_services()
        import time as _t
        _t.sleep(12)  # give services time to finish initialising
        _services_ready = True
        logger.info("Gateway boot sequence complete. All microservices ready.")
    except Exception as e:
        logger.error(f"Error during background service boot: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down gateway and terminating all microservices...")
    await client.aclose()
    for name, proc in processes:
        logger.info(f"Terminating service {name}...")
        proc.terminate()
        try:
            proc.wait(timeout=3.0)
        except subprocess.TimeoutExpired:
            proc.kill()
    logger.info("All microservices terminated.")

# WebSockets Proxy
@app.websocket("/api/v1/notifications/ws")
async def websocket_proxy(websocket: WebSocket):
    await websocket.accept()
    target_url = "ws://127.0.0.1:8011/api/v1/notifications/ws"
    logger.info(f"Connecting WebSocket proxy to {target_url}")
    try:
        async with websockets.connect(target_url) as target_ws:
            async def client_to_target():
                try:
                    while True:
                        data = await websocket.receive_text()
                        await target_ws.send(data)
                except Exception:
                    pass

            async def target_to_client():
                try:
                    while True:
                        data = await target_ws.recv()
                        await websocket.send_text(data)
                except Exception:
                    pass

            await asyncio.gather(client_to_target(), target_to_client())
    except WebSocketDisconnect:
        logger.info("WebSocket connection closed by client.")
    except Exception as e:
        logger.error(f"WebSocket proxy exception: {str(e)}")

# Debug Endpoint — lightweight, no blocking subprocesses
@app.get("/debug")
async def debug_endpoint():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(backend_dir)

    # Check running subprocesses without blocking
    running = []
    for name, proc in processes:
        ret = proc.poll()
        running.append({"name": name, "returncode": ret, "running": ret is None})

    # Quick non-blocking import check
    import_status = ""
    try:
        import importlib
        importlib.import_module("backend.services.auth_service.config")
        import_status = "ok"
    except Exception as e:
        import_status = f"fail: {e}"

    return {
        "sys_executable": sys.executable,
        "python_version": sys.version,
        "backend_dir": backend_dir,
        "parent_dir": parent_dir,
        "services_ready": _services_ready,
        "full_mode": _full_mode,
        "services_configured": len(SERVICES),
        "import_status": import_status,
        "processes": running,
    }

# Explicit root / health endpoints
@app.get("/")
async def root_endpoint():
    return {
        "status": "ok",
        "service": "BIOS Production Gateway",
        "version": "1.0"
    }

@app.get("/health")
async def health_endpoint():
    return {"status": "ready" if _services_ready else "booting"}

# Global HTTP Request Routing Proxy
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
async def route_proxy(request: Request, path: str):
    # Determine which service matches the prefix
    full_path = "/" + path
    matched_port = None
    
    for svc in SERVICES:
        if full_path.startswith(svc["prefix"]):
            matched_port = svc["port"]
            break
            
    if not matched_port:
        return JSONResponse(status_code=404, content={"detail": f"Path '{full_path}' not found on gateway"})

    # Forward the request to the local microservice
    target_url = f"http://127.0.0.1:{matched_port}{full_path}"
    if request.query_params:
        target_url += f"?{request.query_params}"

    req_headers = dict(request.headers)
    # Update host header to target
    req_headers["host"] = f"127.0.0.1:{matched_port}"

    # Read body
    body = await request.body()

    try:
        response = await client.request(
            method=request.method,
            url=target_url,
            headers=req_headers,
            content=body,
            follow_redirects=False
        )
        
        # Build Response
        res_headers = dict(response.headers)
        
        # Remove duplicate CORS headers that downstream service might include
        for key in ["access-control-allow-origin", "access-control-allow-credentials", 
                    "access-control-allow-methods", "access-control-allow-headers"]:
            if key in res_headers:
                del res_headers[key]
                
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=res_headers
        )
    except httpx.RequestError as exc:
        logger.error(f"Error communicating with microservice on port {matched_port}: {str(exc)}")
        return JSONResponse(status_code=503, content={"detail": "Service temporarily unavailable"})
