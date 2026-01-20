# prompt_share.py
from fastapi import APIRouter, Request

from services.web import render_template

prompt_share_bp = APIRouter(prefix="/prompt_share")


@prompt_share_bp.get("/", name="prompt_share.index")
async def index(request: Request):
    """prompt_share.html をレンダリング"""
    return render_template(request, "prompt_share.html")


@prompt_share_bp.get("/manage_prompts", name="prompt_share.manage_prompts")
async def manage_prompts(request: Request):
    """prompt_manage.html をレンダリング"""
    return render_template(request, "prompt_manage.html")
