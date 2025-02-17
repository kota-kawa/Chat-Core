from flask import Blueprint, request, session, jsonify
from common import send_email, create_user, get_user_by_email, set_user_verified, get_user_by_id
import random

verification_bp = Blueprint('verification', __name__)

@verification_bp.route("/api/send_verification_email", methods=["POST"])
def api_send_verification_email():
    """
    register.html から「確認メール送信」ボタン押下で呼ばれる
    - メールアドレスをDBに登録 (is_verified=False)
    - 6桁のコードを生成し、Gmailにて送信
    - コードは session["verification_code"] に一時的に保存 (本番ではDBでもOK)
    - session["temp_user_id"] に仮保存
    """
    data = request.get_json()
    email = data.get("email")
    if not email:
        return jsonify({"status": "fail", "error": "メールアドレスが指定されていません"}), 400

    # すでにユーザーがあれば再利用、なければ作成
    user = get_user_by_email(email)
    if not user:
        user_id = create_user(email)
    else:
        user_id = user["id"]

    # 6桁コード生成→セッションへ
    code = str(random.randint(100000, 999999))
    session["verification_code"] = code
    session["temp_user_id"] = user_id  # どのユーザーか紐付け

    subject = "AIチャットサービス: 認証コード"
    body_text = f"以下の認証コードを登録画面に入力してください。\n\n認証コード: {code}"
    try:
        send_email(to_address=email, subject=subject, body_text=body_text)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "fail", "error": str(e)}), 500

@verification_bp.route("/api/verify_registration_code", methods=["POST"])
def api_verify_registration_code():
    """
    register.html の「認証コードを入力→認証する」ボタンで呼ばれる
    - session["verification_code"] と一致するか確認
    - 一致すればDBのユーザーを is_verified=True にし、ログイン状態にしてトップページへ遷移できるようにする
    """
    data = request.get_json()
    user_code = data.get("authCode")

    session_code = session.get("verification_code")
    user_id = session.get("temp_user_id")

    if not session_code or not user_id:
        return jsonify({"status": "fail", "error": "セッション情報がありません。最初からやり直してください"}), 400

    if user_code == session_code:
        # OK → ユーザーを認証済みに
        set_user_verified(user_id)
        # ★ ログイン状態にする ★
        session["user_id"] = user_id
        user = get_user_by_id(user_id)
        session["user_email"] = user["email"] if user else ""
        # 一時セッション情報のクリア
        session.pop("verification_code", None)
        session.pop("temp_user_id", None)
        return jsonify({"status": "success"})
    else:
        return jsonify({"status": "fail", "error": "認証コードが違います。"}), 400
