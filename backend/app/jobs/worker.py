import time
import sys
import os
import redis

# Add root directory to path for backend module resolution
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from config.redis import redis_client
from app.jobs.queue import get_job, update_job, JOB_QUEUE_KEY
from app.utils.logger import get_logger
from app.jobs.metrics import (
    JOBS_PROCESSED,
    JOBS_FAILED,
    JOBS_RETRIED,
    JOB_PROCESSING_DURATION,
    start_worker_metrics_server,
    update_worker_heartbeat,
    update_queue_size,
)

logger = get_logger("cloudlab.worker")

MAX_RETRIES = 3
METRICS_PORT = 9100


def process_task(payload: dict):
    task_type = payload.get("task", "default")

    if task_type == "fail":
        raise ValueError("Simulated task failure for retry mechanism testing.")

    # Simulate actual background work execution time
    time.sleep(2)
    return {
        "status": "success",
        "processed_task": task_type,
        "message": f"Processed payload: {payload.get('message', 'No message')}"
    }


def start_worker():
    start_worker_metrics_server(METRICS_PORT)
    update_queue_size(redis_client, JOB_QUEUE_KEY)
    logger.info(
        "Background worker started and listening for jobs",
        extra={"queue": JOB_QUEUE_KEY, "metrics_port": METRICS_PORT},
    )

    while True:
        try:
            update_worker_heartbeat()
            update_queue_size(redis_client, JOB_QUEUE_KEY)

            # BLPOP blocks until a job_id is available in the queue (timeout=5s)
            result = redis_client.blpop(JOB_QUEUE_KEY, timeout=5)
            update_worker_heartbeat()
            update_queue_size(redis_client, JOB_QUEUE_KEY)

            if not result:
                continue

            _, job_id = result
            job = get_job(job_id)

            if not job:
                logger.warning("Job ID popped from queue but metadata not found", extra={"job_id": job_id})
                continue

            attempt_num = job["attempts"] + 1
            logger.info(
                "Processing background job",
                extra={"job_id": job_id, "attempt": attempt_num, "task": job["payload"].get("task")}
            )

            update_job(job_id, status="processing", attempts=attempt_num)

            exec_start = time.perf_counter()
            try:
                task_result = process_task(job["payload"])
                duration = time.perf_counter() - exec_start
                JOB_PROCESSING_DURATION.observe(duration)
                JOBS_PROCESSED.inc()

                update_job(
                    job_id,
                    status="completed",
                    result=task_result,
                    error=None
                )
                logger.info(
                    "Background job completed successfully",
                    extra={"job_id": job_id, "attempt": attempt_num, "duration_seconds": round(duration, 4)}
                )

            except Exception as e:
                duration = time.perf_counter() - exec_start
                JOB_PROCESSING_DURATION.observe(duration)
                error_msg = str(e)

                if attempt_num < MAX_RETRIES:
                    JOBS_RETRIED.inc()
                    logger.warning(
                        "Background job failed, re-queueing for retry",
                        extra={
                            "job_id": job_id,
                            "attempt": attempt_num,
                            "max_retries": MAX_RETRIES,
                            "error": error_msg
                        }
                    )
                    update_job(job_id, status="retry", error=error_msg)
                    redis_client.rpush(JOB_QUEUE_KEY, job_id)
                else:
                    JOBS_FAILED.inc()
                    logger.error(
                        "Background job failed permanently after max retries",
                        extra={
                            "job_id": job_id,
                            "attempt": attempt_num,
                            "max_retries": MAX_RETRIES,
                            "error": error_msg
                        }
                    )
                    update_job(job_id, status="failed", error=error_msg)

            finally:
                update_queue_size(redis_client, JOB_QUEUE_KEY)
                update_worker_heartbeat()

        except redis.exceptions.TimeoutError:
            # Normal idle socket timeout when waiting on an empty queue
            update_worker_heartbeat()
            continue
        except Exception as err:
            logger.error("Worker loop encountered an unexpected error", extra={"error": str(err)})
            time.sleep(1)


if __name__ == "__main__":
    start_worker()
