# chat.py
from flask import Blueprint, request, jsonify, render_template, redirect, url_for, session
from common import (
    get_db_connection,
    save_message_to_db,
    get_chat_room_messages,
    get_groq_response,
    create_chat_room_in_db,
    rename_chat_room_in_db
)
import re
import json
import os
from datetime import date, datetime, timedelta
import uuid

# セッションIDを取得するヘルパー関数
def get_session_id():
    if "sid" not in session:
        session["sid"] = str(uuid.uuid4())
    return session["sid"]

# エフェメラルチャットの有効期限（秒）
EXPIRATION_TIME = 3600  # 1時間

# エフェメラルチャットのデータをクリーンアップする関数
def cleanup_ephemeral_chats():
    now = datetime.now()
    sids_to_delete = []
    for sid, rooms in ephemeral_chats.items():
        room_ids_to_delete = []
        for room_id, room_data in rooms.items():
            created_at = room_data.get("created_at")
            if created_at and (now - created_at).total_seconds() > EXPIRATION_TIME:
                room_ids_to_delete.append(room_id)
        for room_id in room_ids_to_delete:
            del rooms[room_id]
        if not rooms:
            sids_to_delete.append(sid)
    for sid in sids_to_delete:
        del ephemeral_chats[sid]

chat_bp = Blueprint('chat', __name__)

# ----------------------------------------
# 未ログインユーザー用のエフェメラルチャットをサーバ側に保存する辞書
# キー: セッションID (get_session_id() で取得)
# 値: { room_id1: {"title": ..., "messages": [...], "created_at": datetime}, room_id2: ... }
# ----------------------------------------
ephemeral_chats = {}

@chat_bp.route("/")
def index():
    """トップページ (チャット画面)
    ログインしていなくても利用可能とする。
    """
    cleanup_ephemeral_chats()
    return render_template("home.html")

@chat_bp.route("/api/new_chat_room", methods=["POST"])
def new_chat_room():
    cleanup_ephemeral_chats()
    data = request.get_json()
    if not data or "id" not in data:
        return jsonify({"error": "'id' フィールドが必要です。"}), 400
    room_id = data["id"]
    title = data.get("title", "新規チャット")

    if "user_id" in session:
        # ログインユーザーの場合はDBに保存（利用回数制限なし）
        user_id = session["user_id"]
        try:
            create_chat_room_in_db(room_id, user_id, title)
            return jsonify({"message": "チャットルームが作成されました。", "id": room_id, "title": title}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        # 非ログインユーザーの場合は、1日10回まで利用可能
        today = date.today().isoformat()
        if session.get("free_chats_date") != today:
            session["free_chats_date"] = today
            session["free_chats_count"] = 0
        if session.get("free_chats_count", 0) >= 10:
            return jsonify({"error": "1日10回までです"}), 403
        session["free_chats_count"] = session.get("free_chats_count", 0) + 1

        # セッションIDをキーにして、サーバ側メモリに保持
        sid = get_session_id()
        if sid not in ephemeral_chats:
            ephemeral_chats[sid] = {}
        # ルーム作成時に現在時刻も記録
        ephemeral_chats[sid][room_id] = {"title": title, "messages": [], "created_at": datetime.now()}

        return jsonify({"message": "エフェメラルチャットルームが作成されました。", "id": room_id, "title": title}), 201

@chat_bp.route("/api/get_chat_rooms", methods=["GET"])
def get_chat_rooms():
    cleanup_ephemeral_chats()
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
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    else:
        # 非ログインユーザーにはサイドバー上でチャットルーム一覧は表示しない
        return jsonify({"rooms": []})

@chat_bp.route("/api/delete_chat_room", methods=["POST"])
def delete_chat_room():
    cleanup_ephemeral_chats()
    data = request.get_json()
    room_id = data.get('room_id')
    if not room_id:
        return jsonify({"error": "room_id is required"}), 400

    if "user_id" in session:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            check_q = "SELECT user_id FROM chat_rooms WHERE id = %s"
            cursor.execute(check_q, (room_id,))
            result = cursor.fetchone()
            if not result:
                return jsonify({"error": "該当ルームが存在しません"}), 404
            if result[0] != session["user_id"]:
                return jsonify({"error": "他ユーザーのチャットルームは削除できません"}), 403

            del_history_q = "DELETE FROM chat_history WHERE chat_room_id = %s"
            cursor.execute(del_history_q, (room_id,))
            del_room_q = "DELETE FROM chat_rooms WHERE id = %s"
            cursor.execute(del_room_q, (room_id,))
            conn.commit()
            return jsonify({"message": "削除しました"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    else:
        sid = get_session_id()
        if sid not in ephemeral_chats:
            return jsonify({"error": "該当ルームが存在しません"}), 404

        if room_id in ephemeral_chats[sid]:
            del ephemeral_chats[sid][room_id]
            return jsonify({"message": "エフェメラルチャットルームを削除しました"}), 200
        else:
            return jsonify({"error": "該当ルームが存在しません"}), 404

@chat_bp.route("/api/rename_chat_room", methods=["POST"])
def rename_chat_room():
    cleanup_ephemeral_chats()
    data = request.get_json()
    room_id = data.get("room_id")
    new_title = data.get("new_title")
    if not room_id or not new_title:
        return jsonify({"error": "room_id と new_title が必要です"}), 400

    if "user_id" in session:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            check_q = "SELECT user_id FROM chat_rooms WHERE id = %s"
            cursor.execute(check_q, (room_id,))
            result = cursor.fetchone()
            if not result:
                return jsonify({"error": "該当ルームが存在しません"}), 404
            if result[0] != session["user_id"]:
                return jsonify({"error": "他ユーザーのチャットルームは変更できません"}), 403
            cursor.close()
            conn.close()

            rename_chat_room_in_db(room_id, new_title)
            return jsonify({"message": "ルーム名を変更しました"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        sid = get_session_id()
        if sid not in ephemeral_chats or room_id not in ephemeral_chats[sid]:
            return jsonify({"error": "該当ルームが存在しません"}), 404

        ephemeral_chats[sid][room_id]["title"] = new_title
        return jsonify({"message": "ルーム名を変更しました"}), 200

@chat_bp.route("/api/chat", methods=["POST"])
def chat():
    cleanup_ephemeral_chats()
    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "'message' が必要です。"}), 400

    user_message = data["message"]
    chat_room_id = data.get("chat_room_id", "default")
    model = data.get("model", "llama-3.3-70b-versatile")

    # 非ログインユーザーの場合、新規チャット・続けてのチャットの回数としてカウント
    if "user_id" not in session:
        today = date.today().isoformat()
        if session.get("free_chats_date") != today:
            session["free_chats_date"] = today
            session["free_chats_count"] = 0
        if session.get("free_chats_count", 0) >= 10:
            return jsonify({"error": "1日10回までです"}), 403
        session["free_chats_count"] = session.get("free_chats_count", 0) + 1

    system_prompt = {
        "role": "system",
        "content": "あなたは日本語で回答する便利なアシスタントです。"
    }

    match = re.match(r"【状況・作業環境】(.+)\n【リクエスト】(.+)", user_message)

    if "user_id" in session:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            check_q = "SELECT user_id FROM chat_rooms WHERE id = %s"
            cursor.execute(check_q, (chat_room_id,))
            result = cursor.fetchone()
            if not result:
                return jsonify({"error": "該当ルームが存在しません"}), 404
            if result[0] != session["user_id"]:
                return jsonify({"error": "他ユーザーのチャットルームには投稿できません"}), 403
        finally:
            cursor.close()
            conn.close()

        save_message_to_db(chat_room_id, user_message, "user")
        all_messages = get_chat_room_messages(chat_room_id)
    else:
        sid = get_session_id()
        if sid not in ephemeral_chats or chat_room_id not in ephemeral_chats[sid]:
            return jsonify({"error": "該当ルームが存在しません"}), 404

        ephemeral_chats[sid][chat_room_id]["messages"].append({"role": "user", "content": user_message})
        all_messages = ephemeral_chats[sid][chat_room_id]["messages"]



    extra_prompt = None
    # ユーザーメッセージの解析前に初期化
    prompt_data = None  # prompt_data を初期化

    if match and len(all_messages) == 1:
        environment = match.group(1).strip()
        task = match.group(2).strip()

        # DBから指定タスクのプロンプトテンプレートと few-shot 例を取得する
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        query = "SELECT prompt_template, input_examples, output_examples FROM task_with_examples WHERE name = %s"
        cursor.execute(query, (task,))
        prompt_data = cursor.fetchone()
        cursor.close()
        conn.close()

    # conversation_messages を必ず初期化
    conversation_messages = []

    
    if prompt_data:
        # 変更開始: DBに登録されている few shot の例は JSON 配列ではなくプレーンテキストの場合にも対応する
        input_examples_str = prompt_data.get("input_examples", "")
        output_examples_str = prompt_data.get("output_examples", "")
        extra_prompt = ""

        # ヘルパー関数: 文字列が JSON 配列ならパース、そうでなければ単一例としてリスト化する
        def parse_examples(ex_str):
            if not ex_str:
                return []
            ex_str = ex_str.strip()
            if ex_str.startswith("["):
                try:
                    return json.loads(ex_str)
                except Exception as e:
                    print("JSONパースエラー:", e)
                    return [ex_str]
            else:
                return [ex_str]

        loaded_input_examples = parse_examples(input_examples_str)
        loaded_output_examples = parse_examples(output_examples_str)

        # 数が異なる場合は、少ない方の数に合わせる
        num_examples = min(len(loaded_input_examples), len(loaded_output_examples))
        if num_examples > 0:
            few_shot_text_lines = []
            for i in range(num_examples):
                inp_text = loaded_input_examples[i].strip()
                out_text = loaded_output_examples[i].strip()
                few_shot_text_lines.append("Q{}: {}\nA{}: {}".format(i+1, inp_text, i+1, out_text))
            extra_prompt = "\n\n".join(few_shot_text_lines)

        conversation_messages.append({
            "role": "system",
            "content": "あなたは日本語で回答する便利なアシスタントです。"
        })
        conversation_messages.append({
            "role": "system",
            "content": extra_prompt
        })
    else:
        conversation_messages.append(system_prompt)

    conversation_messages += all_messages


    # conversation_messages を extra_prompt.txt に書き込む
    try:
        with open('extra_prompt.txt', 'w', encoding='utf-8') as f:
            f.write(json.dumps(conversation_messages, ensure_ascii=False, indent=2))
    except Exception as e:
        print("Failed to write conversation_messages to extra_prompt.txt:", e)


    if model == "google-gemini":
        from gemini import get_gemini_response
        bot_reply = get_gemini_response(conversation_messages, model)
    else:
        bot_reply = get_groq_response(conversation_messages, model)

    if "user_id" in session:
        save_message_to_db(chat_room_id, bot_reply, "assistant")
    else:
        sid = get_session_id()
        ephemeral_chats[sid][chat_room_id]["messages"].append({"role": "assistant", "content": bot_reply})

    return jsonify({"response": bot_reply})

@chat_bp.route("/api/get_chat_history", methods=["GET"])
def get_chat_history():
    cleanup_ephemeral_chats()
    chat_room_id = request.args.get('room_id')
    if not chat_room_id:
        return jsonify({"error": "room_id is required"}), 400

    if "user_id" in session:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            check_q = "SELECT user_id FROM chat_rooms WHERE id = %s"
            cursor.execute(check_q, (chat_room_id,))
            result = cursor.fetchone()
            if not result:
                return jsonify({"error": "該当ルームが存在しません"}), 404
            if result[0] != session["user_id"]:
                return jsonify({"error": "他ユーザーのチャット履歴は見れません"}), 403
            cursor.close()
            conn.close()
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            query = """
                SELECT message, sender, timestamp
                FROM chat_history
                WHERE chat_room_id = %s
                ORDER BY id ASC
            """
            cursor.execute(query, (chat_room_id,))
            rows = cursor.fetchall()
            messages = []
            for (msg, sender, ts) in rows:
                messages.append({
                    "message": msg,
                    "sender": sender,
                    "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S")
                })
            return jsonify({"messages": messages})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    else:
        sid = get_session_id()
        if sid not in ephemeral_chats or chat_room_id not in ephemeral_chats[sid]:
            return jsonify({"error": "該当ルームが存在しません"}), 404

        messages = ephemeral_chats[sid][chat_room_id]["messages"]
        return jsonify({"messages": messages})


# タスクカードの取得
@chat_bp.route("/api/tasks", methods=["GET"])
def get_tasks():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # display_order に基づいて並び替え
        query = "SELECT name, input_examples, output_examples FROM task_with_examples ORDER BY display_order ASC"
        cursor.execute(query)
        tasks = cursor.fetchall()  # 例: [{'name': 'メール作成'}, …]
        return jsonify({"tasks": tasks})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# タスクカード並び替え
@chat_bp.route("/api/update_tasks_order", methods=["POST"])
def update_tasks_order():
    data = request.get_json()
    new_order = data.get("order")
    if not new_order or not isinstance(new_order, list):
        return jsonify({"error": "order must be a list"}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        for index, task_name in enumerate(new_order):
            query = "UPDATE task_with_examples SET display_order = %s WHERE name = %s"
            cursor.execute(query, (index, task_name))
        conn.commit()
        return jsonify({"message": "Order updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
