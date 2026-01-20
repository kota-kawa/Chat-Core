from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

from .cache import get_redis_client


class EphemeralChatStore:
    def __init__(self, expiration_seconds: int):
        self.expiration_seconds = expiration_seconds
        self._memory = {}
        self._redis = get_redis_client()

    def _key(self, sid: str, room_id: str) -> str:
        return f"ephemeral:{sid}:{room_id}"

    def _encode(self, room: dict) -> str:
        return json.dumps(room, ensure_ascii=False)

    def _decode(self, payload: str) -> dict:
        return json.loads(payload)

    def _created_at_from_room(self, room: dict) -> Optional[datetime]:
        created_at = room.get("created_at")
        if not created_at:
            return None
        if isinstance(created_at, datetime):
            return created_at
        try:
            return datetime.fromisoformat(created_at)
        except ValueError:
            return None

    def _remaining_ttl(self, room: dict) -> int:
        created_at = self._created_at_from_room(room)
        if created_at is None:
            return self.expiration_seconds
        elapsed = (datetime.now() - created_at).total_seconds()
        remaining = int(self.expiration_seconds - elapsed)
        return max(0, remaining)

    def _is_expired(self, room: dict) -> bool:
        created_at = self._created_at_from_room(room)
        if created_at is None:
            return False
        return (datetime.now() - created_at).total_seconds() > self.expiration_seconds

    def cleanup(self) -> None:
        if self._redis is not None:
            return
        now = datetime.now()
        sids_to_delete = []
        for sid, rooms in self._memory.items():
            room_ids_to_delete = []
            for room_id, room_data in rooms.items():
                created_at = room_data.get("created_at")
                if created_at and (now - created_at).total_seconds() > self.expiration_seconds:
                    room_ids_to_delete.append(room_id)
            for room_id in room_ids_to_delete:
                del rooms[room_id]
            if not rooms:
                sids_to_delete.append(sid)
        for sid in sids_to_delete:
            del self._memory[sid]

    def create_room(self, sid: str, room_id: str, title: str) -> None:
        room = {
            "title": title,
            "messages": [],
            "created_at": datetime.now().isoformat(),
        }
        if self._redis is not None:
            key = self._key(sid, room_id)
            self._redis.set(key, self._encode(room), ex=self.expiration_seconds)
            return

        self._memory.setdefault(sid, {})[room_id] = {
            "title": title,
            "messages": [],
            "created_at": datetime.now(),
        }

    def get_room(self, sid: str, room_id: str) -> Optional[dict]:
        if self._redis is not None:
            key = self._key(sid, room_id)
            payload = self._redis.get(key)
            if not payload:
                return None
            room = self._decode(payload)
            if self._is_expired(room):
                self._redis.delete(key)
                return None
            return room

        return self._memory.get(sid, {}).get(room_id)

    def room_exists(self, sid: str, room_id: str) -> bool:
        return self.get_room(sid, room_id) is not None

    def _save_room(self, sid: str, room_id: str, room: dict) -> bool:
        if self._redis is not None:
            key = self._key(sid, room_id)
            ttl = self._remaining_ttl(room)
            if ttl <= 0:
                self._redis.delete(key)
                return False
            self._redis.set(key, self._encode(room), ex=ttl)
            return True

        self._memory.setdefault(sid, {})[room_id] = room
        return True

    def delete_room(self, sid: str, room_id: str) -> bool:
        if self._redis is not None:
            return self._redis.delete(self._key(sid, room_id)) > 0

        rooms = self._memory.get(sid)
        if not rooms or room_id not in rooms:
            return False
        del rooms[room_id]
        if not rooms:
            del self._memory[sid]
        return True

    def rename_room(self, sid: str, room_id: str, new_title: str) -> bool:
        room = self.get_room(sid, room_id)
        if not room:
            return False
        room["title"] = new_title
        return self._save_room(sid, room_id, room)

    def append_message(self, sid: str, room_id: str, role: str, content: str) -> bool:
        room = self.get_room(sid, room_id)
        if not room:
            return False
        messages = room.get("messages") or []
        messages.append({"role": role, "content": content})
        room["messages"] = messages
        return self._save_room(sid, room_id, room)

    def get_messages(self, sid: str, room_id: str) -> list:
        room = self.get_room(sid, room_id)
        if not room:
            return []
        return room.get("messages") or []
