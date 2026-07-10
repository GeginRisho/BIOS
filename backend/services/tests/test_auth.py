import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "auth-service"}

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    user_data = {
        "email": "testuser@bios.com",
        "password": "supersecurepassword123",
        "full_name": "Test User",
        "role": "viewer"
    }
    response = await client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 201
    json_resp = response.json()
    assert json_resp["email"] == "testuser@bios.com"
    assert json_resp["full_name"] == "Test User"
    assert "id" in json_resp
    assert json_resp["is_mfa_enabled"] is False

@pytest.mark.asyncio
async def test_register_duplicate_user(client: AsyncClient):
    user_data = {
        "email": "duplicate@bios.com",
        "password": "supersecurepassword123",
        "full_name": "Duplicate User"
    }
    # Register first
    response_first = await client.post("/api/v1/auth/register", json=user_data)
    assert response_first.status_code == 201
    
    # Register second time
    response_second = await client.post("/api/v1/auth/register", json=user_data)
    assert response_second.status_code == 400
    assert response_second.json()["detail"] == "User with this email already registered"

@pytest.mark.asyncio
async def test_login_user(client: AsyncClient):
    user_data = {
        "email": "loginuser@bios.com",
        "password": "supersecurepassword123",
        "full_name": "Login User"
    }
    # Register user
    await client.post("/api/v1/auth/register", json=user_data)
    
    # Log in user
    login_data = {
        "email": "loginuser@bios.com",
        "password": "supersecurepassword123"
    }
    response = await client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    json_resp = response.json()
    assert "access_token" in json_resp
    assert "refresh_token" in json_resp
    assert json_resp["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    user_data = {
        "email": "wrongpwd@bios.com",
        "password": "supersecurepassword123",
        "full_name": "Wrong Pwd User"
    }
    # Register user
    await client.post("/api/v1/auth/register", json=user_data)
    
    # Log in user with wrong password
    login_data = {
        "email": "wrongpwd@bios.com",
        "password": "wrongpasswordchoice"
    }
    response = await client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

@pytest.mark.asyncio
async def test_get_profile_me(client: AsyncClient):
    user_data = {
        "email": "profileuser@bios.com",
        "password": "supersecurepassword123",
        "full_name": "Profile User"
    }
    # Register user
    await client.post("/api/v1/auth/register", json=user_data)
    
    # Log in user to get token
    login_data = {
        "email": "profileuser@bios.com",
        "password": "supersecurepassword123"
    }
    login_response = await client.post("/api/v1/auth/login", json=login_data)
    token = login_response.json()["access_token"]
    
    # Query /me with access token
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp["email"] == "profileuser@bios.com"
    assert json_resp["full_name"] == "Profile User"
