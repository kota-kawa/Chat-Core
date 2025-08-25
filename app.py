# app.py
from flask import Flask
import threading
import time
from datetime import timedelta
import os
from dotenv import load_dotenv
from blueprints.chat import cleanup_ephemeral_chats  # chat.py に定義されたクリーンアップ関数をインポート

# Load environment variables
load_dotenv()

# Flaskアプリを生成
app = Flask(__name__)
app.secret_key = "YOUR_SECRET_KEY"  # セッション暗号化キー
app.permanent_session_lifetime = timedelta(days=30)

# Google OAuth での初回ログインがリダイレクトされない問題を防ぐため
# セッションクッキーをクロスサイトでも送信できるように設定
if os.getenv("FLASK_ENV") == "production":
    app.config.update(
        SESSION_COOKIE_SAMESITE="None",
        SESSION_COOKIE_SECURE=True,
    )
else:
    app.config.update(
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=False,
    )

# 各Blueprintをimportする
from blueprints.auth import auth_bp
from blueprints.verification import verification_bp
from blueprints.chat import chat_bp
from blueprints.prompt_share import prompt_share_bp
from blueprints.prompt_share.prompt_share_api import prompt_share_api_bp
from blueprints.prompt_share.prompt_search import search_bp
from blueprints.prompt_share.prompt_manage_api import prompt_manage_api_bp

# Blueprintを登録
app.register_blueprint(auth_bp)
app.register_blueprint(verification_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(prompt_share_bp)
app.register_blueprint(prompt_share_api_bp)
app.register_blueprint(search_bp)
app.register_blueprint(prompt_manage_api_bp)

def periodic_cleanup():
    while True:
        cleanup_ephemeral_chats()
        # 1分ごとにエフェメラルチャットのクリーンアップ処理を実行
        time.sleep(6000)

if __name__ == '__main__':
    # バックグラウンドスレッドで定期クリーンアップを開始
    cleanup_thread = threading.Thread(target=periodic_cleanup, daemon=True)
    cleanup_thread.start()
    app.run(debug=True, host='0.0.0.0')
