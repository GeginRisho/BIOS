# BIOS API Reference Documentation

This document describes API contracts and routing protocols for our microservices directory. All endpoints accept and return JSON payloads.

---

## 1. Authentication & JWT Credentials

### User Registration
`POST /api/v1/auth/register`
* **Request Payload:**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123",
    "full_name": "John Doe",
    "role": "viewer"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "id": "d99aba2f-1ec0-4c95-bf88-70dc2c712abd",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "viewer",
    "is_mfa_enabled": false,
    "created_at": "2026-07-08T07:44:00Z"
  }
  ```

### User Login
`POST /api/v1/auth/login`
* **Request Payload:**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "refresh_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer"
  }
  ```

---

## 2. Crawler & Business Ingestions

### Trigger Crawl Job
`POST /api/v1/crawler/jobs`
* **Request Payload:**
  ```json
  {
    "url": "https://apple.com",
    "priority": 1
  }
  ```
* **Response (202 Accepted):**
  ```json
  {
    "job_id": "8f0a1c2d-3b4e-5f6g-7h8i-9j0k1l2m3n4o",
    "url": "https://apple.com",
    "status": "queued",
    "created_at": "2026-07-08T07:44:00Z"
  }
  ```

### Direct Ingestion Pipeline
`POST /api/v1/businesses/ingest`
* **Request Payload:**
  ```json
  {
    "extracted_data": {
      "name": "Apple Inc",
      "domain": "apple.com",
      "url": "https://apple.com",
      "inferred_industry": "Technology",
      "city": "Cupertino",
      "country": "USA",
      "latitude": 37.3318,
      "longitude": -122.0311,
      "extracted_intelligence": {
        "suppliers": ["Foxconn", "TSMC"],
        "competitors": ["Samsung", "Google"],
        "traffic_score_mock": 98.4,
        "sentiment_score_mock": 0.88,
        "seo_score_mock": 94.0
      }
    }
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "id": "e4a2b1c3-d4e5-6f7g-8h9i-0j1k2l3m4n5o",
    "name": "Apple Inc",
    "website": "https://apple.com",
    "industry": "Technology",
    "country": "USA",
    "city": "Cupertino",
    "latitude": 37.3318,
    "longitude": -122.0311,
    "is_verified": false,
    "created_at": "2026-07-08T07:44:00Z"
  }
  ```

---

## 3. WebSockets Live Warning Channels
Clients subscribe to real-time alerts via WebSockets:
`WS /api/v1/notifications/ws`

* **Incoming Alert Frame:**
  ```json
  {
    "timestamp": "2026-07-08T07:44:00Z",
    "category": "simulation_warning",
    "title": "Hyper-Inflation Impact Triggered",
    "message": "Simulated supply lines shipping costs increased by +25% for Apple Inc.",
    "business_id": "e4a2b1c3-d4e5-6f7g-8h9i-0j1k2l3m4n5o"
  }
  ```
