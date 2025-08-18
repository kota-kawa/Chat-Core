from .db import get_db_connection


def copy_default_tasks_for_user(user_id):
    """user_id IS NULL の共通タスクを指定ユーザーに複製"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT name, prompt_template, input_examples,
               output_examples, display_order
          FROM task_with_examples
         WHERE user_id IS NULL
        """
    )
    defaults = cursor.fetchall()

    for name, tmpl, inp, out, disp in defaults:
        cursor.execute(
            """
            SELECT 1 FROM task_with_examples
             WHERE user_id = %s AND name = %s
            """,
            (user_id, name)
        )
        if cursor.fetchone():
            continue
        cursor.execute(
            """
            INSERT INTO task_with_examples
                  (user_id, name, prompt_template,
                   input_examples, output_examples, display_order)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_id, name, tmpl, inp, out, disp)
        )

    conn.commit()
    cursor.close()
    conn.close()


def get_user_by_email(email):
    """メールアドレスでユーザーを取得"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def get_user_by_id(user_id):
    """ユーザーIDでユーザーを取得"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT id, email, is_verified, created_at,
                   username, bio, avatar_url
              FROM users
             WHERE id = %s
            """,
            (user_id,)
        )
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def create_user(email):
    """未認証ユーザーを新規作成"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO users (email, is_verified)
            VALUES (%s, FALSE)
            """,
            (email,)
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        cursor.close()
        conn.close()


def set_user_verified(user_id):
    """ユーザーを認証済みに更新"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE users SET is_verified = TRUE
            WHERE id = %s
            """,
            (user_id,)
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()
