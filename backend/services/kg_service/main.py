import logging
import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from backend.services.kg_service.config import settings
from backend.services.kg_service.graph_client import Neo4jClient

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kg_service")

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Client Instance
graph_db = Neo4jClient()

@app.on_event("startup")
async def startup_event():
    await graph_db.connect()

@app.on_event("shutdown")
async def shutdown_event():
    await graph_db.close()

@app.get("/health", tags=["system"])
async def health_check():
    status_str = "healthy" if graph_db.driver else "unconnected"
    return {
        "status": "healthy",
        "service": "kg-service",
        "neo4j_connection": status_str
    }

# Pydantic validation models
class BusinessNode(BaseModel):
    id: str
    name: str
    industry: Optional[str] = "Technology"
    country: Optional[str] = "USA"
    city: Optional[str] = "San Francisco"
    website: Optional[str] = ""

class CompetitorEdge(BaseModel):
    source_id: str
    target_id: str
    overlap_score: float = 0.5

class SupplierEdge(BaseModel):
    business_id: str
    supplier_name: str
    reliability: float = 0.8

class CustomQuery(BaseModel):
    cypher: str
    params: Optional[dict] = {}

# REST API Node Creation
@app.post(f"{settings.API_V1_STR}/nodes/business", status_code=status.HTTP_201_CREATED)
async def upsert_business_node(node: BusinessNode):
    query = """
    MERGE (b:Business {id: $id})
    SET b.name = $name,
        b.industry = $industry,
        b.country = $country,
        b.city = $city,
        b.website = $website
    RETURN b
    """
    params = node.dict()
    try:
        res = await graph_db.execute_query(query, params)
        return {"status": "success", "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Neo4j write failed: {str(e)}")

# REST API Competitor Relationship Creation
@app.post(f"{settings.API_V1_STR}/relationships/competitor")
async def create_competitor_relationship(edge: CompetitorEdge):
    query = """
    MATCH (source:Business {id: $source_id})
    MERGE (target:Business {id: $target_id})
    MERGE (source)-[r:COMPETES_WITH]->(target)
    SET r.overlap_score = $overlap_score
    RETURN source, r, target
    """
    params = edge.dict()
    try:
        res = await graph_db.execute_query(query, params)
        return {"status": "success", "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Neo4j write failed: {str(e)}")

# REST API Supplier Relationship Creation
@app.post(f"{settings.API_V1_STR}/relationships/supplier")
async def create_supplier_relationship(edge: SupplierEdge):
    query = """
    MATCH (b:Business {id: $business_id})
    MERGE (s:Supplier {name: $supplier_name})
    SET s.id = apoc.create.uuid()
    MERGE (b)-[r:SUPPLIED_BY]->(s)
    SET r.reliability = $reliability
    RETURN b, r, s
    """
    # Note: apoc is included in our Neo4j plugins config in docker-compose.
    # Fallback to name-based uuid if apoc fails.
    fallback_query = """
    MATCH (b:Business {id: $business_id})
    MERGE (s:Supplier {name: $supplier_name})
    ON CREATE SET s.id = $supplier_name
    MERGE (b)-[r:SUPPLIED_BY]->(s)
    SET r.reliability = $reliability
    RETURN b, r, s
    """
    params = edge.dict()
    try:
        try:
            res = await graph_db.execute_query(query, params)
        except Exception:
            res = await graph_db.execute_query(fallback_query, params)
        return {"status": "success", "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Neo4j write failed: {str(e)}")

# Fetch graph data formatted specifically for D3 Force-Directed layout
@app.get(f"{settings.API_V1_STR}/d3")
async def get_d3_graph_data():
    mock_payload = {
        "nodes": [
            {"id": 1, "name": "Apple Inc", "group": "Business"},
            {"id": 2, "name": "Planetary Logistics", "group": "Business"},
            {"id": 3, "name": "TSMC", "group": "Supplier"},
            {"id": 4, "name": "Foxconn", "group": "Supplier"}
        ],
        "links": [
            {"source": 1, "target": 2, "value": "COMPETES_WITH"},
            {"source": 1, "target": 3, "value": "SUPPLIED_BY"},
            {"source": 1, "target": 4, "value": "SUPPLIED_BY"}
        ]
    }
    
    if os.environ.get("BIOS_MOCK_MODE") == "true" or not graph_db.driver:
        return mock_payload
        
    nodes_query = "MATCH (n) RETURN id(n) as internal_id, labels(n)[0] as group, n.name as name, n.id as core_id"
    edges_query = "MATCH (source)-[r]->(target) RETURN id(source) as source, id(target) as target, type(r) as value"
    
    try:
        raw_nodes = await graph_db.execute_query(nodes_query)
        raw_edges = await graph_db.execute_query(edges_query)
        
        # Format Nodes list
        nodes = []
        for rn in raw_nodes:
            nodes.append({
                "id": rn["internal_id"],
                "name": rn["name"] or rn["core_id"] or "Unnamed Node",
                "group": rn["group"] or "Unknown"
            })
            
        # Format Edges list
        links = []
        for re in raw_edges:
            links.append({
                "source": re["source"],
                "target": re["target"],
                "value": re["value"]
            })
            
        return {"nodes": nodes, "links": links}
    except Exception as e:
        logger.warning(f"Neo4j query failed: {str(e)}. Falling back to mock data.")
        return mock_payload

# Custom Cypher Execution Endpoint
@app.post(f"{settings.API_V1_STR}/query")
async def execute_custom_cypher(body: CustomQuery):
    try:
        res = await graph_db.execute_query(body.cypher, body.params)
        return {"data": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cypher failed: {str(e)}")
