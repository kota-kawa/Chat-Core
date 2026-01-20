from datetime import date, datetime

from fastapi import Request

from services.db import get_db_connection
from services.chat_service import (
    create_chat_room_in_db,
    rename_chat_room_in_db,
)

from services.web import get_json, jsonify

from . import chat_bp, cleanup_ephemeral_chats, ephemeral_chats, get_session_id


@chat_bp.post("/api/new_chat_room", name="chat.new_chat_room")
async def new_chat_room(request: Request):
    cleanup_ephemeral_chats()
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
            create_chat_room_in_db(room_id, user_id, title)
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

        # セッションIDをキーにして、サーバ側メモリに保持
        sid = get_session_id(session)
        if sid not in ephemeral_chats:
            ephemeral_chats[sid] = {}
        # ルーム作成時に現在時刻も記録
        ephemeral_chats[sid][room_id] = {"title": title, "messages": [], "created_at": datetime.now()}

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
    cleanup_ephemeral_chats()
    session = request.session
    if "user_id" in session:
        # ログインユーザー：DBから取得
        user_id = session["user_id"]
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
            for (r_id, r_title, r_created) in rows:
                rooms.append({
                    "id": r_id,
                    "title": r_title,
                    "created_at": r_created.strftime("%Y-%m-%d %H:%M:%S")
                })
            return jsonify({"rooms": rooms})
        except Exception as e:
            return jsonify({"error": str(e)}, status_code=500)
        finally:
            cursor.close()
            conn.close()
    else:
        # 非ログインユーザーにはサイドバー上でチャットルーム一覧は表示しない
        return jsonify({"rooms": []})


@chat_bp.post("/api/delete_chat_room", name="chat.delete_chat_room")
async def delete_chat_room(request: Request):
    cleanup_ephemeral_chats()
    data = await get_json(request)
    room_id = data.get('room_id')
    if not room_id:
        return jsonify({"error": "room_id is required"}, status_code=400)

    session = request.session
    if "user_id" in session:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            check_q = "SELECT user_id FROM chat_rooms WHERE id = %s"
            cursor.execute(check_q, (room_id,))
            result = cursor.fetchone()
            if not result:
                return jsonify({"error": "該当ルームが存在しません"}, status_code=404)
            if result[0] != session["user_id"]:
                return jsonify({"error": "他ユーザーのチャットルームは削除できません"}, status_code=403)

            del_history_q = "DELETE FROM chat_history WHERE chat_room_id = %s"
            cursor.execute(del_history_q, (room_id,))
            del_room_q = "DELETE FROM chat_rooms WHERE id = %s"
            cursor.execute(del_room_q, (room_id,))
            conn.commit()
            return jsonify({"message": "削除しました"}, status_code=200)
        except Exception as e:
            return jsonify({"error": str(e)}, status_code=500)
        finally:
            cursor.close()
            conn.close()
    else:
        sid = get_session_id(session)
        if sid not in ephemeral_chats:
            return jsonify({"error": "該当ルームが存在しません"}, status_code=404)

        if room_id in ephemeral_chats[sid]:
            del ephemeral_chats[sid][room_id]
            return jsonify({"message": "エフェメラルチャットルームを削除しました"}, status_code=200)
        else:
            return jsonify({"error": "該当ルームが存在しません"}, status_code=404)


@chat_bp.post("/api/rename_chat_room", name="chat.rename_chat_room")
async def rename_chat_room(request: Request):
    cleanup_ephemeral_chats()
    data = await get_json(request)
    room_id = data.get("room_id")
    new_title = data.get("new_title")
    if not room_id or not new_title:
        return jsonify({"error": "room_id と new_title が必要です"}, status_code=400)

    session = request.session
    if "user_id" in session:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            check_q = "SELECT user_id FROM chat_rooms WHERE id = %s"
            cursor.execute(check_q, (room_id,))
            result = cursor.fetchone()
            if not result:
                return jsonify({"error": "該当ルームが存在しません"}, status_code=404)
            if result[0] != session["user_id"]:
                return jsonify({"error": "他ユーザーのチャットルームは変更できません"}, status_code=403)
            cursor.close()
            conn.close()

            rename_chat_room_in_db(room_id, new_title)
            return jsonify({"message": "ルーム名を変更しました"}, status_code=200)
        except Exception as e:
            return jsonify({"error": str(e)}, status_code=500)
    else:
        sid = get_session_id(session)
        if sid not in ephemeral_chats or room_id not in ephemeral_chats[sid]:
            return jsonify({"error": "該当ルームが存在しません"}, status_code=404)

        ephemeral_chats[sid][room_id]["title"] = new_title
        return jsonify({"message": "ルーム名を変更しました"}, status_code=200)
