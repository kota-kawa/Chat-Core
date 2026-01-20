import os

try:
    import redis
except ModuleNotFoundError:  # pragma: no cover - optional for test envs
    redis = None


_redis_client = None


def get_redis_client():
    if redis is None:
        return None

    global _redis_client
    if _redis_client is not None:
        return _redis_client

    url = os.environ.get("REDIS_URL")
    if url:
        _redis_client = redis.Redis.from_url(url, decode_responses=True)
        return _redis_client

    host = os.environ.get("REDIS_HOST", "redis")
    port = int(os.environ.get("REDIS_PORT", "6379"))
    db = int(os.environ.get("REDIS_DB", "0"))
    password = os.environ.get("REDIS_PASSWORD")
    _redis_client = redis.Redis(
        host=host,
        port=port,
        db=db,
        password=password,
        decode_responses=True,
    )
    return _redis_client
