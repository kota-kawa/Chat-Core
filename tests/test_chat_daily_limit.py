import asyncio
import json
import unittest
from unittest.mock import patch

from starlette.requests import Request

from blueprints.chat.messages import chat


def make_request(json_body, session=None):
    body = json.dumps(json_body).encode("utf-8")
    scope = {
        "type": "http",
        "asgi": {"spec_version": "2.3", "version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/api/chat",
        "raw_path": b"/api/chat",
        "query_string": b"",
        "headers": [(b"content-type", b"application/json")],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
        "session": session or {},
    }

    async def receive():
        nonlocal body
        if body is None:
            return {"type": "http.request", "body": b"", "more_body": False}
        current = body
        body = None
        return {"type": "http.request", "body": current, "more_body": False}

    return Request(scope, receive)


class ChatDailyLimitTestCase(unittest.TestCase):
    def test_chat_returns_429_when_global_daily_limit_exceeded(self):
        request = make_request(
            {"message": "こんにちは", "chat_room_id": "default", "model": "gemini-2.5-flash"},
            session={},
        )

        with patch("blueprints.chat.messages.cleanup_ephemeral_chats"):
            with patch("blueprints.chat.messages.ephemeral_store.room_exists", return_value=True):
                with patch("blueprints.chat.messages.ephemeral_store.get_messages", return_value=[]):
                    with patch("blueprints.chat.messages.ephemeral_store.append_message"):
                        with patch(
                            "blueprints.chat.messages.consume_llm_daily_quota",
                            return_value=(False, 0, 300),
                        ):
                            with patch("blueprints.chat.messages.get_gemini_response") as mock_llm:
                                response = asyncio.run(chat(request))

        self.assertEqual(response.status_code, 429)
        payload = json.loads(response.body.decode("utf-8"))
        self.assertIn("上限", payload["error"])
        mock_llm.assert_not_called()


if __name__ == "__main__":
    unittest.main()
