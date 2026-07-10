import logging
import asyncio
from neo4j import GraphDatabase, AsyncGraphDatabase
from backend.services.kg_service.config import settings

logger = logging.getLogger("graph_client")

class Neo4jClient:
    def __init__(self):
        self.driver = None

    async def connect(self):
        try:
            self.driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            logger.info("Connected to Neo4j database successfully.")
            # Launch constraints creation as background task to avoid blocking uvicorn startup
            asyncio.create_task(self.initialize_constraints())
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {str(e)}")
            self.driver = None

    async def close(self):
        if self.driver:
            await self.driver.close()
            logger.info("Neo4j driver connection closed.")

    async def initialize_constraints(self):
        if not self.driver:
            return
        
        # Create unique constraints
        constraints = [
            "CREATE CONSTRAINT business_id_unique IF NOT EXISTS FOR (b:Business) REQUIRE b.id IS UNIQUE",
            "CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT supplier_id_unique IF NOT EXISTS FOR (s:Supplier) REQUIRE s.id IS UNIQUE",
            "CREATE CONSTRAINT location_id_unique IF NOT EXISTS FOR (l:Location) REQUIRE l.id IS UNIQUE"
        ]
        
        async with self.driver.session() as session:
            for query in constraints:
                try:
                    await session.run(query)
                except Exception as e:
                    logger.warning(f"Error creating constraint: {str(e)}")

    async def execute_query(self, cypher: str, parameters: dict = None) -> list:
        if not self.driver:
            logger.warning("Neo4j driver not connected. Returning empty query set.")
            return []
            
        async with self.driver.session() as session:
            try:
                result = await session.run(cypher, parameters or {})
                records = []
                async for record in result:
                    records.append(record.data())
                return records
            except Exception as e:
                logger.error(f"Cypher execution error: {str(e)}")
                raise
