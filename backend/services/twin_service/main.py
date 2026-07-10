import logging
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, Float, Numeric, DateTime, desc, select
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import List, Optional

from backend.services.twin_service.config import settings

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("twin_service")

# Database Session Setup
engine = create_async_engine(settings.database_url, echo=False)
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()

# Local Model Definitions representing Postgres Tables
class Business(Base):
    __tablename__ = "businesses"
    id = Column(UUID(as_uuid=True), primary_key=True)
    name = Column(String(255), nullable=False)
    website = Column(String(255))
    industry = Column(String(100))

class BusinessMetric(Base):
    __tablename__ = "business_metrics"
    recorded_at = Column(DateTime(timezone=True), primary_key=True, default=datetime.utcnow)
    business_id = Column(UUID(as_uuid=True), primary_key=True)
    revenue_estimate = Column(Numeric(15, 2))
    traffic_score = Column(Float)
    sentiment_score = Column(Float)
    brand_score = Column(Float)
    reputation_score = Column(Float)
    risk_score = Column(Float)
    hiring_score = Column(Float)
    seo_score = Column(Float)

# Session injection
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
    return {"status": "healthy", "service": "twin-service"}

# Core Scoring Algorithm Engine
@app.post(f"{settings.API_V1_STR}/compute/{{business_id}}")
async def compute_digital_twin_scores(business_id: str, db: AsyncSession = Depends(get_db)):
    """
    Reads existing metric data and runs composite score calculations for brand strength,
    market reputation index, and business risk profile. Updates state in PostgreSQL/TimescaleDB.
    """
    biz_uuid = uuid.UUID(business_id)
    
    # Verify business profile exists
    stmt_biz = select(Business).where(Business.id == biz_uuid)
    biz_res = await db.execute(stmt_biz)
    biz = biz_res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
        
    # Read last metrics records to calculate trends
    stmt_metrics = select(BusinessMetric).where(BusinessMetric.business_id == biz_uuid).order_by(desc(BusinessMetric.recorded_at)).limit(5)
    metrics_res = await db.execute(stmt_metrics)
    metrics = metrics_res.scalars().all()
    
    if not metrics:
        # If no metric data is present, write default base ratings
        base_metric = BusinessMetric(
            business_id=biz_uuid,
            revenue_estimate=1000000.0,
            traffic_score=50.0,
            sentiment_score=0.7,
            brand_score=35.0,
            reputation_score=75.0,
            risk_score=20.0,
            hiring_score=50.0,
            seo_score=60.0
        )
        db.add(base_metric)
        await db.commit()
        return base_metric
        
    latest = metrics[0]
    
    # Algorithmic scoring mappings
    traffic = latest.traffic_score or 50.0
    sentiment = latest.sentiment_score or 0.7
    seo = latest.seo_score or 60.0
    hiring = latest.hiring_score or 50.0
    revenue = float(latest.revenue_estimate or 1000000.0)
    
    # 1. Brand Score: Traffic weighted by sentiment
    brand_score = traffic * (0.5 + sentiment) # range [25 - 150]
    brand_score = max(0.0, min(100.0, brand_score))
    
    # 2. Reputation Score: Sentiment base + SEO footprint
    reputation_score = (sentiment * 80) + (seo * 0.2) # range [0 - 100]
    
    # 3. Risk Score: High values indicate distress. Calculated from low sentiment, high employee churn, low traffic.
    risk_score = 100.0 - (sentiment * 60.0 + (traffic * 0.4))
    risk_score = max(0.0, min(100.0, risk_score))
    
    # 4. Growth Rate & Revenue Estimate adjustments
    growth_rate = 0.05 # default 5%
    if len(metrics) > 1:
        prev = metrics[1]
        if prev.traffic_score and latest.traffic_score:
            traffic_change = (latest.traffic_score - prev.traffic_score) / max(1.0, prev.traffic_score)
            growth_rate = max(-0.5, min(1.0, traffic_change))
            
    revenue_update = revenue * (1.0 + (growth_rate * 0.1)) # Adjust revenue estimate gently by growth trend
    
    # Create new aggregated snapshot
    new_snapshot = BusinessMetric(
        business_id=biz_uuid,
        revenue_estimate=revenue_update,
        traffic_score=traffic,
        sentiment_score=sentiment,
        brand_score=brand_score,
        reputation_score=reputation_score,
        risk_score=risk_score,
        hiring_score=hiring,
        seo_score=seo
    )
    
    db.add(new_snapshot)
    await db.commit()
    
    return {
        "business_id": business_id,
        "name": biz.name,
        "industry": biz.industry,
        "brand_score": brand_score,
        "reputation_score": reputation_score,
        "risk_score": risk_score,
        "revenue_estimate": revenue_update,
        "growth_rate_calculated": growth_rate,
        "timestamp": datetime.utcnow()
    }

# Read historical snapshot metrics
@app.get(f"{settings.API_V1_STR}/{{business_id}}/history")
async def get_twin_snapshot_history(business_id: str, limit: int = 50, db: AsyncSession = Depends(get_db)):
    biz_uuid = uuid.UUID(business_id)
    stmt = select(BusinessMetric).where(BusinessMetric.business_id == biz_uuid).order_by(desc(BusinessMetric.recorded_at)).limit(limit)
    res = await db.execute(stmt)
    history = res.scalars().all()
    return history
