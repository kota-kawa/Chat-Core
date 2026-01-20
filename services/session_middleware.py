from __future__ import annotations

from typing import List, Tuple

from starlette.middleware.sessions import SessionMiddleware


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
