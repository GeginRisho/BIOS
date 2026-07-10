import logging
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, Float, Numeric, DateTime, JSON, select
from sqlalchemy.dialects.postgresql import UUID
import uuid
import json
from pydantic import BaseModel
from typing import List, Optional

from backend.services.simulation_service.config import settings

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("simulation_service")

# Database Session Setup
engine = create_async_engine(settings.database_url, echo=False)
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()
BaseQuery = declarative_base()

class Business(BaseQuery):
    __tablename__ = "businesses"
    id = Column(UUID(as_uuid=True), primary_key=True)
    name = Column(String(255), nullable=False)
    website = Column(String(255))
    industry = Column(String(100))

class SimulationRun(Base):
    __tablename__ = "simulations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True))
    time_horizon = Column(String(50), nullable=False)
    scenario_type = Column(String(50), nullable=False)
    forecast_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

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

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy", "service": "simulation-service"}

class SimulationRequest(BaseModel):
    business_id: str
    time_horizon: str # 1M, 3M, 6M, 1Y, 3Y, 5Y, 10Y
    scenario_type: str # base, recession, inflation, pandemic, competitor_entry, supply_shortage

@app.post(f"{settings.API_V1_STR}/run")
async def run_scenario_simulation(payload: SimulationRequest, db: AsyncSession = Depends(get_db)):
    """
    Executes a virtual macroeconomic event simulation on a business digital twin.
    Calculates operational margins, revenues, cash holdings, and files the log in Postgres.
    """
    biz_uuid = uuid.UUID(payload.business_id)
    
    # Check if business exists
    stmt = select(Business).where(Business.id == biz_uuid)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business digital twin not found")
        
    # Map time horizon string to month count
    horizon_months = {
        "1M": 1, "3M": 3, "6M": 6, "1Y": 12, "3Y": 36, "5Y": 60, "10Y": 120
    }.get(payload.time_horizon, 12)
    
    # Baseline stats
    starting_revenue = 400000.0 # Monthly default
    cash_holding = 1500000.0
    profit_margin = 0.22 # 22% standard
    
    # Simulation factors
    cost_multiplier = 1.0
    revenue_growth_modifier = 0.0
    
    # Apply scenario shocks
    if payload.scenario_type == "inflation":
        cost_multiplier = 1.15 # +15% costs
        revenue_growth_modifier = -0.015 # -1.5% demand drop
    elif payload.scenario_type == "recession":
        cost_multiplier = 1.05 # minor cost hikes
        revenue_growth_modifier = -0.035 # -3.5% demand drop
    elif payload.scenario_type == "competitor_entry":
        cost_multiplier = 1.10 # marketing cost spikes to compete
        revenue_growth_modifier = -0.02 # market share decay
    elif payload.scenario_type == "supply_shortage":
        cost_multiplier = 1.25 # logistics costs surge +25%
        revenue_growth_modifier = -0.01
        
    timeline_data = []
    current_date = datetime.utcnow()
    
    running_revenue = starting_revenue
    running_cash = cash_holding
    
    for month in range(1, horizon_months + 1):
        future_date = current_date + timedelta(days=month * 30)
        
        # Calculate monthly variables
        running_revenue = running_revenue * (1.0 + revenue_growth_modifier)
        monthly_cost = (running_revenue * (1.0 - profit_margin)) * cost_multiplier
        monthly_profit = running_revenue - monthly_cost
        
        running_cash = running_cash + monthly_profit
        
        # Avoid negative cash reserves
        if running_cash < 0:
            running_cash = 0.0
            
        calculated_margin = (monthly_profit / running_revenue) * 100.0 if running_revenue > 0 else 0.0
        
        timeline_data.append({
            "period": month,
            "date": future_date.strftime("%Y-%m-%d"),
            "revenue": round(running_revenue, 2),
            "operating_cost": round(monthly_cost, 2),
            "profit_margin": round(calculated_margin, 2),
            "cash_reserve": round(running_cash, 2)
        })
        
    # Persist simulation run details
    sim_run = SimulationRun(
        business_id=biz_uuid,
        time_horizon=payload.time_horizon,
        scenario_type=payload.scenario_type,
        forecast_data=timeline_data
    )
    
    db.add(sim_run)
    await db.commit()
    
    return {
        "simulation_id": str(sim_run.id),
        "business_id": payload.business_id,
        "scenario": payload.scenario_type,
        "time_horizon": payload.time_horizon,
        "growth_coefficient": revenue_growth_modifier,
        "cost_multiplier": cost_multiplier,
        "timeline": timeline_data
    }
