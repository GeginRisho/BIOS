import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

from backend.services.notification_service.config import settings

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("notification_service")

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        logger.info(f"Broadcasting message to {len(self.active_connections)} clients: {message}")
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                # Remove dead connection
                logger.warning(f"Error sending WebSocket frame, dropping connection: {str(e)}")
                self.disconnect(connection)

manager = ConnectionManager()

class AlertBroadcast(BaseModel):
    category: str # crawler_status, risk_alert, simulation_warning
    title: str
    message: str
    business_id: Optional[str] = None

@app.get("/health", tags=["system"])
async def health_check():
    return {
        "status": "healthy",
        "service": "notification-service",
        "active_listeners": len(manager.active_connections)
    }

# REST endpoint to push alerts dynamically
@app.post(f"{settings.API_V1_STR}/broadcast")
async def trigger_manual_alert_broadcast(alert: AlertBroadcast):
    payload = {
        "timestamp": datetime.utcnow().isoformat(),
        "category": alert.category,
        "title": alert.title,
        "message": alert.message,
        "business_id": alert.business_id
    }
    await manager.broadcast(payload)
    return {"status": "broadcasted", "listeners_notified": len(manager.active_connections)}

# WebSocket Connection endpoint
websocket_route = f"{settings.API_V1_STR}/ws"
@app.websocket("/api/v1/notifications/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Welcome message
        await manager.send_personal_message({
            "timestamp": datetime.utcnow().isoformat(),
            "category": "system",
            "title": "Connected",
            "message": "Welcome to BIOS Live Intelligence WebSocket Broker."
        }, websocket)
        
        while True:
            # Maintain connection alive, ignore incoming frames from clients
            data = await websocket.receive_text()
            logger.debug(f"Received WebSocket data frame: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket execution error: {str(e)}")
        manager.disconnect(websocket)
