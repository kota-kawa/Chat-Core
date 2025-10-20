from __future__ import annotations

from typing import List

from flask import Blueprint, flash, redirect, render_template, request, url_for
from mysql.connector import Error

from services.db import get_db_connection

memo_bp = Blueprint(
    "memo",
    __name__,
    template_folder="templates",
    static_folder="static",
    url_prefix="/memo",
)


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


@memo_bp.route("", methods=["GET", "POST"])
def create_memo():
    input_content = request.form.get("input_content", "").strip()
    ai_response = request.form.get("ai_response", "").strip()
    title = request.form.get("title", "").strip()
    tags = request.form.get("tags", "").strip()

    if request.method == "POST":
        if not ai_response:
            flash("AIの回答を入力してください。", "error")
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
                flash("メモを保存しました。", "success")
                return redirect(url_for("memo.create_memo"))
            except Error as exc:
                flash(f"メモの保存に失敗しました: {exc}", "error")
            finally:
                if cursor is not None:
                    cursor.close()
                if connection is not None:
                    connection.close()

    recent_memos = _fetch_recent_memos()

    return render_template(
        "memo_create.html",
        input_content=input_content,
        ai_response=ai_response,
        title=title,
        tags=tags,
        recent_memos=recent_memos,
    )
