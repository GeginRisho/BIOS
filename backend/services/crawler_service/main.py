import uuid
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel, HttpUrl
from typing import Optional

from backend.services.crawler_service.config import settings
from backend.services.crawler_service.crawler_engine import CrawlerEngine

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crawler_service")

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

# MongoDB Client Setup (Lazy initialized)
mongo_client = None
db = None

def get_mongodb():
    global mongo_client, db
    if mongo_client is None:
        try:
            mongo_client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=2000)
            # Trigger connection check
            mongo_client.admin.command('ping')
            db = mongo_client[settings.MONGO_DB]
            logger.info("Connected to MongoDB raw storage successfully.")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            db = None
    return db

# Kafka Producer Setup (Lazy initialized)
kafka_producer = None

def publish_kafka_event(topic: str, key: str, value: str):
    global kafka_producer
    if kafka_producer is None:
        try:
            from confluent_kafka import Producer
            kafka_producer = Producer({"bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS})
            logger.info("Kafka Producer initialized successfully.")
        except Exception as e:
            logger.warning(f"Kafka unavailable, proceeding without event broadcasting: {str(e)}")
            return
    
    try:
        kafka_producer.produce(topic=topic, key=key.encode('utf-8'), value=value.encode('utf-8'))
        kafka_producer.flush(1)
        logger.info(f"Broadcasted event on topic {topic} for key {key}")
    except Exception as e:
        logger.error(f"Kafka write error: {str(e)}")

# Pydantic schemas
class CrawlRequest(BaseModel):
    url: str
    priority: Optional[int] = 1

class CrawlJobResponse(BaseModel):
    job_id: str
    url: str
    status: str
    created_at: datetime

@app.get("/health", tags=["system"])
async def health_check():
    db_status = "unconnected"
    mongo = get_mongodb()
    if mongo is not None:
        db_status = "connected"
    return {
        "status": "healthy",
        "service": "crawler-service",
        "mongodb_status": db_status
    }

async def run_crawler_task(job_id: str, url: str):
    logger.info(f"Starting async crawl task for job {job_id} on {url}")
    crawler = CrawlerEngine(user_agent=settings.USER_AGENT)
    
    # Perform Scrape
    result = await crawler.scrape(url)
    
    # Store Raw Scraped Info in MongoDB
    mongo = get_mongodb()
    record = {
        "job_id": job_id,
        "url": url,
        "status": "completed",
        "timestamp": datetime.utcnow(),
        "extracted_data": result
    }
    
    if mongo is not None:
        try:
            mongo.raw_crawling_jobs.insert_one(record)
            logger.info(f"Stored scraping job {job_id} raw document in MongoDB.")
        except Exception as e:
            logger.error(f"Failed to store crawl data in MongoDB: {str(e)}")
    
    # Emit Kafka event for consumer ingestion in Business Service
    import json
    event_data = {
        "job_id": job_id,
        "url": url,
        "timestamp": datetime.utcnow().isoformat(),
        "extracted_data": result
    }
    publish_kafka_event("crawler.scraped", job_id, json.dumps(event_data))

@app.post(f"{settings.API_V1_STR}/jobs", response_model=CrawlJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_crawl_job(payload: CrawlRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    
    # Schedule background crawling
    background_tasks.add_task(run_crawler_task, job_id, payload.url)
    
    return {
        "job_id": job_id,
        "url": payload.url,
        "status": "queued",
        "created_at": datetime.utcnow()
    }

@app.get(f"{settings.API_V1_STR}/jobs/{{job_id}}")
async def get_job_status(job_id: str):
    mongo = get_mongodb()
    if mongo is None:
        # Fallback if MongoDB is offline
        raise HTTPException(
            status_code=503,
            detail="MongoDB raw storage service is currently unavailable"
        )
    
    record = mongo.raw_crawling_jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not record:
        return {"job_id": job_id, "status": "processing_or_not_found"}
        
    return record
