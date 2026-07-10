-- BIOS Authentication Service Schema
-- PostgreSQL / SQLite compatible

CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    email       TEXT UNIQUE NOT NULL,
    full_name   TEXT,
    hashed_password TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'viewer',  -- super_admin | admin | analyst | viewer
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    user_id     TEXT,
    action      TEXT NOT NULL,
    details     TEXT,
    ip_address  TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
