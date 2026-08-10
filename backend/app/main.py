from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from config.session import SessionLocal, engine, Base
from app import models
from app.routers import users, auth, jobs
from config.redis import redis_client

# Auto-create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CloudLab API",
    description="Backend API for CloudLab infrastructure learning platform",
    version="1.0.0"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(jobs.router)


@app.get("/")
def read_root():
    return {
        "message": "Welcome to CloudLab API 🚀",
        "status": "healthy"
    }


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
