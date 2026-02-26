import asyncio
import json
import unittest
from unittest.mock import patch

from starlette.requests import Request

from blueprints.chat.tasks import add_task
from blueprints.prompt_share.prompt_share_api import create_prompt


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


class PayloadValidationRoutesTestCase(unittest.TestCase):
    def test_add_task_rejects_blank_title_after_strip(self):
        request = make_request(
            "/api/add_task",
            {"title": "   ", "prompt_content": "有効", "input_examples": "", "output_examples": ""},
            session={"user_id": 1},
        )

        with patch("blueprints.chat.tasks._add_task_for_user") as mock_add:
            response = asyncio.run(add_task(request))

        self.assertEqual(response.status_code, 400)
        payload = json.loads(response.body.decode("utf-8"))
        self.assertEqual(payload["error"], "タイトルとプロンプト内容は必須です。")
        mock_add.assert_not_called()

    def test_create_prompt_rejects_blank_required_category(self):
        request = make_request(
            "/prompt_share/api/prompts",
            {
                "title": "title",
                "category": "   ",
                "content": "content",
                "author": "author",
            },
            session={"user_id": 1},
        )

        with patch("blueprints.prompt_share.prompt_share_api._create_prompt_for_user") as mock_create:
            response = asyncio.run(create_prompt(request))

        self.assertEqual(response.status_code, 400)
        payload = json.loads(response.body.decode("utf-8"))
        self.assertEqual(payload["error"], "必要なフィールドが不足しています。")
        mock_create.assert_not_called()


if __name__ == "__main__":
    unittest.main()
