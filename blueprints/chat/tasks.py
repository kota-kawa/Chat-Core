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
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        if "user_id" in session:
            cursor.execute("""
              SELECT name, prompt_template, input_examples, output_examples
                FROM task_with_examples
               WHERE user_id = %s
               ORDER BY COALESCE(display_order, 99999), id
            """, (session["user_id"],))
        else:
            cursor.execute("""
              SELECT name, prompt_template, input_examples, output_examples
                FROM task_with_examples
               WHERE user_id IS NULL
               ORDER BY COALESCE(display_order, 99999), id
            """)

        tasks = cursor.fetchall()
        return jsonify({"tasks": tasks})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close(); conn.close()


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
