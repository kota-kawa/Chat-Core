from __future__ import annotations

from typing import List

from fastapi import APIRouter, Request
from starlette.responses import RedirectResponse

from services.db import Error, get_db_connection
from services.web import flash, render_template, url_for

memo_bp = APIRouter(prefix="/memo")


def _ensure_title(ai_response: str, provided_title: str) -> str:
    """Generate a fallback title from the AI response when none is supplied."""
    title = provided_title.strip()
    if title:
        return title[:255]

    for line in ai_response.splitlines():
        cleaned = line.strip()
        if cleaned:
            return cleaned[:255]

    return "新しいメモ"


def _fetch_recent_memos(limit: int = 10) -> List[dict]:
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT
                id,
                title,
                tags,
                created_at,
                input_content,
                ai_response
            FROM memo_entries
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (limit,),
        )
        return list(cursor.fetchall())
    except Error:
        return []
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


@memo_bp.api_route("", methods=["GET", "POST"], name="memo.create_memo")
async def create_memo(request: Request):
    input_content = ""
    ai_response = ""
    title = ""
    tags = ""

    if request.method == "POST":
        form = await request.form()
        input_content = (form.get("input_content") or "").strip()
        ai_response = (form.get("ai_response") or "").strip()
        title = (form.get("title") or "").strip()
        tags = (form.get("tags") or "").strip()

        if not ai_response:
            flash(request, "AIの回答を入力してください。", "error")
        else:
            resolved_title = _ensure_title(ai_response, title)
            connection = None
            cursor = None
            try:
                connection = get_db_connection()
                cursor = connection.cursor()
                cursor.execute(
                    """
                    INSERT INTO memo_entries (input_content, ai_response, title, tags)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (input_content, ai_response, resolved_title, tags or None),
                )
                connection.commit()
                flash(request, "メモを保存しました。", "success")
                return RedirectResponse(url_for(request, "memo.create_memo"), status_code=302)
            except Error as exc:
                flash(request, f"メモの保存に失敗しました: {exc}", "error")
            finally:
                if cursor is not None:
                    cursor.close()
                if connection is not None:
                    connection.close()

    recent_memos = _fetch_recent_memos()

    return render_template(
        request,
        "memo_create.html",
        input_content=input_content,
        ai_response=ai_response,
        title=title,
        tags=tags,
        recent_memos=recent_memos,
    )
