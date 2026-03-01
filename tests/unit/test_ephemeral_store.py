import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

from services.ephemeral_store import EphemeralChatStore


class EphemeralChatStoreMemoryTest(unittest.TestCase):
    def test_memory_flow(self):
        with patch("services.ephemeral_store.get_redis_client", return_value=None):
            store = EphemeralChatStore(expiration_seconds=60)
            store.create_room("sid", "room", "title")

            self.assertTrue(store.room_exists("sid", "room"))

            store.append_message("sid", "room", "user", "hello")
            messages = store.get_messages("sid", "room")
            self.assertEqual(messages[0]["role"], "user")
            self.assertEqual(messages[0]["content"], "hello")

            self.assertTrue(store.rename_room("sid", "room", "new"))
            room = store.get_room("sid", "room")
            self.assertEqual(room["title"], "new")

            self.assertTrue(store.delete_room("sid", "room"))
            self.assertFalse(store.room_exists("sid", "room"))

    def test_memory_cleanup_expires_rooms(self):
        with patch("services.ephemeral_store.get_redis_client", return_value=None):
            store = EphemeralChatStore(expiration_seconds=10)
            store.create_room("sid", "room", "title")
            store._memory["sid"]["room"]["created_at"] = datetime.now() - timedelta(seconds=20)

            store.cleanup()

            self.assertFalse(store.room_exists("sid", "room"))


if __name__ == "__main__":
    unittest.main()
