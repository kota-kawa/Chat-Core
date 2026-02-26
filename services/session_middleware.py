from __future__ import annotations

import json
import secrets
from http.cookies import SimpleCookie
from typing import List, Tuple

from itsdangerous import BadSignature, URLSafeSerializer
from starlette.concurrency import run_in_threadpool
from starlette.datastructures import Headers, MutableHeaders
from starlette.middleware.sessions import SessionMiddleware

from services.cache import get_redis_client


class PermanentSessionMiddleware:
    def __init__(
        self,
        app,
        *,
        secret_key: str,
        session_cookie: str = "session",
        max_age: int | None = None,
        path: str = "/",
        same_site: str = "lax",
        https_only: bool = False,
    ) -> None:
        self.session_cookie = session_cookie
        self._use_redis = get_redis_client() is not None
        if self._use_redis:
            self.inner = RedisSessionMiddleware(
                app,
                secret_key=secret_key,
                session_cookie=session_cookie,
                max_age=max_age,
                path=path,
                same_site=same_site,
                https_only=https_only,
            )
        else:
            self.inner = SessionMiddleware(
                app,
                secret_key=secret_key,
                session_cookie=session_cookie,
                max_age=max_age,
                path=path,
                same_site=same_site,
                https_only=https_only,
            )

    async def __call__(self, scope, receive, send):
        if not self._use_redis:
            if scope["type"] != "http":
                return await self.inner(scope, receive, send)

            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    session = scope.get("session") or {}
                    is_permanent = session.get("_permanent") is True
                    if session and not is_permanent:
                        message["headers"] = _strip_cookie_headers(
                            message["headers"], self.session_cookie
                        )
                await send(message)

            return await self.inner(scope, receive, send_wrapper)

        return await self.inner(scope, receive, send)


class RedisSessionMiddleware:
    def __init__(
        self,
        app,
        *,
        secret_key: str,
        session_cookie: str = "session",
        max_age: int | None = None,
        path: str = "/",
        same_site: str = "lax",
        https_only: bool = False,
    ) -> None:
        self.app = app
        self.session_cookie = session_cookie
        self.max_age = max_age
        self.path = path
        self.same_site = same_site
        self.https_only = https_only
        self.serializer = URLSafeSerializer(secret_key, salt="strike.session")
        self.redis = get_redis_client()

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        session_id = self._load_session_id(scope)
        session_data = (
            await run_in_threadpool(self._load_session, session_id)
            if session_id
            else {}
        )
        scope["session"] = session_data
        scope["session_id"] = session_id

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                await run_in_threadpool(self._commit_session, scope, headers)
            await send(message)

        return await self.app(scope, receive, send_wrapper)

    def _load_session_id(self, scope):
        headers = Headers(scope=scope)
        cookie_header = headers.get("cookie")
        if not cookie_header:
            return None
        cookies = SimpleCookie()
        cookies.load(cookie_header)
        if self.session_cookie not in cookies:
            return None
        signed_value = cookies[self.session_cookie].value
        try:
            return self.serializer.loads(signed_value)
        except BadSignature:
            return None

    def _load_session(self, session_id):
        if self.redis is None:
            return {}
        payload = self.redis.get(self._redis_key(session_id))
        if not payload:
            return {}
        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            return {}

    def _commit_session(self, scope, headers: MutableHeaders) -> None:
        session = scope.get("session") or {}
        session_id = scope.get("session_id")

        if not session:
            if session_id:
                self._delete_session(session_id)
                self._set_cookie(headers, "", max_age=0)
            return

        if not session_id:
            session_id = secrets.token_urlsafe(32)
            scope["session_id"] = session_id

        self._save_session(session_id, session)

        is_permanent = session.get("_permanent") is True
        cookie_max_age = self.max_age if is_permanent else None
        self._set_cookie(headers, self.serializer.dumps(session_id), cookie_max_age)

    def _save_session(self, session_id: str, session: dict) -> None:
        if self.redis is None:
            return
        payload = json.dumps(session, ensure_ascii=False)
        if self.max_age is not None:
            self.redis.set(self._redis_key(session_id), payload, ex=self.max_age)
        else:
            self.redis.set(self._redis_key(session_id), payload)

    def _delete_session(self, session_id: str) -> None:
        if self.redis is None:
            return
        self.redis.delete(self._redis_key(session_id))

    def _redis_key(self, session_id: str) -> str:
        return f"session:{session_id}"

    def _set_cookie(self, headers: MutableHeaders, value: str, max_age=None) -> None:
        cookie = SimpleCookie()
        cookie[self.session_cookie] = value
        cookie[self.session_cookie]["path"] = self.path
        cookie[self.session_cookie]["httponly"] = True
        if self.same_site:
            cookie[self.session_cookie]["samesite"] = self.same_site
        if self.https_only:
            cookie[self.session_cookie]["secure"] = True
        if max_age is not None:
            cookie[self.session_cookie]["max-age"] = str(max_age)
        if max_age == 0:
            cookie[self.session_cookie]["expires"] = "Thu, 01 Jan 1970 00:00:00 GMT"
        headers.append("set-cookie", cookie.output(header="").strip())


def _strip_cookie_headers(headers, cookie_name: str):
    new_headers: List[Tuple[bytes, bytes]] = []
    set_cookie_headers: List[str] = []

    for key, value in headers:
        if key.lower() == b"set-cookie":
            set_cookie_headers.append(value.decode("latin-1"))
        else:
            new_headers.append((key, value))

    if not set_cookie_headers:
        return headers

    for cookie in set_cookie_headers:
        if cookie.startswith(f"{cookie_name}="):
            cookie = _strip_cookie_attributes(cookie)
        new_headers.append((b"set-cookie", cookie.encode("latin-1")))

    return new_headers


def _strip_cookie_attributes(cookie: str) -> str:
    parts = cookie.split(";")
    if len(parts) <= 1:
        return cookie

    kept_parts = [parts[0].strip()]
    for part in parts[1:]:
        attr = part.strip()
        attr_lower = attr.lower()
        if attr_lower.startswith("max-age=") or attr_lower.startswith("expires="):
            continue
        kept_parts.append(attr)

    return "; ".join(kept_parts)
