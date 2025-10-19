# prompt_share/prompt_share_api.py
from flask import Blueprint, request, jsonify, session
from services.db import get_db_connection

prompt_share_api_bp = Blueprint('prompt_share_api', __name__, url_prefix='/prompt_share/api')


@prompt_share_api_bp.route('/prompts', methods=['GET'])
def get_prompts():
    """
    保存されている全プロンプトを取得するエンドポイント
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    user_id = session.get('user_id')
    try:
        cursor.execute("""
            SELECT id, title, category, content, author, input_examples, output_examples, created_at
            FROM prompts
            WHERE is_public = TRUE
            ORDER BY created_at DESC
        """)
        prompts = cursor.fetchall()

        bookmark_titles = set()
        if user_id:
            cursor.execute(
                "SELECT name FROM task_with_examples WHERE user_id = %s",
                (user_id,)
            )
            bookmarks = cursor.fetchall()
            bookmark_titles = {b['name'] for b in bookmarks}

        # 各プロンプトにブックマーク済みかどうかのフラグを付与
        for prompt in prompts:
            prompt['bookmarked'] = prompt['title'] in bookmark_titles

        return jsonify({'prompts': prompts})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@prompt_share_api_bp.route('/prompts', methods=['POST'])
def create_prompt():
    """
    新しいプロンプトを投稿するエンドポイント
    JSON で必要なフィールド: title, category, content, author
    オプションで few_shot_examples
    """

    # セッションからログインユーザーのuser_idを取得
    if 'user_id' not in session:
        return jsonify({'error': 'ログインしていません'}), 401
    user_id = session['user_id']

    data = request.get_json()
    title = data.get('title')
    category = data.get('category')
    content = data.get('content')
    author = data.get('author')
    input_examples = data.get('input_examples', '')
    output_examples = data.get('output_examples', '')
    # すべて公開するため、is_public は常に True とする
    is_public = True

    if not title or not category or not content or not author:
        return jsonify({'error': '必要なフィールドが不足しています。'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            INSERT INTO prompts (title, category, content, author, input_examples, output_examples, user_id, is_public, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """
        cursor.execute(query, (title, category, content, author, input_examples, output_examples, user_id, is_public))
        conn.commit()
        prompt_id = cursor.lastrowid
        return jsonify({'message': 'プロンプトが作成されました。', 'prompt_id': prompt_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@prompt_share_api_bp.route('/bookmark', methods=['POST'])
def add_bookmark():
    # ログインしていない場合はエラーを返す
    if 'user_id' not in session:
        return jsonify({'error': 'ログインしていません'}), 401
    user_id = session['user_id']

    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    input_examples = data.get('input_examples', '')
    output_examples = data.get('output_examples', '')

    # 必須項目チェック
    if not title or not content:
        return jsonify({'error': '必要なフィールドが不足しています'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id FROM task_with_examples WHERE user_id = %s AND name = %s",
            (user_id, title)
        )
        existing = cursor.fetchone()
        if existing:
            return jsonify({'message': 'すでに保存されています。', 'saved_id': existing['id']}), 200

        # user_id を必ず INSERT して、自分のタスクとして登録
        cursor.execute(
            """
            INSERT INTO task_with_examples
                (user_id, name, prompt_template, input_examples, output_examples)
            VALUES (%s,      %s,   %s,               %s,             %s)
            """,
            (user_id, title, content, input_examples, output_examples)
        )
        conn.commit()
        return jsonify({'message': 'ブックマークが保存されました。', 'saved_id': cursor.lastrowid}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()



@prompt_share_api_bp.route('/bookmark', methods=['DELETE'])
def remove_bookmark():
    # ログイン状態チェック
    if 'user_id' not in session:
        return jsonify({'error': 'ログインしていません'}), 401
    user_id = session['user_id']

    data = request.get_json()
    title = data.get('title')
    if not title:
        return jsonify({'error': '必要なフィールドが不足しています'}), 400

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
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

