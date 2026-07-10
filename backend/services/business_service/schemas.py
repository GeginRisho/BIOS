import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, HttpUrl, Field

class BusinessCreate(BaseModel):
    name: str = Field(..., max_length=255)
    legal_name: Optional[str] = Field(None, max_length=255)
    registration_number: Optional[str] = Field(None, max_length=100)
    website: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    ceo: Optional[str] = None
    employees: Optional[int] = None
    revenue: Optional[float] = None
    market_cap: Optional[float] = None
    founded: Optional[int] = None
    stock_symbol: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    claimed_by: Optional[str] = None
    is_verified: Optional[bool] = None
    ceo: Optional[str] = None
    employees: Optional[int] = None
    revenue: Optional[float] = None
    market_cap: Optional[float] = None
    founded: Optional[int] = None
    stock_symbol: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None

class BusinessResponse(BaseModel):
    id: uuid.UUID
    name: str
    legal_name: Optional[str] = None
    registration_number: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ceo: Optional[str] = None
    employees: Optional[int] = None
    revenue: Optional[float] = None
    market_cap: Optional[float] = None
    founded: Optional[int] = None
    stock_symbol: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    claimed_by: Optional[uuid.UUID] = None
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class MetricCreate(BaseModel):
    business_id: str
    revenue_estimate: Optional[float] = 0.0
    traffic_score: Optional[float] = 0.0
    sentiment_score: Optional[float] = 0.0
    brand_score: Optional[float] = 0.0
    reputation_score: Optional[float] = 0.0
    risk_score: Optional[float] = 0.0
    hiring_score: Optional[float] = 0.0
    seo_score: Optional[float] = 0.0

class MetricResponse(BaseModel):
    recorded_at: datetime
    business_id: str
    revenue_estimate: Optional[float] = None
    traffic_score: Optional[float] = None
    sentiment_score: Optional[float] = None
    brand_score: Optional[float] = None
    reputation_score: Optional[float] = None
    risk_score: Optional[float] = None
    hiring_score: Optional[float] = None
    seo_score: Optional[float] = None

    class Config:
        from_attributes = True
