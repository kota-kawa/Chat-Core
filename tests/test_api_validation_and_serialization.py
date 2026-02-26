import asyncio
import json
import unittest
from datetime import datetime
from unittest.mock import patch

from starlette.requests import Request

from blueprints.auth import api_send_login_code
from blueprints.chat.messages import chat
from blueprints.chat.tasks import update_tasks_order
from blueprints.prompt_share.prompt_manage_api import get_my_prompts


def make_request(
    *,
    method: str,
    path: str,
    session=None,
    json_body=None,
    raw_body: bytes | None = None,
):
    if json_body is not None and raw_body is not None:
        raise ValueError("json_body and raw_body are mutually exclusive")

    if json_body is not None:
        body = json.dumps(json_body).encode("utf-8")
    else:
        body = raw_body or b""

    headers = [(b"content-type", b"application/json")]
    scope = {
        "type": "http",
        "asgi": {"spec_version": "2.3", "version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("utf-8"),
        "query_string": b"",
        "headers": headers,
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


class ApiValidationAndSerializationTestCase(unittest.TestCase):
    def test_chat_update_tasks_order_rejects_malformed_json(self):
        request = make_request(
            method="POST",
            path="/api/update_tasks_order",
            session={"user_id": 1},
            raw_body=b"{",
        )

        response = asyncio.run(update_tasks_order(request))

        self.assertEqual(response.status_code, 400)
        payload = json.loads(response.body.decode("utf-8"))
        self.assertEqual(payload["error"], "JSON形式が不正です。")

    def test_auth_send_login_code_rejects_malformed_json_with_fail_status(self):
        request = make_request(
            method="POST",
            path="/api/send_login_code",
            raw_body=b"{",
        )

        response = asyncio.run(api_send_login_code(request))

        self.assertEqual(response.status_code, 400)
        payload = json.loads(response.body.decode("utf-8"))
        self.assertEqual(payload["status"], "fail")
        self.assertEqual(payload["error"], "JSON形式が不正です。")

    def test_chat_missing_ephemeral_room_returns_404_response(self):
        request = make_request(
            method="POST",
            path="/api/chat",
            json_body={"message": "こんにちは", "chat_room_id": "missing-room"},
            session={},
        )

        with patch("blueprints.chat.messages.cleanup_ephemeral_chats"):
            with patch("blueprints.chat.messages.ephemeral_store.room_exists", return_value=False):
                response = asyncio.run(chat(request))

        self.assertEqual(response.status_code, 404)
        payload = json.loads(response.body.decode("utf-8"))
        self.assertEqual(payload["error"], "該当ルームが存在しません")

    def test_prompt_manage_serializes_datetime_consistently(self):
        request = make_request(
            method="GET",
            path="/prompt_manage/api/my_prompts",
            session={"user_id": 99},
        )
        sample_prompts = [
            {
                "id": 1,
                "title": "title",
                "category": "cat",
                "content": "content",
                "input_examples": "",
                "output_examples": "",
                "created_at": datetime(2024, 1, 2, 3, 4, 5),
            }
        ]

        with patch(
            "blueprints.prompt_share.prompt_manage_api._fetch_my_prompts",
            return_value=sample_prompts,
        ):
            response = asyncio.run(get_my_prompts(request))

        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.body.decode("utf-8"))
        self.assertEqual(payload["prompts"][0]["created_at"], "2024-01-02T03:04:05")


if __name__ == "__main__":
    unittest.main()
