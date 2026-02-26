# search_module.py
from fastapi import APIRouter, Request

from services.async_utils import run_blocking
from services.db import get_db_connection  # 既存の DB 接続関数を利用
from services.web import jsonify

search_bp = APIRouter(prefix="/search")


def _search_public_prompts(query):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not query:
            return []
        sql = """
            SELECT
              id,
              title,
              category,
              content,
              author,
              input_examples,
              output_examples,
              created_at
            FROM prompts
            WHERE is_public = TRUE
              AND (
                title   LIKE %s OR
                content LIKE %s OR
                category LIKE %s OR
                author  LIKE %s
              )
            ORDER BY created_at DESC
        """
        like_query = f"%{query}%"
        cursor.execute(sql, (like_query, like_query, like_query, like_query))
        return cursor.fetchall()
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@search_bp.get('/prompts', name="search.search_prompts")
async def search_prompts(request: Request):
    """
    クエリパラメータ q に基づいてプロンプトを検索するエンドポイント
    """
    query = request.query_params.get('q', '').strip()
    try:
        prompts = await run_blocking(_search_public_prompts, query)
        return jsonify({'prompts': prompts})
    except Exception as e:
        return jsonify({'error': str(e)}, status_code=500)
