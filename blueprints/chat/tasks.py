from flask import request, jsonify, session

from services.db import get_db_connection

from . import chat_bp


@chat_bp.route("/api/tasks", methods=["GET"])
def get_tasks():
    """
    ログインしている場合:
        ・自分のタスクのみ返す（共通タスクは登録時に複製されているため不要）
    未ログインの場合:
        ・共通タスク (user_id IS NULL) のみ返す
    """
    # Temporary mock data for testing UI changes
    mock_tasks = [
        {
            "name": "メール作成",
            "prompt_template": "ビジネスメールを作成してください。",
            "input_examples": "会議の招待メール",
            "output_examples": "件名: 月次会議のご案内\n\nお疲れさまです。..."
        },
        {
            "name": "レポート作成",
            "prompt_template": "レポートを作成してください。",
            "input_examples": "月次売上レポート",
            "output_examples": "# 月次売上レポート\n\n## 概要\n..."
        },
        {
            "name": "プレゼン資料",
            "prompt_template": "プレゼンテーション資料を作成してください。",
            "input_examples": "新商品紹介",
            "output_examples": "スライド1: タイトル\n新商品のご紹介\n\nスライド2: 特徴\n..."
        },
        {
            "name": "議事録作成",
            "prompt_template": "議事録を作成してください。",
            "input_examples": "チーム会議",
            "output_examples": "# 議事録\n\n日時: 2024/01/15\n参加者: ..."
        },
        {
            "name": "企画書作成",
            "prompt_template": "企画書を作成してください。",
            "input_examples": "新サービス企画",
            "output_examples": "# 新サービス企画書\n\n## 背景\n..."
        },
        {
            "name": "マニュアル作成",
            "prompt_template": "マニュアルを作成してください。",
            "input_examples": "操作手順書",
            "output_examples": "# 操作マニュアル\n\n## 手順1\n..."
        },
        {
            "name": "提案書作成",
            "prompt_template": "提案書を作成してください。",
            "input_examples": "業務改善提案",
            "output_examples": "# 業務改善提案書\n\n## 現状の課題\n..."
        },
        {
            "name": "分析レポート",
            "prompt_template": "分析レポートを作成してください。",
            "input_examples": "データ分析結果",
            "output_examples": "# 分析レポート\n\n## データ概要\n..."
        }
    ]
    
    return jsonify({"tasks": mock_tasks})
    
    # Original database code (commented out for testing)
    # try:
    #     conn   = get_db_connection()
    #     cursor = conn.cursor(dictionary=True)

    #     if "user_id" in session:
    #         cursor.execute("""
    #           SELECT name, prompt_template, input_examples, output_examples
    #             FROM task_with_examples
    #            WHERE user_id = %s
    #            ORDER BY COALESCE(display_order, 99999), id
    #         """, (session["user_id"],))
    #     else:
    #         cursor.execute("""
    #           SELECT name, prompt_template, input_examples, output_examples
    #             FROM task_with_examples
    #            WHERE user_id IS NULL
    #            ORDER BY COALESCE(display_order, 99999), id
    #         """)

    #     tasks = cursor.fetchall()
    #     return jsonify({"tasks": tasks})
    # except Exception as e:
    #     return jsonify({"error": str(e)}), 500
    # finally:
    #     cursor.close(); conn.close()


# タスクカード並び替え
@chat_bp.route("/api/update_tasks_order", methods=["POST"])
def update_tasks_order():
    data       = request.get_json()
    new_order  = data.get("order")
    user_id    = session.get("user_id")
    if not user_id:
        return jsonify({"error": "ログインが必要です"}), 403
    if not new_order or not isinstance(new_order, list):
        return jsonify({"error": "order must be a list"}), 400
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        for index, task_name in enumerate(new_order):
            cursor.execute("""
                UPDATE task_with_examples
                   SET display_order=%s
                 WHERE name=%s AND user_id=%s
            """, (index, task_name, user_id))
        conn.commit()
        return jsonify({"message": "Order updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


@chat_bp.route("/api/delete_task", methods=["POST"])
def delete_task():
    data      = request.get_json()
    task_name = data.get("task")
    user_id   = session.get("user_id")
    if not user_id:
        return jsonify({"error": "ログインが必要です"}), 403
    if not task_name:
        return jsonify({"error": "task is required"}), 400
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        query  = "DELETE FROM task_with_examples WHERE name=%s AND user_id=%s"
        cursor.execute(query, (task_name, user_id))
        conn.commit()
        return jsonify({"message": "Task deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


@chat_bp.route("/api/edit_task", methods=["POST"])
def edit_task():
    data            = request.get_json()
    old_task        = data.get("old_task")
    new_task        = data.get("new_task")
    prompt_template = data.get("prompt_template")
    input_examples  = data.get("input_examples")
    output_examples = data.get("output_examples")

    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "ログインが必要です"}), 403
    if not old_task or not new_task:
        return jsonify({"error": "old_task と new_task は必須です"}), 400

    try:
        conn = get_db_connection()

        sel_cursor = conn.cursor()
        sel_cursor.execute(
            """
            SELECT 1
              FROM task_with_examples
             WHERE name = %s
               AND user_id = %s
            """,
            (old_task, user_id),
        )
        exists = sel_cursor.fetchone()
        sel_cursor.close()

        if not exists:
            return jsonify({"error": "他ユーザーのタスクは編集できません"}), 403

        upd_cursor = conn.cursor()
        upd_cursor.execute(
            """
            UPDATE task_with_examples
               SET name            = %s,
                   prompt_template = %s,
                   input_examples  = %s,
                   output_examples = %s
             WHERE name = %s
               AND user_id = %s
            """,
            (new_task, prompt_template, input_examples,
             output_examples, old_task, user_id),
        )
        conn.commit()
        upd_cursor.close()

        return jsonify({"message": "Task updated"}), 200

    except Exception as e:
        print("EDIT_TASK_EXCEPTION:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


@chat_bp.route("/api/add_task", methods=["POST"])
def add_task():
    data = request.get_json()
    title           = data.get("title")
    prompt_content  = data.get("prompt_content")
    input_examples  = data.get("input_examples", "")
    output_examples = data.get("output_examples", "")

    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "ログインが必要です"}), 403

    if not title or not prompt_content:
        return jsonify({"error": "タイトルとプロンプト内容は必須です。"}), 400

    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO task_with_examples
                  (name, prompt_template, input_examples, output_examples, user_id)
            VALUES (%s,   %s,               %s,             %s,             %s)
        """
        cursor.execute(query, (title, prompt_content, input_examples,
                               output_examples, user_id))
        conn.commit()
        return jsonify({"message": "タスクが追加されました"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()
