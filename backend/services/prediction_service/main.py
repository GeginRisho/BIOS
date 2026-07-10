import logging
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, Float, Numeric, DateTime, desc, select
from sqlalchemy.dialects.postgresql import UUID
import uuid
import math
from typing import List, Optional

from backend.services.prediction_service.config import settings

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prediction_service")

# Database Session Setup
engine = create_async_engine(settings.database_url, echo=False)
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()

class BusinessMetric(Base):
    __tablename__ = "business_metrics"
    recorded_at = Column(DateTime(timezone=True), primary_key=True)
    business_id = Column(UUID(as_uuid=True), primary_key=True)
    revenue_estimate = Column(Numeric(15, 2))
    traffic_score = Column(Float)
    sentiment_score = Column(Float)
    risk_score = Column(Float)

# Session Injection helper
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

@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy", "service": "prediction-service"}

# Forecast Execution controller
@app.post(f"{settings.API_V1_STR}/forecast/{{business_id}}")
async def generate_business_forecasts(
    business_id: str,
    months: int = Query(default=12, ge=1, le=120),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves historical digital twin timeseries and extrapolates predictive timelines
    for revenue, customers count, demand levels, and bankruptcy vulnerability indices.
    """
    biz_uuid = uuid.UUID(business_id)
    
    # Query historical metrics
    stmt = select(BusinessMetric).where(BusinessMetric.business_id == biz_uuid).order_by(desc(BusinessMetric.recorded_at)).limit(10)
    res = await db.execute(stmt)
    history = res.scalars().all()
    
    # Default baseline parameters if no data exists yet
    base_revenue = 250000.0 # Monthly default
    base_risk = 15.0
    growth_trend = 0.015 # 1.5% month over month default
    
    if history:
        latest = history[0]
        base_revenue = float(latest.revenue_estimate or 3000000.0) / 12.0 # convert annual to monthly base
        base_risk = latest.risk_score or 20.0
        
        # Calculate trend coefficients
        if len(history) > 1:
            earliest = history[-1]
            months_delta = max(1, (latest.recorded_at - earliest.recorded_at).days // 30)
            rev_latest = float(latest.revenue_estimate or 1.0)
            rev_earliest = float(earliest.revenue_estimate or 1.0)
            if rev_earliest > 0:
                growth_trend = (rev_latest - rev_earliest) / rev_earliest / max(1, months_delta)
                growth_trend = max(-0.2, min(0.2, growth_trend)) # Cap at ±20% monthly
                
    # Extrapolate forecast timeline
    forecast_points = []
    current_date = datetime.utcnow()
    
    running_revenue = base_revenue
    running_risk = base_risk
    
    # Mathematical season multiplier coefficient (simulates annual cycles)
    for step in range(1, months + 1):
        future_date = current_date + timedelta(days=step * 30)
        
        # Apply sine wave seasonal variation (simulates Q4 retail peaks or summer lulls)
        seasonal_multiplier = 1.0 + (0.08 * math.sin(step * (math.pi / 6.0)))
        
        # Revenue extrapolation
        running_revenue = running_revenue * (1.0 + growth_trend)
        adjusted_revenue = running_revenue * seasonal_multiplier
        
        # Customer volume proxy extrapolation
        customers_projected = int((adjusted_revenue / 120.0) * (1.0 + (growth_trend * 0.5)))
        
        # Bankruptcy risk drift: drops if growth is positive, spikes if revenue declines
        risk_drift = -0.2 if growth_trend > 0 else 0.5
        running_risk = max(0.0, min(100.0, running_risk + risk_drift + (1.2 * math.cos(step * (math.pi / 4.0)))))
        
        # Demand index calculation
        demand_index = max(10.0, min(100.0, 60.0 + (growth_trend * 100.0) + (10.0 * math.sin(step * (math.pi / 3.0)))))
        
        forecast_points.append({
            "period_index": step,
            "date": future_date.strftime("%Y-%m-%d"),
            "revenue": round(adjusted_revenue, 2),
            "customers": max(10, customers_projected),
            "bankruptcy_risk": round(running_risk, 2),
            "demand_index": round(demand_index, 2)
        })
        
    return {
        "business_id": business_id,
        "forecast_horizon_months": months,
        "calculated_monthly_growth_rate": round(growth_trend * 100.0, 2),
        "predictions": forecast_points
    }
