import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.services.agent_service.config import settings
from backend.services.agent_service.swarm_orchestrator import SwarmOrchestrator

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent_service")

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

# Initialize Swarm Orchestrator
swarm = SwarmOrchestrator(provider=settings.LLM_PROVIDER)

class ChatRequest(BaseModel):
    message: str

@app.get("/health", tags=["system"])
async def health_check():
    return {
        "status": "healthy",
        "service": "agent-service",
        "llm_provider": settings.LLM_PROVIDER
    }

@app.post(f"{settings.API_V1_STR}/chat")
async def chat_with_agents(payload: ChatRequest):
    """
    Passes a natural language query down to the 16-agent orchestrator swarm.
    Runs planning, crawling, graph syncing, forecasting, and reflection.
    """
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Query message cannot be empty")
        
    try:
        response = await swarm.execute_task(payload.message)
        return response
    except Exception as e:
        logger.error(f"Swarm orchestration execution failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Swarm failed to complete task: {str(e)}"
        )
