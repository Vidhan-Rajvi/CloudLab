from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from config.session import get_db
from app.schemas import LoginRequest, Token
from app.services.user_service import get_user_by_email
from app.security.password import verify_password
from app.security.jwt import create_access_token, verify_access_token
from app.security.token_store import revoke_token

router = APIRouter(
    tags=["Authentication"]
)

security = HTTPBearer()


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


@router.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    # Verify token first
    payload = verify_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jti = payload.get("jti")
    expires_at = payload.get("exp")

    if not jti or not expires_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Store revoked token in Redis
    revoke_token(jti, expires_at)

    return {
        "message": "Logged out successfully ✅",
        "token_revoked": True
    }
