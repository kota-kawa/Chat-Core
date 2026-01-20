from fastapi import APIRouter
import uuid

from services.ephemeral_store import EphemeralChatStore

chat_bp = APIRouter()

# エフェメラルチャットの有効期限（秒）
EXPIRATION_TIME = 3600  # 1時間

# 未ログインユーザー用のエフェメラルチャットを保持するストア
ephemeral_store = EphemeralChatStore(EXPIRATION_TIME)


# セッションIDを取得するヘルパー関数
def get_session_id(session: dict) -> str:
    if "sid" not in session:
        session["sid"] = str(uuid.uuid4())
    return session["sid"]


# エフェメラルチャットのデータをクリーンアップする関数
def cleanup_ephemeral_chats():
    ephemeral_store.cleanup()


# ルートハンドラを登録
from . import views, profile, rooms, messages, tasks  # noqa: F401

__all__ = [
    "chat_bp",
    "cleanup_ephemeral_chats",
    "get_session_id",
    "ephemeral_store",
    "EXPIRATION_TIME",
]
