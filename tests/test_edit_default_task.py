import unittest
from unittest.mock import patch

from app import app


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


class EditDefaultTaskTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    def test_editing_copied_default_task_is_allowed(self):
        fake_connection = FakeConnection()

        with patch("blueprints.chat.tasks.get_db_connection", return_value=fake_connection):
            with self.client.session_transaction() as sess:
                sess["user_id"] = 123

            response = self.client.post(
                "/api/edit_task",
                json={
                    "old_task": "Default Task",
                    "new_task": "Updated Task",
                    "prompt_template": "Prompt",
                    "input_examples": "input",
                    "output_examples": "output",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(fake_connection.committed)
        self.assertTrue(any("SELECT 1" in query for query, _ in fake_connection.cursors[0].executed))


if __name__ == "__main__":
    unittest.main()
