import os
import logging
from datetime import date, datetime, timedelta
from threading import Lock

from services.cache import get_redis_client


DEFAULT_LLM_DAILY_API_LIMIT = 300
LLM_DAILY_API_LIMIT_ENV = "LLM_DAILY_API_LIMIT"
_LLM_DAILY_COUNT_KEY_PREFIX = "llm:daily_api_total"

DEFAULT_AUTH_EMAIL_DAILY_SEND_LIMIT = 50
AUTH_EMAIL_DAILY_SEND_LIMIT_ENV = "AUTH_EMAIL_DAILY_SEND_LIMIT"
_AUTH_EMAIL_DAILY_COUNT_KEY_PREFIX = "auth_email:daily_send_total"

_in_memory_lock = Lock()
_in_memory_daily_counts = {}
logger = logging.getLogger(__name__)


def _get_daily_limit(env_name, default_limit):
    raw_limit = os.environ.get(env_name, str(default_limit))
    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        logger.warning(
            "Invalid %s value '%s'. Falling back to %s.",
            env_name,
            raw_limit,
            default_limit,
        )
        return default_limit
    return max(limit, 0)


def _seconds_until_tomorrow():
    now = datetime.now()
    tomorrow = datetime.combine(now.date() + timedelta(days=1), datetime.min.time())
    seconds = int((tomorrow - now).total_seconds())
    return max(seconds, 1)


def _consume_with_redis(redis_client, redis_key, daily_limit):
    lua_script = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', key) or '0')

if current >= limit then
  return {0, current}
end

current = redis.call('INCR', key)
if current == 1 then
  redis.call('EXPIRE', key, ttl)
end

return {1, current}
"""
    try:
        result = redis_client.eval(lua_script, 1, redis_key, daily_limit, _seconds_until_tomorrow())
        if not isinstance(result, (list, tuple)) or len(result) != 2:
            raise ValueError(f"Unexpected Redis result: {result}")
        allowed = int(result[0]) == 1
        current = int(result[1])
        remaining = max(daily_limit - current, 0)
        return allowed, remaining
    except Exception:
        logger.exception("Redis quota tracking failed; falling back to in-memory.")
        return None


def _consume_with_in_memory(daily_key, current_date, daily_limit):
    with _in_memory_lock:
        date_suffix = f":{current_date}"
        stale_keys = [key for key in _in_memory_daily_counts if not key.endswith(date_suffix)]
        for key in stale_keys:
            _in_memory_daily_counts.pop(key, None)

        current = _in_memory_daily_counts.get(daily_key, 0)
        if current >= daily_limit:
            return False, 0

        current += 1
        _in_memory_daily_counts[daily_key] = current
        remaining = max(daily_limit - current, 0)
        return True, remaining


def _consume_daily_quota(*, key_prefix, env_name, default_limit, current_date=None):
    daily_limit = _get_daily_limit(env_name, default_limit)
    if daily_limit <= 0:
        return False, 0, daily_limit

    today = current_date or date.today().isoformat()
    quota_key = f"{key_prefix}:{today}"

    redis_client = get_redis_client()
    if redis_client is not None:
        redis_result = _consume_with_redis(redis_client, quota_key, daily_limit)
        if redis_result is not None:
            allowed, remaining = redis_result
            return allowed, remaining, daily_limit

    allowed, remaining = _consume_with_in_memory(quota_key, today, daily_limit)
    return allowed, remaining, daily_limit


def get_llm_daily_api_limit():
    return _get_daily_limit(LLM_DAILY_API_LIMIT_ENV, DEFAULT_LLM_DAILY_API_LIMIT)


def get_auth_email_daily_send_limit():
    return _get_daily_limit(
        AUTH_EMAIL_DAILY_SEND_LIMIT_ENV, DEFAULT_AUTH_EMAIL_DAILY_SEND_LIMIT
    )


def consume_llm_daily_quota(current_date=None):
    allowed, remaining, daily_limit = _consume_daily_quota(
        key_prefix=_LLM_DAILY_COUNT_KEY_PREFIX,
        env_name=LLM_DAILY_API_LIMIT_ENV,
        default_limit=DEFAULT_LLM_DAILY_API_LIMIT,
        current_date=current_date,
    )
    return allowed, remaining, daily_limit


def consume_auth_email_daily_quota(current_date=None):
    allowed, remaining, daily_limit = _consume_daily_quota(
        key_prefix=_AUTH_EMAIL_DAILY_COUNT_KEY_PREFIX,
        env_name=AUTH_EMAIL_DAILY_SEND_LIMIT_ENV,
        default_limit=DEFAULT_AUTH_EMAIL_DAILY_SEND_LIMIT,
        current_date=current_date,
    )
    return allowed, remaining, daily_limit
