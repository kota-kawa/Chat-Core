"""LLM service module using OpenAI client for multiple providers."""

import logging
import os
from openai import OpenAI

GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
GEMINI_DEFAULT_MODEL = os.environ.get("GEMINI_DEFAULT_MODEL", "gemini-2.5-flash")

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"

# Valid model names
VALID_GEMINI_MODELS = {
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
}
VALID_GROQ_MODELS = {GROQ_MODEL}

groq_api_key = os.environ.get("GROQ_API_KEY", "")
gemini_api_key = os.environ.get("Gemini_API_KEY", "")

groq_client = (
    OpenAI(api_key=groq_api_key, base_url=GROQ_BASE_URL)
    if groq_api_key
    else None
)
gemini_client = (
    OpenAI(api_key=gemini_api_key, base_url=GEMINI_BASE_URL)
    if gemini_api_key
    else None
)
logger = logging.getLogger(__name__)


def get_groq_response(conversation_messages, model_name):
    """Groq API呼び出し (via OpenAI client)"""
    if groq_client is None:
        return "エラー: GROQ_API_KEY が未設定です。"

    try:
        response = groq_client.chat.completions.create(
            model=model_name,
            messages=conversation_messages,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except Exception:
        logger.exception("Groq API call failed.")
        return "エラーが発生しました。後でもう一度お試しください。"


def get_gemini_response(conversation_messages, model_name):
    """Google Gemini API呼び出し (via OpenAI client)"""
    if gemini_client is None:
        return "エラー: Gemini_API_KEY が未設定です。"

    try:
        response = gemini_client.chat.completions.create(
            model=model_name,
            messages=conversation_messages,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except Exception:
        logger.exception("Google Gemini API call failed.")
        return "エラーが発生しました。後でもう一度お試しください。"


def get_llm_response(conversation_messages, model_name):
    if model_name in VALID_GEMINI_MODELS:
        return get_gemini_response(conversation_messages, model_name)
    if model_name in VALID_GROQ_MODELS:
        return get_groq_response(conversation_messages, model_name)

    valid_models = sorted(VALID_GEMINI_MODELS | VALID_GROQ_MODELS)
    logger.warning(
        "Invalid model requested: %s. Valid models: %s",
        model_name,
        valid_models,
    )
    return (
        f"エラー: 無効なモデル '{model_name}' が指定されました。"
        f"有効なモデル: {', '.join(valid_models)}"
    )
