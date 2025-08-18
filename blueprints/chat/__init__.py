from flask import Blueprint, session
from datetime import datetime
import uuid

chat_bp = Blueprint('chat', __name__)

# エフェメラルチャットの有効期限（秒）
EXPIRATION_TIME = 3600  # 1時間

# 未ログインユーザー用のエフェメラルチャットをサーバ側に保存する辞書
# キー: セッションID (get_session_id() で取得)
# 値: { room_id1: {"title": ..., "messages": [...], "created_at": datetime}, room_id2: ... }
ephemeral_chats = {}


# セッションIDを取得するヘルパー関数
def get_session_id():
    if "sid" not in session:
        session["sid"] = str(uuid.uuid4())
    return session["sid"]


# エフェメラルチャットのデータをクリーンアップする関数
def cleanup_ephemeral_chats():
    now = datetime.now()
    sids_to_delete = []
    for sid, rooms in ephemeral_chats.items():
        room_ids_to_delete = []
        for room_id, room_data in rooms.items():
            created_at = room_data.get("created_at")
            if created_at and (now - created_at).total_seconds() > EXPIRATION_TIME:
                room_ids_to_delete.append(room_id)
        for room_id in room_ids_to_delete:
            del rooms[room_id]
        if not rooms:
            sids_to_delete.append(sid)
    for sid in sids_to_delete:
        del ephemeral_chats[sid]


# ルートハンドラを登録
from . import views, profile, rooms, messages, tasks  # noqa: F401

__all__ = [
    "chat_bp",
    "cleanup_ephemeral_chats",
    "get_session_id",
    "ephemeral_chats",
    "EXPIRATION_TIME",
]
