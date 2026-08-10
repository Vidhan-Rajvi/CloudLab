import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config.session import get_db
from app.schemas import UserCreate, UserResponse
from app.services.user_service import create_user_record, get_all_users, get_user_by_id
from app.security.deps import get_current_user
from app.security.rate_limiter import check_rate_limit
from app.utils.lock import acquire_lock, release_lock

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    return create_user_record(db=db, user=user)


@router.get(
    "",
    response_model=List[UserResponse],
    dependencies=[Depends(check_rate_limit)]
)
def read_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_all_users(db=db)


@router.post("/lock-test")
def lock_test(current_user: dict = Depends(get_current_user)):
    lock_name = "user-operation"
    lock_token = acquire_lock(lock_name)

    if lock_token is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Another operation is already in progress."
        )

    try:
        time.sleep(5)
        return {
            "message": "Distributed lock acquired successfully 🔒",
            "status": "operation completed"
        }
    finally:
        release_lock(lock_name, lock_token)


@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_user = get_user_by_id(db=db, user_id=user_id)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return db_user
