import unittest

from starlette.requests import Request

from blueprints.auth import _build_google_authorization_response


def make_request(*, scheme: str, host: str, path: str, query_string: bytes) -> Request:
    scope = {
        "type": "http",
        "asgi": {"spec_version": "2.3", "version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": scheme,
        "path": path,
        "raw_path": path.encode("utf-8"),
        "query_string": query_string,
        "headers": [(b"host", host.encode("utf-8"))],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    return Request(scope, receive)


class GoogleOAuthCallbackUrlTestCase(unittest.TestCase):
    def test_uses_redirect_uri_origin_for_authorization_response(self):
        request = make_request(
            scheme="http",
            host="internal:5004",
            path="/google-callback",
            query_string=b"code=abc&state=xyz",
        )

        actual = _build_google_authorization_response(
            request, "https://chatcore-ai.com/google-callback"
        )

        self.assertEqual(
            actual,
            "https://chatcore-ai.com/google-callback?code=abc&state=xyz",
        )

    def test_falls_back_to_request_url_when_redirect_uri_is_not_absolute(self):
        request = make_request(
            scheme="http",
            host="localhost:5004",
            path="/google-callback",
            query_string=b"code=devcode",
        )

        actual = _build_google_authorization_response(request, "/google-callback")

        self.assertEqual(actual, "http://localhost:5004/google-callback?code=devcode")


if __name__ == "__main__":
    unittest.main()
