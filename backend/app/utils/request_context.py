from contextvars import ContextVar
from typing import Optional

# Stores the request ID for the current execution context.
_request_id_context: ContextVar[Optional[str]] = ContextVar(
    "cloudlab_request_id",
    default=None
)


def set_request_id(request_id: str):
    """Sets the request ID for the current execution context."""
    return _request_id_context.set(request_id)


def get_request_id() -> Optional[str]:
    """Returns the request ID for the current execution context."""
    return _request_id_context.get()


def reset_request_id(token) -> None:
    """Restores the previous request context."""
    _request_id_context.reset(token)
