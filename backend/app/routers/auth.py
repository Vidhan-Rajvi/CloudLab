from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from config.session import get_db
from app.schemas import LoginRequest, Token
from app.services.user_service import get_user_by_email
from app.security.password import verify_password
from app.security.jwt import create_access_token

router = APIRouter(
    tags=["Authentication"]
)

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    # 1. Fetch user by email
    user = get_user_by_email(db, email=login_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # 2. Verify password against hash stored in db
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # 3. Generate JWT Token
    access_token = create_access_token(data={"sub": user.email, "user_id": user.id})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
