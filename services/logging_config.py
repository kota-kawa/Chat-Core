import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

DEFAULT_LOG_LEVEL = "INFO"
DEFAULT_LOG_DIR = "logs"
DEFAULT_APP_LOG_FILE = "app.log"
DEFAULT_ERROR_LOG_FILE = "error.log"
DEFAULT_LOG_MAX_BYTES = 10 * 1024 * 1024
DEFAULT_LOG_BACKUP_COUNT = 10

APP_LOG_HANDLER_NAME = "chatcore_app_file"
ERROR_LOG_HANDLER_NAME = "chatcore_error_file"
LOG_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"

logger = logging.getLogger(__name__)


def _parse_positive_int_env(env_name: str, default_value: int) -> int:
    raw_value = os.getenv(env_name, str(default_value))
    try:
        parsed_value = int(raw_value)
    except (TypeError, ValueError):
        logger.warning(
            "Invalid %s value '%s'. Falling back to %s.",
            env_name,
            raw_value,
            default_value,
        )
        return default_value

    if parsed_value <= 0:
        logger.warning(
            "Invalid %s value '%s'. Falling back to %s.",
            env_name,
            raw_value,
            default_value,
        )
        return default_value
    return parsed_value


def _replace_named_handler(root_logger: logging.Logger, handler_name: str) -> None:
    for existing_handler in list(root_logger.handlers):
        if getattr(existing_handler, "name", "") == handler_name:
            root_logger.removeHandler(existing_handler)
            existing_handler.close()


def _build_rotating_handler(
    *,
    file_path: Path,
    level: int,
    max_bytes: int,
    backup_count: int,
    handler_name: str,
) -> RotatingFileHandler:
    handler = RotatingFileHandler(
        file_path,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    handler.name = handler_name
    return handler


def configure_logging() -> None:
    log_level_name = os.getenv("LOG_LEVEL", DEFAULT_LOG_LEVEL).upper()
    resolved_log_level = getattr(logging, log_level_name, logging.INFO)

    logging.basicConfig(level=resolved_log_level, format=LOG_FORMAT)
    root_logger = logging.getLogger()
    root_logger.setLevel(resolved_log_level)

    log_dir = Path(os.getenv("LOG_DIR", DEFAULT_LOG_DIR))
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        root_logger.exception("Failed to create log directory: %s", log_dir)
        return

    max_bytes = _parse_positive_int_env("LOG_MAX_BYTES", DEFAULT_LOG_MAX_BYTES)
    backup_count = _parse_positive_int_env("LOG_BACKUP_COUNT", DEFAULT_LOG_BACKUP_COUNT)
    app_log_file = log_dir / os.getenv("APP_LOG_FILE", DEFAULT_APP_LOG_FILE)
    error_log_file = log_dir / os.getenv("ERROR_LOG_FILE", DEFAULT_ERROR_LOG_FILE)

    _replace_named_handler(root_logger, APP_LOG_HANDLER_NAME)
    root_logger.addHandler(
        _build_rotating_handler(
            file_path=app_log_file,
            level=resolved_log_level,
            max_bytes=max_bytes,
            backup_count=backup_count,
            handler_name=APP_LOG_HANDLER_NAME,
        )
    )

    _replace_named_handler(root_logger, ERROR_LOG_HANDLER_NAME)
    root_logger.addHandler(
        _build_rotating_handler(
            file_path=error_log_file,
            level=logging.ERROR,
            max_bytes=max_bytes,
            backup_count=backup_count,
            handler_name=ERROR_LOG_HANDLER_NAME,
        )
    )
