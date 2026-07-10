import logging
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from typing import List, Optional
import uuid

from backend.services.business_service.config import settings
from backend.services.business_service.database import get_db, Base, engine, SessionLocal
from backend.services.business_service.models import Business, BusinessMetric
from backend.services.business_service.schemas import (
    BusinessCreate,
    BusinessUpdate,
    BusinessResponse,
    MetricCreate,
    MetricResponse
)

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("business_service")

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

# Seed Data Set for Seeding database
SEED_DATA = [
    {"name": "Apple Inc.", "industry": "Technology", "city": "Cupertino", "country": "USA", "latitude": 37.33182, "longitude": -122.03118, "website": "https://apple.com", "ceo": "Tim Cook", "employees": 164000, "revenue": 383.0, "market_cap": 3350.0, "founded": 1976, "stock_symbol": "AAPL", "status": "Verified Twin", "description": "Planetary technology leader specializing in premium hardware architectures and neural edge chipsets.", "risk": 8.5},
    {"name": "Microsoft Corporation", "industry": "Technology", "city": "Redmond", "country": "USA", "latitude": 47.674, "longitude": -122.1215, "website": "https://microsoft.com", "ceo": "Satya Nadella", "employees": 220000, "revenue": 245.0, "market_cap": 3200.0, "founded": 1975, "stock_symbol": "MSFT", "status": "Verified Twin", "description": "Hyperscale cloud, enterprise productivity solutions, and AI infrastructure pioneer.", "risk": 6.5},
    {"name": "Google LLC", "industry": "Technology", "city": "Mountain View", "country": "USA", "latitude": 37.422, "longitude": -122.084, "website": "https://google.com", "ceo": "Sundar Pichai", "employees": 182000, "revenue": 307.0, "market_cap": 2150.0, "founded": 1998, "stock_symbol": "GOOGL", "status": "Verified Twin", "description": "Global search infrastructure, advertising systems, and cloud compute platform pioneer.", "risk": 7.2},
    {"name": "Tesla Motors", "industry": "Technology", "city": "Austin", "country": "USA", "latitude": 30.267, "longitude": -97.743, "website": "https://tesla.com", "ceo": "Elon Musk", "employees": 140000, "revenue": 96.0, "market_cap": 580.0, "founded": 2003, "stock_symbol": "TSLA", "status": "Verified Twin", "description": "Electric mobility and energy autonomy pioneer scaling global manufacturing footprints.", "risk": 15.0},
    {"name": "NVIDIA Corp", "industry": "Technology", "city": "Santa Clara", "country": "USA", "latitude": 37.354, "longitude": -121.955, "website": "https://nvidia.com", "ceo": "Jensen Huang", "employees": 29000, "revenue": 60.0, "market_cap": 2980.0, "founded": 1993, "stock_symbol": "NVDA", "status": "Verified Twin", "description": "Pioneering accelerated graphics accelerators and AI architecture clusters.", "risk": 11.2},
    {"name": "TSMC Co.", "industry": "Technology", "city": "Hsinchu", "country": "Taiwan", "latitude": 24.781, "longitude": 120.993, "website": "https://tsmc.com", "ceo": "C.C. Wei", "employees": 73000, "revenue": 70.0, "market_cap": 820.0, "founded": 1987, "stock_symbol": "TSM", "status": "Verified Twin", "description": "The world's largest dedicated independent semiconductor foundry group.", "risk": 19.5},
    {"name": "ASML Semiconductors", "industry": "Technology", "city": "Veldhoven", "country": "Netherlands", "latitude": 51.396, "longitude": 5.404, "website": "https://asml.com", "ceo": "Christophe Fouquet", "employees": 42000, "revenue": 27.0, "market_cap": 380.0, "founded": 1984, "stock_symbol": "ASML", "status": "Verified Twin", "description": "Lithography machines manufacturer for the global semiconductor industry.", "risk": 12.4},
    {"name": "Infosys Ltd.", "industry": "Technology", "city": "Bengaluru", "country": "India", "latitude": 12.972, "longitude": 77.595, "website": "https://infosys.com", "ceo": "Salil Parekh", "employees": 320000, "revenue": 18.0, "market_cap": 85.0, "founded": 1981, "stock_symbol": "INFY", "status": "Verified Twin", "description": "Global digital consulting services driving large-scale system modernization.", "risk": 12.0},
    {"name": "TCS Consultancy", "industry": "Technology", "city": "Mumbai", "country": "India", "latitude": 19.076, "longitude": 72.877, "website": "https://tcs.com", "ceo": "K. Krithivasan", "employees": 608000, "revenue": 29.0, "market_cap": 145.0, "founded": 1968, "stock_symbol": "TCS", "status": "Verified Twin", "description": "Largest global IT consulting services provider offering cognitive automation.", "risk": 9.8},
    {"name": "Samsung Electronics", "industry": "Technology", "city": "Suwon", "country": "South Korea", "latitude": 37.263, "longitude": 127.029, "website": "https://samsung.com", "ceo": "Han Jong-hee", "employees": 270000, "revenue": 200.0, "market_cap": 370.0, "founded": 1969, "stock_symbol": "SMSN", "status": "Verified Twin", "description": "Consumer electronics giant and memory semiconductor market leader.", "risk": 14.8},
    {"name": "Sino Logistics", "industry": "Logistics", "city": "Shanghai", "country": "China", "latitude": 31.23, "longitude": 121.47, "website": "https://sinologistics.com", "ceo": "Executive Log", "employees": 45000, "revenue": 8.5, "market_cap": 12.0, "founded": 2005, "stock_symbol": "SINO", "status": "Verified Twin", "description": "Heavy cargo transport operations linking global shipping tracks.", "risk": 18.0},
    {"name": "DHL Supply Chain", "industry": "Logistics", "city": "Bonn", "country": "Germany", "latitude": 50.737, "longitude": 7.098, "website": "https://dhl.com", "ceo": "Oscar de Bok", "employees": 185000, "revenue": 94.0, "market_cap": 52.0, "founded": 1969, "stock_symbol": "DHL", "status": "Verified Twin", "description": "Global logistics and express mail services provider operating in 220 countries.", "risk": 10.4},
    {"name": "Pfizer Pharmaceuticals", "industry": "Healthcare", "city": "New York", "country": "USA", "latitude": 40.749, "longitude": -73.974, "website": "https://pfizer.com", "ceo": "Albert Bourla", "employees": 83000, "revenue": 58.0, "market_cap": 162.0, "founded": 1849, "stock_symbol": "PFE", "status": "Verified Twin", "description": "Global pharmaceutical company developing medicines and vaccines.", "risk": 15.0},
    {"name": "Goldman Sachs Group", "industry": "Finance", "city": "New York", "country": "USA", "latitude": 40.715, "longitude": -74.014, "website": "https://goldman.com", "ceo": "David Solomon", "employees": 45000, "revenue": 46.0, "market_cap": 138.0, "founded": 1869, "stock_symbol": "GS", "status": "Verified Twin", "description": "Leading global investment banking, securities, and investment management firm.", "risk": 12.0},
    {"name": "Siemens AG", "industry": "Manufacturing", "city": "Munich", "country": "Germany", "latitude": 48.135, "longitude": 11.582, "website": "https://siemens.com", "ceo": "Roland Busch", "employees": 320000, "revenue": 78.0, "market_cap": 140.0, "founded": 1847, "stock_symbol": "SIE", "status": "Verified Twin", "description": "Global technology powerhouse focusing on industry, infrastructure, and transport.", "risk": 11.0},
    {"name": "Gigafactory Berlin", "industry": "Manufacturing", "city": "Berlin", "country": "Germany", "latitude": 52.39, "longitude": 13.79, "website": "https://tesla.com/gigafactory-berlin", "ceo": "Elon Musk", "employees": 12000, "revenue": 8.4, "market_cap": 25.0, "founded": 2022, "stock_symbol": "TSLA", "status": "Verified Twin", "description": "European electric vehicle and battery manufacturing hub.", "risk": 10.0},
    {"name": "Foxconn Shenzhen", "industry": "Manufacturing", "city": "Shenzhen", "country": "China", "latitude": 22.54, "longitude": 114.05, "website": "https://foxconn.com", "ceo": "Young Liu", "employees": 1000000, "revenue": 200.0, "market_cap": 95.0, "founded": 1974, "stock_symbol": "FOXC", "status": "Verified Twin", "description": "World's largest contract electronics manufacturer assembling premium hardware.", "risk": 28.0},
    {"name": "Client Consumers", "industry": "Retail", "city": "London", "country": "UK", "latitude": 51.507, "longitude": -0.127, "website": "https://consumers.org", "ceo": "Retail Head", "employees": 10000000, "revenue": 380.0, "market_cap": 0.0, "founded": 1900, "stock_symbol": "NONE", "status": "Verified Twin", "description": "Representing the global retail consumer market base.", "risk": 6.0},
    {"name": "Enterprise Clients", "industry": "Finance", "city": "New York", "country": "USA", "latitude": 40.712, "longitude": -74.006, "website": "https://enterprise.org", "ceo": "B2B Lead", "employees": 500000, "revenue": 850.0, "market_cap": 0.0, "founded": 1950, "stock_symbol": "NONE", "status": "Verified Twin", "description": "Institutional corporate and enterprise buyer segment.", "risk": 8.0},
    {"name": "Government Solutions", "industry": "Finance", "city": "Washington DC", "country": "USA", "latitude": 38.907, "longitude": -77.036, "website": "https://gov.solutions", "ceo": "Gov Director", "employees": 200000, "revenue": 450.0, "market_cap": 0.0, "founded": 1789, "stock_symbol": "NONE", "status": "Verified Twin", "description": "Public sector and government client base.", "risk": 5.0}
]

async def seed_data():
    logger.info("Seeding realistic corporate twin profiles...")
    async with SessionLocal() as db:
        for val in SEED_DATA:
            # Check if already seeded
            stmt = select(Business).where(Business.name == val["name"])
            res = await db.execute(stmt)
            if res.scalars().first():
                continue
                
            biz = Business(
                name=val["name"],
                website=val["website"],
                industry=val["industry"],
                country=val["country"],
                city=val["city"],
                latitude=val["latitude"],
                longitude=val["longitude"],
                ceo=val["ceo"],
                employees=val["employees"],
                revenue=val["revenue"],
                market_cap=val["market_cap"],
                founded=val["founded"],
                stock_symbol=val["stock_symbol"],
                status=val["status"],
                description=val["description"],
                is_verified=True
            )
            db.add(biz)
            await db.flush()
            
            # Seed initial metric
            metric = BusinessMetric(
                business_id=biz.id,
                revenue_estimate=val["revenue"] * 1000000,
                traffic_score=85.0,
                sentiment_score=0.88,
                brand_score=75.0,
                reputation_score=90.0,
                risk_score=val["risk"],
                hiring_score=70.0,
                seo_score=80.0
            )
            db.add(metric)
        await db.commit()
    logger.info("Database seeding completed.")

# Startup DB validation
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Business Directory Service. Creating database schemas...")
    async with engine.begin() as conn:
        # Create tables only if they do not exist
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized successfully.")
    await seed_data()

@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy", "service": "business-service"}

# Create Business manually
@app.post(f"{settings.API_V1_STR}", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_business(business_in: BusinessCreate, db: AsyncSession = Depends(get_db)):
    if business_in.registration_number:
        stmt = select(Business).where(Business.registration_number == business_in.registration_number)
        res = await db.execute(stmt)
        if res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business with this registration number already registered"
            )
            
    biz = Business(
        name=business_in.name,
        legal_name=business_in.legal_name,
        registration_number=business_in.registration_number,
        website=business_in.website,
        industry=business_in.industry,
        country=business_in.country,
        city=business_in.city,
        latitude=business_in.latitude,
        longitude=business_in.longitude,
        ceo=business_in.ceo,
        employees=business_in.employees,
        revenue=business_in.revenue,
        market_cap=business_in.market_cap,
        founded=business_in.founded,
        stock_symbol=business_in.stock_symbol,
        status=business_in.status or "Verified Twin",
        description=business_in.description,
        is_verified=True
    )
    db.add(biz)
    await db.commit()
    await db.refresh(biz)
    return biz

# Get / List Businesses (with filtering)
@app.get(f"{settings.API_V1_STR}", response_model=List[BusinessResponse])
async def list_businesses(
    industry: Optional[str] = None,
    city: Optional[str] = None,
    country: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Business)
    if industry:
        stmt = stmt.where(Business.industry == industry)
    if city:
        stmt = stmt.where(Business.city == city)
    if country:
        stmt = stmt.where(Business.country == country)
    
    stmt = stmt.offset(skip).limit(limit).order_by(Business.name)
    res = await db.execute(stmt)
    return res.scalars().all()

# Get Single Business Detail
@app.get(f"{settings.API_V1_STR}/{{business_id}}", response_model=BusinessResponse)
async def get_business(business_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Business).where(Business.id == uuid.UUID(business_id))
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found"
        )
    return biz

# Update Business
@app.put(f"{settings.API_V1_STR}/{{business_id}}", response_model=BusinessResponse)
async def update_business(
    business_id: str,
    business_in: BusinessUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Business).where(Business.id == uuid.UUID(business_id))
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
        
    update_data = business_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(biz, key, value)
        
    db.add(biz)
    await db.commit()
    await db.refresh(biz)
    return biz

# Claim Business Twin
@app.post(f"{settings.API_V1_STR}/{{business_id}}/claim", response_model=BusinessResponse)
async def claim_business(business_id: str, user_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Business).where(Business.id == uuid.UUID(business_id))
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business twin not found")
    if biz.claimed_by:
        raise HTTPException(status_code=400, detail="Business twin already claimed")
        
    biz.claimed_by = uuid.UUID(user_id)
    biz.is_verified = True
    db.add(biz)
    await db.commit()
    await db.refresh(biz)
    return biz

# Write Historical Metric
@app.post(f"{settings.API_V1_STR}/{{business_id}}/metrics", response_model=MetricResponse)
async def record_metric(business_id: str, metric_in: MetricCreate, db: AsyncSession = Depends(get_db)):
    metric = BusinessMetric(
        business_id=uuid.UUID(business_id),
        revenue_estimate=metric_in.revenue_estimate,
        traffic_score=metric_in.traffic_score,
        sentiment_score=metric_in.sentiment_score,
        brand_score=metric_in.brand_score,
        reputation_score=metric_in.reputation_score,
        risk_score=metric_in.risk_score,
        hiring_score=metric_in.hiring_score,
        seo_score=metric_in.seo_score
    )
    db.add(metric)
    await db.commit()
    return metric

# Fetch metrics history (Timeseries)
@app.get(f"{settings.API_V1_STR}/{{business_id}}/metrics", response_model=List[MetricResponse])
async def list_metrics(business_id: str, limit: int = 100, db: AsyncSession = Depends(get_db)):
    stmt = select(BusinessMetric).where(BusinessMetric.business_id == uuid.UUID(business_id)).order_by(desc(BusinessMetric.recorded_at)).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

# Direct Crawler Ingestion Pipeline route (Normalizer + Deduplication + Sync)
@app.post(f"{settings.API_V1_STR}/ingest", response_model=BusinessResponse)
async def ingest_crawl_result(payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Accepts crawled output from crawler-service. Normalizes data, performs deduplication checking,
    writes the new Business Profile, and registers an initial set of digital twin metrics.
    """
    ext_data = payload.get("extracted_data", {})
    domain = ext_data.get("domain", "unknown.com")
    name = ext_data.get("name") or ext_data.get("title") or domain.split('.')[0].title()
    
    # Deduplicate by domain / website URL
    stmt = select(Business).where(Business.website.like(f"%{domain}%"))
    res = await db.execute(stmt)
    existing_biz = res.scalars().first()
    
    if existing_biz:
        logger.info(f"Duplicate domain detected for {domain}. Skipping creation.")
        return existing_biz
    
    # Extract mock attributes or scraped indicators
    mock_intel = ext_data.get("extracted_intelligence", {})
    traffic = mock_intel.get("traffic_score_mock") or 50.0
    sentiment = mock_intel.get("sentiment_score_mock") or 0.7
    seo = mock_intel.get("seo_score_mock") or 60.0
    
    # Clean location details
    city = ext_data.get("city", "San Francisco")
    country = ext_data.get("country", "USA")
    lat = ext_data.get("latitude", 37.7749)
    lon = ext_data.get("longitude", -122.4194)
    
    # Create Business
    biz = Business(
        name=name,
        website=ext_data.get("url", f"https://{domain}"),
        industry=ext_data.get("inferred_industry", "Technology"),
        country=country,
        city=city,
        latitude=lat,
        longitude=lon,
        is_verified=False
    )
    db.add(biz)
    await db.flush() # Load ID
    
    # Create twin metrics entry
    metric = BusinessMetric(
        business_id=biz.id,
        revenue_estimate=5000000.0, # default starting estimate
        traffic_score=traffic,
        sentiment_score=sentiment,
        brand_score=traffic * sentiment,
        reputation_score=sentiment * 100,
        risk_score=random_risk_score(sentiment),
        hiring_score=50.0,
        seo_score=seo
    )
    db.add(metric)
    await db.commit()
    await db.refresh(biz)
    
    # Emit event to Kafka (for Knowledge Graph sync) if Kafka available
    try:
        import json
        from confluent_kafka import Producer
        producer = Producer({"bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS})
        event = {
            "business_id": str(biz.id),
            "name": biz.name,
            "industry": biz.industry,
            "website": biz.website,
            "city": biz.city,
            "country": biz.country,
            "suppliers": mock_intel.get("suppliers", []),
            "competitors": mock_intel.get("competitors", [])
        }
        producer.produce("business.normalized", str(biz.id).encode('utf-8'), json.dumps(event).encode('utf-8'))
        producer.flush(1)
        logger.info(f"Broadcasted business.normalized for business: {biz.id}")
    except Exception as e:
        logger.warning(f"Kafka sync bypassed for Business {biz.id}: {str(e)}")
        
    return biz

# Delete Business
@app.delete(f"{settings.API_V1_STR}/{{business_id}}", status_code=status.HTTP_200_OK)
async def delete_business(business_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Business).where(Business.id == uuid.UUID(business_id))
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
        
    # Also delete metrics associated with it
    from sqlalchemy import delete
    stmt_del_metrics = delete(BusinessMetric).where(BusinessMetric.business_id == uuid.UUID(business_id))
    await db.execute(stmt_del_metrics)
    
    await db.delete(biz)
    await db.commit()
    return {"message": "Business deleted successfully"}

def random_risk_score(sentiment: float) -> float:
    # Inverse correlation with sentiment
    return max(0.0, min(100.0, (1.0 - sentiment) * 100.0))
