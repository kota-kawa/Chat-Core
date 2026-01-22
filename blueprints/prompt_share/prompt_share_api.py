# prompt_share/prompt_share_api.py
from fastapi import APIRouter, Request

from services.db import get_db_connection
from services.web import get_json, jsonify

prompt_share_api_bp = APIRouter(prefix="/prompt_share/api")


@prompt_share_api_bp.get('/prompts', name="prompt_share_api.get_prompts")
async def get_prompts(request: Request):
    """
    保存されている全プロンプトを取得するエンドポイント
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    session = getattr(request, "session", {}) or {}
    user_id = session.get('user_id')
    try:
        cursor.execute("""
            SELECT id, title, category, content, author, input_examples, output_examples, created_at
            FROM prompts
            WHERE is_public = TRUE
            ORDER BY created_at DESC
        """)
        prompts = [dict(row) for row in cursor.fetchall()]

        bookmark_titles = set()
        saved_prompt_ids = set()
        saved_prompt_titles = set()
        if user_id:
            cursor.execute(
                "SELECT name FROM task_with_examples WHERE user_id = %s",
                (user_id,)
            )
            bookmarks = cursor.fetchall()
            bookmark_titles = {b['name'] for b in bookmarks}

            cursor.execute(
                """
                SELECT prompt_id, title
                FROM prompt_list_entries
                WHERE user_id = %s
                """,
                (user_id,)
            )
            saved_entries = cursor.fetchall()
            for entry in saved_entries:
                if entry['prompt_id'] is not None:
                    saved_prompt_ids.add(entry['prompt_id'])
                if entry['title']:
                    saved_prompt_titles.add(entry['title'])

        # 各プロンプトにブックマーク・保存状態のフラグを付与
        for prompt in prompts:
            created_at = prompt.get("created_at")
            if created_at is not None and hasattr(created_at, "isoformat"):
                prompt["created_at"] = created_at.isoformat()
            prompt['bookmarked'] = prompt['title'] in bookmark_titles
            prompt['saved_to_list'] = (
                prompt['id'] in saved_prompt_ids or prompt['title'] in saved_prompt_titles
            )

        return jsonify({'prompts': prompts})
    except Exception as e:
        return jsonify({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()

@prompt_share_api_bp.post('/prompts', name="prompt_share_api.create_prompt")
async def create_prompt(request: Request):
    """
    新しいプロンプトを投稿するエンドポイント
    JSON で必要なフィールド: title, category, content, author
    オプションで few_shot_examples
    """

    # セッションからログインユーザーのuser_idを取得
    if 'user_id' not in request.session:
        return jsonify({'error': 'ログインしていません'}, status_code=401)
    user_id = request.session['user_id']

    data = await get_json(request)
    title = data.get('title')
    category = data.get('category')
    content = data.get('content')
    author = data.get('author')
    input_examples = data.get('input_examples', '')
    output_examples = data.get('output_examples', '')
    # すべて公開するため、is_public は常に True とする
    is_public = True

    if not title or not category or not content or not author:
        return jsonify({'error': '必要なフィールドが不足しています。'}, status_code=400)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            INSERT INTO prompts (title, category, content, author, input_examples, output_examples, user_id, is_public, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
        """
        cursor.execute(query, (title, category, content, author, input_examples, output_examples, user_id, is_public))
        conn.commit()
        row = cursor.fetchone()
        prompt_id = row[0] if row else None
        return jsonify({'message': 'プロンプトが作成されました。', 'prompt_id': prompt_id}, status_code=201)
    except Exception as e:
        return jsonify({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@prompt_share_api_bp.post('/bookmark', name="prompt_share_api.add_bookmark")
async def add_bookmark(request: Request):
    # ログインしていない場合はエラーを返す
    if 'user_id' not in request.session:
        return jsonify({'error': 'ログインしていません'}, status_code=401)
    user_id = request.session['user_id']

    data = await get_json(request)
    title = data.get('title')
    content = data.get('content')
    input_examples = data.get('input_examples', '')
    output_examples = data.get('output_examples', '')

    # 必須項目チェック
    if not title or not content:
        return jsonify({'error': '必要なフィールドが不足しています'}, status_code=400)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id FROM task_with_examples WHERE user_id = %s AND name = %s",
            (user_id, title)
        )
        existing = cursor.fetchone()
        if existing:
            return jsonify({'message': 'すでに保存されています。', 'saved_id': existing['id']}, status_code=200)

        # user_id を必ず INSERT して、自分のタスクとして登録
        cursor.execute(
            """
            INSERT INTO task_with_examples
                (user_id, name, prompt_template, input_examples, output_examples)
            VALUES (%s,      %s,   %s,               %s,             %s)
            RETURNING id
            """,
            (user_id, title, content, input_examples, output_examples)
        )
        conn.commit()
        row = cursor.fetchone()
        saved_id = row[0] if row else None
        return jsonify({'message': 'ブックマークが保存されました。', 'saved_id': saved_id}, status_code=201)
    except Exception as e:
        return jsonify({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()



@prompt_share_api_bp.delete('/bookmark', name="prompt_share_api.remove_bookmark")
async def remove_bookmark(request: Request):
    # ログイン状態チェック
    if 'user_id' not in request.session:
        return jsonify({'error': 'ログインしていません'}, status_code=401)
    user_id = request.session['user_id']

    data = await get_json(request)
    title = data.get('title')
    if not title:
        return jsonify({'error': '必要なフィールドが不足しています'}, status_code=400)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 自分のブックマークだけを削除
        cursor.execute(
            "DELETE FROM task_with_examples WHERE user_id = %s AND name = %s",
            (user_id, title)
        )
        conn.commit()
        return jsonify({'message': 'ブックマークが削除されました。'})
    except Exception as e:
        return jsonify({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@prompt_share_api_bp.post('/prompt_list', name="prompt_share_api.add_prompt_to_list")
async def add_prompt_to_list(request: Request):
    if 'user_id' not in request.session:
        return jsonify({'error': 'ログインしていません'}, status_code=401)
    user_id = request.session['user_id']

    data = await get_json(request) or {}
    prompt_id = data.get('prompt_id')
    title = data.get('title')
    category = data.get('category', '')
    content = data.get('content')
    input_examples = data.get('input_examples', '')
    output_examples = data.get('output_examples', '')

    if not title or not content:
        return jsonify({'error': '必要なフィールドが不足しています'}, status_code=400)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if prompt_id is not None:
            cursor.execute(
                """
                SELECT id
                FROM prompt_list_entries
                WHERE user_id = %s AND prompt_id = %s
                """,
                (user_id, prompt_id),
            )
            existing = cursor.fetchone()
            if existing:
                return jsonify({'message': 'すでに保存されています。', 'saved_id': existing['id']}, status_code=200)

        cursor.execute(
            """
            SELECT id
            FROM prompt_list_entries
            WHERE user_id = %s AND prompt_id IS NULL AND title = %s
            """,
            (user_id, title),
        )
        existing_by_title = cursor.fetchone()
        if existing_by_title:
            return jsonify({'message': 'すでに保存されています。', 'saved_id': existing_by_title['id']}, status_code=200)

        cursor.execute(
            """
            INSERT INTO prompt_list_entries
                (user_id, prompt_id, title, category, content, input_examples, output_examples)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                user_id,
                prompt_id,
                title,
                category or '',
                content,
                input_examples,
                output_examples,
            ),
        )
        conn.commit()
        row = cursor.fetchone()
        saved_id = row[0] if row else None
        return jsonify({'message': 'プロンプトリストに保存しました。', 'saved_id': saved_id}, status_code=201)
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()
