# BIOS Installation & Setup Guide

This document describes how to configure, boot, and verify the BIOS platform locally.

---

## 1. Prerequisites
Ensure your system meets the following version configurations:
- **Operating System:** Windows 10/11, macOS 12+, or Ubuntu 20.04+
- **Docker Desktop:** Version `24.0.0` or higher
- **Python:** Version `3.10` or `3.11`
- **Node.js:** Version `18` or `20` (includes npm `9` or `10`)

---

## 2. Python Virtual Environment Setup

1. **Clone or navigate to the workspace root directory:**
   ```powershell
   cd "c:\Users\GeginRisho\OneDrive\Desktop\Global Business Intelligence Operating System (BIOS)"
   ```
2. **Create a Python virtual environment:**
   ```powershell
   python -m venv venv
   ```
3. **Activate the virtual environment:**
   - **Windows PowerShell:**
     ```powershell
     .\venv\Scripts\activate
     ```
   - **Linux/macOS Bash:**
     ```bash
     source venv/bin/activate
     ```
4. **Install service dependencies:**
   ```bash
   pip install -r services/requirements.txt
   ```

---

## 3. Database Services Setup (Docker Compose)
We bundle a multi-database container structure to manage unstructured records, graphs, vectors, and event streams.

1. **Boot all containerized databases in background mode:**
   ```bash
   docker-compose up -d
   ```
2. **Validate container states:**
   ```bash
   docker ps
   ```
   Verify that `bios-postgres`, `bios-neo4j`, `bios-mongodb`, `bios-qdrant`, `bios-elasticsearch`, `bios-redis`, and `bios-kafka` show status `Up`.

---

## 4. Frontend Application Boot
1. **Navigate to the frontend portal directory:**
   ```bash
   cd frontend
   ```
2. **Install node package modules:**
   ```bash
   npm install
   ```
3. **Boot the Next.js development server:**
   ```bash
   npm run dev
   ```
4. **Access the portal:** Open `http://localhost:3000` in your web browser.

---

## 5. Local Setup Verification Checklist

- [ ] Docker engine is active and container daemons are running.
- [ ] Database credentials in `.env` match ports mapped in `docker-compose.yml`.
- [ ] Python packages installed successfully inside `.venv`.
- [ ] Backend test suite running via `python -m pytest services/tests/` passes.
- [ ] Next.js client renders without script compiler warnings on port 3000.
- [ ] Direct crawler normalizer endpoints respond with success JSON frames on test inputs.
