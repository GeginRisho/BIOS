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

# Create a symlink 'backend -> .' in the current directory if it does not exist.
# This ensures that absolute imports starting with 'backend.' resolve correctly
# when deployed to Render where the root directory is set to 'backend' (meaning the
# files are in the root of the container and the 'backend' folder prefix is lost).
backend_dir_global = os.path.dirname(os.path.abspath(__file__))
symlink_path_global = os.path.join(backend_dir_global, "backend")
if not os.path.lexists(symlink_path_global):
    try:
        if os.name == "nt":
            # On Windows, create a directory junction
            subprocess.run(["cmd", "/c", f"mklink /J \"{symlink_path_global}\" \"{backend_dir_global}\""], capture_output=True)
        else:
            os.symlink(".", symlink_path_global)
        logger.info(f"Created 'backend' symlink/junction: {symlink_path_global} -> {backend_dir_global}")
    except Exception as e:
        logger.warning(f"Could not create 'backend' symlink/junction: {e}")

app = FastAPI(title="BIOS Production Gateway Proxy")

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICES = [
    {"name": "auth_service", "port": 8001, "prefix": "/api/v1/auth"},
    {"name": "business_service", "port": 8002, "prefix": "/api/v1/businesses"},
    {"name": "kg_service", "port": 8003, "prefix": "/api/v1/graph"},
    {"name": "twin_service", "port": 8004, "prefix": "/api/v1/twin"},
    {"name": "crawler_service", "port": 8005, "prefix": "/api/v1/crawler"},
    {"name": "prediction_service", "port": 8007, "prefix": "/api/v1/predictions"},
    {"name": "simulation_service", "port": 8008, "prefix": "/api/v1/simulations"},
    {"name": "agent_service", "port": 8009, "prefix": "/api/v1/agents"},
    {"name": "search_service", "port": 8010, "prefix": "/api/v1/search"},
    {"name": "notification_service", "port": 8011, "prefix": "/api/v1/notifications"},
    {"name": "report_service", "port": 8012, "prefix": "/api/v1/reports"},
]
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

    # ---------------------------------------------------------------
    # Ensure a "backend" symlink exists inside backend_dir so that
    # absolute imports like "backend.services.X" resolve correctly.
    # On Render, rootDirectory=backend means backend_dir IS the app
    # root — there is no parent "backend" folder.  The symlink makes
    # backend_dir/backend -> backend_dir so the package resolves.
    # ---------------------------------------------------------------
    symlink_path = os.path.join(backend_dir, "backend")
    if not os.path.lexists(symlink_path):
        try:
            if os.name == "nt":
                subprocess.run(
                    ["cmd", "/c", f'mklink /J "{symlink_path}" "{backend_dir}"'],
                    capture_output=True
                )
            else:
                os.symlink(backend_dir, symlink_path)
            logger.info(f"[start_services] Created 'backend' symlink: {symlink_path}")
        except Exception as e:
            logger.warning(f"[start_services] Could not create symlink: {e}")

    # With the symlink in place, use backend_dir as the CWD.
    # PYTHONPATH includes backend_dir so "import backend.X" resolves
    # through the symlink.
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

    logger.info("Waiting 12 seconds for microservices to fully initialize...")
    time.sleep(12)

@app.on_event("startup")
def startup_event():
    logger.info("Gateway starting up...")
    start_services()
    logger.info("Gateway boot sequence complete.")

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

# Debug Endpoint to verify paths on Render
@app.get("/debug")
async def debug_endpoint():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(backend_dir)
    python_exe = sys.executable or "python"

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    sep = ";" if os.name == "nt" else ":"
    env["PYTHONPATH"] = f"{backend_dir}{sep}{parent_dir}{sep}{env.get('PYTHONPATH', '')}"

    import_status = ""
    try:
        import backend.services.auth_service.config  # type: ignore
        import_status = "settings import ok"
    except Exception as e:
        import_status = f"settings import fail: {str(e)}"

    # Check if auth_service subprocess can import and start
    import_test = subprocess.run(
        [python_exe, "-c",
         "import backend.services.auth_service.main; print('auth_service import ok')"],
        env=env,
        cwd=backend_dir,
        capture_output=True,
        text=True,
        timeout=30,
    )

    # Check running subprocesses
    running = []
    for name, proc in processes:
        ret = proc.poll()
        running.append({"name": name, "returncode": ret, "running": ret is None})

    return {
        "sys_executable": sys.executable,
        "backend_dir": backend_dir,
        "parent_dir": parent_dir,
        "import_status": import_status,
        "auth_service_import_stdout": import_test.stdout,
        "auth_service_import_stderr": import_test.stderr,
        "auth_service_import_returncode": import_test.returncode,
        "env_pythonpath": env.get("PYTHONPATH"),
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
    return {"status": "healthy"}

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
