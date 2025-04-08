# prompt_manage_api.py
from flask import Blueprint, request, jsonify, session
from common import get_db_connection  # 既存の DB 接続関数を利用

prompt_manage_api_bp = Blueprint('prompt_manage_api', __name__, url_prefix='/prompt_manage/api')

@prompt_manage_api_bp.route('/my_prompts', methods=['GET'])
def get_my_prompts():
    """ログインユーザーが投稿したプロンプト一覧を取得するエンドポイント"""
    if 'user_id' not in session:
        return jsonify({'error': 'ログインしていません'}), 401
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT id, title, category, content, input_examples, output_examples, created_at
            FROM prompts
            WHERE user_id = %s
            ORDER BY created_at DESC
        """
        cursor.execute(query, (user_id,))
        prompts = cursor.fetchall()
        return jsonify({'prompts': prompts})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@prompt_manage_api_bp.route('/prompts/<int:prompt_id>', methods=['PUT'])
def update_prompt(prompt_id):
    """投稿済みプロンプトの内容を更新するエンドポイント"""
    if 'user_id' not in session:
        return jsonify({'error': 'ログインしていません'}), 401
    user_id = session['user_id']
    data = request.get_json()
    title = data.get('title')
    category = data.get('category')
    content = data.get('content')
    input_examples = data.get('input_examples', '')
    output_examples = data.get('output_examples', '')
    if not title or not category or not content:
        return jsonify({'error': '必要なフィールドが不足しています。'}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            UPDATE prompts
            SET title = %s, category = %s, content = %s, input_examples = %s, output_examples = %s
            WHERE id = %s AND user_id = %s
        """
        cursor.execute(query, (title, category, content, input_examples, output_examples, prompt_id, user_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': '対象のプロンプトが見つかりませんでした。'}), 404
        return jsonify({'message': 'プロンプトが更新されました。'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@prompt_manage_api_bp.route('/prompts/<int:prompt_id>', methods=['DELETE'])
def delete_prompt(prompt_id):
    """投稿済みプロンプトを削除するエンドポイント"""
    if 'user_id' not in session:
        return jsonify({'error': 'ログインしていません'}), 401
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = "DELETE FROM prompts WHERE id = %s AND user_id = %s"
        cursor.execute(query, (prompt_id, user_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': '対象のプロンプトが見つかりませんでした。'}), 404
        return jsonify({'message': 'プロンプトが削除されました。'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
