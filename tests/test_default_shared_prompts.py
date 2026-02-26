import unittest
from unittest.mock import patch

from services.default_shared_prompts import (
    DEFAULT_SHARED_PROMPTS,
    ensure_default_shared_prompts,
)


class FakeCursor:
    def __init__(self, *, owner_id=None, existing_prompt_titles=None):
        self.owner_id = owner_id
        self.existing_prompt_titles = set(existing_prompt_titles or [])
        self.inserted_prompts = []
        self.executed_queries = []
        self._fetchone_result = None
        self.closed = False

    def execute(self, query, params=None):
        normalized = " ".join(query.split())
        self.executed_queries.append((normalized, params))

        if "SELECT id FROM users WHERE email = %s" in normalized:
            self._fetchone_result = (self.owner_id,) if self.owner_id is not None else None
            return

        if "INSERT INTO users" in normalized and "RETURNING id" in normalized:
            self.owner_id = 999
            self._fetchone_result = (self.owner_id,)
            return

        if "SELECT 1 FROM prompts" in normalized and "title = %s" in normalized:
            title = params[1]
            self._fetchone_result = (1,) if title in self.existing_prompt_titles else None
            return

        if "INSERT INTO prompts" in normalized:
            title = params[1]
            self.inserted_prompts.append(title)
            self.existing_prompt_titles.add(title)
            self._fetchone_result = None
            return

        self._fetchone_result = None

    def fetchone(self):
        result = self._fetchone_result
        self._fetchone_result = None
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


class DefaultSharedPromptsTestCase(unittest.TestCase):
    def test_inserts_samples_when_they_are_missing(self):
        fake_cursor = FakeCursor()
        fake_conn = FakeConnection(fake_cursor)

        with patch("services.default_shared_prompts.get_db_connection", return_value=fake_conn):
            inserted = ensure_default_shared_prompts()

        self.assertEqual(inserted, len(DEFAULT_SHARED_PROMPTS))
        self.assertTrue(fake_conn.committed)
        self.assertFalse(fake_conn.rolled_back)
        self.assertTrue(fake_conn.closed)
        self.assertTrue(fake_cursor.closed)
        self.assertEqual(len(fake_cursor.inserted_prompts), len(DEFAULT_SHARED_PROMPTS))
        self.assertIsNotNone(fake_cursor.owner_id)

    def test_skips_when_all_samples_already_exist(self):
        existing_titles = {prompt["title"] for prompt in DEFAULT_SHARED_PROMPTS}
        fake_cursor = FakeCursor(owner_id=999, existing_prompt_titles=existing_titles)
        fake_conn = FakeConnection(fake_cursor)

        with patch("services.default_shared_prompts.get_db_connection", return_value=fake_conn):
            inserted = ensure_default_shared_prompts()

        self.assertEqual(inserted, 0)
        self.assertFalse(fake_conn.committed)
        self.assertFalse(fake_conn.rolled_back)
        self.assertTrue(fake_conn.closed)
        self.assertTrue(fake_cursor.closed)
        self.assertEqual(fake_cursor.inserted_prompts, [])
        self.assertFalse(
            any("INSERT INTO users" in query for query, _ in fake_cursor.executed_queries)
        )


if __name__ == "__main__":
    unittest.main()
