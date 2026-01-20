import asyncio
import json
import unittest
from unittest.mock import patch

from starlette.requests import Request

from blueprints.auth import api_current_user


def make_request(session=None):
    scope = {
        "type": "http",
        "asgi": {"spec_version": "2.3", "version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/api/current_user",
        "raw_path": b"/api/current_user",
        "query_string": b"",
        "headers": [],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
        "session": session or {},
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    return Request(scope, receive)


class CurrentUserTestCase(unittest.TestCase):
    def test_current_user_logged_out(self):
        request = make_request()
        response = asyncio.run(api_current_user(request))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.body.decode()), {"logged_in": False})

    def test_current_user_logged_in(self):
        request = make_request(session={"user_id": 7})
        with patch("blueprints.auth.get_user_by_id") as mock_get_user:
            mock_get_user.return_value = {"id": 7, "email": "user@example.com"}
            response = asyncio.run(api_current_user(request))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            json.loads(response.body.decode()),
            {"logged_in": True, "user": {"id": 7, "email": "user@example.com"}},
        )


if __name__ == "__main__":
    unittest.main()
