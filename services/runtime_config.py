import logging
import os

logger = logging.getLogger(__name__)


def get_runtime_env() -> str:
    runtime_env = os.getenv("FASTAPI_ENV")
    legacy_env = os.getenv("FLASK_ENV")

    if runtime_env:
        if legacy_env and legacy_env != runtime_env:
            logger.warning(
                "Both FASTAPI_ENV and FLASK_ENV are set with different values. "
                "Using FASTAPI_ENV."
            )
        return runtime_env

    if legacy_env:
        logger.warning("FLASK_ENV is deprecated. Use FASTAPI_ENV instead.")
        return legacy_env

    return "development"


def is_production_env() -> bool:
    return get_runtime_env().lower() == "production"


def get_session_secret_key() -> str | None:
    fastapi_secret = os.getenv("FASTAPI_SECRET_KEY")
    legacy_secret = os.getenv("FLASK_SECRET_KEY")

    if fastapi_secret:
        if legacy_secret and legacy_secret != fastapi_secret:
            logger.warning(
                "Both FASTAPI_SECRET_KEY and FLASK_SECRET_KEY are set with "
                "different values. Using FASTAPI_SECRET_KEY."
            )
        return fastapi_secret

    if legacy_secret:
        logger.warning(
            "FLASK_SECRET_KEY is deprecated. Use FASTAPI_SECRET_KEY instead."
        )
        return legacy_secret

    return None
