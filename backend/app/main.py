from fastapi import FastAPI
from sqlalchemy import text
from config.session import SessionLocal, engine, Base
from app import models
from app.routers import users, auth
from config.redis import redis_client

# Auto-create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CloudLab API",
    description="Backend API for CloudLab Platform",
    version="1.0.0"
)

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)

@app.get("/")
def home():
    return {"message": "🚀 Welcome to CloudLab API"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/db")
def test_database():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"database": "Connected Successfully ✅"}
    except Exception as e:
        return {"database": "Connection Failed ❌", "error": str(e)}
    finally:
        db.close()

@app.get("/redis")
def test_redis():
    try:
        redis_client.set("cloudlab", "Redis Connected Successfully 🚀")
        value = redis_client.get("cloudlab")

        return {
            "status": "Connected",
            "value": value
        }

    except Exception as e:
        return {
            "status": "Failed",
            "error": str(e)
        }
