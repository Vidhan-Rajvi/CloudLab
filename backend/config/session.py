import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Uses your environment variables from .env
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://cloudlab:cloudlab123@postgres:5432/cloudlab_db"
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for SQLAlchemy models
Base = declarative_base()
