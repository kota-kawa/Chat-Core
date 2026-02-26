import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from services import llm


def _mock_openai_response(text):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=text))]
    )


class LlmServiceTestCase(unittest.TestCase):
    def test_get_llm_response_routes_to_groq(self):
        mock_groq = MagicMock()
        mock_groq.chat.completions.create.return_value = _mock_openai_response("groq-ok")

        with patch.object(llm, "groq_client", mock_groq):
            response = llm.get_llm_response(
                [{"role": "user", "content": "hello"}],
                llm.GROQ_MODEL,
            )

        self.assertEqual(response, "groq-ok")
        mock_groq.chat.completions.create.assert_called_once()

    def test_get_llm_response_routes_to_gemini(self):
        mock_gemini = MagicMock()
        mock_gemini.chat.completions.create.return_value = _mock_openai_response(
            "gemini-ok"
        )

        with patch.object(llm, "gemini_client", mock_gemini):
            response = llm.get_llm_response(
                [{"role": "user", "content": "hello"}],
                "gemini-2.5-flash",
            )

        self.assertEqual(response, "gemini-ok")
        mock_gemini.chat.completions.create.assert_called_once()

    def test_get_llm_response_rejects_invalid_model(self):
        response = llm.get_llm_response(
            [{"role": "user", "content": "hello"}],
            "invalid-model",
        )
        self.assertIn("無効なモデル", response)


if __name__ == "__main__":
    unittest.main()
