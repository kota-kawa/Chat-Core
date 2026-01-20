import asyncio
import json
import unittest
from unittest.mock import patch

from starlette.requests import Request

from blueprints.admin.views import api_dashboard, api_login, ADMIN_PASSWORD


def make_request(method="GET", path="/admin/api/dashboard", json_body=None, session=None, query_string=b""):
    body = b""
    headers = []
    if json_body is not None:
        body = json.dumps(json_body).encode("utf-8")
        headers = [(b"content-type", b"application/json")]

    scope = {
        "type": "http",
        "asgi": {"spec_version": "2.3", "version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("utf-8"),
        "query_string": query_string,
        "headers": headers,
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
        "session": session or {},
    }

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    return Request(scope, receive)


class AdminApiTestCase(unittest.TestCase):
    def test_dashboard_requires_admin(self):
        request = make_request(session={})
        response = asyncio.run(api_dashboard(request))
        self.assertEqual(response.status_code, 401)
        payload = json.loads(response.body.decode())
        self.assertEqual(payload["status"], "fail")

    def test_login_success(self):
        request = make_request(
            method="POST",
            path="/admin/api/login",
            json_body={"password": ADMIN_PASSWORD, "next": "/admin"},
        )
        response = asyncio.run(api_login(request))
        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.body.decode())
        self.assertEqual(payload["status"], "success")

    def test_dashboard_returns_tables(self):
        class DummyCursor:
            def close(self):
                return None

        class DummyConnection:
            def cursor(self):
                return DummyCursor()

            def close(self):
                return None

        request = make_request(session={"is_admin": True}, query_string=b"table=users")

        with patch("blueprints.admin.views.get_db_connection", return_value=DummyConnection()):
            with patch("blueprints.admin.views._fetch_tables", return_value=["users"]):
                with patch(
                    "blueprints.admin.views._fetch_table_preview",
                    return_value=(["id"], [(1,)]),
                ):
                    with patch(
                        "blueprints.admin.views._fetch_table_columns",
                        return_value=[
                            {
                                "name": "id",
                                "type": "int",
                                "nullable": False,
                                "key": "PRI",
                                "default": None,
                                "extra": "",
                            }
                        ],
                    ):
                        response = asyncio.run(api_dashboard(request))

        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.body.decode())
        self.assertEqual(payload["selected_table"], "users")
        self.assertEqual(payload["column_names"], ["id"])


if __name__ == "__main__":
    unittest.main()
