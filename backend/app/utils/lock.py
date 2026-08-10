import uuid
from config.redis import redis_client

LOCK_PREFIX = "cloudlab:lock:"
LOCK_TTL = 30


def acquire_lock(lock_name: str) -> str | None:
    """
    Attempt to acquire a Redis distributed lock.

    Returns:
        Lock token string if acquired.
        None if the lock is already held.
    """
    lock_key = f"{LOCK_PREFIX}{lock_name}"
    lock_token = str(uuid.uuid4())

    acquired = redis_client.set(
        lock_key,
        lock_token,
        nx=True,
        ex=LOCK_TTL
    )

    if acquired:
        return lock_token

    return None


def release_lock(lock_name: str, lock_token: str) -> bool:
    """
    Release the Redis lock only if the token matches.
    Prevents one process from releasing another process's lock.
    """
    lock_key = f"{LOCK_PREFIX}{lock_name}"
    current_token = redis_client.get(lock_key)

    if current_token == lock_token:
        redis_client.delete(lock_key)
        return True

    return False
