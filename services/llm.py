import os
from groq import Groq

api_key = os.environ.get('GROQ_API_KEY')
client = Groq(api_key=api_key)

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
