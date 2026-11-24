import time
from prometheus_client import Counter, Gauge, Histogram, start_http_server

# Worker availability and heartbeat
WORKER_UP = Gauge(
    "cloudlab_worker_up",
    "Whether the CloudLab background worker process has started.",
)

WORKER_LAST_HEARTBEAT = Gauge(
    "cloudlab_worker_last_heartbeat_timestamp_seconds",
    "Unix timestamp of the worker's last heartbeat.",
)

# Redis queue monitoring
QUEUE_SIZE = Gauge(
    "cloudlab_queue_size",
    "Number of jobs currently waiting in the Redis queue.",
)

# Job processing counters
JOBS_PROCESSED = Counter(
    "cloudlab_jobs_processed_total",
    "Total number of successfully completed jobs.",
)

JOBS_FAILED = Counter(
    "cloudlab_jobs_failed_total",
    "Total number of jobs permanently failed after all retries.",
)

JOBS_RETRIED = Counter(
    "cloudlab_jobs_retried_total",
    "Total number of job retry attempts scheduled.",
)

# Job execution duration histogram
JOB_PROCESSING_DURATION = Histogram(
    "cloudlab_job_processing_duration_seconds",
    "Time spent executing background jobs in seconds.",
    buckets=(0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0),
)


def start_worker_metrics_server(port: int = 9100) -> None:
    """Starts the Prometheus metrics HTTP server in a background thread."""
    start_http_server(port, addr="0.0.0.0")
    WORKER_UP.set(1)
    update_worker_heartbeat()


def update_worker_heartbeat() -> None:
    """Records the latest worker loop heartbeat timestamp."""
    WORKER_LAST_HEARTBEAT.set(time.time())


def update_queue_size(redis_client, queue_key: str) -> None:
    """Updates the current Redis list depth safely."""
    try:
        QUEUE_SIZE.set(redis_client.llen(queue_key))
    except Exception:
        pass
