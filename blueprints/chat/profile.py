import os
import shutil
import logging

from fastapi import Request
from werkzeug.utils import secure_filename

from services.async_utils import run_blocking
from services.db import get_db_connection
from services.users import get_user_by_id
from services.web import BASE_DIR, jsonify, log_and_internal_server_error

from . import chat_bp

logger = logging.getLogger(__name__)


def _save_avatar_file(upload_dir, filepath, avatar_file_obj):
    # アップロード先ディレクトリを保証してからファイルを保存する
    # Ensure upload directory exists, then persist uploaded avatar file.
    os.makedirs(upload_dir, exist_ok=True)
    with open(filepath, "wb") as out_f:
        shutil.copyfileobj(avatar_file_obj, out_f)


def _update_user_profile(user_id, username, email, bio, avatar_url):
    # 入力されたプロフィール項目のみを users テーブルへ更新する
    # Update users table with submitted profile fields.
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE users
               SET username = %s,
                   email = %s,
                   bio = %s,
                   avatar_url = COALESCE(%s, avatar_url)
             WHERE id = %s
            """,
            (username, email, bio, avatar_url, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


# --- プロフィール取得 ---
# User profile read/update endpoint.
@chat_bp.api_route('/api/user/profile', methods=['GET', 'POST'], name="chat.user_profile")
async def user_profile(request: Request):
    """
    GET  : 自分のプロフィールを JSON で返す
    POST : フォーム / multipart で受け取ったプロフィールを更新する
    """
    if 'user_id' not in request.session:
        return jsonify({'error': 'ログインが必要です'}, status_code=401)
    user_id = request.session['user_id']

    # ---------- GET ----------
    # Return current profile data as JSON.
    if request.method == 'GET':
        user = await run_blocking(get_user_by_id, user_id)
        if not user:
            return jsonify({'error': 'ユーザーが存在しません'}, status_code=404)
        return jsonify({
            'username'  : user.get('username', ''),
            'email'     : user.get('email', ''),
            'bio'       : user.get('bio', ''),
            'avatar_url': user.get('avatar_url', '')
        })

    # ---------- POST ----------
    form = await request.form()
    username = (form.get('username') or '').strip()
    email = (form.get('email') or '').strip()
    bio = (form.get('bio') or '').strip()
    avatar_f = form.get('avatar')      # 画像ファイル (任意)
    # Optional avatar file from multipart form.

    if not username or not email:
        return jsonify({'error': 'ユーザー名とメールアドレスは必須です'}, status_code=400)

    # 画像アップロード (あれば)
    # Upload avatar file if one is provided.
    avatar_url = None
    if avatar_f and avatar_f.filename:
        fname = secure_filename(avatar_f.filename)
        upload_dir = os.path.join(BASE_DIR, 'frontend', 'public', 'static', 'uploads')
        filepath = os.path.join(upload_dir, fname)
        await run_blocking(_save_avatar_file, upload_dir, filepath, avatar_f.file)
        avatar_url = f'/static/uploads/{fname}'

    # DB 更新
    # Persist profile updates to database.
    try:
        await run_blocking(_update_user_profile, user_id, username, email, bio, avatar_url)
        return jsonify({
            'message': 'プロフィールを更新しました',
            'avatar_url': avatar_url         # 新しい画像 URL（ない場合は null）
            # Newly uploaded avatar URL (null when unchanged).
        })
    except Exception:
        return log_and_internal_server_error(
            logger,
            "Failed to update user profile.",
        )
