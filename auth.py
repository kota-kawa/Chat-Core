from flask import Blueprint, request, session, render_template, redirect, url_for, jsonify
import random
from common import get_user_by_email, get_user_by_id, send_email

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/register", methods=["GET"])
def register_page():
    """登録ページ(メール認証方式)"""
    return render_template("register.html")

@auth_bp.route("/api/current_user", methods=["GET"])
def api_current_user():
    if "user_id" in session:
        user = get_user_by_id(session["user_id"])
        return jsonify({"logged_in": True, "user": {"id": user["id"], "email": user["email"]}})
    else:
        return jsonify({"logged_in": False})


@auth_bp.route("/login", methods=["GET"])
def login():
    """ログインページ（初期表示は login.html を返す）"""
    return render_template("login.html")

@auth_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth.login"))

@auth_bp.route("/api/send_login_code", methods=["POST"])
def api_send_login_code():
    """
    ログイン用の認証コード送信 API
    - POST JSON: { "email": "ユーザーのメールアドレス" }
    - 対象ユーザーが存在し、かつ is_verified=True であれば認証コードを生成し、メール送信する
    - 認証コードとユーザーIDはセッション変数 (login_verification_code, login_temp_user_id) に一時保存
    """
    data = request.get_json()
    email = data.get("email")
    if not email:
        return jsonify({"status": "fail", "error": "メールアドレスが指定されていません"}), 400
    user = get_user_by_email(email)
    if not user or not user["is_verified"]:
        return jsonify({"status": "fail", "error": "ユーザーが存在しないか、認証されていません"}), 400
    code = str(random.randint(100000, 999999))
    session["login_verification_code"] = code
    session["login_temp_user_id"] = user["id"]
    subject = "AIチャットサービス: ログイン認証コード"
    body_text = f"以下の認証コードをログイン画面に入力してください。\n\n認証コード: {code}"
    try:
        send_email(to_address=email, subject=subject, body_text=body_text)
        return jsonify({"status": "success", "message": "認証コードを送信しました"})
    except Exception as e:
        return jsonify({"status": "fail", "error": str(e)}), 500

@auth_bp.route("/api/verify_login_code", methods=["POST"])
def api_verify_login_code():
    """
    ログイン用の認証コード確認 API
    - POST JSON: { "authCode": "ユーザーが入力した認証コード" }
    - セッションに保存した認証コードと照合し、一致すればログイン（session["user_id"] にユーザーIDを保存）する
    """
    data = request.get_json()
    auth_code = data.get("authCode")
    session_code = session.get("login_verification_code")
    user_id = session.get("login_temp_user_id")
    if not session_code or not user_id:
        return jsonify({"status": "fail", "error": "セッション情報がありません。最初からやり直してください"}), 400
    if auth_code == session_code:
        session["user_id"] = user_id
        user = get_user_by_id(user_id)
        session["user_email"] = user["email"] if user else ""
        session.pop("login_verification_code", None)
        session.pop("login_temp_user_id", None)
        return jsonify({"status": "success", "message": "ログインに成功しました"})
    else:
        return jsonify({"status": "fail", "error": "認証コードが違います"}), 400
