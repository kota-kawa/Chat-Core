from fastapi import Request

from services.web import redirect_to_frontend

from . import chat_bp, cleanup_ephemeral_chats


@chat_bp.get("/", name="chat.index")
async def index(request: Request):
    cleanup_ephemeral_chats()
    return redirect_to_frontend(request)


@chat_bp.get("/settings", name="chat.settings")
async def settings(request: Request):
    return redirect_to_frontend(request)
