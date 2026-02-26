from datetime import date

from fastapi import Request

from services.async_utils import run_blocking
from services.db import get_db_connection
from services.chat_service import (
    create_chat_room_in_db,
    rename_chat_room_in_db,
)

from services.web import get_json, jsonify

from . import chat_bp, cleanup_ephemeral_chats, ephemeral_store, get_session_id


def _fetch_user_rooms(user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            SELECT id, title, created_at
            FROM chat_rooms
            WHERE user_id = %s
            ORDER BY created_at DESC
        """
        cursor.execute(query, (user_id,))
        rows = cursor.fetchall()
        rooms = []
        for (room_id, title, created_at) in rows:
            rooms.append(
                {
                    "id": room_id,
                    "title": title,
                    "created_at": created_at.strftime("%Y-%m-%d %H:%M:%S"),
                }
            )
        return rooms
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def _validate_room_owner(room_id, user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        check_q = "SELECT user_id FROM chat_rooms WHERE id = %s"
        cursor.execute(check_q, (room_id,))
        result = cursor.fetchone()
        if not result:
            return False, {"error": "該当ルームが存在しません"}, 404
        if result[0] != user_id:
            return False, {"error": "他ユーザーのチャットルームは変更できません"}, 403
        return True, None, None
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def _delete_room_for_user(room_id, user_id):
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
            return {"error": "他ユーザーのチャットルームは削除できません"}, 403

        del_history_q = "DELETE FROM chat_history WHERE chat_room_id = %s"
        cursor.execute(del_history_q, (room_id,))
        del_room_q = "DELETE FROM chat_rooms WHERE id = %s"
        cursor.execute(del_room_q, (room_id,))
        conn.commit()
        return {"message": "削除しました"}, 200
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@chat_bp.post("/api/new_chat_room", name="chat.new_chat_room")
async def new_chat_room(request: Request):
    await run_blocking(cleanup_ephemeral_chats)
    data = await get_json(request)
    if not data or "id" not in data:
        return jsonify({"error": "'id' フィールドが必要です。"}, status_code=400)
    room_id = data["id"]
    title = data.get("title", "新規チャット")

    session = request.session
    if "user_id" in session:
        # ログインユーザーの場合はDBに保存（利用回数制限なし）
        user_id = session["user_id"]
        try:
            await run_blocking(create_chat_room_in_db, room_id, user_id, title)
            return jsonify(
                {
                    "message": "チャットルームが作成されました。",
                    "id": room_id,
                    "title": title,
                },
                status_code=201,
            )
        except Exception as e:
            return jsonify({"error": str(e)}, status_code=500)
    else:
        # 非ログインユーザーの場合は、1日10回まで利用可能
        today = date.today().isoformat()
        if session.get("free_chats_date") != today:
            session["free_chats_date"] = today
            session["free_chats_count"] = 0
        if session.get("free_chats_count", 0) >= 10:
            return jsonify({"error": "1日10回までです"}, status_code=403)
        session["free_chats_count"] = session.get("free_chats_count", 0) + 1

        sid = get_session_id(session)
        await run_blocking(ephemeral_store.create_room, sid, room_id, title)

        return jsonify(
            {
                "message": "エフェメラルチャットルームが作成されました。",
                "id": room_id,
                "title": title,
            },
            status_code=201,
        )


@chat_bp.get("/api/get_chat_rooms", name="chat.get_chat_rooms")
async def get_chat_rooms(request: Request):
    await run_blocking(cleanup_ephemeral_chats)
    session = request.session
    if "user_id" in session:
        # ログインユーザー：DBから取得
        user_id = session["user_id"]
        try:
            rooms = await run_blocking(_fetch_user_rooms, user_id)
            return jsonify({"rooms": rooms})
        except Exception as e:
            return jsonify({"error": str(e)}, status_code=500)
    else:
        # 非ログインユーザーにはサイドバー上でチャットルーム一覧は表示しない
        return jsonify({"rooms": []})


@chat_bp.post("/api/delete_chat_room", name="chat.delete_chat_room")
async def delete_chat_room(request: Request):
    await run_blocking(cleanup_ephemeral_chats)
    data = await get_json(request)
    room_id = data.get('room_id')
    if not room_id:
        return jsonify({"error": "room_id is required"}, status_code=400)

    session = request.session
    if "user_id" in session:
        try:
            payload, status_code = await run_blocking(
                _delete_room_for_user, room_id, session["user_id"]
            )
            return jsonify(payload, status_code=status_code)
        except Exception as e:
            return jsonify({"error": str(e)}, status_code=500)
    else:
        sid = get_session_id(session)
        if not await run_blocking(ephemeral_store.delete_room, sid, room_id):
            return jsonify({"error": "該当ルームが存在しません"}, status_code=404)
        return jsonify({"message": "エフェメラルチャットルームを削除しました"}, status_code=200)


@chat_bp.post("/api/rename_chat_room", name="chat.rename_chat_room")
async def rename_chat_room(request: Request):
    await run_blocking(cleanup_ephemeral_chats)
    data = await get_json(request)
    room_id = data.get("room_id")
    new_title = data.get("new_title")
    if not room_id or not new_title:
        return jsonify({"error": "room_id と new_title が必要です"}, status_code=400)

    session = request.session
    if "user_id" in session:
        try:
            is_owner, payload, status_code = await run_blocking(
                _validate_room_owner, room_id, session["user_id"]
            )
            if not is_owner:
                return jsonify(payload, status_code=status_code)

            await run_blocking(rename_chat_room_in_db, room_id, new_title)
            return jsonify({"message": "ルーム名を変更しました"}, status_code=200)
        except Exception as e:
            return jsonify({"error": str(e)}, status_code=500)
    else:
        sid = get_session_id(session)
        if not await run_blocking(ephemeral_store.rename_room, sid, room_id, new_title):
            return jsonify({"error": "該当ルームが存在しません"}, status_code=404)
        return jsonify({"message": "ルーム名を変更しました"}, status_code=200)
