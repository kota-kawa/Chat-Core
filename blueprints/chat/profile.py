import os
import shutil

from fastapi import Request
from werkzeug.utils import secure_filename

from services.db import get_db_connection
from services.users import get_user_by_id
from services.web import BASE_DIR, jsonify

from . import chat_bp


# --- プロフィール取得 ---
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
    if request.method == 'GET':
        user = get_user_by_id(user_id)
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

    if not username or not email:
        return jsonify({'error': 'ユーザー名とメールアドレスは必須です'}, status_code=400)

    # 画像アップロード (あれば)
    avatar_url = None
    if avatar_f and avatar_f.filename:
        fname = secure_filename(avatar_f.filename)
        upload_dir = os.path.join(BASE_DIR, 'frontend', 'public', 'static', 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, fname)
        with open(filepath, "wb") as out_f:
            shutil.copyfileobj(avatar_f.file, out_f)
        avatar_url = f'/static/uploads/{fname}'

    # DB 更新
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        fields = ['username=%s', 'email=%s', 'bio=%s']
        params = [username,      email,      bio]
        if avatar_url:
            fields.append('avatar_url=%s')
            params.append(avatar_url)
        params.append(user_id)

        sql = f"UPDATE users SET {', '.join(fields)} WHERE id=%s"
        cursor.execute(sql, params)
        conn.commit()
        return jsonify({
            'message': 'プロフィールを更新しました',
            'avatar_url': avatar_url         # 新しい画像 URL（ない場合は null）
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()
