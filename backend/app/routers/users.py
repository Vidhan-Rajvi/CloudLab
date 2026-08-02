from typing import List
from fastapi import APIRouter, HTTPException, status
from config.session import SessionLocal
from app.schemas import UserCreate, UserResponse
from app.services import user_service

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate):
    db = SessionLocal()
    try:
        existing_user = user_service.get_user_by_email(db, user.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists."
            )

        new_user = user_service.create_user_record(db, user)
        return {
            "message": "User Created Successfully ✅",
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
        }
    finally:
        db.close()

@router.get("", response_model=List[UserResponse])
def get_users():
    db = SessionLocal()
    try:
        return user_service.get_all_users(db)
    finally:
        db.close()

@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(user_id: int):
    db = SessionLocal()
    try:
        user = user_service.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )
        return user
    finally:
        db.close()
