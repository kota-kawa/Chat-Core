from fastapi import Request

from services.db import get_db_connection
from services.web import get_json, jsonify

from . import chat_bp


@chat_bp.get("/api/tasks", name="chat.get_tasks")
async def get_tasks(request: Request):
    """
    ログインしている場合:
        ・自分のタスクのみ返す（共通タスクは登録時に複製されているため不要）
    未ログインの場合:
        ・共通タスク (user_id IS NULL) のみ返す
    """
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        session = request.session
        if "user_id" in session:
            cursor.execute(
                """
              SELECT name,
                     prompt_template,
                     input_examples,
                     output_examples,
                     FALSE AS is_default
                FROM task_with_examples
               WHERE user_id = %s
               ORDER BY COALESCE(display_order, 99999),
                        id
            """,
                (session["user_id"],),
            )
        else:
            cursor.execute(
                """
              SELECT name,
                     prompt_template,
                     input_examples,
                     output_examples,
                     TRUE AS is_default
                FROM task_with_examples
               WHERE user_id IS NULL
               ORDER BY COALESCE(display_order, 99999), id
            """
            )

        tasks = cursor.fetchall()
        return jsonify({"tasks": tasks})
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)
    finally:
        cursor.close(); conn.close()


# タスクカード並び替え
@chat_bp.post("/api/update_tasks_order", name="chat.update_tasks_order")
async def update_tasks_order(request: Request):
    data       = await get_json(request)
    new_order  = data.get("order")
    user_id    = request.session.get("user_id")
    if not user_id:
        return jsonify({"error": "ログインが必要です"}, status_code=403)
    if not new_order or not isinstance(new_order, list):
        return jsonify({"error": "order must be a list"}, status_code=400)
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
        return jsonify({"message": "Order updated"}, status_code=200)
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)
    finally:
        cursor.close(); conn.close()


@chat_bp.post("/api/delete_task", name="chat.delete_task")
async def delete_task(request: Request):
    data      = await get_json(request)
    task_name = data.get("task")
    user_id   = request.session.get("user_id")
    if not user_id:
        return jsonify({"error": "ログインが必要です"}, status_code=403)
    if not task_name:
        return jsonify({"error": "task is required"}, status_code=400)
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        query  = "DELETE FROM task_with_examples WHERE name=%s AND user_id=%s"
        cursor.execute(query, (task_name, user_id))
        conn.commit()
        return jsonify({"message": "Task deleted"}, status_code=200)
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)
    finally:
        cursor.close(); conn.close()


@chat_bp.post("/api/edit_task", name="chat.edit_task")
async def edit_task(request: Request):
    data            = await get_json(request)
    old_task        = data.get("old_task")
    new_task        = data.get("new_task")
    prompt_template = data.get("prompt_template")
    input_examples  = data.get("input_examples")
    output_examples = data.get("output_examples")

    user_id = request.session.get("user_id")
    if not user_id:
        return jsonify({"error": "ログインが必要です"}, status_code=403)
    if not old_task or not new_task:
        return jsonify({"error": "old_task と new_task は必須です"}, status_code=400)

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
            return jsonify({"error": "他ユーザーのタスクは編集できません"}, status_code=403)

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

        return jsonify({"message": "Task updated"}, status_code=200)

    except Exception as e:
        print("EDIT_TASK_EXCEPTION:", e)
        return jsonify({"error": str(e)}, status_code=500)

    finally:
        conn.close()


@chat_bp.post("/api/add_task", name="chat.add_task")
async def add_task(request: Request):
    data = await get_json(request)
    title           = data.get("title")
    prompt_content  = data.get("prompt_content")
    input_examples  = data.get("input_examples", "")
    output_examples = data.get("output_examples", "")

    user_id = request.session.get("user_id")
    if not user_id:
        return jsonify({"error": "ログインが必要です"}, status_code=403)

    if not title or not prompt_content:
        return jsonify({"error": "タイトルとプロンプト内容は必須です。"}, status_code=400)

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
        return jsonify({"message": "タスクが追加されました"}, status_code=201)
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)
    finally:
        cursor.close(); conn.close()
