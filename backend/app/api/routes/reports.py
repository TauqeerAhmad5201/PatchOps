"""Reports and incidents routes"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.session import get_db
from app.models.incident import Incident
from app.models.change_request import ChangeRequest, CRStatus
from app.core.security import get_current_user

router = APIRouter()


@router.get("/incidents")
async def list_incidents(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(Incident).order_by(desc(Incident.created_at))
    if status:
        q = q.where(Incident.status == status)
    result = await db.execute(q)
    incidents = result.scalars().all()
    return [
        {
            "id": i.id,
            "cr_id": i.cr_id,
            "server_hostname": i.server_hostname,
            "sn_incident_number": i.sn_incident_number,
            "status": i.status,
            "title": i.title,
            "description": i.description,
            "rca_analysis": i.rca_analysis,
            "rca_root_cause": i.rca_root_cause,
            "rca_steps": i.rca_steps,
            "rca_completed_at": i.rca_completed_at.isoformat() if i.rca_completed_at else None,
            "email_sent": i.email_sent,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in incidents
    ]


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Dashboard summary stats"""
    cr_stats = await db.execute(
        select(ChangeRequest.status, func.count(ChangeRequest.id)).group_by(ChangeRequest.status)
    )
    status_counts = dict(cr_stats.all())

    incident_count = (await db.execute(select(func.count(Incident.id)))).scalar_one()

    # Success rate from completed CRs
    total_completed = status_counts.get(CRStatus.completed, 0)
    total_failed = status_counts.get(CRStatus.failed, 0)
    total_done = total_completed + total_failed
    success_rate = round((total_completed / total_done * 100) if total_done else 0, 1)

    return {
        "total_crs": sum(status_counts.values()),
        "by_status": {k: v for k, v in status_counts.items()},
        "total_incidents": incident_count,
        "success_rate": success_rate,
        "awaiting_approval": status_counts.get(CRStatus.awaiting_approval, 0),
        "in_progress": status_counts.get(CRStatus.in_progress, 0),
        "pending": status_counts.get(CRStatus.pending, 0),
    }
