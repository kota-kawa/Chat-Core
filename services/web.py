from __future__ import annotations

import os
from typing import Any, Dict, List, Tuple

from fastapi import Request
from fastapi.templating import Jinja2Templates
from jinja2 import Environment, FileSystemLoader, select_autoescape
from starlette.responses import JSONResponse

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

TEMPLATE_DIRS = [
    os.path.join(BASE_DIR, "templates"),
    os.path.join(BASE_DIR, "blueprints", "prompt_share", "templates"),
    os.path.join(BASE_DIR, "blueprints", "memo", "templates"),
]

_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIRS),
    autoescape=select_autoescape(["html", "xml"]),
)
templates = Jinja2Templates(env=_env)


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


def render_template(request: Request, template_name: str, **context: Any):
    context.setdefault("request", request)
    context.setdefault(
        "url_for", lambda endpoint, **values: url_for(request, endpoint, **values)
    )
    context.setdefault(
        "get_flashed_messages",
        lambda **kwargs: get_flashed_messages(request, **kwargs),
    )
    return templates.TemplateResponse(template_name, context)
