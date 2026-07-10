# Global Business Intelligence Operating System (BIOS)

> **Tagline:** The Operating System for Every Business on Earth.

BIOS continuously collects information from the internet and real-world public sources to create a dynamically updating, predictive Digital Twin of every business. 

---

## 📚 Handover Documentation Directory

Please explore our detailed architecture and implementation manuals below:

1. **[Installation & Local Setup](file:///c:/Users/GeginRisho/OneDrive/Desktop/Global%20Business%20Intelligence%20Operating%20System%20%28BIOS%29/docs/INSTALLATION.md)** - Python venv configurations, test suite triggers, and local database container launches.
2. **[DevOps & Kubernetes Guide](file:///c:/Users/GeginRisho/OneDrive/Desktop/Global%20Business%20Intelligence%20Operating%20System%20%28BIOS%29/docs/DOCKER_K8S.md)** - Dockerfiles specifications, replicas configurations, and cluster ingress controllers.
3. **[API Reference Directory](file:///c:/Users/GeginRisho/OneDrive/Desktop/Global%20Business%20Intelligence%20Operating%20System%20%28BIOS%29/docs/API_REFERENCE.md)** - REST payloads contracts, WebSockets channels, and direct ingest normalizers.
4. **[Database Schemas Specifications](file:///c:/Users/GeginRisho/OneDrive/Desktop/Global%20Business%20Intelligence%20Operating%20System%20%28BIOS%29/docs/DATABASE_SCHEMA.md)** - SQL index maps, Neo4j edges structures, and vector distance metrics.
5. **[AI & Search Engine Architecture](file:///c:/Users/GeginRisho/OneDrive/Desktop/Global%20Business%20Intelligence%20Operating%20System%20%28BIOS%29/docs/AI_ARCHITECT.md)** - 16-agent coordinator swarms, hybrid Reciprocal Rank Fusion, and macro equation rules.
6. **[User & Admin Operating Manuals](file:///c:/Users/GeginRisho/OneDrive/Desktop/Global%20Business%20Intelligence%20Operating%20System%20%28BIOS%29/docs/MANUALS.md)** - Twin claiming guidelines, database health checks, and API Key provisioning rules.
7. **[Developer & Troubleshooting Guide](file:///c:/Users/GeginRisho/OneDrive/Desktop/Global%20Business%20Intelligence%20Operating%20System%20%28BIOS%29/docs/DEVELOPER_GUIDE.md)** - Uvicorn parameters, testing setups, and common ports debugging checks.
8. **[Strategic Future Roadmap](file:///c:/Users/GeginRisho/OneDrive/Desktop/Global%20Business%20Intelligence%20Operating%20System%20%28BIOS%29/docs/ROADMAP.md)** - GNN integrations, zero-knowledge proofs roadmap, and satellite pipelines.

---

## 🛠️ Port Allocations Map

When the databases are spun up locally using Docker, they bind to:
- **PostgreSQL + TimescaleDB**: Port `5432` (Auth & metrics)
- **Neo4j Graph Database**: Port `7474` (Dashboard), `7687` (Bolt API)
- **MongoDB Storage**: Port `27017` (Raw scraped pages)
- **Qdrant Vector Database**: Port `6333` (HTTP), `6334` (gRPC)
- **Elasticsearch Engine**: Port `9200` (Lexical search)
- **Redis Cache Store**: Port `6379` (Session memory)
- **Apache Kafka Broker**: Port `9092` (Inter-service event streams)

---

## 🚀 Quick Local Launch

1. **Spin up database instances:**
   ```bash
   docker-compose up -d
   ```
2. **Configure python environment:**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r services/requirements.txt
   ```
3. **Execute unit & integration tests:**
   ```bash
   python -m pytest services/tests/
   ```
4. **Boot next.js web dashboard:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Explore the visual platform on `http://localhost:3000`.
