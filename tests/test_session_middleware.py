import asyncio
import json
import unittest
from http.cookies import SimpleCookie
from unittest.mock import patch

from itsdangerous import URLSafeSerializer

from services.session_middleware import PermanentSessionMiddleware


class DummyRedis:
    def __init__(self):
        self.store = {}
        self.expiry = {}

    def get(self, key):
        return self.store.get(key)

    def set(self, key, value, ex=None):
        self.store[key] = value
        if ex is not None:
            self.expiry[key] = ex
        return True

    def delete(self, key):
        if key in self.store:
            del self.store[key]
            return 1
        return 0


def make_scope(cookie_header=None):
    headers = []
    if cookie_header:
        headers.append((b"cookie", cookie_header.encode("latin-1")))
    return {
        "type": "http",
        "asgi": {"spec_version": "2.3", "version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/",
        "raw_path": b"/",
        "query_string": b"",
        "headers": headers,
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }


async def receive():
    return {"type": "http.request", "body": b"", "more_body": False}


class RedisSessionMiddlewareTest(unittest.TestCase):
    def test_session_roundtrip_via_redis(self):
        dummy_redis = DummyRedis()
        captured = {}

        async def app(scope, receive, send):
            scope["session"]["foo"] = "bar"
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b"ok"})

        with patch("services.session_middleware.get_redis_client", return_value=dummy_redis):
            middleware = PermanentSessionMiddleware(app, secret_key="secret", max_age=60)
            messages = []

            async def send(message):
                messages.append(message)

            asyncio.run(middleware(make_scope(), receive, send))

        header_values = [
            value.decode("latin-1")
            for message in messages
            if message["type"] == "http.response.start"
            for key, value in message["headers"]
            if key.lower() == b"set-cookie"
        ]
        self.assertTrue(header_values)

        cookie = SimpleCookie()
        cookie.load(header_values[0])
        signed = cookie["session"].value

        serializer = URLSafeSerializer("secret", salt="strike.session")
        session_id = serializer.loads(signed)
        payload = dummy_redis.get(f"session:{session_id}")
        self.assertEqual(json.loads(payload)["foo"], "bar")

        async def app_read(scope, receive, send):
            captured["session"] = dict(scope["session"])
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b"ok"})

        with patch("services.session_middleware.get_redis_client", return_value=dummy_redis):
            middleware = PermanentSessionMiddleware(app_read, secret_key="secret", max_age=60)
            messages = []

            async def send(message):
                messages.append(message)

            asyncio.run(middleware(make_scope(f"session={signed}"), receive, send))

        self.assertEqual(captured["session"]["foo"], "bar")


if __name__ == "__main__":
    unittest.main()
