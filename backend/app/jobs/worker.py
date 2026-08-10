import time
import sys
import os

# Add root directory to path for backend module resolution
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from config.redis import redis_client
from app.jobs.queue import get_job, update_job, JOB_QUEUE_KEY

MAX_RETRIES = 3


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
    print("🚀 CloudLab Redis Background Worker Started. Listening for jobs...", flush=True)

    while True:
        try:
            # BLPOP blocks until a job_id is available in the queue (timeout=5s)
            result = redis_client.blpop(JOB_QUEUE_KEY, timeout=5)
            if not result:
                continue

            _, job_id = result
            job = get_job(job_id)

            if not job:
                continue

            print(f"📦 Processing Job ID: {job_id} (Attempt {job['attempts'] + 1})", flush=True)

            update_job(job_id, status="processing", attempts=job["attempts"] + 1)

            try:
                task_result = process_task(job["payload"])
                update_job(
                    job_id,
                    status="completed",
                    result=task_result,
                    error=None
                )
                print(f"✅ Job {job_id} completed successfully.", flush=True)

            except Exception as e:
                error_msg = str(e)
                current_attempts = job["attempts"] + 1

                if current_attempts < MAX_RETRIES:
                    print(f"⚠️ Job {job_id} failed. Re-queueing (Attempt {current_attempts}/{MAX_RETRIES})...", flush=True)
                    update_job(job_id, status="retry", error=error_msg)
                    redis_client.rpush(JOB_QUEUE_KEY, job_id)
                else:
                    print(f"❌ Job {job_id} failed permanently after {MAX_RETRIES} attempts.", flush=True)
                    update_job(job_id, status="failed", error=error_msg)

        except Exception as err:
            print(f"Worker Error: {err}", flush=True)
            time.sleep(1)


if __name__ == "__main__":
    start_worker()
