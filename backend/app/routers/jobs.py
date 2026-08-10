from fastapi import APIRouter, Depends, HTTPException, status
from app.jobs.queue import create_job, get_job
from app.security.deps import get_current_user

router = APIRouter(
    prefix="/jobs",
    tags=["Jobs"]
)


@router.post("", status_code=status.HTTP_202_ACCEPTED)
def submit_job(
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    job_id = create_job(payload)
    return {
        "job_id": job_id,
        "status": "queued"
    }


@router.get("/{job_id}")
def get_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    job = get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    return job
