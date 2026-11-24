import json
import logging
import sys
from datetime import datetime, timezone
from app.utils.request_context import get_request_id


class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON objects."""

    STANDARD_ATTRS = {
        "name", "msg", "args", "levelname", "levelno", "pathname",
        "filename", "module", "exc_info", "exc_text", "stack_info",
        "lineno", "funcName", "created", "msecs", "relativeCreated",
        "thread", "threadName", "processName", "process", "message",
        "taskName"
    }

    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Automatically include the current request ID when present.
        request_id = get_request_id()
        if request_id:
            log_record["request_id"] = request_id

        # Include any extra structured context passed via `extra={...}`
        for key, value in record.__dict__.items():
            if key not in self.STANDARD_ATTRS and not key.startswith("_"):
                log_record[key] = value

        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record, default=str)


def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Returns a configured logger outputting structured JSON to stdout."""
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.propagate = False

    return logger
