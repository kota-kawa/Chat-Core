# app.py
import logging
import os
import threading
from contextlib import asynccontextmanager
from datetime import timedelta

from dotenv import load_dotenv
from fastapi import FastAPI, Request

from blueprints.chat import cleanup_ephemeral_chats
from services.db import close_db_pool
from services.default_tasks import ensure_default_tasks_seeded
from services.default_shared_prompts import ensure_default_shared_prompts
from services.runtime_config import get_session_secret_key, is_production_env
from services.session_middleware import PermanentSessionMiddleware
from services.web import DEFAULT_INTERNAL_ERROR_MESSAGE, jsonify

# Load environment variables
load_dotenv()

log_level = os.getenv("LOG_LEVEL", "INFO").upper()
resolved_log_level = getattr(logging, log_level, logging.INFO)
logging.basicConfig(
    level=resolved_log_level,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

secret_key = get_session_secret_key()
if not secret_key:
    raise ValueError(
        "No session secret key set. Define FASTAPI_SECRET_KEY "
        "(or legacy FLASK_SECRET_KEY)."
    )
permanent_max_age = int(timedelta(days=30).total_seconds())

if is_production_env():
    same_site = "none"
    https_only = True
else:
    same_site = "lax"
    https_only = False


def periodic_cleanup(stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        try:
            cleanup_ephemeral_chats()
        except Exception:
            logger.exception("Failed to clean up ephemeral chats.")
        # 1分ごとにエフェメラルチャットのクリーンアップ処理を実行
        stop_event.wait(timeout=6000)


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        inserted = ensure_default_tasks_seeded()
        if inserted > 0:
            logger.info("Seeded %s default tasks.", inserted)
    except Exception:
        logger.exception("Failed to seed default tasks.")

    try:
        inserted = ensure_default_shared_prompts()
        if inserted > 0:
            logger.info("Seeded %s sample shared prompts.", inserted)
    except Exception:
        logger.exception("Failed to seed sample shared prompts.")

    cleanup_stop_event = threading.Event()
    cleanup_thread = threading.Thread(
        target=periodic_cleanup,
        args=(cleanup_stop_event,),
        daemon=True,
        name="ephemeral-chat-cleanup",
    )
    cleanup_thread.start()

    try:
        yield
    finally:
        cleanup_stop_event.set()
        cleanup_thread.join(timeout=1)
        close_db_pool()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    PermanentSessionMiddleware,
    secret_key=secret_key,
    session_cookie="session",
    max_age=permanent_max_age,
    same_site=same_site,
    https_only=https_only,
)

app.state.session_secret = secret_key
app.state.session_cookie = "session"


# 各Routerをimportする
from blueprints.auth import auth_bp
from blueprints.verification import verification_bp
from blueprints.chat import chat_bp
from blueprints.prompt_share import prompt_share_bp
from blueprints.prompt_share.prompt_share_api import prompt_share_api_bp
from blueprints.prompt_share.prompt_search import search_bp
from blueprints.prompt_share.prompt_manage_api import prompt_manage_api_bp
from blueprints.admin import admin_bp
from blueprints.memo import memo_bp

# Routerを登録
app.include_router(auth_bp)
app.include_router(verification_bp)
app.include_router(chat_bp)
app.include_router(prompt_share_bp)
app.include_router(prompt_share_api_bp)
app.include_router(search_bp)
app.include_router(prompt_manage_api_bp)
app.include_router(admin_bp)
app.include_router(memo_bp)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled exception on %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return jsonify({"error": DEFAULT_INTERNAL_ERROR_MESSAGE}, status_code=500)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "5004"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
