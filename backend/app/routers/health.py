import time
from fastapi import APIRouter, Response, status
from sqlalchemy import text
from config.session import engine
from config.redis import redis_client
from app.utils.logger import get_logger

router = APIRouter(
    prefix="/health",
    tags=["Health Checks"]
)

logger = get_logger("cloudlab.api")


@router.get("/live")
def liveness_check():
    """
    Liveness check.
    Confirms that the CloudLab API process is running and responding to HTTP requests.
    This endpoint does not check external dependencies.
    """
    return {
        "status": "alive",
        "service": "cloudlab-api"
    }


@router.get("/ready")
def readiness_check(response: Response):
    """
    Readiness check.
    Verifies connectivity to PostgreSQL and Redis.
    Returns HTTP 200 when ready, or HTTP 503 if any dependency is unavailable.
    """
    checks = {}
    is_ready = True

    # 1. PostgreSQL check (SELECT 1)
    pg_start = time.perf_counter()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        pg_duration = round((time.perf_counter() - pg_start) * 1000, 2)
        checks["postgres"] = {
            "status": "connected",
            "duration_ms": pg_duration,
        }
    except Exception as exc:
        pg_duration = round((time.perf_counter() - pg_start) * 1000, 2)
        is_ready = False
        checks["postgres"] = {
            "status": "unavailable",
            "duration_ms": pg_duration,
        }
        logger.warning(
            "PostgreSQL readiness check failed",
            extra={
                "component": "health",
                "dependency": "postgres",
                "duration_ms": pg_duration,
                "error_type": type(exc).__name__,
            },
        )

    # 2. Redis check (PING)
    redis_start = time.perf_counter()
    try:
        redis_client.ping()
        redis_duration = round((time.perf_counter() - redis_start) * 1000, 2)
        checks["redis"] = {
            "status": "connected",
            "duration_ms": redis_duration,
        }
    except Exception as exc:
        redis_duration = round((time.perf_counter() - redis_start) * 1000, 2)
        is_ready = False
        checks["redis"] = {
            "status": "unavailable",
            "duration_ms": redis_duration,
        }
        logger.warning(
            "Redis readiness check failed",
            extra={
                "component": "health",
                "dependency": "redis",
                "duration_ms": redis_duration,
                "error_type": type(exc).__name__,
            },
        )

    readiness_status = "ready" if is_ready else "not_ready"

    if is_ready:
        logger.info(
            "Application readiness check completed",
            extra={
                "component": "health",
                "readiness_status": readiness_status,
            },
        )
    else:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        logger.warning(
            "Application readiness check degraded",
            extra={
                "component": "health",
                "readiness_status": readiness_status,
            },
        )

    return {
        "status": readiness_status,
        "service": "cloudlab-api",
        "checks": checks,
    }
