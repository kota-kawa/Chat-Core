import copy
import os
import random

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Request
from starlette.responses import RedirectResponse

try:
    from google_auth_oauthlib.flow import Flow
except ModuleNotFoundError:  # pragma: no cover - optional for test envs
    Flow = None

from services.web import (
    get_json,
    jsonify,
    frontend_login_url,
    frontend_url,
    redirect_to_frontend,
    set_session_permanent,
    url_for,
)
from services.users import (
    get_user_by_email,
    get_user_by_id,
    create_user,
    set_user_verified,
    copy_default_tasks_for_user,
)
from services.email_service import send_email
from services.llm_daily_limit import consume_auth_email_daily_quota

load_dotenv()

# Allow OAuth over HTTP in non-production environments
if os.getenv("FLASK_ENV") != "production":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

GOOGLE_CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "project_id": "chatcore-ai-469306",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "redirect_uris": [],
        "javascript_origins": ["https://chatcore-ai.com"],
    }
}

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
]

auth_bp = APIRouter()

@auth_bp.get("/register", name="auth.register_page")
async def register_page(request: Request):
    """登録ページ(統合認証ページを返す)"""
    return redirect_to_frontend(request)

@auth_bp.get("/api/current_user", name="auth.api_current_user")
async def api_current_user(request: Request):
    session = request.session
    if "user_id" in session:
        user = get_user_by_id(session["user_id"])
        if user:
            return jsonify({"logged_in": True, "user": {"id": user["id"], "email": user["email"]}})
        # user_id in session but user no longer exists; clear the stale session
        session.pop("user_id", None)
        session.pop("user_email", None)
        session.pop("login_verification_code", None)
        session.pop("login_temp_user_id", None)
        session.pop("google_oauth_state", None)
        session.pop("google_redirect_uri", None)
        set_session_permanent(session, False)
        return jsonify({"logged_in": False})
    else:
        return jsonify({"logged_in": False})


@auth_bp.get("/login", name="auth.login")
async def login(request: Request):
    """ログインページ（統合認証ページを返す）"""
    return redirect_to_frontend(request)

@auth_bp.get("/logout", name="auth.logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(frontend_login_url(), status_code=302)


@auth_bp.get("/google-login", name="auth.google_login")
async def google_login(request: Request):
    if Flow is None:
        return jsonify({"error": "google-auth-oauthlib is required"}, status_code=500)
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI") or url_for(
        request, "auth.google_callback", _external=True
    )
    client_config = copy.deepcopy(GOOGLE_CLIENT_CONFIG)
    client_config["web"]["redirect_uris"] = [redirect_uri]
    flow = Flow.from_client_config(
        client_config,
        scopes=GOOGLE_SCOPES,
        redirect_uri=redirect_uri,
    )
    authorization_url, state = flow.authorization_url(prompt="consent")
    request.session["google_oauth_state"] = state
    request.session["google_redirect_uri"] = redirect_uri
    return RedirectResponse(authorization_url, status_code=302)


@auth_bp.get("/google-callback", name="auth.google_callback")
async def google_callback(request: Request):
    if Flow is None:
        return jsonify({"error": "google-auth-oauthlib is required"}, status_code=500)
    session = request.session
    state = session.get("google_oauth_state")
    if not state:
        return RedirectResponse(frontend_login_url(), status_code=302)
    redirect_uri = session.get("google_redirect_uri") or os.getenv(
        "GOOGLE_REDIRECT_URI"
    )
    if not redirect_uri:
        redirect_uri = url_for(request, "auth.google_callback", _external=True)
    client_config = copy.deepcopy(GOOGLE_CLIENT_CONFIG)
    client_config["web"]["redirect_uris"] = [redirect_uri]
    flow = Flow.from_client_config(
        client_config,
        scopes=GOOGLE_SCOPES,
        state=state,
        redirect_uri=redirect_uri,
    )
    flow.fetch_token(authorization_response=str(request.url))
    session.pop("google_oauth_state", None)
    session.pop("google_redirect_uri", None)

    credentials = flow.credentials
    user_info = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {credentials.token}"},
    ).json()
    email = user_info.get("email")
    if not email:
        return RedirectResponse(frontend_login_url(), status_code=302)
    user = get_user_by_email(email)
    if not user:
        user_id = create_user(email)
        set_user_verified(user_id)
    else:
        user_id = user["id"]

    copy_default_tasks_for_user(user_id)
    session["user_id"] = user_id
    session["user_email"] = email
    set_session_permanent(session, True)
    return RedirectResponse(frontend_url("/"), status_code=302)

@auth_bp.post("/api/send_login_code", name="auth.api_send_login_code")
async def api_send_login_code(request: Request):
    """
    ログイン用の認証コード送信 API
    - POST JSON: { "email": "ユーザーのメールアドレス" }
    - 対象ユーザーが存在し、かつ is_verified=True であれば認証コードを生成し、メール送信する
    - 認証コードとユーザーIDはセッション変数 (login_verification_code, login_temp_user_id) に一時保存
    """
    data = await get_json(request)
    email = data.get("email")
    if not email:
        return jsonify({"status": "fail", "error": "メールアドレスが指定されていません"}, status_code=400)
    user = get_user_by_email(email)
    if not user or not user["is_verified"]:
        return jsonify(
            {"status": "fail", "error": "ユーザーが存在しないか、認証されていません"},
            status_code=400,
        )
    can_send_email, _, daily_limit = consume_auth_email_daily_quota()
    if not can_send_email:
        return jsonify(
            {
                "status": "fail",
                "error": (
                    f"本日の認証メール送信上限（全ユーザー合計 {daily_limit} 件）に達しました。"
                    "日付が変わってから再度お試しください。"
                ),
            },
            status_code=429,
        )
    code = str(random.randint(100000, 999999))
    request.session["login_verification_code"] = code
    request.session["login_temp_user_id"] = user["id"]
    subject = "AIチャットサービス: ログイン認証コード"
    body_text = f"以下の認証コードをログイン画面に入力してください。\n\n認証コード: {code}"
    try:
        send_email(to_address=email, subject=subject, body_text=body_text)
        return jsonify({"status": "success", "message": "認証コードを送信しました"})
    except Exception as e:
        return jsonify({"status": "fail", "error": str(e)}, status_code=500)

@auth_bp.post("/api/verify_login_code", name="auth.api_verify_login_code")
async def api_verify_login_code(request: Request):
    """
    ログイン用の認証コード確認 API
    - POST JSON: { "authCode": "ユーザーが入力した認証コード" }
    - セッションに保存した認証コードと照合し、一致すればログイン（session["user_id"] にユーザーIDを保存）する
    """
    data = await get_json(request)
    auth_code = data.get("authCode")
    session = request.session
    session_code = session.get("login_verification_code")
    user_id = session.get("login_temp_user_id")
    if not session_code or not user_id:
        return jsonify(
            {"status": "fail", "error": "セッション情報がありません。最初からやり直してください"},
            status_code=400,
        )
    if auth_code == session_code:
        session["user_id"] = user_id
        user = get_user_by_id(user_id)
        session["user_email"] = user["email"] if user else ""
        set_session_permanent(session, True)
        session.pop("login_verification_code", None)
        session.pop("login_temp_user_id", None)
        copy_default_tasks_for_user(user_id)
        return jsonify({"status": "success", "message": "ログインに成功しました"})
    else:
        return jsonify({"status": "fail", "error": "認証コードが違います"}, status_code=400)
