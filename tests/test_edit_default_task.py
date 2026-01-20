import asyncio
import json
import unittest
from unittest.mock import patch

from starlette.requests import Request

from blueprints.chat.tasks import edit_task


class FakeCursor:
    def __init__(self):
        self.executed = []
        self._fetchone_result = None

    def execute(self, query, params=None):
        self.executed.append((query, params))
        if "SELECT 1" in query:
            self._fetchone_result = (1,)
        else:
            self._fetchone_result = None

    def fetchone(self):
        result = self._fetchone_result
        self._fetchone_result = None
        return result

    def close(self):
        pass


class FakeConnection:
    def __init__(self):
        self.committed = False
        self.closed = False
        self.cursors = []

    def cursor(self, dictionary=False):
        cursor = FakeCursor()
        self.cursors.append(cursor)
        return cursor

    def commit(self):
        self.committed = True

    def close(self):
        self.closed = True


def make_request(json_body, session=None):
    body = json.dumps(json_body).encode("utf-8")
    scope = {
        "type": "http",
        "asgi": {"spec_version": "2.3", "version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/api/edit_task",
        "raw_path": b"/api/edit_task",
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
        data = body
        body = None
        return {"type": "http.request", "body": data, "more_body": False}

    return Request(scope, receive)


class EditDefaultTaskTestCase(unittest.TestCase):
    def test_editing_copied_default_task_is_allowed(self):
        fake_connection = FakeConnection()
        request = make_request(
            {
                "old_task": "Default Task",
                "new_task": "Updated Task",
                "prompt_template": "Prompt",
                "input_examples": "input",
                "output_examples": "output",
            },
            session={"user_id": 123},
        )

        with patch("blueprints.chat.tasks.get_db_connection", return_value=fake_connection):
            response = asyncio.run(edit_task(request))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(fake_connection.committed)
        self.assertTrue(any("SELECT 1" in query for query, _ in fake_connection.cursors[0].executed))


if __name__ == "__main__":
    unittest.main()
