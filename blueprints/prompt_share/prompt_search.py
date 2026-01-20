# search_module.py
from fastapi import APIRouter, Request

from services.db import get_db_connection  # 既存の DB 接続関数を利用
from services.web import jsonify

search_bp = APIRouter(prefix="/search")


@search_bp.get('/prompts', name="search.search_prompts")
async def search_prompts(request: Request):
    """
    クエリパラメータ q に基づいてプロンプトを検索するエンドポイント
    """
    query = request.query_params.get('q', '').strip()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if query:
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
            cursor.execute(sql, (
                like_query,
                like_query,
                like_query,
                like_query
            ))
            prompts = cursor.fetchall()
        else:
            prompts = []
        return jsonify({'prompts': prompts})
    except Exception as e:
        return jsonify({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()
