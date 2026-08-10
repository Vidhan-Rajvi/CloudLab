import json
import uuid
from datetime import datetime, timezone
from config.redis import redis_client

JOB_QUEUE_KEY = "cloudlab:jobs"
JOB_KEY_PREFIX = "cloudlab:job:"


def create_job(payload: dict) -> str:
    job_id = str(uuid.uuid4())

    job_data = {
        "job_id": job_id,
        "status": "queued",
        "payload": payload,
        "result": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "attempts": 0,
    }

    redis_client.set(
        f"{JOB_KEY_PREFIX}{job_id}",
        json.dumps(job_data)
    )

    redis_client.rpush(
        JOB_QUEUE_KEY,
        job_id
    )

    return job_id


def get_job(job_id: str):
    data = redis_client.get(f"{JOB_KEY_PREFIX}{job_id}")
    if not data:
        return None
    return json.loads(data)


def update_job(job_id: str, **updates):
    job = get_job(job_id)
    if not job:
        return None

    job.update(updates)
    job["updated_at"] = datetime.now(timezone.utc).isoformat()

    redis_client.set(
        f"{JOB_KEY_PREFIX}{job_id}",
        json.dumps(job)
    )

    return job
