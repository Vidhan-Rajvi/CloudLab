import os
from sqlalchemy import create_engine

# Read DATABASE_URL from .env or fallback to container network service name
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg://cloudlab:cloudlab123@postgres:5432/cloudlab_db"
)

engine = create_engine(DATABASE_URL)
