from .db import get_db_connection


def save_message_to_db(chat_room_id, message, sender):
    # チャットメッセージを履歴テーブルへ追加する
    # Insert a chat message into the history table.
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = "INSERT INTO chat_history (chat_room_id, message, sender) VALUES (%s, %s, %s)"
        cursor.execute(query, (chat_room_id, message, sender))
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def create_chat_room_in_db(room_id, user_id, title):
    # チャットルームのメタ情報を保存する
    # Persist chat room metadata.
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = "INSERT INTO chat_rooms (id, user_id, title) VALUES (%s, %s, %s)"
        cursor.execute(query, (room_id, user_id, title))
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def rename_chat_room_in_db(room_id, new_title):
    # 既存チャットルームのタイトルを更新する
    # Update the title of an existing chat room.
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = "UPDATE chat_rooms SET title = %s WHERE id = %s"
        cursor.execute(query, (new_title, room_id))
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def get_chat_room_messages(chat_room_id):
    # LLM へ渡す role/content 形式で履歴を整形して返す
    # Return history formatted as role/content messages for LLM calls.
    """GPTへのAPI呼び出しに使う形で取得"""
    conn = get_db_connection()
    cursor = conn.cursor()
    messages = []
    try:
        query = (
            "SELECT message, sender FROM chat_history WHERE chat_room_id = %s ORDER BY id ASC"
        )
        cursor.execute(query, (chat_room_id,))
        rows = cursor.fetchall()
        for (message, sender) in rows:
            role = 'user' if sender == 'user' else 'assistant'
            messages.append({"role": role, "content": message})
        return messages
    finally:
        cursor.close()
        conn.close()


def validate_room_owner(
    room_id: str, user_id: int, forbidden_message: str
) -> tuple[dict[str, str] | None, int | None]:
    # 指定ルームの所有者チェックを行い、失敗時はAPI返却形式で返す
    # Validate room ownership and return API-shaped error on failure.
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        check_q = "SELECT user_id FROM chat_rooms WHERE id = %s"
        cursor.execute(check_q, (room_id,))
        result = cursor.fetchone()
        if not result:
            return {"error": "該当ルームが存在しません"}, 404
        if result[0] != user_id:
            return {"error": forbidden_message}, 403
        return None, None
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()
