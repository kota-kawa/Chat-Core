# gemini.py
import google.generativeai as genai
import os


# 環境変数からAPIキーを取得
gemini_api_key = os.environ.get("Gemini_API_KEY")
if not gemini_api_key:
    raise ValueError("Gemini_API_KEY が環境変数に設定されていません。")

# APIキーを設定
genai.configure(api_key=gemini_api_key)

# 利用するモデルを初期化（例：gemini-1.5-flash）
gemini_model = genai.GenerativeModel("gemini-1.5-flash")

def get_gemini_response(conversation_messages, model_name):
    """
    Google Gemini API を呼び出し、チャットの応答を取得する。
    
    Parameters:
      conversation_messages: 各メッセージは {"role": <role>, "content": <テキスト>} の形式の辞書のリスト。
      model_name: 利用するモデル名（本実装では引数は無視し、gemini_model を使用）
    
    Returns:
      Gemini モデルから生成されたテキスト応答。
    """
    try:
        # 新たなチャットセッションを開始（過去の履歴はリセット）
        gemini_model.start_chat(history=[])
        
        # conversation_messages の各項目を連結して1つのプロンプト文字列に整形
        prompt_lines = []
        for msg in conversation_messages:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "user":
                prompt_lines.append("User: " + content)
            elif role == "assistant":
                prompt_lines.append("Assistant: " + content)
            elif role == "system":
                prompt_lines.append("System: " + content)
            else:
                prompt_lines.append(content)
        prompt_text = "\n".join(prompt_lines)
        
        # Gemini モデルに対してテキスト生成を実行
        output = gemini_model.generate_content(prompt_text, stream=False)
        return output.text
    except Exception as e:
        print(f"Google Gemini API Error: {e}")
        return "エラーが発生しました。後でもう一度お試しください。"
