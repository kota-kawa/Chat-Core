import asyncio
import json
import unittest
from datetime import datetime
from unittest.mock import patch

from blueprints.memo import api_create_memo, api_recent_memos
from tests.helpers.request_helpers import build_request


def make_request(method="GET", path="/memo/api", json_body=None, session=None, query_string=b""):
    return build_request(
        method=method,
        path=path,
        json_body=json_body,
        session=session,
        query_string=query_string,
    )


class MemoApiTestCase(unittest.TestCase):
    def test_recent_memos_serializes(self):
        sample = {
            "id": 1,
            "title": "サンプル",
            "tags": "仕事",
            "created_at": datetime(2024, 1, 1, 9, 30),
            "input_content": "input",
            "ai_response": "response",
        }
        request = make_request(path="/memo/api/recent", query_string=b"limit=5")

        with patch("blueprints.memo._fetch_recent_memos", return_value=[sample]):
            response = asyncio.run(api_recent_memos(request, limit=5))

        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.body.decode())
        self.assertEqual(payload["memos"][0]["created_at"], "2024-01-01 09:30")

    def test_create_memo_requires_response(self):
        request = make_request(method="POST", json_body={"input_content": "x", "ai_response": ""})
        response = asyncio.run(api_create_memo(request))
        self.assertEqual(response.status_code, 400)
        payload = json.loads(response.body.decode())
        self.assertEqual(payload["status"], "fail")

    def test_create_memo_success(self):
        class FakeCursor:
            def execute(self, *args, **kwargs):
                return None

            def fetchone(self):
                return (42,)

            def close(self):
                return None

        class FakeConnection:
            def cursor(self):
                return FakeCursor()

            def commit(self):
                return None

            def close(self):
                return None

        request = make_request(
            method="POST",
            json_body={"input_content": "x", "ai_response": "ok", "title": "", "tags": ""},
        )

        with patch("blueprints.memo.get_db_connection", return_value=FakeConnection()):
            response = asyncio.run(api_create_memo(request))

        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.body.decode())
        self.assertEqual(payload["status"], "success")
        self.assertEqual(payload["memo_id"], 42)


if __name__ == "__main__":
    unittest.main()
