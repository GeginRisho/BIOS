# BIOS Database Schemas & Optimizations

This document explains our multi-engine data storage structure.

---

## 1. Relational Database (PostgreSQL + TimescaleDB)

### Primary Directory Tables
- **`users`:** Houses credentials, roles, and MFA secrets.
- **`businesses`:** Directory index of all crawled digital twins.
- **`simulations`:** Run records for auditing strategic forecast simulations.
- **`audit_logs`:** Global user auditing trail.

### TimescaleDB Hypertables
- **`business_metrics`:** Renders timeseries metric snapshots:
  ```sql
  CREATE TABLE business_metrics (
      recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
      business_id UUID NOT NULL,
      revenue_estimate NUMERIC(15, 2),
      traffic_score DOUBLE PRECISION,
      sentiment_score DOUBLE PRECISION,
      brand_score DOUBLE PRECISION,
      reputation_score DOUBLE PRECISION,
      risk_score DOUBLE PRECISION,
      hiring_score DOUBLE PRECISION,
      seo_score DOUBLE PRECISION
  );
  SELECT create_hypertable('business_metrics', 'recorded_at');
  ```

### Indexes & Optimizations
- Unique index on `users.email` and `businesses.registration_number`.
- Compound timeseries indexes:
  ```sql
  CREATE INDEX idx_metrics_query ON business_metrics (business_id, recorded_at DESC);
  ```

---

## 2. Graph Database Schema (Neo4j)

### Node Configurations
- **`(:Business)`** properties: `id` (UUID), `name`, `industry`, `country`, `city`, `website`.
- **`(:Supplier)`** properties: `id`, `name`.
- **`(:Location)`** properties: `id`, `name`, `type`, `latitude`, `longitude`.

### Relationship Edges
- **`[:COMPETES_WITH]`**: Attributes: `overlap_score` (Float).
- **`[:SUPPLIED_BY]`**: Attributes: `reliability` (Float).
- **`[:LOCATED_IN]`**: Standard mapping link to branch office details.

---

## 3. Vector Database Collection (Qdrant)
- **Collection Name:** `bios_knowledge_embeddings`
- **Vector Parameters:** size `384` (using `all-MiniLM-L6-v2`), distance metric `Cosine`.
- **Payload Schema:**
  ```json
  {
    "business_id": "UUID string",
    "name": "Corporate Name",
    "content": "Descriptive text chunks from reports or website crawls"
  }
  ```
