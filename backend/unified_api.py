"""
BIOS Unified API Gateway
========================
Single-process FastAPI application that merges all 11 microservice routers
into one process.  Designed to fit within Render Free Tier (512 MB RAM).

Usage (production on Render):
    uvicorn unified_api:app --host 0.0.0.0 --port ${PORT:-10000}
"""

import os
import sys
import logging

# ---------------------------------------------------------------------------
# Ensure "backend" package resolves when CWD == backend/ (Render deployment)
# ---------------------------------------------------------------------------
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_backend_dir)
for p in (_backend_dir, _parent_dir):
    if p not in sys.path:
        sys.path.insert(0, p)


# ---------------------------------------------------------------------------
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.routing import Mount, Match
from starlette._utils import get_route_path
import re

class NoRedirectMount(Mount):
    def __init__(self, path: str, app=None, routes=None, name=None, middleware=None):
        super().__init__(path, app=app, routes=routes, name=name, middleware=middleware)
        escaped_path = re.escape(self.path)
        # Match prefix followed optionally by slash and sub-path, preventing sibling path conflicts
        self.path_regex = re.compile(f"^{escaped_path}(?:/(?P<path>.*))?$")

    def matches(self, scope):
        if scope["type"] in ("http", "websocket"):
            route_path = get_route_path(scope)
            match = self.path_regex.match(route_path)
            if match:
                matched_params = match.groupdict()
                path_val = matched_params.pop("path") or ""
                # Calculate correct remaining and matched path values for sub-routing
                remaining_path = "/" + path_val if path_val else "/"
                matched_path = route_path[: -len(remaining_path)] if path_val else route_path
                
                path_params = dict(scope.get("path_params", {}))
                child_scope = {
                    "path_params": path_params,
                    "app_root_path": scope.get("app_root_path", scope.get("root_path", "")),
                    "root_path": scope.get("root_path", "") + matched_path,
                    "endpoint": self.app,
                }
                return Match.FULL, child_scope
        return Match.NONE, {}

    async def __call__(self, scope, receive, send):
        await self.handle(scope, receive, send)

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("unified_api")

app = FastAPI(title="BIOS Unified API", version="2.0")

def mount_subapp(prefix: str, subapp):
    app.routes.append(NoRedirectMount(prefix, app=subapp))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health / root
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"status": "ok", "service": "BIOS Unified API", "version": "2.0"}

@app.get("/health")
async def health():
    return {"status": "ready"}

# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
class SubAppPrefixMiddleware:
    def __init__(self, sub_app, prefix: str):
        self.app = sub_app
        self.prefix = prefix.rstrip("/")

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            root_path = scope.get("root_path", "")
            path = scope.get("path", "")
            
            # Normalize path: check if it already starts with self.prefix
            if path.startswith(self.prefix):
                full_path = path
            else:
                full_path = self.prefix + path
            
            scope["path"] = full_path
            scope["root_path"] = ""
            if "raw_path" in scope:
                scope["raw_path"] = full_path.encode("ascii")
        await self.app(scope, receive, send)

# ---------------------------------------------------------------------------
# Mount each service's FastAPI sub-application
# ---------------------------------------------------------------------------

# 1. Auth Service
try:
    from backend.services.auth_service.main import app as auth_app
    mount_subapp("/api/v1/auth", SubAppPrefixMiddleware(auth_app, "/api/v1/auth"))
    logger.info("✓ Mounted auth_service  at /api/v1/auth")
except Exception as e:
    logger.error(f"✗ Failed to mount auth_service: {e}")

# 2. Business Service
try:
    from backend.services.business_service.main import app as biz_app
    mount_subapp("/api/v1/businesses", SubAppPrefixMiddleware(biz_app, "/api/v1/businesses"))
    logger.info("✓ Mounted business_service at /api/v1/businesses")
except Exception as e:
    logger.error(f"✗ Failed to mount business_service: {e}")

# 3. Knowledge Graph Service
try:
    from backend.services.kg_service.main import app as kg_app
    mount_subapp("/api/v1/graph", SubAppPrefixMiddleware(kg_app, "/api/v1/graph"))
    logger.info("✓ Mounted kg_service at /api/v1/graph")
except Exception as e:
    logger.error(f"✗ Failed to mount kg_service: {e}")

# 4. Twin Service
try:
    from backend.services.twin_service.main import app as twin_app
    mount_subapp("/api/v1/twin", SubAppPrefixMiddleware(twin_app, "/api/v1/twin"))
    logger.info("✓ Mounted twin_service at /api/v1/twin")
except Exception as e:
    logger.error(f"✗ Failed to mount twin_service: {e}")

# 5. Crawler Service
try:
    from backend.services.crawler_service.main import app as crawler_app
    mount_subapp("/api/v1/crawler", SubAppPrefixMiddleware(crawler_app, "/api/v1/crawler"))
    logger.info("✓ Mounted crawler_service at /api/v1/crawler")
except Exception as e:
    logger.error(f"✗ Failed to mount crawler_service: {e}")

# 6. Prediction Service
try:
    from backend.services.prediction_service.main import app as pred_app
    mount_subapp("/api/v1/predictions", SubAppPrefixMiddleware(pred_app, "/api/v1/predictions"))
    logger.info("✓ Mounted prediction_service at /api/v1/predictions")
except Exception as e:
    logger.error(f"✗ Failed to mount prediction_service: {e}")

# 7. Simulation Service
try:
    from backend.services.simulation_service.main import app as sim_app
    mount_subapp("/api/v1/simulations", SubAppPrefixMiddleware(sim_app, "/api/v1/simulations"))
    logger.info("✓ Mounted simulation_service at /api/v1/simulations")
except Exception as e:
    logger.error(f"✗ Failed to mount simulation_service: {e}")

# 8. Agent Service
try:
    from backend.services.agent_service.main import app as agent_app
    mount_subapp("/api/v1/agents", SubAppPrefixMiddleware(agent_app, "/api/v1/agents"))
    logger.info("✓ Mounted agent_service at /api/v1/agents")
except Exception as e:
    logger.error(f"✗ Failed to mount agent_service: {e}")

# 9. Search Service
try:
    from backend.services.search_service.main import app as search_app
    mount_subapp("/api/v1/search", SubAppPrefixMiddleware(search_app, "/api/v1/search"))
    logger.info("✓ Mounted search_service at /api/v1/search")
except Exception as e:
    logger.error(f"✗ Failed to mount search_service: {e}")

# 10. Notification Service
try:
    from backend.services.notification_service.main import app as notif_app
    mount_subapp("/api/v1/notifications", SubAppPrefixMiddleware(notif_app, "/api/v1/notifications"))
    logger.info("✓ Mounted notification_service at /api/v1/notifications")
except Exception as e:
    logger.error(f"✗ Failed to mount notification_service: {e}")

# 11. Report Service
try:
    from backend.services.report_service.main import app as report_app
    mount_subapp("/api/v1/reports", SubAppPrefixMiddleware(report_app, "/api/v1/reports"))
    logger.info("✓ Mounted report_service at /api/v1/reports")
except Exception as e:
    logger.error(f"✗ Failed to mount report_service: {e}")

# ---------------------------------------------------------------------------
# Database initialization on startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    logger.info("unified_api startup: Initialising databases and tables...")
    try:
        # 1. Auth service database tables
        from backend.services.auth_service.database import Base as AuthBase, engine as AuthEngine
        from backend.services.auth_service.main import seed_users
        async with AuthEngine.begin() as conn:
            await conn.run_sync(AuthBase.metadata.create_all)
        logger.info("✓ Auth Service database tables verified.")
        await seed_users()
        logger.info("✓ Auth Service default users seeded.")

        # 2. Business service database tables
        from backend.services.business_service.database import Base as BizBase, engine as BizEngine
        from backend.services.business_service.main import seed_data
        async with BizEngine.begin() as conn:
            await conn.run_sync(BizBase.metadata.create_all)
        logger.info("✓ Business Service database tables verified.")
        await seed_data()
        logger.info("✓ Business Service seed data initialized.")

        # 3. Simulation service database tables
        from backend.services.simulation_service.main import Base as SimBase, engine as SimEngine
        async with SimEngine.begin() as conn:
            await conn.run_sync(SimBase.metadata.create_all)
        logger.info("✓ Simulation Service database tables verified.")

    except Exception as e:
        logger.error(f"✗ Failed to initialise databases on startup: {e}")

# ---------------------------------------------------------------------------
# Debug endpoint (mirrors prod_gateway behaviour)
# ---------------------------------------------------------------------------
@app.get("/debug")
async def debug_endpoint():
    return {
        "sys_executable": sys.executable,
        "python_version": sys.version,
        "backend_dir": _backend_dir,
        "services_ready": True,
        "full_mode": True,
        "architecture": "unified_single_process",
    }

logger.info("BIOS Unified API initialisation complete — all services in one process.")
