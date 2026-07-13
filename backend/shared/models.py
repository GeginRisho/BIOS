import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Float, Numeric, ForeignKey, Integer, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, default="viewer") # super_admin, admin, analyst, viewer
    mfa_secret = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    is_mfa_enabled = Column(Boolean, default=False)
    sso_provider = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="audit_logs")


class Business(Base):
    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    legal_name = Column(String(255), nullable=True)
    registration_number = Column(String(100), unique=True, nullable=True, index=True)
    website = Column(String(255), nullable=True)
    industry = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    ceo = Column(String(255), nullable=True)
    employees = Column(Integer, nullable=True)
    revenue = Column(Float, nullable=True)
    market_cap = Column(Float, nullable=True)
    founded = Column(Integer, nullable=True)
    stock_symbol = Column(String(50), nullable=True)
    status = Column(String(100), nullable=True, default="Verified Twin")
    description = Column(Text, nullable=True)
    claimed_by = Column(UUID(as_uuid=True), nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class BusinessMetric(Base):
    __tablename__ = "business_metrics"

    recorded_at = Column(DateTime(timezone=True), primary_key=True, server_default=func.now())
    business_id = Column(UUID(as_uuid=True), primary_key=True)
    revenue_estimate = Column(Numeric(15, 2), nullable=True)
    traffic_score = Column(Float, nullable=True)
    sentiment_score = Column(Float, nullable=True)
    brand_score = Column(Float, nullable=True)
    reputation_score = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=True)
    hiring_score = Column(Float, nullable=True)
    seo_score = Column(Float, nullable=True)


class SimulationRun(Base):
    __tablename__ = "simulations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True))
    time_horizon = Column(String(50), nullable=False)
    scenario_type = Column(String(50), nullable=False)
    forecast_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
