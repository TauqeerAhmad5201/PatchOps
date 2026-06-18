"""Change Request API routes with SSE log streaming"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.db.session import get_db, AsyncSessionLocal
from app.models.change_request import ChangeRequest, CRStatus, ServerTask
from app.models.agent_run import AgentLog, AgentRun
from app.core.security import get_current_user
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────
class CRListItem(BaseModel):
    id: int
    cr_number: str
    title: str
    status: str
    priority: str
    requested_by: Optional[str]
    approver_name: Optional[str]
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    change_window_start: Optional[datetime]
    change_window_end: Optional[datetime]
    change_window_timezone: Optional[str]
    progress_percent: float
    total_servers: int
    completed_servers: int
    failed_servers: int
    received_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    is_patching: Optional[bool]

    class Config:
        from_attributes = True


class AcceptRejectAgent1(BaseModel):
    accepted: bool


class AcceptRejectExecution(BaseModel):
    accepted: bool


# ── List CRs ─────────────────────────────────────────────────────────────────
@router.get("", response_model=dict)
async def list_crs(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(ChangeRequest).order_by(desc(ChangeRequest.received_at))

    if status:
        query = query.where(ChangeRequest.status == status)
    if priority:
        query = query.where(ChangeRequest.priority == priority)
    if search:
        query = query.where(
            ChangeRequest.cr_number.ilike(f"%{search}%") |
            ChangeRequest.title.ilike(f"%{search}%")
        )

    # Exclude non-patching (ignored) from default view unless explicitly filtered
    if not status:
        query = query.where(ChangeRequest.status != CRStatus.ignored)

    total_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_q)).scalar_one()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    crs = result.scalars().all()

    return {
        "items": [_cr_to_dict(cr) for cr in crs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ── Stats ─────────────────────────────────────────────────────────────────────
@router.get("/stats")
async def cr_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(ChangeRequest.status, func.count(ChangeRequest.id))
        .group_by(ChangeRequest.status)
    )
    counts = dict(result.all())

    return {
        "total": sum(counts.values()),
        "by_status": counts,
        "awaiting_approval": counts.get(CRStatus.awaiting_approval, 0),
        "pending": counts.get(CRStatus.pending, 0),
        "in_progress": counts.get(CRStatus.in_progress, 0),
        "completed": counts.get(CRStatus.completed, 0),
        "failed": counts.get(CRStatus.failed, 0),
    }


# ── Get CR detail ─────────────────────────────────────────────────────────────
@router.get("/{cr_number}")
async def get_cr(
    cr_number: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(ChangeRequest)
        .where(ChangeRequest.cr_number == cr_number)
        .options(selectinload(ChangeRequest.server_tasks))
        .options(selectinload(ChangeRequest.agent_runs).selectinload(AgentRun.logs))
    )
    cr = result.scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="CR not found")

    return _cr_to_detail(cr)


# ── Accept/Reject Agent 1 plan ────────────────────────────────────────────────
@router.post("/{cr_number}/accept-plan")
async def accept_agent1_plan(
    cr_number: str,
    body: AcceptRejectAgent1,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(ChangeRequest).where(ChangeRequest.cr_number == cr_number)
    )
    cr = result.scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="CR not found")

    cr.agent1_accepted = body.accepted
    cr.agent1_accepted_by = current_user.id
    cr.agent1_accepted_at = datetime.now(timezone.utc)

    if body.accepted:
        from app.worker.tasks import run_execution_agent
        from app.worker.celery_app import celery_app
        celery_app.send_task("run_execution_agent", args=[cr.id])
        logger.info(f"Execution agent queued for CR {cr_number}")
    else:
        cr.status = CRStatus.pending
        logger.info(f"Agent 1 plan rejected for CR {cr_number}")

    await db.commit()
    return {"status": "ok", "accepted": body.accepted}


# ── Accept/Reject execution summary (go-ahead for validation) ─────────────────
@router.post("/{cr_number}/accept-execution")
async def accept_execution(
    cr_number: str,
    body: AcceptRejectExecution,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(ChangeRequest).where(ChangeRequest.cr_number == cr_number)
    )
    cr = result.scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="CR not found")

    cr.execution_accepted = body.accepted
    if body.accepted:
        from app.worker.celery_app import celery_app
        celery_app.send_task("run_validation_agent", args=[cr.id])
    await db.commit()
    return {"status": "ok", "accepted": body.accepted}


# ── Server tasks for a CR ─────────────────────────────────────────────────────
@router.get("/{cr_number}/tasks")
async def get_cr_tasks(
    cr_number: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cr_result = await db.execute(
        select(ChangeRequest).where(ChangeRequest.cr_number == cr_number)
    )
    cr = cr_result.scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="CR not found")

    result = await db.execute(
        select(ServerTask)
        .where(ServerTask.cr_id == cr.id)
        .order_by(ServerTask.bucket_number, ServerTask.execution_order)
    )
    tasks = result.scalars().all()
    return [_task_to_dict(t) for t in tasks]


# ── SSE Log Stream ────────────────────────────────────────────────────────────
@router.get("/{cr_number}/logs/stream")
async def stream_logs(
    cr_number: str,
    cursor: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    """
    SSE endpoint — streams AgentLog rows for a CR using BigSerial cursor.
    Uses Starlette StreamingResponse with manual SSE encoding (sse-starlette
    3.x has connection-drop bugs; manual encoding is reliable).
    """
    cr_result = await db.execute(
        select(ChangeRequest.id).where(ChangeRequest.cr_number == cr_number)
    )
    cr_id = cr_result.scalar_one_or_none()
    if not cr_id:
        raise HTTPException(status_code=404, detail="CR not found")

    async def _sse_generator() -> AsyncGenerator[bytes, None]:
        last_id = cursor
        idle_ticks = 0
        max_idle = 200  # ~300s at 1.5s interval

        while idle_ticks < max_idle:
            async with AsyncSessionLocal() as session:
                rows = (
                    await session.execute(
                        select(AgentLog)
                        .where(AgentLog.cr_id == cr_id, AgentLog.id > last_id)
                        .order_by(AgentLog.id)
                        .limit(50)
                    )
                ).scalars().all()

                # Materialise before session closes
                events = [
                    {
                        "id": r.id,
                        "agent": r.agent_type,
                        "level": r.level,
                        "message": r.message,
                        "server": r.server_hostname,
                        "ts": r.ts.isoformat() if r.ts else None,
                        "meta": r.metadata_,
                    }
                    for r in rows
                ]

            if events:
                for ev in events:
                    last_id = ev["id"]
                    data = json.dumps(ev)
                    yield f"id: {ev['id']}\ndata: {data}\n\n".encode()
                idle_ticks = 0
            else:
                yield b": heartbeat\n\n"
                idle_ticks += 1

            await asyncio.sleep(1.5)

        yield b"event: done\ndata: stream_closed\n\n"

    return StreamingResponse(
        _sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── Recent logs REST endpoint ──────────────────────────────────────────────────
@router.get("/{cr_number}/logs")
async def get_logs(
    cr_number: str,
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cr_result = await db.execute(
        select(ChangeRequest.id).where(ChangeRequest.cr_number == cr_number)
    )
    cr_id = cr_result.scalar_one_or_none()
    if not cr_id:
        raise HTTPException(status_code=404, detail="CR not found")

    result = await db.execute(
        select(AgentLog)
        .where(AgentLog.cr_id == cr_id)
        .order_by(AgentLog.id)
        .limit(limit)
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "agent": r.agent_type,
            "level": r.level,
            "message": r.message,
            "server": r.server_hostname,
            "ts": r.ts.isoformat() if r.ts else None,
        }
        for r in rows
    ]


# ── Helpers ───────────────────────────────────────────────────────────────────
def _cr_to_dict(cr: ChangeRequest) -> dict:
    return {
        "id": cr.id,
        "cr_number": cr.cr_number,
        "title": cr.title,
        "status": cr.status,
        "priority": cr.priority,
        "requested_by": cr.requested_by,
        "approver_name": cr.approver_name,
        "approved_by": cr.approved_by,
        "approved_at": cr.approved_at.isoformat() if cr.approved_at else None,
        "change_window_start": cr.change_window_start.isoformat() if cr.change_window_start else None,
        "change_window_end": cr.change_window_end.isoformat() if cr.change_window_end else None,
        "change_window_timezone": cr.change_window_timezone,
        "progress_percent": cr.progress_percent,
        "total_servers": cr.total_servers,
        "completed_servers": cr.completed_servers,
        "failed_servers": cr.failed_servers,
        "received_at": cr.received_at.isoformat() if cr.received_at else None,
        "started_at": cr.started_at.isoformat() if cr.started_at else None,
        "completed_at": cr.completed_at.isoformat() if cr.completed_at else None,
        "is_patching": cr.is_patching,
        "sn_url": cr.sn_url,
        "description": cr.description,
    }


def _cr_to_detail(cr: ChangeRequest) -> dict:
    d = _cr_to_dict(cr)
    d.update({
        "classification_confidence": cr.classification_confidence,
        "classification_reasoning": cr.classification_reasoning,
        "ordered_server_list": cr.ordered_server_list,
        "agent1_summary": cr.agent1_summary,
        "agent1_accepted": cr.agent1_accepted,
        "agent1_accepted_at": cr.agent1_accepted_at.isoformat() if cr.agent1_accepted_at else None,
        "execution_summary": cr.execution_summary,
        "execution_accepted": cr.execution_accepted,
        "validation_report": cr.validation_report,
        "server_tasks": [_task_to_dict(t) for t in (cr.server_tasks or [])],
    })
    return d


def _task_to_dict(t: ServerTask) -> dict:
    return {
        "id": t.id,
        "server_hostname": t.server_hostname,
        "server_ip": t.server_ip,
        "bucket_number": t.bucket_number,
        "execution_order": t.execution_order,
        "status": t.status,
        "health_ok": t.health_ok,
        "deviation_percent": t.deviation_percent,
        "error_message": t.error_message,
        "requires_service_pause": t.requires_service_pause,
        "service_name": t.service_name,
        "started_at": t.started_at.isoformat() if t.started_at else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "reboot_scheduled_for": t.reboot_scheduled_for.isoformat() if t.reboot_scheduled_for else None,
    }
