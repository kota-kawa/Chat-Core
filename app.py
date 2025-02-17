# app.py
from flask import Flask
import threading
import time
from chat import cleanup_ephemeral_chats  # chat.py に定義されたクリーンアップ関数をインポート

# Flaskアプリを生成
app = Flask(__name__)
app.secret_key = "YOUR_SECRET_KEY"  # セッション暗号化キー

# 各Blueprintをimport
from auth import auth_bp
from verification import verification_bp
from chat import chat_bp
from prompt_share import prompt_share_bp  


# Blueprintを登録
app.register_blueprint(auth_bp)
app.register_blueprint(verification_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(prompt_share_bp)

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
