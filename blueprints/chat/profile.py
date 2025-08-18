from flask import request, jsonify, current_app, session
from werkzeug.utils import secure_filename
import os

from services.db import get_db_connection
from services.users import get_user_by_id

from . import chat_bp


# --- プロフィール取得 ---
@chat_bp.route('/api/user/profile', methods=['GET', 'POST'])
def user_profile():
    """
    GET  : 自分のプロフィールを JSON で返す
    POST : フォーム / multipart で受け取ったプロフィールを更新する
    """
    if 'user_id' not in session:
        return jsonify({'error': 'ログインが必要です'}), 401
    user_id = session['user_id']

    # ---------- GET ----------
    if request.method == 'GET':
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({'error': 'ユーザーが存在しません'}), 404
        return jsonify({
            'username'  : user.get('username', ''),
            'email'     : user.get('email', ''),
            'bio'       : user.get('bio', ''),
            'avatar_url': user.get('avatar_url', '')
        })

    # ---------- POST ----------
    # フォーム値
    username = request.form.get('username', '').strip()
    email    = request.form.get('email', '').strip()
    bio      = request.form.get('bio', '').strip()
    avatar_f = request.files.get('avatar')      # 画像ファイル (任意)

    if not username or not email:
        return jsonify({'error': 'ユーザー名とメールアドレスは必須です'}), 400

    # 画像アップロード (あれば)
    avatar_url = None
    if avatar_f and avatar_f.filename:
        fname = secure_filename(avatar_f.filename)
        upload_dir = os.path.join(current_app.static_folder, 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, fname)
        avatar_f.save(filepath)
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
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
