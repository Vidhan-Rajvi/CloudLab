import logging
import time
from starlette.types import ASGIApp, Receive, Scope, Send
from app.utils.logger import get_logger

logger = get_logger("cloudlab.api")


class RequestLoggingMiddleware:
    """ASGI middleware to log HTTP requests, response status codes, and latency."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.perf_counter()
        method = scope.get("method", "UNKNOWN")
        path = scope.get("path", "/")
        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                "HTTP request failed",
                extra={
                    "method": method,
                    "path": path,
                    "status_code": 500,
                    "duration_ms": duration_ms,
                    "exception_type": type(exc).__name__,
                },
            )
            raise
        else:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            if status_code >= 500:
                log_level = logging.ERROR
            elif status_code >= 400:
                log_level = logging.WARNING
            else:
                log_level = logging.INFO

            logger.log(
                log_level,
                "HTTP request completed",
                extra={
                    "method": method,
                    "path": path,
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                },
            )
