import json
from config.redis import redis_client

USERS_CACHE_KEY = "users:all"
CACHE_TTL = 60

def get_users_cache():
    cached_users = redis_client.get(USERS_CACHE_KEY)
    if cached_users:
        return json.loads(cached_users)
    return None

def set_users_cache(users):
    redis_client.setex(
        USERS_CACHE_KEY,
        CACHE_TTL,
        json.dumps(users)
    )

def clear_users_cache():
    redis_client.delete(USERS_CACHE_KEY)
