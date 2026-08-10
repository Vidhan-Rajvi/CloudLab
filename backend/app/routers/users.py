from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from config.session import get_db
from app.schemas import UserCreate, UserResponse
from app.services.user_service import create_user_record, get_all_users, get_user_by_id
from app.security.deps import get_current_user
from app.security.rate_limiter import check_rate_limit

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
