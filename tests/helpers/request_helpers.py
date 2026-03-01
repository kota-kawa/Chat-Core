import json

from starlette.requests import Request


def build_request(
    *,
    method="GET",
    path="/",
    session=None,
    json_body=None,
    raw_body=None,
    query_string=b"",
    headers=None,
    scheme="http",
    host_header=None,
    server_host="testserver",
    server_port=80,
):
    if json_body is not None and raw_body is not None:
        raise ValueError("json_body and raw_body are mutually exclusive")

    if raw_body is not None:
        body = raw_body
    elif json_body is not None:
        body = json.dumps(json_body).encode("utf-8")
    else:
        body = b""

    request_headers = list(headers or [])
    if json_body is not None and not any(key.lower() == b"content-type" for key, _ in request_headers):
        request_headers.append((b"content-type", b"application/json"))
    if host_header and not any(key.lower() == b"host" for key, _ in request_headers):
        request_headers.append((b"host", host_header.encode("utf-8")))

    scope = {
        "type": "http",
        "asgi": {"spec_version": "2.3", "version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": scheme,
        "path": path,
        "raw_path": path.encode("utf-8"),
        "query_string": query_string,
        "headers": request_headers,
        "client": ("testclient", 50000),
        "server": (server_host, server_port),
        "session": session or {},
    }

    async def receive():
        nonlocal body
        if body is None:
            return {"type": "http.request", "body": b"", "more_body": False}
        current = body
        body = None
        return {"type": "http.request", "body": current, "more_body": False}

    return Request(scope, receive)

