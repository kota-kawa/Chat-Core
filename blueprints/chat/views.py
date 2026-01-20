from fastapi import Request

from services.web import render_template

from . import chat_bp, cleanup_ephemeral_chats


@chat_bp.get("/", name="chat.index")
async def index(request: Request):
    cleanup_ephemeral_chats()
    return render_template(request, "home.html")


@chat_bp.get("/settings", name="chat.settings")
async def settings(request: Request):
    return render_template(request, "user_settings.html")
