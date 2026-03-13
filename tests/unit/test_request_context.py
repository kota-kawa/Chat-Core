import asyncio
import io
import logging
import unittest

import httpx
from fastapi import FastAPI

from services.request_context import RequestContextFilter, RequestContextMiddleware


class RequestContextMiddlewareTestCase(unittest.TestCase):
    def setUp(self):
        self.stream = io.StringIO()
        self.handler = logging.StreamHandler(self.stream)
        self.handler.addFilter(RequestContextFilter())
        self.handler.setFormatter(
            logging.Formatter("%(request_id)s %(request_method)s %(request_path)s %(message)s")
        )
        self.logger = logging.getLogger("tests.request_context")
        self.original_handlers = list(self.logger.handlers)
        self.original_level = self.logger.level
        self.original_propagate = self.logger.propagate
        self.logger.handlers = [self.handler]
        self.logger.setLevel(logging.INFO)
        self.logger.propagate = False

    def tearDown(self):
        self.handler.close()
        self.logger.handlers = self.original_handlers
        self.logger.setLevel(self.original_level)
        self.logger.propagate = self.original_propagate

    def test_request_context_sets_response_header_and_log_fields(self):
        app = FastAPI()
        app.add_middleware(RequestContextMiddleware)

        @app.get("/ping")
        async def ping():
            self.logger.info("inside route")
            return {"status": "ok"}

        async def scenario():
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app),
                base_url="http://testserver",
            ) as client:
                response = await client.get("/ping", headers={"X-Request-ID": "req-123"})

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["X-Request-ID"], "req-123")

        asyncio.run(scenario())

        self.assertIn("req-123 GET /ping inside route", self.stream.getvalue())


if __name__ == "__main__":
    unittest.main()
