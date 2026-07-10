import logging
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, Float, Numeric, DateTime, desc, select
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import List, Optional

from backend.services.report_service.config import settings

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("report_service")

# Database Session Setup
engine = create_async_engine(settings.database_url, echo=False)
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()

class Business(Base):
    __tablename__ = "businesses"
    id = Column(UUID(as_uuid=True), primary_key=True)
    name = Column(String(255), nullable=False)
    website = Column(String(255))
    industry = Column(String(100))
    city = Column(String(100))
    country = Column(String(100))

class BusinessMetric(Base):
    __tablename__ = "business_metrics"
    recorded_at = Column(DateTime(timezone=True), primary_key=True)
    business_id = Column(UUID(as_uuid=True), primary_key=True)
    revenue_estimate = Column(Numeric(15, 2))
    traffic_score = Column(Float)
    sentiment_score = Column(Float)
    brand_score = Column(Float)
    reputation_score = Column(Float)
    risk_score = Column(Float)

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
    return {"status": "healthy", "service": "report-service"}

@app.post(f"{settings.API_V1_STR}/generate/{{business_id}}")
async def generate_business_report_json(business_id: str, db: AsyncSession = Depends(get_db)):
    """
    Compiles a comprehensive digital twin briefing report containing
    entity records, SWOT quadrants, brand health indicators, and core recommendations.
    """
    biz_uuid = uuid.UUID(business_id)
    
    # Fetch business
    stmt_biz = select(Business).where(Business.id == biz_uuid)
    biz_res = await db.execute(stmt_biz)
    biz = biz_res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
        
    # Fetch metrics
    stmt_metrics = select(BusinessMetric).where(BusinessMetric.business_id == biz_uuid).order_by(desc(BusinessMetric.recorded_at)).limit(1)
    metrics_res = await db.execute(stmt_metrics)
    latest_metrics = metrics_res.scalars().first()
    
    brand_val = latest_metrics.brand_score if latest_metrics else 50.0
    risk_val = latest_metrics.risk_score if latest_metrics else 20.0
    rev_val = float(latest_metrics.revenue_estimate) if latest_metrics and latest_metrics.revenue_estimate else 1000000.0
    
    report_data = {
        "report_id": str(uuid.uuid4()),
        "generated_at": datetime.utcnow().isoformat(),
        "business_profile": {
            "name": biz.name,
            "industry": biz.industry,
            "location": f"{biz.city}, {biz.country}",
            "website": biz.website
        },
        "kpis": {
            "annual_revenue": f"${rev_val:,.2f}",
            "brand_score": brand_val,
            "risk_score": risk_val
        },
        "swot": {
            "strengths": [f"Stable operational status in {biz.city}.", "Strong digital twin metric tracking active."],
            "weaknesses": ["Vulnerability to macroeconomic supply cost shocks.", "Dependence on regional distribution channels."],
            "opportunities": ["Leveraging hybrid search indexing to scout global competitors.", "Improving SEO scores dynamically."],
            "threats": ["Local regulatory changes in regional locations.", "New market entrants diluting customer sentiment."]
        },
        "recommendations": [
            "Perform weekly crawling scans of key competitors to update graph edges.",
            "Maintain cash reserve ratio at 18% to counter inflation scenarios.",
            "Verify business ownership status to access advanced forecasting portals."
        ]
    }
    
    return report_data

@app.get(f"{settings.API_V1_STR}/export/{{business_id}}", response_class=HTMLResponse)
async def export_business_report_html(business_id: str, db: AsyncSession = Depends(get_db)):
    """
    Compiles report data and structures it into printable PDF-ready HTML markup.
    """
    data = await generate_business_report_json(business_id, db)
    profile = data["business_profile"]
    kpis = data["kpis"]
    swot = data["swot"]
    recs = data["recommendations"]
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>BIOS Briefing - {profile["name"]}</title>
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; background-color: #f8fafc; }}
            .container {{ max-width: 800px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }}
            .header {{ border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }}
            .header h1 {{ margin: 0; color: #1e3a8a; font-size: 28px; }}
            .header p {{ margin: 5px 0 0; color: #64748b; font-size: 14px; }}
            .section {{ margin-bottom: 30px; }}
            .section-title {{ font-size: 18px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; font-weight: bold; }}
            .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
            .card {{ background: #f1f5f9; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1; }}
            .card h3 {{ margin-top: 0; color: #1e40af; font-size: 15px; }}
            .kpi-box {{ display: flex; justify-content: space-between; margin-bottom: 20px; }}
            .kpi-card {{ flex: 1; background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; text-align: center; border-radius: 6px; margin: 0 5px; }}
            .kpi-card h4 {{ margin: 0; color: #1d4ed8; font-size: 12px; text-transform: uppercase; }}
            .kpi-card p {{ margin: 5px 0 0; font-size: 20px; font-weight: bold; color: #1e3a8a; }}
            ul {{ padding-left: 20px; margin-top: 5px; }}
            li {{ margin-bottom: 8px; }}
            .footer {{ text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 50px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{profile["name"]}</h1>
                <p>Industry: {profile["industry"]} | Location: {profile["location"]} | Website: {profile["website"]}</p>
                <p style="font-size: 11px;">Report ID: {data["report_id"]} | Compiled: {data["generated_at"]}</p>
            </div>
            
            <div class="section">
                <div class="kpi-box">
                    <div class="kpi-card">
                        <h4>Annual Revenue</h4>
                        <p>{kpis["annual_revenue"]}</p>
                    </div>
                    <div class="kpi-card">
                        <h4>Brand Score</h4>
                        <p>{kpis["brand_score"]}/100</p>
                    </div>
                    <div class="kpi-card">
                        <h4>Risk Index</h4>
                        <p style="color: {'#ef4444' if kpis["risk_score"] > 50 else '#1e3a8a'};">{kpis["risk_score"]}/100</p>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">SWOT Matrix Analysis</div>
                <div class="grid">
                    <div class="card">
                        <h3>Strengths</h3>
                        <ul>{"".join(f"<li>{s}</li>" for s in swot["strengths"])}</ul>
                    </div>
                    <div class="card">
                        <h3>Weaknesses</h3>
                        <ul>{"".join(f"<li>{w}</li>" for w in swot["weaknesses"])}</ul>
                    </div>
                    <div class="card">
                        <h3>Opportunities</h3>
                        <ul>{"".join(f"<li>{o}</li>" for o in swot["opportunities"])}</ul>
                    </div>
                    <div class="card">
                        <h3>Threats</h3>
                        <ul>{"".join(f"<li>{t}</li>" for t in swot["threats"])}</ul>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Strategic Action Items</div>
                <ul>
                    {"".join(f"<li><strong>Priority:</strong> {r}</li>" for r in recs)}
                </ul>
            </div>
            
            <div class="footer">
                <p>Global Business Intelligence Operating System (BIOS) - Planetary Digital Twin Platform © 2026</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html_content
