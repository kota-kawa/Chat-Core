import unittest
from unittest.mock import patch

from services.default_tasks import (
    default_task_payloads,
    default_task_rows,
    ensure_default_tasks_seeded,
)


class FakeCursor:
    def __init__(self, *, existing_names=None):
        self.existing_names = set(existing_names or [])
        self.inserted_names = []
        self.executed_queries = []
        self._fetchall_result = []
        self.closed = False

    def execute(self, query, params=None):
        normalized = " ".join(query.split())
        self.executed_queries.append((normalized, params))

        if "SELECT name FROM task_with_examples WHERE user_id IS NULL" in normalized:
            self._fetchall_result = [(name,) for name in sorted(self.existing_names)]
            return

        if "INSERT INTO task_with_examples" in normalized:
            name = params[0]
            self.inserted_names.append(name)
            self.existing_names.add(name)

    def fetchall(self):
        result = self._fetchall_result
        self._fetchall_result = []
        return result

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


SAMPLE_TASKS = [
    {
        "name": "Task A",
        "prompt_template": "Prompt A",
        "input_examples": "Input A",
        "output_examples": "Output A",
        "display_order": 0,
    },
    {
        "name": "Task B",
        "prompt_template": "Prompt B",
        "input_examples": "Input B",
        "output_examples": "Output B",
        "display_order": 1,
    },
]


class DefaultTasksTestCase(unittest.TestCase):
    def test_payloads_and_rows_are_derived_from_shared_data(self):
        with patch("services.default_tasks.load_default_tasks", return_value=SAMPLE_TASKS):
            payloads = default_task_payloads()
            rows = default_task_rows()

        self.assertEqual(len(payloads), 2)
        self.assertTrue(all(payload["is_default"] for payload in payloads))
        self.assertEqual(payloads[0]["name"], "Task A")
        self.assertEqual(rows[0], ("Task A", "Prompt A", "Input A", "Output A", 0))

    def test_seed_inserts_missing_default_tasks(self):
        fake_cursor = FakeCursor(existing_names=[])
        fake_conn = FakeConnection(fake_cursor)

        with patch("services.default_tasks.get_db_connection", return_value=fake_conn), patch(
            "services.default_tasks.load_default_tasks", return_value=SAMPLE_TASKS
        ):
            inserted = ensure_default_tasks_seeded()

        self.assertEqual(inserted, len(SAMPLE_TASKS))
        self.assertEqual(fake_cursor.inserted_names, ["Task A", "Task B"])
        self.assertTrue(fake_conn.committed)
        self.assertFalse(fake_conn.rolled_back)
        self.assertTrue(fake_cursor.closed)
        self.assertTrue(fake_conn.closed)

    def test_seed_skips_when_default_tasks_already_exist(self):
        existing_names = {task["name"] for task in SAMPLE_TASKS}
        fake_cursor = FakeCursor(existing_names=existing_names)
        fake_conn = FakeConnection(fake_cursor)

        with patch("services.default_tasks.get_db_connection", return_value=fake_conn), patch(
            "services.default_tasks.load_default_tasks", return_value=SAMPLE_TASKS
        ):
            inserted = ensure_default_tasks_seeded()

        self.assertEqual(inserted, 0)
        self.assertEqual(fake_cursor.inserted_names, [])
        self.assertFalse(fake_conn.committed)
        self.assertFalse(fake_conn.rolled_back)
        self.assertTrue(fake_cursor.closed)
        self.assertTrue(fake_conn.closed)


if __name__ == "__main__":
    unittest.main()
