from __future__ import annotations

from typing import Any

from services.cache import get_redis_client, is_redis_configured
from services.db import get_db_connection


def get_liveness_status() -> dict[str, Any]:
    return {"status": "ok"}


def get_readiness_status() -> tuple[dict[str, Any], int]:
    components: dict[str, dict[str, Any]] = {}
    overall_ok = True
    degraded = False

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            finally:
                cursor.close()
        components["database"] = {"status": "ok", "required": True}
    except Exception as exc:
        overall_ok = False
        components["database"] = {
            "status": "error",
            "required": True,
            "detail": exc.__class__.__name__,
        }

    if is_redis_configured():
        redis_client = get_redis_client()
        if redis_client is None:
            degraded = True
            components["redis"] = {
                "status": "degraded",
                "required": False,
            }
        else:
            components["redis"] = {"status": "ok", "required": False}
    else:
        components["redis"] = {
            "status": "disabled",
            "required": False,
        }

    if overall_ok:
        if degraded:
            return {"status": "degraded", "components": components}, 200
        return {"status": "ok", "components": components}, 200
    return {"status": "error", "components": components}, 503
