import logging
import re
import time
import uuid
from starlette.types import ASGIApp, Receive, Scope, Send
from app.utils.logger import get_logger
from app.utils.request_context import set_request_id, reset_request_id

logger = get_logger("cloudlab.api")

REQUEST_ID_HEADER = b"x-request-id"
# Allow only simple, safe request IDs up to 64 characters.
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def get_or_create_request_id(scope: Scope) -> str:
    """Returns a valid incoming request ID or generates a new UUID."""
    headers = dict(scope.get("headers", []))
    incoming_id = headers.get(REQUEST_ID_HEADER)
    if incoming_id:
        try:
            candidate = incoming_id.decode("ascii").strip()
            if REQUEST_ID_PATTERN.fullmatch(candidate):
                return candidate
        except UnicodeDecodeError:
            pass
    return str(uuid.uuid4())


class RequestLoggingMiddleware:
    """ASGI middleware to correlate and log HTTP request/response lifecycles."""

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

        request_id = get_or_create_request_id(scope)
        scope.setdefault("state", {})["request_id"] = request_id
        context_token = set_request_id(request_id)

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = list(message.get("headers", []))
                if not any(k.lower() == REQUEST_ID_HEADER for k, _ in headers):
                    headers.append((REQUEST_ID_HEADER, request_id.encode("ascii")))
                message["headers"] = headers
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
        finally:
            reset_request_id(context_token)
