-- BIOS Business Directory Service Schema
-- PostgreSQL / SQLite compatible

CREATE TABLE IF NOT EXISTS businesses (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    legal_name      TEXT,
    registration_number TEXT,
    website         TEXT,
    industry        TEXT,
    country         TEXT,
    city            TEXT,
    latitude        REAL,
    longitude       REAL,
    ceo             TEXT,
    employees       INTEGER,
    revenue         REAL,
    market_cap      REAL,
    founded         INTEGER,
    stock_symbol    TEXT,
    status          TEXT DEFAULT 'Verified Twin',
    description     TEXT,
    claimed_by      TEXT,
    is_verified     INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_metrics (
    id               TEXT PRIMARY KEY,
    business_id      TEXT NOT NULL,
    revenue_estimate REAL DEFAULT 0.0,
    traffic_score    REAL DEFAULT 0.0,
    sentiment_score  REAL DEFAULT 0.0,
    brand_score      REAL DEFAULT 0.0,
    reputation_score REAL DEFAULT 0.0,
    risk_score       REAL DEFAULT 0.0,
    hiring_score     REAL DEFAULT 0.0,
    seo_score        REAL DEFAULT 0.0,
    recorded_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id)
);
