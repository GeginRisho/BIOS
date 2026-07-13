import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

# User Registration Schema
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: Optional[str] = None
    role: Optional[str] = "viewer" # ignored by backend, always forced to viewer

# User Login Schema
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Token Payload representation
class TokenPayload(BaseModel):
    sub: str # user_id as string
    email: str
    role: str
    exp: Optional[int] = None

# Response payload for tokens
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

# User details response schema
class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    is_active: bool = True
    is_mfa_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Audit log details response schema
class AuditLogResponse(BaseModel):
    id: uuid.UUID
    action: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# ── User Management Schemas ──────────────────────────────────

class RoleUpdate(BaseModel):
    role: str = Field(..., description="One of: viewer, analyst, admin, super_admin")

class StatusUpdate(BaseModel):
    is_active: bool

class RefreshTokenRequest(BaseModel):
    refresh_token: str
