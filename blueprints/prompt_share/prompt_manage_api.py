# prompt_manage_api.py
from fastapi import APIRouter, Request

from services.async_utils import run_blocking
from services.db import get_db_connection
from services.web import get_json, jsonify

prompt_manage_api_bp = APIRouter(prefix="/prompt_manage/api")


def _fetch_my_prompts(user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT id, title, category, content, input_examples, output_examples, created_at
            FROM prompts
            WHERE user_id = %s
            ORDER BY created_at DESC
        """
        cursor.execute(query, (user_id,))
        return cursor.fetchall()
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def _fetch_saved_prompts(user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT id, name, prompt_template, input_examples, output_examples, created_at
            FROM task_with_examples
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
        """
        cursor.execute(query, (user_id,))
        return cursor.fetchall()
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def _fetch_prompt_list(user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT id, prompt_id, title, category, content, input_examples, output_examples, created_at
            FROM prompt_list_entries
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
        """
        cursor.execute(query, (user_id,))
        return cursor.fetchall()
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def _delete_prompt_list_entry_for_user(user_id, entry_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "DELETE FROM prompt_list_entries WHERE id = %s AND user_id = %s"
        cursor.execute(query, (entry_id, user_id))
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def _delete_saved_prompt_for_user(user_id, prompt_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "DELETE FROM task_with_examples WHERE id = %s AND user_id = %s"
        cursor.execute(query, (prompt_id, user_id))
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def _update_prompt_for_user(
    user_id, prompt_id, title, category, content, input_examples, output_examples
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            UPDATE prompts
            SET title = %s, category = %s, content = %s, input_examples = %s, output_examples = %s
            WHERE id = %s AND user_id = %s
        """
        cursor.execute(
            query,
            (
                title,
                category,
                content,
                input_examples,
                output_examples,
                prompt_id,
                user_id,
            ),
        )
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def _delete_prompt_for_user(user_id, prompt_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "DELETE FROM prompts WHERE id = %s AND user_id = %s"
        cursor.execute(query, (prompt_id, user_id))
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@prompt_manage_api_bp.get("/my_prompts", name="prompt_manage_api.get_my_prompts")
async def get_my_prompts(request: Request):
    """ログインユーザーが投稿したプロンプト一覧を取得するエンドポイント"""
    if "user_id" not in request.session:
        return jsonify({"error": "ログインしていません"}, status_code=401)
    user_id = request.session["user_id"]
    try:
        prompts = await run_blocking(_fetch_my_prompts, user_id)
        return jsonify({"prompts": prompts})
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)


@prompt_manage_api_bp.get("/saved_prompts", name="prompt_manage_api.get_saved_prompts")
async def get_saved_prompts(request: Request):
    """ログインユーザーが保存したプロンプト（ブックマーク）一覧を取得するエンドポイント"""
    if "user_id" not in request.session:
        return jsonify({"error": "ログインしていません"}, status_code=401)

    user_id = request.session["user_id"]
    try:
        prompts = await run_blocking(_fetch_saved_prompts, user_id)
        return jsonify({"prompts": prompts})
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)


@prompt_manage_api_bp.get("/prompt_list", name="prompt_manage_api.get_prompt_list")
async def get_prompt_list(request: Request):
    """ログインユーザーのプロンプトリストを取得するエンドポイント"""
    if "user_id" not in request.session:
        return jsonify({"error": "ログインしていません"}, status_code=401)

    user_id = request.session["user_id"]
    try:
        prompts = await run_blocking(_fetch_prompt_list, user_id)
        return jsonify({"prompts": prompts})
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)


@prompt_manage_api_bp.delete(
    "/prompt_list/{entry_id}", name="prompt_manage_api.delete_prompt_list_entry"
)
async def delete_prompt_list_entry(entry_id: int, request: Request):
    """プロンプトリストからエントリを削除するエンドポイント"""
    if "user_id" not in request.session:
        return jsonify({"error": "ログインしていません"}, status_code=401)

    user_id = request.session["user_id"]
    try:
        deleted = await run_blocking(_delete_prompt_list_entry_for_user, user_id, entry_id)
        if deleted == 0:
            return jsonify({"error": "対象のプロンプトが見つかりませんでした。"}, status_code=404)
        return jsonify({"message": "プロンプトを削除しました。"})
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)


@prompt_manage_api_bp.delete(
    "/saved_prompts/{prompt_id}", name="prompt_manage_api.delete_saved_prompt"
)
async def delete_saved_prompt(prompt_id: int, request: Request):
    """保存したプロンプトを削除するエンドポイント"""
    if "user_id" not in request.session:
        return jsonify({"error": "ログインしていません"}, status_code=401)

    user_id = request.session["user_id"]
    try:
        deleted = await run_blocking(_delete_saved_prompt_for_user, user_id, prompt_id)
        if deleted == 0:
            return jsonify({"error": "対象の保存済みプロンプトが見つかりませんでした。"}, status_code=404)
        return jsonify({"message": "保存したプロンプトを削除しました。"})
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)


@prompt_manage_api_bp.put("/prompts/{prompt_id}", name="prompt_manage_api.update_prompt")
async def update_prompt(prompt_id: int, request: Request):
    """投稿済みプロンプトの内容を更新するエンドポイント"""
    if "user_id" not in request.session:
        return jsonify({"error": "ログインしていません"}, status_code=401)
    user_id = request.session["user_id"]
    data = await get_json(request)
    title = data.get("title")
    category = data.get("category")
    content = data.get("content")
    input_examples = data.get("input_examples", "")
    output_examples = data.get("output_examples", "")
    if not title or not category or not content:
        return jsonify({"error": "必要なフィールドが不足しています。"}, status_code=400)

    try:
        updated = await run_blocking(
            _update_prompt_for_user,
            user_id,
            prompt_id,
            title,
            category,
            content,
            input_examples,
            output_examples,
        )
        if updated == 0:
            return jsonify({"error": "対象のプロンプトが見つかりませんでした。"}, status_code=404)
        return jsonify({"message": "プロンプトが更新されました。"})
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)


@prompt_manage_api_bp.delete("/prompts/{prompt_id}", name="prompt_manage_api.delete_prompt")
async def delete_prompt(prompt_id: int, request: Request):
    """投稿済みプロンプトを削除するエンドポイント"""
    if "user_id" not in request.session:
        return jsonify({"error": "ログインしていません"}, status_code=401)
    user_id = request.session["user_id"]

    try:
        deleted = await run_blocking(_delete_prompt_for_user, user_id, prompt_id)
        if deleted == 0:
            return jsonify({"error": "対象のプロンプトが見つかりませんでした。"}, status_code=404)
        return jsonify({"message": "プロンプトが削除されました。"})
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)
