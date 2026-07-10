# BIOS AI Multi-Agent & RAG Architecture

This document explains our agent-based workflows, vector-lexical retrievers, and forecasting mathematics.

---

## 1. 16-Agent LangGraph Swarm Orchestration

We organize our AI modules using a hierarchical **Coordinator-Executor** architecture. 

```
[User Request] 
      │
      ▼
┌────────────────────────────────────────────────────────┐
│                   Coordinator Agent                    │
│  (Orchestrates routing flow, compiles final reports)   │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌────────────────────────┐  ┌────────────────────────┐
│     Planner Agent      │  │     Executor Agent     │
│ (Splits query targets) │  │ (Dispatches task jobs) │
└────────────┬───────────┘  └────────────┬───────────┘
             │                           │
   ┌─────────┴─────────┐       ┌─────────┴─────────┐
   ▼                   ▼       ▼                   ▼
┌──────────────┐ ┌───────────┐ ┌──────────────┐ ┌──────────┐
│Research Agent│ │Crawler Svc│ │Prediction Svc│ │Risk Svc  │
└──────────────┘ └───────────┘ └──────────────┘ └──────────┘
```

### Swarm Execution Stages:
1. **Coordinator** ingests query, logs session state via **Memory Agent**.
2. **Planner** creates steps (e.g. scrape website, verify supply links, compute trends).
3. **Crawler/Research** nodes execute data gathers, writing raw docs to MongoDB.
4. **Knowledge Agent** syncs nodes and edges to Neo4j.
5. **Prediction/Risk/Finance/Growth** nodes process TimescaleDB metric streams.
6. **Reflection/Evaluator** checks numbers against standard error margins (±3.4%).
7. **Coordinator** returns compiled brief reports.

---

## 2. Hybrid Graph RAG Search Engine
We merge two distinct retrieval paths using **Reciprocal Rank Fusion (RRF)**:
1. **Lexical Retrieval:** Elasticsearch matches keywords across indexing fields (`name`, `content`, `industry`).
2. **Semantic Retrieval:** Qdrant checks Cosine similarity on 384-dimension vector embeddings.

### RRF Ranking Formula:
$$RRF\_Score(d) = \sum_{m \in M} \frac{1}{60 + r_m(d)}$$
Where $r_m(d)$ represents the ordinal rank of document $d$ in search provider $m$. This fuses results correctly without requiring unified score calibration!

---

## 3. Macroeconomic Simulation Mathematics
The **Simulation Engine** executes shocks modeled over time horizons ($T$ months):
- **Hyper-Inflation Shock:**
  $$Cost_t = Cost_{t-1} \times 1.15$$
  $$Revenue_t = Revenue_{t-1} \times (1.0 - 0.015)$$
- **Recession Shock:**
  $$Revenue_t = Revenue_{t-1} \times (1.0 - 0.035)$$
  $$Cash_t = Cash_{t-1} + (Revenue_t - Cost_t)$$
These state equations evaluate monthly cash decays and estimate risk indexes.
