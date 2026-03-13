import logging
import os
import time
from typing import Any

try:
    import redis
except ModuleNotFoundError:  # pragma: no cover - optional for test envs
    redis = None


_redis_client: Any | None = None
_redis_retry_after = 0.0

DEFAULT_REDIS_RETRY_COOLDOWN_SECONDS = 5

logger = logging.getLogger(__name__)


def is_redis_configured() -> bool:
    return bool(os.environ.get("REDIS_URL") or os.environ.get("REDIS_HOST"))


def mark_redis_unavailable(exc: Exception | None = None) -> None:
    global _redis_client, _redis_retry_after
    _redis_client = None
    _redis_retry_after = time.monotonic() + DEFAULT_REDIS_RETRY_COOLDOWN_SECONDS
    if exc is not None:
        logger.warning(
            "Redis is unavailable; falling back to local session/cache behavior for %s seconds.",
            DEFAULT_REDIS_RETRY_COOLDOWN_SECONDS,
            extra={"error_class": exc.__class__.__name__},
        )


def get_redis_client() -> Any | None:
    # Redis 依存がない環境では None を返し、呼び出し側がメモリ実装へフォールバックする
    # Return None when Redis dependency is unavailable so callers can fallback to memory.
    if redis is None:
        return None
    if not is_redis_configured():
        return None

    global _redis_client, _redis_retry_after
    if _redis_client is not None:
        return _redis_client
    if time.monotonic() < _redis_retry_after:
        return None

    # URL 指定を最優先し、未指定時は host/port/db 設定で接続する
    # Prefer REDIS_URL, otherwise build client from host/port/db settings.
    url = os.environ.get("REDIS_URL")
    if url:
        candidate = redis.Redis.from_url(url, decode_responses=True)
    else:
        host = os.environ.get("REDIS_HOST")
        port = int(os.environ.get("REDIS_PORT", "6379"))
        db = int(os.environ.get("REDIS_DB", "0"))
        password = os.environ.get("REDIS_PASSWORD")
        candidate = redis.Redis(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=True,
        )

    try:
        candidate.ping()
    except Exception as exc:
        mark_redis_unavailable(exc)
        return None

    _redis_retry_after = 0.0
    _redis_client = candidate
    return _redis_client
