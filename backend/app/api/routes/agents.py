"""Agent trigger routes"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.change_request import ChangeRequest, CRStatus
from app.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/trigger/intake/{cr_number}")
async def trigger_intake(
    cr_number: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Manually trigger intake agent for a CR (for re-processing)"""
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.cr_number == cr_number))
    cr = result.scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="CR not found")

    from app.worker.celery_app import celery_app
    task = celery_app.send_task("run_intake_agent", args=[cr.id])
    return {"status": "queued", "task_id": task.id}


@router.post("/trigger/baseline/{cr_number}")
async def trigger_baseline(
    cr_number: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.cr_number == cr_number))
    cr = result.scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="CR not found")

    from app.worker.celery_app import celery_app
    task = celery_app.send_task("run_baseline_agent", args=[cr.id])
    return {"status": "queued", "task_id": task.id}
