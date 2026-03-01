from fastapi import FastAPI, Request
from starlette.middleware.sessions import SessionMiddleware


def build_session_test_app(*routers, secret_key="endpoint-test-secret", include_test_session_route=False):
    app = FastAPI()
    app.add_middleware(SessionMiddleware, secret_key=secret_key)

    for router in routers:
        app.include_router(router)

    if include_test_session_route:

        @app.post("/_test/session")
        async def set_test_session(request: Request):
            payload = await request.json()
            for key, value in payload.items():
                request.session[key] = value
            return {"status": "ok"}

    return app

