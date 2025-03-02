# prompt_share/prompt_share_api.py
from flask import Blueprint, request, jsonify
from common import get_db_connection

prompt_share_api_bp = Blueprint('prompt_share_api', __name__, url_prefix='/prompt_share/api')

@prompt_share_api_bp.route('/prompts', methods=['GET'])
def get_prompts():
    """
    保存されている全プロンプトを取得するエンドポイント
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, title, category, content, author, prompt_example, created_at
            FROM prompts
            ORDER BY created_at DESC
        """)
        prompts = cursor.fetchall()
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
    オプションで prompt_example
    """
    data = request.get_json()
    title = data.get('title')
    category = data.get('category')
    content = data.get('content')
    author = data.get('author')
    prompt_example = data.get('prompt_example', '')

    if not title or not category or not content or not author:
        return jsonify({'error': '必要なフィールドが不足しています。'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            INSERT INTO prompts (title, category, content, author, prompt_example, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """
        cursor.execute(query, (title, category, content, author, prompt_example))
        conn.commit()
        prompt_id = cursor.lastrowid
        return jsonify({'message': 'プロンプトが作成されました。', 'prompt_id': prompt_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
