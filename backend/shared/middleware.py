"""
BIOS Shared Middleware Helpers
================================
Reusable CORS, request-logging, and rate-limit helpers.
Import in any FastAPI service via:

    from backend.shared.middleware import apply_cors, apply_logging
"""
import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("bios.shared")


def apply_cors(app: FastAPI, origins: list = None) -> None:
    """Apply enterprise CORS policy to a FastAPI app."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def apply_logging(app: FastAPI, service_name: str = "bios-service") -> None:
    """Add request timing / access-log middleware."""
    svc_logger = logging.getLogger(service_name)

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        elapsed = round((time.time() - start) * 1000, 2)
        svc_logger.debug(
            f"{request.method} {request.url.path} -> {response.status_code} [{elapsed}ms]"
        )
        return response
