import random

from fastapi import APIRouter, Request

from services.email_service import send_email
from services.users import (
    create_user,
    get_user_by_email,
    set_user_verified,
    get_user_by_id,
    copy_default_tasks_for_user,
)
from services.web import get_json, jsonify

verification_bp = APIRouter()

@verification_bp.post("/api/send_verification_email", name="verification.api_send_verification_email")
async def api_send_verification_email(request: Request):
    """
    register.html から「確認メール送信」ボタン押下で呼ばれる
    - メールアドレスをDBに登録 (is_verified=False)
    - 6桁のコードを生成し、Gmailにて送信
    - コードは session["verification_code"] に一時的に保存 (本番ではDBでもOK)
    - session["temp_user_id"] に仮保存
    """
    data = await get_json(request)
    email = data.get("email")
    if not email:
        return jsonify({"status": "fail", "error": "メールアドレスが指定されていません"}, status_code=400)

    # すでにユーザーがあれば再利用、なければ作成
    user = get_user_by_email(email)
    if not user:
        user_id = create_user(email)
    else:
        user_id = user["id"]

    # 6桁コード生成→セッションへ
    code = str(random.randint(100000, 999999))
    request.session["verification_code"] = code
    request.session["temp_user_id"] = user_id  # どのユーザーか紐付け

    subject = "AIチャットサービス: 認証コード"
    body_text = f"以下の認証コードを登録画面に入力してください。\n\n認証コード: {code}"
    try:
        send_email(to_address=email, subject=subject, body_text=body_text)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "fail", "error": str(e)}, status_code=500)

@verification_bp.post("/api/verify_registration_code", name="verification.api_verify_registration_code")
async def api_verify_registration_code(request: Request):
    """
    register.html の「認証する」ボタンで呼ばれる。
    ・セッション保存の認証コードと照合
    ・一致すればユーザーを is_verified=True にしログイン状態へ
    ・このタイミングで初期タスクをユーザー専用に複製
    """
    data        = await get_json(request)
    user_code   = data.get("authCode")
    session_code= request.session.get("verification_code")
    user_id     = request.session.get("temp_user_id")

    if not session_code or not user_id:
        return jsonify({"status": "fail", "error": "セッション情報がありません。最初からやり直してください"}, status_code=400)

    if user_code != session_code:
        return jsonify({"status": "fail", "error": "認証コードが違います。"}, status_code=400)

    # ここから成功処理 ----------------------------------------------------
    set_user_verified(user_id)                 # ユーザーを認証済みに
    copy_default_tasks_for_user(user_id)       # ★ 共通タスクを複製 ★

    # ログイン状態にセット
    request.session["user_id"]    = user_id
    user                  = get_user_by_id(user_id)
    request.session["user_email"] = user["email"] if user else ""

    # 一時セッション情報のクリア
    request.session.pop("verification_code", None)
    request.session.pop("temp_user_id", None)

    return jsonify({"status": "success"})
