import re
import json
import html
from datetime import date

from fastapi import Request

from services.db import get_db_connection
from services.chat_service import (
    save_message_to_db,
    get_chat_room_messages,
)
from services.llm import get_gemini_response  # get_groq_response commented out
from services.web import get_json, jsonify

from . import (
    chat_bp,
    get_session_id,
    cleanup_ephemeral_chats,
    ephemeral_store,
)


@chat_bp.post("/api/chat", name="chat.chat")
async def chat(request: Request):
    cleanup_ephemeral_chats()
    data = await get_json(request)
    if not data or "message" not in data:
        return jsonify({"error": "'message' が必要です。"}, status_code=400)

    user_message = data["message"]
    chat_room_id = data.get("chat_room_id", "default")
    model = data.get("model", "gemini-1.5-flash")

    # 非ログインユーザーの場合、新規チャット・続けてのチャットの回数としてカウント
    session = request.session
    if "user_id" not in session:
        today = date.today().isoformat()
        if session.get("free_chats_date") != today:
            session["free_chats_date"] = today
            session["free_chats_count"] = 0
        if session.get("free_chats_count", 0) >= 10:
            return jsonify({"error": "1日10回までです"}, status_code=403)
        session["free_chats_count"] = session.get("free_chats_count", 0) + 1

    system_prompt = {
        "role": "system",
        "content": """
        あなたは日本語で回答する親切なアシスタントです。
        「入力例:」と「出力例:」が提供されることがあるが、その情報はあくまで入力からの回答の例であり、【リクエスト】の部分に書かれていることが最もユーザーが求めていることなので、それを１番優先して。
        """
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
                return jsonify({"error": "該当ルームが存在しません"}, status_code=404)
            if result[0] != session["user_id"]:
                return jsonify({"error": "他ユーザーのチャットルームには投稿できません"}, status_code=403)
        finally:
            cursor.close()
            conn.close()

        escaped = html.escape(user_message)
        formatted_user_message = escaped.replace("\n", "<br>")

        save_message_to_db(chat_room_id, formatted_user_message, "user")
        all_messages = get_chat_room_messages(chat_room_id)
    else:
        sid = get_session_id(session)
        if not ephemeral_store.room_exists(sid, chat_room_id):
            return jsonify({"error": "該当ルームが存在しません"}), 404

        escaped = html.escape(user_message)
        formatted_user_message = escaped.replace("\n", "<br>")
        ephemeral_store.append_message(sid, chat_room_id, "user", formatted_user_message)
        all_messages = ephemeral_store.get_messages(sid, chat_room_id)

    extra_prompt = None
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

    conversation_messages = []

    if prompt_data:
        input_examples_str = prompt_data.get("input_examples", "")
        output_examples_str = prompt_data.get("output_examples", "")
        extra_prompt = ""

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
            "content": "あなたは日本語で回答する便利なアシスタントです。",
        })
        conversation_messages.append({
            "role": "system",
            "content": extra_prompt,
        })
    else:
        conversation_messages.append(system_prompt)

    conversation_messages += all_messages

    try:
        with open('extra_prompt.txt', 'w', encoding='utf-8') as f:
            f.write(json.dumps(conversation_messages, ensure_ascii=False, indent=2))
    except Exception as e:
        print("Failed to write conversation_messages to extra_prompt.txt:", e)

    # Always use Gemini since Groq models have been removed
    bot_reply = get_gemini_response(conversation_messages, model)

    if "user_id" in session:
        save_message_to_db(chat_room_id, bot_reply, "assistant")
    else:
        sid = get_session_id(session)
        ephemeral_store.append_message(sid, chat_room_id, "assistant", bot_reply)

    return jsonify({"response": bot_reply})


@chat_bp.get("/api/get_chat_history", name="chat.get_chat_history")
async def get_chat_history(request: Request):
    cleanup_ephemeral_chats()
    chat_room_id = request.query_params.get('room_id')
    if not chat_room_id:
        return jsonify({"error": "room_id is required"}, status_code=400)

    session = request.session
    if "user_id" in session:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            check_q = "SELECT user_id FROM chat_rooms WHERE id = %s"
            cursor.execute(check_q, (chat_room_id,))
            result = cursor.fetchone()
            if not result:
                return jsonify({"error": "該当ルームが存在しません"}, status_code=404)
            if result[0] != session["user_id"]:
                return jsonify({"error": "他ユーザーのチャット履歴は見れません"}, status_code=403)
            cursor.close()
            conn.close()
        except Exception as e:
            return jsonify({"error": str(e)}, status_code=500)

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
                    "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
                })
            return jsonify({"messages": messages})
        except Exception as e:
            return jsonify({"error": str(e)}, status_code=500)
        finally:
            cursor.close()
            conn.close()
    else:
        sid = get_session_id(session)
        if not ephemeral_store.room_exists(sid, chat_room_id):
            return jsonify({"error": "該当ルームが存在しません"}, status_code=404)

        messages = ephemeral_store.get_messages(sid, chat_room_id)
        return jsonify({"messages": messages})
