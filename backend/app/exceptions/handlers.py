from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.utils.logger import get_logger
from app.utils.request_context import get_request_id

logger = get_logger("cloudlab.api")

HTTP_ERROR_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "TOO_MANY_REQUESTS",
    500: "INTERNAL_SERVER_ERROR",
}


def get_request_id_from_request(request: Request) -> str | None:
    """Gets the request ID from request state or the current context."""
    return getattr(request.state, "request_id", None) or get_request_id()


def get_request_id_headers(request: Request, extra_headers: dict | None = None) -> dict:
    """Merges existing exception headers with X-Request-ID when available."""
    headers = dict(extra_headers) if extra_headers else {}
    request_id = get_request_id_from_request(request)
    if request_id:
        headers["X-Request-ID"] = request_id
    return headers


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Formats intentional HTTPException responses consistently while preserving headers."""
    error_code = HTTP_ERROR_CODES.get(exc.status_code, f"HTTP_{exc.status_code}")
    message = exc.detail if isinstance(exc.detail, str) else "Request could not be processed."

    logger.warning(
        "HTTP exception handled",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": exc.status_code,
            "error_code": error_code,
        },
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": error_code,
                "message": message,
            }
        },
        headers=get_request_id_headers(request, getattr(exc, "headers", None)),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Formats Pydantic/FastAPI validation errors safely without echoing sensitive user inputs."""
    sanitized_details = []
    for err in exc.errors():
        loc = [str(item) for item in err.get("loc", []) if item != "body"]
        field_name = ".".join(loc) if loc else "request"
        sanitized_details.append(
            {
                "field": field_name,
                "message": err.get("msg", "Invalid value"),
            }
        )

    logger.warning(
        "Request validation failed",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": 422,
            "error_code": "VALIDATION_ERROR",
            "field_count": len(sanitized_details),
        },
    )

    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": sanitized_details,
            }
        },
        headers=get_request_id_headers(request),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catches unexpected internal errors, logs full context internally, and returns a safe 500 JSON."""
    logger.error(
        "Unhandled server exception",
        exc_info=True,
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": 500,
            "error_code": "INTERNAL_SERVER_ERROR",
            "exception_type": type(exc).__name__,
        },
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
            }
        },
        headers=get_request_id_headers(request),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Registers centralized exception handlers onto the FastAPI application."""
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
