import os

try:
    import psycopg2
    from psycopg2 import Error, extras
except ModuleNotFoundError:  # pragma: no cover - optional for test envs
    psycopg2 = None
    Error = Exception
    extras = None


class _ConnectionProxy:
    """psycopg2 connection wrapper to support dictionary=True cursors."""

    def __init__(self, connection):
        self._connection = connection

    def cursor(self, *args, **kwargs):
        dictionary = kwargs.pop("dictionary", False)
        if dictionary:
            if extras is None:
                raise RuntimeError("psycopg2 extras are required for dictionary cursors.")
            kwargs["cursor_factory"] = extras.RealDictCursor
        return self._connection.cursor(*args, **kwargs)

    def __getattr__(self, name):
        return getattr(self._connection, name)


def _get_env(name, fallback_name, default):
    value = os.environ.get(name)
    if value:
        return value
    value = os.environ.get(fallback_name)
    if value:
        return value
    return default


def _get_db_config():
    return {
        "host": _get_env("POSTGRES_HOST", "MYSQL_HOST", "db"),
        "user": _get_env("POSTGRES_USER", "MYSQL_USER", "chatuser"),
        "password": _get_env("POSTGRES_PASSWORD", "MYSQL_PASSWORD", "chatpass"),
        "dbname": _get_env("POSTGRES_DB", "MYSQL_DATABASE", "chat_db"),
        "port": int(_get_env("POSTGRES_PORT", "MYSQL_PORT", "5432")),
    }


def get_db_connection():
    """PostgreSQLへの接続を返す"""
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required to connect to the database.")
    connection = psycopg2.connect(**_get_db_config())
    return _ConnectionProxy(connection)
