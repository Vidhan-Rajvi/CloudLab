<<<<<<< HEAD
from typing import List
from fastapi import FastAPI, HTTPException, status
from sqlalchemy import text
from config.session import SessionLocal, engine, Base
from .models import User
from .schemas import UserCreate, UserResponse
=======
from fastapi import FastAPI
from sqlalchemy import text
from config.session import SessionLocal, engine, Base
from app.routers import users
>>>>>>> 14b5503 (Phase 5.6: Refactor backend into professional layered architecture)

# Auto-create database tables
Base.metadata.create_all(bind=engine)

<<<<<<< HEAD
app = FastAPI()

=======
app = FastAPI(
    title="CloudLab API",
    description="Backend API for CloudLab Platform",
    version="1.0.0"
)

# Include Routers
app.include_router(users.router)
>>>>>>> 14b5503 (Phase 5.6: Refactor backend into professional layered architecture)

@app.get("/")
def home():
    return {"message": "🚀 Welcome to CloudLab API"}

<<<<<<< HEAD

=======
>>>>>>> 14b5503 (Phase 5.6: Refactor backend into professional layered architecture)
@app.get("/health")
def health():
    return {"status": "healthy"}

<<<<<<< HEAD

=======
>>>>>>> 14b5503 (Phase 5.6: Refactor backend into professional layered architecture)
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
<<<<<<< HEAD


@app.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate):
    db = SessionLocal()
    try:
        # Check if email already exists in database
        existing_user = db.query(User).filter(User.email == user.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists."
            )

        new_user = User(name=user.name, email=user.email)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {
            "message": "User Created Successfully ✅",
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
        }
    finally:
        db.close()


@app.get("/users", response_model=List[UserResponse])
def get_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        return users
    finally:
        db.close()


@app.get("/users/{user_id}", response_model=UserResponse)
def get_user_by_id(user_id: int):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )
        return user
    finally:
        db.close()
=======
>>>>>>> 14b5503 (Phase 5.6: Refactor backend into professional layered architecture)
