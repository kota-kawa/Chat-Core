from __future__ import annotations

import os
from typing import Any, Dict, List, Tuple
from urllib.parse import urlencode

from fastapi import Request
from starlette.responses import JSONResponse, RedirectResponse

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


async def get_json(request: Request) -> Dict[str, Any] | None:
    try:
        return await request.json()
    except Exception:
        return None


def jsonify(payload: Dict[str, Any], status_code: int = 200) -> JSONResponse:
    return JSONResponse(payload, status_code=status_code)


def set_session_permanent(session: dict, value: bool) -> None:
    if value:
        session["_permanent"] = True
    else:
        session.pop("_permanent", None)


def flash(request: Request, message: str, category: str = "message") -> None:
    flashes: List[Tuple[str, str]] = request.session.setdefault("_flashes", [])
    flashes.append((category, message))


def get_flashed_messages(
    request: Request, *, with_categories: bool = False
) -> List[str] | List[Tuple[str, str]]:
    flashes = request.session.pop("_flashes", [])
    if with_categories:
        return flashes
    return [message for _, message in flashes]


def url_for(request: Request, endpoint: str, **values: Any) -> str:
    external = values.pop("_external", False)
    if "filename" in values and "path" not in values:
        values["path"] = values.pop("filename")

    path_param_names: List[str] = []
    for route in request.app.router.routes:
        if getattr(route, "name", None) == endpoint:
            path_param_names = list(getattr(route, "param_convertors", {}).keys())
            break

    path_params = {}
    for key in list(values.keys()):
        if key in path_param_names:
            path_params[key] = values.pop(key)

    url = request.url_for(endpoint, **path_params)
    if values:
        url = url.include_query_params(**values)

    if external:
        return str(url)

    if url.query:
        return f"{url.path}?{url.query}"
    return url.path


def frontend_url(path: str = "", *, query: str | None = None) -> str:
    base = FRONTEND_URL.rstrip("/")
    if path:
        normalized = path if path.startswith("/") else f"/{path}"
        url = f"{base}{normalized}"
    else:
        url = f"{base}/"
    if query:
        return f"{url}?{query}"
    return url


def redirect_to_frontend(
    request: Request, path: str | None = None, *, status_code: int = 302
) -> RedirectResponse:
    target_path = path if path is not None else request.url.path
    query = request.url.query or None
    return RedirectResponse(frontend_url(target_path, query=query), status_code=status_code)


def frontend_login_url(next_path: str | None = None) -> str:
    query = urlencode({"next": next_path}) if next_path else None
    return frontend_url("/login", query=query)
