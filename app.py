# app.py
import os
import threading
import time
from datetime import timedelta

from dotenv import load_dotenv
from fastapi import FastAPI

from blueprints.chat import cleanup_ephemeral_chats
from services.default_tasks import ensure_default_tasks_seeded
from services.default_shared_prompts import ensure_default_shared_prompts
from services.session_middleware import PermanentSessionMiddleware

# Load environment variables
load_dotenv()

app = FastAPI()

secret_key = os.environ.get("FLASK_SECRET_KEY")
if not secret_key:
    raise ValueError("No FLASK_SECRET_KEY set for Flask application")
permanent_max_age = int(timedelta(days=30).total_seconds())

if os.getenv("FLASK_ENV") == "production":
    same_site = "none"
    https_only = True
else:
    same_site = "lax"
    https_only = False

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


def periodic_cleanup():
    while True:
        cleanup_ephemeral_chats()
        # 1分ごとにエフェメラルチャットのクリーンアップ処理を実行
        time.sleep(6000)


@app.on_event("startup")
def start_cleanup_thread():
    try:
        inserted = ensure_default_tasks_seeded()
        if inserted > 0:
            print(f"Seeded {inserted} default tasks.")
    except Exception as exc:
        print(f"Failed to seed default tasks: {exc}")

    try:
        inserted = ensure_default_shared_prompts()
        if inserted > 0:
            print(f"Seeded {inserted} sample shared prompts.")
    except Exception as exc:
        print(f"Failed to seed sample shared prompts: {exc}")

    cleanup_thread = threading.Thread(target=periodic_cleanup, daemon=True)
    cleanup_thread.start()


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "5004"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
