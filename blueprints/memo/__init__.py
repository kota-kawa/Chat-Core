from __future__ import annotations

from typing import List

from fastapi import APIRouter, Request

from services.db import Error, get_db_connection
from services.web import flash, get_json, jsonify, redirect_to_frontend

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


def _serialize_memo(memo: dict) -> dict:
    created_at = memo.get("created_at")
    created_at_str = created_at.strftime("%Y-%m-%d %H:%M") if created_at else None
    return {
        "id": memo.get("id"),
        "title": memo.get("title"),
        "tags": memo.get("tags"),
        "created_at": created_at_str,
        "input_content": memo.get("input_content") or "",
        "ai_response": memo.get("ai_response") or "",
    }


@memo_bp.get("/api/recent", name="memo.api_recent")
async def api_recent_memos(request: Request, limit: int = 10):
    safe_limit = max(1, min(limit, 100))
    memos = [_serialize_memo(memo) for memo in _fetch_recent_memos(safe_limit)]
    return jsonify({"memos": memos})


@memo_bp.post("/api", name="memo.api_create")
async def api_create_memo(request: Request):
    data = await get_json(request)
    if data is None:
        form = await request.form()
        data = {key: value for key, value in form.items()}

    input_content = (data.get("input_content") or "").strip()
    ai_response = (data.get("ai_response") or "").strip()
    title = (data.get("title") or "").strip()
    tags = (data.get("tags") or "").strip()

    if not ai_response:
        return jsonify(
            {"status": "fail", "error": "AIの回答を入力してください。"}, status_code=400
        )

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
            RETURNING id
            """,
            (input_content, ai_response, resolved_title, tags or None),
        )
        connection.commit()
        row = cursor.fetchone()
        memo_id = row[0] if row else None
        flash(request, "メモを保存しました。", "success")
        return jsonify({"status": "success", "memo_id": memo_id})
    except Error as exc:
        return jsonify({"status": "fail", "error": str(exc)}, status_code=500)
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


@memo_bp.api_route("", methods=["GET", "POST"], name="memo.create_memo")
async def create_memo(request: Request):
    status_code = 302 if request.method == "GET" else 303
    return redirect_to_frontend(request, status_code=status_code)
