import os
from typing import Optional

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models import ALL_DOCUMENTS

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("MONGO_DB_NAME", "ecosphere")

client: Optional[AsyncIOMotorClient] = None


async def init_db():
    """Connect to MongoDB and register all Document models with Beanie."""
    global client
    client = AsyncIOMotorClient(MONGO_URI)
    await init_beanie(database=client[DATABASE_NAME], document_models=ALL_DOCUMENTS)


async def close_db():
    if client is not None:
        client.close()
