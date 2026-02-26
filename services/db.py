import atexit
import os
import threading

try:
    import psycopg2
    from psycopg2 import Error, extras
    from psycopg2.pool import ThreadedConnectionPool
except ModuleNotFoundError:  # pragma: no cover - optional for test envs
    psycopg2 = None
    Error = Exception
    extras = None
    ThreadedConnectionPool = None


_pool_lock = threading.Lock()
_connection_pool = None
_connection_pool_key = None


class _ConnectionProxy:
    """Pooled connection wrapper with dictionary=True cursor support."""

    def __init__(self, connection, connection_pool):
        self._connection = connection
        self._connection_pool = connection_pool
        self._returned = False

    def _ensure_open(self):
        if self._returned or self._connection is None:
            raise RuntimeError("Connection already returned to pool.")

    def cursor(self, *args, **kwargs):
        self._ensure_open()
        dictionary = kwargs.pop("dictionary", False)
        if dictionary:
            if extras is None:
                raise RuntimeError("psycopg2 extras are required for dictionary cursors.")
            kwargs["cursor_factory"] = extras.RealDictCursor
        return self._connection.cursor(*args, **kwargs)

    def close(self):
        if self._returned or self._connection is None:
            return

        connection = self._connection
        connection_pool = self._connection_pool
        self._connection = None
        self._connection_pool = None
        self._returned = True

        close_physical = bool(getattr(connection, "closed", 0))
        if not close_physical:
            try:
                connection.rollback()
            except Exception:
                close_physical = True

        try:
            connection_pool.putconn(connection, close=close_physical)
        except Exception:  # pragma: no cover - depends on env/pool state
            try:
                connection.close()
            except Exception:
                pass

    def __enter__(self):
        self._ensure_open()
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()
        return False

    def __del__(self):  # pragma: no cover - GC timing is nondeterministic
        try:
            self.close()
        except Exception:
            pass

    def __getattr__(self, name):
        self._ensure_open()
        return getattr(self._connection, name)


def _get_env(name, fallback_name, default):
    value = os.environ.get(name)
    if value:
        return value
    value = os.environ.get(fallback_name)
    if value:
        return value
    return default


def _get_db_hosts():
    env_host = os.environ.get("POSTGRES_HOST") or os.environ.get("MYSQL_HOST")
    if env_host:
        hosts = [host.strip() for host in env_host.split(",") if host.strip()]
        # If a single docker-compose host is provided, add safe local fallbacks.
        if len(hosts) == 1 and hosts[0] == "db":
            hosts.extend(["localhost", "127.0.0.1", "host.docker.internal"])
        return hosts
    # Prefer docker-compose's default service name but allow local dev fallback.
    return ["db", "localhost", "127.0.0.1", "host.docker.internal"]


def _get_db_config():
    user = _get_env("POSTGRES_USER", "MYSQL_USER", None)
    password = _get_env("POSTGRES_PASSWORD", "MYSQL_PASSWORD", None)
    dbname = _get_env("POSTGRES_DB", "MYSQL_DATABASE", None)

    if not all([user, password, dbname]):
        raise ValueError("Database configuration (USER, PASSWORD, DB) must be set in environment variables.")

    return {
        "host": _get_env("POSTGRES_HOST", "MYSQL_HOST", "db"),
        "user": user,
        "password": password,
        "dbname": dbname,
        "port": int(_get_env("POSTGRES_PORT", "MYSQL_PORT", "5432")),
    }


def _get_pool_bounds():
    min_conn = int(os.environ.get("DB_POOL_MIN_CONN", "1"))
    max_conn = int(os.environ.get("DB_POOL_MAX_CONN", "10"))
    if min_conn < 1:
        raise ValueError("DB_POOL_MIN_CONN must be >= 1.")
    if max_conn < min_conn:
        raise ValueError("DB_POOL_MAX_CONN must be >= DB_POOL_MIN_CONN.")
    return min_conn, max_conn


def _build_pool_key(config, hosts, min_conn, max_conn):
    return (
        tuple(hosts),
        config["user"],
        config["password"],
        config["dbname"],
        config["port"],
        min_conn,
        max_conn,
    )


def _build_connection_pool(config, hosts, min_conn, max_conn):
    if ThreadedConnectionPool is None:
        raise RuntimeError("psycopg2 ThreadedConnectionPool is required to connect to the database.")

    first_exc = None
    for host in hosts:
        candidate_config = dict(config)
        candidate_config["host"] = host
        pool_instance = None
        try:
            pool_instance = ThreadedConnectionPool(min_conn, max_conn, **candidate_config)
            validation_conn = pool_instance.getconn()
            pool_instance.putconn(validation_conn)
            return pool_instance
        except Exception as exc:  # pragma: no cover - depends on env
            if first_exc is None:
                first_exc = exc
            if pool_instance is not None:
                try:
                    pool_instance.closeall()
                except Exception:
                    pass
            continue

    if first_exc is not None:
        raise first_exc
    raise RuntimeError("Database connection pool initialization failed without an exception.")


def _get_connection_pool():
    global _connection_pool, _connection_pool_key

    config = _get_db_config()
    hosts = _get_db_hosts()
    min_conn, max_conn = _get_pool_bounds()
    pool_key = _build_pool_key(config, hosts, min_conn, max_conn)
    old_pool = None
    new_pool = None

    with _pool_lock:
        if _connection_pool is not None and _connection_pool_key == pool_key:
            return _connection_pool

        old_pool = _connection_pool
        new_pool = _build_connection_pool(config, hosts, min_conn, max_conn)
        _connection_pool = new_pool
        _connection_pool_key = pool_key

    if old_pool is not None:
        try:
            old_pool.closeall()
        except Exception:
            pass

    return new_pool


def close_db_pool():
    """Close all pooled DB connections."""
    global _connection_pool, _connection_pool_key

    with _pool_lock:
        pool_instance = _connection_pool
        _connection_pool = None
        _connection_pool_key = None

    if pool_instance is None:
        return

    try:
        pool_instance.closeall()
    except Exception:  # pragma: no cover - depends on env
        pass


atexit.register(close_db_pool)


def get_db_connection():
    """PostgreSQL への接続を返す (connection pool backed)."""
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required to connect to the database.")

    connection_pool = _get_connection_pool()
    connection = connection_pool.getconn()
    return _ConnectionProxy(connection, connection_pool)
