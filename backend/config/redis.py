import redis

redis_client = redis.Redis(
    host="cloudlab-redis",
    port=6379,
    decode_responses=True
)
