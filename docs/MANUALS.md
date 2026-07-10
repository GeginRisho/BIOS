# BIOS User & Admin Manuals

This document guides users and administrators through operating the BIOS platform.

---

## 1. User Manual

### Twin Claiming & Profile Updates
1. Go to **Planetary Map** view.
2. Search for your corporate entity name in the directory.
3. Select your twin to open the profile page.
4. Click **Claim Business Twin**. This updates `businesses.claimed_by` in the directory database and tags your profile as verified.

### Strategic Trend Simulations
1. Go to **Simulation & Trends** tab.
2. Select your desired business profile.
3. Select the target scenario shock (recession, hyper-inflation, supply shortage).
4. Select the time horizon (e.g. 12 months) and click **Execute Simulator**. The chart will plot the estimated cash holding reserves and revenue curves.

### Interacting with the AI Agent Swarm
1. Go to **AI Agent Swarm** console.
2. Enter custom natural language commands (e.g., "Suggest cost optimizations for Apple Inc under a simulated recession scenario").
3. Click **Query Swarm**. The page will trace step-by-step logs from our 16 orchestrator agents as they coordinate research.

---

## 2. Admin Manual

### Monitoring Infrastructure Status
- Navigating to **Super Admin Settings** page lists container ports health indicators for all active engines (PostgreSQL, Neo4j, MongoDB, Qdrant).
- If any database indicator blinks red, verify database service logs:
  ```bash
  docker-compose logs <database-service-name>
  ```

### API Access Key Management
1. To provision external developer credentials, navigate to the **Settings** panel.
2. Click **Copy Key** on the primary access token block.
3. This token acts as a master JWT bearer token, allowing third-party API nodes to push raw ingestion logs to our queues. Keep it secure!
