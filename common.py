import os
import random
import mysql.connector
import smtplib
from email.mime.text import MIMEText
from email.utils import formatdate

from groq import Groq

# --------------------------------------------------
# メール送信用アカウント情報
# --------------------------------------------------
SEND_ADDRESS = 'youzitsurist@gmail.com'
SEND_PASSWORD = 'xbxueirkbfiyoskx'  # 例: アプリパスワード

# --------------------------------------------------
# Groq APIキー
# --------------------------------------------------
api_key = os.environ.get('GROQ_API_KEY')
client = Groq(api_key=api_key)

# --------------------------------------------------
# MySQL 接続設定
# --------------------------------------------------
db_config = {
    'host': os.environ.get('MYSQL_HOST', 'mysql_db'),
    'user': os.environ.get('MYSQL_USER', 'chatuser'),
    'password': os.environ.get('MYSQL_PASSWORD', 'chatpass'),
    'database': os.environ.get('MYSQL_DATABASE', 'chat_db')
}

def get_db_connection():
    """MySQLへの接続を返す"""
    return mysql.connector.connect(**db_config)

# =================================================================
# ユーザー管理関連
# =================================================================

def copy_default_tasks_for_user(user_id):
    """
    user_id IS NULL の“共通タスク”を、指定ユーザー専用として複製する。
    すでに同名タスクが存在する場合はスキップ。
    """
    conn   = get_db_connection()
    cursor = conn.cursor()

    # 共通タスクを取得
    cursor.execute("""
        SELECT name,
               prompt_template,
               input_examples,
               output_examples,
               display_order
          FROM task_with_examples
         WHERE user_id IS NULL
    """)
    defaults = cursor.fetchall()

    # ユーザー専用タスクとして INSERT（重複名はスキップ）
    for name, tmpl, inp, out, disp in defaults:
        cursor.execute("""
            SELECT 1
              FROM task_with_examples
             WHERE user_id = %s AND name = %s
        """, (user_id, name))
        if cursor.fetchone():
            continue

        cursor.execute("""
            INSERT INTO task_with_examples
                  (user_id, name, prompt_template,
                   input_examples, output_examples, display_order)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (user_id, name, tmpl, inp, out, disp))

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
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

def create_user(email):
    """未認証ユーザーを新規作成 (is_verified=False)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO users (email, is_verified)
            VALUES (%s, FALSE)
        """, (email,))
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
        cursor.execute("""
            UPDATE users SET is_verified = TRUE
            WHERE id = %s
        """, (user_id,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

# =================================================================
# メール送信用
# =================================================================

def send_email(to_address, subject, body_text):
    """指定アドレスにメール送信"""
    smtpobj = smtplib.SMTP("smtp.gmail.com", 587)
    smtpobj.starttls()
    smtpobj.login(SEND_ADDRESS, SEND_PASSWORD)
    msg = MIMEText(body_text)
    msg['Subject'] = subject
    msg['From'] = SEND_ADDRESS
    msg['To'] = to_address
    msg['Date'] = formatdate()
    smtpobj.send_message(msg)
    smtpobj.close()

# =================================================================
# チャット関連
# =================================================================

def save_message_to_db(chat_room_id, message, sender):
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
    """GPTへのAPI呼び出しに使う形で取得"""
    conn = get_db_connection()
    cursor = conn.cursor()
    messages = []
    try:
        query = """
            SELECT message, sender
            FROM chat_history
            WHERE chat_room_id = %s
            ORDER BY id ASC
        """
        cursor.execute(query, (chat_room_id,))
        rows = cursor.fetchall()
        for (message, sender) in rows:
            role = 'user' if sender == 'user' else 'assistant'
            messages.append({
                "role": role,
                "content": message
            })
        return messages
    finally:
        cursor.close()
        conn.close()

def get_groq_response(conversation_messages, model):
    """Groq API呼び出し"""
    try:
        response = client.chat.completions.create(
            model=model,
            messages=conversation_messages,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Groq API Error: {e}")
        return "エラーが発生しました。後でもう一度お試しください。"
