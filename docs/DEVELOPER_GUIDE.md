# BIOS Developer, Testing & Troubleshooting Guide

This guide is designed to assist software engineers in extending, testing, and debugging BIOS.

---

## 1. Developer Workflows

### Directory Import Principles
All python backend services reside inside `services/` as standard modules using underscores (e.g. `auth_service`, `crawler_service`).
- Internal imports should reference the module root:
  ```python
  from services.auth_service.database import Base
  ```
- To run uvicorn locally for a single service in development:
  ```bash
  python -m uvicorn services.auth_service.main:app --reload --port 8001
  ```

---

## 2. Test Execution & Coverage
We write asynchronous integration test suites under `services/tests/` utilizing `pytest-asyncio` and `httpx.AsyncClient`.

### Run tests:
Activate your virtual environment and run:
```bash
python -m pytest services/tests/
```
Tests automatically spawn an isolated, in-memory SQLite database (`sqlite+aiosqlite:///:memory:`) to verify endpoints, preventing database pollution.

---

## 3. Troubleshooting Protocols

### Common Issue: Port Conflicts
- **Symptom:** Docker containers fail to boot showing `Port already allocated` errors.
- **Fix:** Verify local services running on port `5432` (Postgres) or `6379` (Redis). Stop local service instances before running `docker-compose up`.

### Common Issue: NameError or SyntaxError in Imports
- **Symptom:** Uvicorn throws exceptions on startup regarding folders or dot imports.
- **Fix:** Python prohibits hyphens in module package paths. Ensure all service directories in the workspace use underscores (e.g. `auth_service`).

### Common Issue: 72-Byte Bcrypt limit
- **Symptom:** User logins or registration endpoints crash throwing a `ValueError`.
- **Fix:** Native `bcrypt` packages throw value errors on long strings. Ensure password hashes utilize the custom `bcrypt.hashpw` caller in `security.py` directly, bypassing the deprecated `passlib` wrapper.
