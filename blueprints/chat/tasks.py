from fastapi import Request

from services.async_utils import run_blocking
from services.db import get_db_connection
from services.default_tasks import default_task_payloads
from services.web import get_json, jsonify

from . import chat_bp


def _fetch_tasks_from_db(user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        if user_id:
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
                (user_id,),
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

        return cursor.fetchall()
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def _update_tasks_order_for_user(user_id, new_order):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        for index, task_name in enumerate(new_order):
            cursor.execute(
                """
                UPDATE task_with_examples
                   SET display_order=%s
                 WHERE name=%s AND user_id=%s
            """,
                (index, task_name, user_id),
            )
        conn.commit()
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def _delete_task_for_user(user_id, task_name):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "DELETE FROM task_with_examples WHERE name=%s AND user_id=%s"
        cursor.execute(query, (task_name, user_id))
        conn.commit()
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def _edit_task_for_user(
    user_id,
    old_task,
    new_task,
    prompt_template,
    input_examples,
    output_examples,
):
    conn = None
    sel_cursor = None
    upd_cursor = None
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
        if not exists:
            return False

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
            (
                new_task,
                prompt_template,
                input_examples,
                output_examples,
                old_task,
                user_id,
            ),
        )
        conn.commit()
        return True
    finally:
        if sel_cursor is not None:
            sel_cursor.close()
        if upd_cursor is not None:
            upd_cursor.close()
        if conn is not None:
            conn.close()


def _add_task_for_user(user_id, title, prompt_content, input_examples, output_examples):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO task_with_examples
                  (name, prompt_template, input_examples, output_examples, user_id)
            VALUES (%s,   %s,               %s,             %s,             %s)
        """
        cursor.execute(
            query, (title, prompt_content, input_examples, output_examples, user_id)
        )
        conn.commit()
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@chat_bp.get("/api/tasks", name="chat.get_tasks")
async def get_tasks(request: Request):
    """
    ログインしている場合:
        ・自分のタスクのみ返す（共通タスクは登録時に複製されているため不要）
    未ログインの場合:
        ・共通タスク (user_id IS NULL) のみ返す
    """
    try:
        session = request.session
        # user_id が None や空文字の場合は未ログインとして扱う
        user_id = session.get("user_id")
        if not user_id:
            user_id = None

        tasks = []
        try:
            tasks = await run_blocking(_fetch_tasks_from_db, user_id)

        except Exception as db_err:
            print(f"Database error in get_tasks: {db_err}")
            # ログインユーザーの場合、DBエラーはそのままエラーとして扱う（または空リスト？）
            # ここでは安全のためエラーをログに出しつつ、
            # もし未ログインならデフォルトタスクを返すようにフローを継続する
            if user_id:
                # ユーザーがいるのにDBエラーなら500にする（frontendでハンドリングされる）
                raise db_err
            # 未ログインならDBエラーでも続行（tasks=[] のまま）

        # 未ログイン かつ タスクが取得できていない場合はデフォルトタスクを使用
        if not user_id and not tasks:
            tasks = default_task_payloads()

        return jsonify({"tasks": tasks})

    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)


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
        await run_blocking(_update_tasks_order_for_user, user_id, new_order)
        return jsonify({"message": "Order updated"}, status_code=200)
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)


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
        await run_blocking(_delete_task_for_user, user_id, task_name)
        return jsonify({"message": "Task deleted"}, status_code=200)
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)


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
        updated = await run_blocking(
            _edit_task_for_user,
            user_id,
            old_task,
            new_task,
            prompt_template,
            input_examples,
            output_examples,
        )
        if not updated:
            return jsonify({"error": "他ユーザーのタスクは編集できません"}, status_code=403)

        return jsonify({"message": "Task updated"}, status_code=200)

    except Exception as e:
        print("EDIT_TASK_EXCEPTION:", e)
        return jsonify({"error": str(e)}, status_code=500)


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
        await run_blocking(
            _add_task_for_user,
            user_id,
            title,
            prompt_content,
            input_examples,
            output_examples,
        )
        return jsonify({"message": "タスクが追加されました"}, status_code=201)
    except Exception as e:
        return jsonify({"error": str(e)}, status_code=500)
