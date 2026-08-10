from fastapi import HTTPException, Request, status
from config.redis import redis_client

RATE_LIMIT = 10
RATE_WINDOW = 60


def check_rate_limit(request: Request):
    """
    Allow a maximum of RATE_LIMIT requests
    from a client IP within RATE_WINDOW seconds.
    """
    client_ip = request.client.host if request.client else "unknown"
    redis_key = f"rate_limit:{client_ip}"

    current_count = redis_client.incr(redis_key)

    if current_count == 1:
        redis_client.expire(redis_key, RATE_WINDOW)

    if current_count > RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(RATE_WINDOW)}
        )

    return True
