from datetime import datetime, timezone
from config.redis import redis_client

TOKEN_BLACKLIST_PREFIX = "auth:revoked:"


def get_blacklist_key(jti: str) -> str:
    return f"{TOKEN_BLACKLIST_PREFIX}{jti}"


def revoke_token(jti: str, expires_at: int) -> None:
    """
    Store a revoked JWT in Redis until the token naturally expires.
    """
    now = datetime.now(timezone.utc).timestamp()
    ttl = int(expires_at - now)

    # Always keep at least 1 second of TTL
    if ttl < 1:
        ttl = 1

    redis_client.setex(
        get_blacklist_key(jti),
        ttl,
        "revoked"
    )


def is_token_revoked(jti: str) -> bool:
    """
    Check whether a JWT has been revoked.
    """
    return redis_client.exists(get_blacklist_key(jti)) == 1
