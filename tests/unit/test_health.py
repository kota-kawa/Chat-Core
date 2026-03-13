import unittest
from unittest.mock import patch

from services.health import get_liveness_status, get_readiness_status


class DummyCursor:
    def execute(self, query):
        self.query = query

    def fetchone(self):
        return (1,)

    def close(self):
        return None


class DummyConnection:
    def cursor(self):
        return DummyCursor()

    def close(self):
        return None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()
        return False


class HealthServiceTestCase(unittest.TestCase):
    def test_liveness_status_is_ok(self):
        self.assertEqual(get_liveness_status(), {"status": "ok"})

    def test_readiness_is_ok_when_dependencies_are_available(self):
        with patch("services.health.get_db_connection", return_value=DummyConnection()):
            with patch("services.health.is_redis_configured", return_value=True):
                with patch("services.health.get_redis_client", return_value=object()):
                    payload, status_code = get_readiness_status()

        self.assertEqual(status_code, 200)
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["components"]["database"]["status"], "ok")
        self.assertEqual(payload["components"]["redis"]["status"], "ok")

    def test_readiness_is_degraded_when_optional_redis_is_unavailable(self):
        with patch("services.health.get_db_connection", return_value=DummyConnection()):
            with patch("services.health.is_redis_configured", return_value=True):
                with patch("services.health.get_redis_client", return_value=None):
                    payload, status_code = get_readiness_status()

        self.assertEqual(status_code, 200)
        self.assertEqual(payload["status"], "degraded")
        self.assertEqual(payload["components"]["redis"]["status"], "degraded")

    def test_readiness_is_error_when_database_is_unavailable(self):
        with patch("services.health.get_db_connection", side_effect=RuntimeError("db down")):
            with patch("services.health.is_redis_configured", return_value=False):
                payload, status_code = get_readiness_status()

        self.assertEqual(status_code, 503)
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["components"]["database"]["status"], "error")


if __name__ == "__main__":
    unittest.main()
