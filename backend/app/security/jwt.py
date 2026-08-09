from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4
from jose import JWTError, jwt
from app.security.token_store import is_token_revoked

SECRET_KEY = "SUPER_SECRET_CLOUDLAB_KEY_CHANGE_IN_PRODUCTION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()

    # Unique identifier for every JWT
    jti = str(uuid4())
    to_encode["jti"] = jti

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode["exp"] = expire

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")

        # JWT must contain a unique identifier
        if not jti:
            return None

        # Check Redis token blacklist
        if is_token_revoked(jti):
            return None

        return payload
    except JWTError:
        return None
