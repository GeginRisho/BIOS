import logging
import uuid
from datetime import timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from jose import JWTError, jwt
from typing import Optional

from backend.services.auth_service.config import settings
from backend.services.auth_service.database import get_db, Base, engine
from backend.services.auth_service.models import User, AuditLog
from backend.services.auth_service.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token
)
from backend.services.auth_service.schemas import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    TokenPayload,
    AuditLogResponse,
    RoleUpdate,
    StatusUpdate,
    RefreshTokenRequest
)

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("auth_service")

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

security_scheme = HTTPBearer()

# Helper: Write to audit trail
async def write_audit_log(db: AsyncSession, user_id: str, action: str, details: str, request: Request):
    ip_addr = request.client.host if request.client else "unknown"
    audit = AuditLog(
        user_id=user_id,
        action=action,
        details=details,
        ip_address=ip_addr
    )
    db.add(audit)
    await db.commit()

async def seed_users():
    # Import locally to avoid circular dependencies
    from backend.services.auth_service.database import SessionLocal as AuthSessionLocal
    from sqlalchemy import func
    async with AuthSessionLocal() as db:
        # Check if users table is empty
        stmt_count = select(func.count(User.id))
        res_count = await db.execute(stmt_count)
        count = res_count.scalar()
        if count == 0:
            logger.info("Database is empty. Seeding default role-based users...")
            default_users = [
                {"email": "superadmin@bios.com", "password": "Admin@123", "full_name": "Super Admin", "role": "super_admin"},
                {"email": "admin@bios.com", "password": "Admin@123", "full_name": "Enterprise Admin", "role": "admin"},
                {"email": "analyst@bios.com", "password": "Admin@123", "full_name": "Lead Analyst", "role": "analyst"},
                {"email": "viewer@bios.com", "password": "Admin@123", "full_name": "External Viewer", "role": "viewer"}
            ]
            for du in default_users:
                user = User(
                    email=du["email"],
                    hashed_password=get_password_hash(du["password"]),
                    full_name=du["full_name"],
                    role=du["role"],
                    is_active=True
                )
                db.add(user)
            await db.commit()
            logger.info("Default users seeded successfully.")
        else:
            logger.info("Database is not empty. Skipping user seeding.")

# Middleware to bootstrap databases (for development setup)
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Auth Service. Connecting to PostgreSQL and creating schemas...")
    async with engine.begin() as conn:
        # Create tables if not exists (avoid drop_all)
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified.")
    await seed_users()


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy", "service": "auth-service"}

# Registration Endpoint
@app.post(f"{settings.API_V1_STR}/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    stmt = select(User).where(User.email == user_in.email)
    result = await db.execute(stmt)
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already registered"
        )
    
    # Hash password and create user — ALWAYS force viewer role for self-registration
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        role="viewer",  # Security: always viewer, ignore client-sent role
        is_active=True
    )
    
    db.add(user)
    await db.flush() # flush to generate ID
    
    # Audit log entry
    await write_audit_log(
        db, 
        user.id, 
        "REGISTER", 
        f"Registered new user account: {user.email}", 
        request
    )
    
    await db.commit()
    await db.refresh(user)
    return user

# Login Endpoint
@app.post(f"{settings.API_V1_STR}/login", response_model=Token)
async def login(user_in: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == user_in.email)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user account is active
    if hasattr(user, 'is_active') and not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Contact your administrator."
        )
    
    # Generate JWT Tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    
    # Audit log entry
    await write_audit_log(
        db,
        user.id,
        "LOGIN",
        f"User successfully logged in: {user.email}",
        request
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

# Refresh Token Endpoint (Fixed: uses JSON body instead of query param)
@app.post(f"{settings.API_V1_STR}/refresh", response_model=Token)
async def refresh_token(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(body.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token payload"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate refresh credentials"
        )
    
    # Load user
    stmt = select(User).where(User.id == uuid.UUID(user_id))
    result = await db.execute(stmt)
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate new tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    new_refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

# Get Current Authenticated User Dependency
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    stmt = select(User).where(User.id == uuid.UUID(user_id))
    result = await db.execute(stmt)
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with token not found"
        )
    return user

# Require super_admin role
async def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )
    return current_user

# Get Me Profile Endpoint
@app.get(f"{settings.API_V1_STR}/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

# ─────────────────────────────────────────────────────────────
# USER MANAGEMENT ENDPOINTS (Super Admin Only)
# ─────────────────────────────────────────────────────────────

# List all users with optional search
@app.get(f"{settings.API_V1_STR}/users", response_model=list[UserResponse])
async def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User)
    if search:
        stmt = stmt.where(
            or_(
                User.email.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%")
            )
        )
    if role:
        stmt = stmt.where(User.role == role)
    stmt = stmt.order_by(User.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

# Update user role
@app.put(f"{settings.API_V1_STR}/users/{{user_id}}/role")
async def update_user_role(
    user_id: str,
    body: RoleUpdate,
    request: Request,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    valid_roles = ["viewer", "analyst", "admin", "super_admin"]
    if body.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
    
    stmt = select(User).where(User.id == uuid.UUID(user_id))
    result = await db.execute(stmt)
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_role = user.role
    user.role = body.role
    await db.commit()
    
    await write_audit_log(
        db, current_user.id, "ROLE_CHANGE",
        f"Changed role for {user.email}: {old_role} → {body.role}",
        request
    )
    
    return {"status": "success", "email": user.email, "old_role": old_role, "new_role": body.role}

# Activate / deactivate user
@app.put(f"{settings.API_V1_STR}/users/{{user_id}}/status")
async def update_user_status(
    user_id: str,
    body: StatusUpdate,
    request: Request,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == uuid.UUID(user_id))
    result = await db.execute(stmt)
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = body.is_active
    await db.commit()
    
    action = "ACTIVATE" if body.is_active else "DEACTIVATE"
    await write_audit_log(
        db, current_user.id, action,
        f"{action}d user account: {user.email}",
        request
    )
    
    return {"status": "success", "email": user.email, "is_active": body.is_active}

# Delete user
@app.delete(f"{settings.API_V1_STR}/users/{{user_id}}")
async def delete_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == uuid.UUID(user_id))
    result = await db.execute(stmt)
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    email = user.email
    await db.delete(user)
    await db.commit()
    
    await write_audit_log(
        db, current_user.id, "DELETE_USER",
        f"Deleted user account: {email}",
        request
    )
    
    return {"status": "deleted", "email": email}

# ─────────────────────────────────────────────────────────────
# AUDIT LOGS
# ─────────────────────────────────────────────────────────────

@app.get(f"{settings.API_V1_STR}/audit", response_model=list[AuditLogResponse])
async def get_audits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Viewer can only see their own audit logs, admins can see all
    if current_user.role in ["admin", "super_admin"]:
        stmt = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100)
    else:
        stmt = select(AuditLog).where(AuditLog.user_id == current_user.id).order_by(AuditLog.timestamp.desc()).limit(100)
    
    result = await db.execute(stmt)
    audits = result.scalars().all()
    return audits
