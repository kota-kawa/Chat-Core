"""LLM service module using OpenAI client for multiple providers."""

import os
from openai import OpenAI


# --- Groq client setup (COMMENTED OUT) -----------------------------------
# groq_api_key = os.environ.get("GROQ_API_KEY", "dummy-key")
# groq_client = OpenAI(
#     api_key=groq_api_key,
#     base_url="https://api.groq.com/openai/v1",
# )
# 
# 
# def get_groq_response(conversation_messages, model):
#     """Groq API呼び出し (via OpenAI client)"""
#     try:
#         response = groq_client.chat.completions.create(
#             model=model,
#             messages=conversation_messages,
#             max_tokens=1024,
#         )
#         return response.choices[0].message.content
#     except Exception as e:
#         print(f"Groq API Error: {e}")
#         return "エラーが発生しました。後でもう一度お試しください。"


# --- Google Gemini client setup ------------------------------------------
gemini_api_key = os.environ.get("Gemini_API_KEY", "dummy-key")
gemini_client = OpenAI(
    api_key=gemini_api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai",
)


def get_gemini_response(conversation_messages, model_name):
    """Google Gemini API呼び出し (via OpenAI client)"""
    try:
        response = gemini_client.chat.completions.create(
            model=model_name,
            messages=conversation_messages,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Google Gemini API Error: {e}")
        return "エラーが発生しました。後でもう一度お試しください。"

