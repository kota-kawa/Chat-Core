import asyncio
import json
import unittest
from unittest.mock import patch

from starlette.requests import Request

from blueprints.auth import api_send_login_code
from blueprints.verification import api_send_verification_email


def make_request(path, json_body, session=None):
    body = json.dumps(json_body).encode("utf-8")
    scope = {
        "type": "http",
        "asgi": {"spec_version": "2.3", "version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("utf-8"),
        "query_string": b"",
        "headers": [(b"content-type", b"application/json")],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
        "session": session or {},
    }

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    return Request(scope, receive)


class AuthEmailLimitRoutesTestCase(unittest.TestCase):
    def test_send_login_code_returns_429_when_daily_limit_exceeded(self):
        request = make_request("/api/send_login_code", {"email": "user@example.com"})

        with patch(
            "blueprints.auth.get_user_by_email",
            return_value={"id": 1, "email": "user@example.com", "is_verified": True},
        ):
            with patch(
                "blueprints.auth.consume_auth_email_daily_quota",
                return_value=(False, 0, 50),
            ):
                with patch("blueprints.auth.send_email") as mock_send_email:
                    response = asyncio.run(api_send_login_code(request))

        self.assertEqual(response.status_code, 429)
        payload = json.loads(response.body.decode("utf-8"))
        self.assertEqual(payload["status"], "fail")
        self.assertIn("上限", payload["error"])
        mock_send_email.assert_not_called()

    def test_send_verification_email_returns_429_when_daily_limit_exceeded(self):
        request = make_request("/api/send_verification_email", {"email": "new-user@example.com"})

        with patch(
            "blueprints.verification.consume_auth_email_daily_quota",
            return_value=(False, 0, 50),
        ):
            with patch("blueprints.verification.send_email") as mock_send_email:
                response = asyncio.run(api_send_verification_email(request))

        self.assertEqual(response.status_code, 429)
        payload = json.loads(response.body.decode("utf-8"))
        self.assertEqual(payload["status"], "fail")
        self.assertIn("上限", payload["error"])
        mock_send_email.assert_not_called()


if __name__ == "__main__":
    unittest.main()
