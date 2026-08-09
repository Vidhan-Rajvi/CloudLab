from typing import List
from fastapi import APIRouter, HTTPException, status
from config.session import SessionLocal
from app.schemas import UserCreate, UserResponse
from app.services import user_service
from app.utils.cache import (
    get_users_cache,
    set_users_cache,
    clear_users_cache
)

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

        # Invalidate users cache because database changed
        clear_users_cache()

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
    # Try Redis first
    cached_users = get_users_cache()
    if cached_users is not None:
        return cached_users

    # Cache miss -> query PostgreSQL
    db = SessionLocal()
    try:
        users = user_service.get_all_users(db)
        users_data = [
            {
                "id": user.id,
                "name": user.name,
                "email": user.email
            }
            for user in users
        ]

        # Store result in Redis
        set_users_cache(users_data)
        return users_data
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
