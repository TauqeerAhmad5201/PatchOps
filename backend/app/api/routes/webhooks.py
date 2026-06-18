"""ServiceNow webhook handlers — CR received and CR approved"""
import hmac
import hashlib
import logging
from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel,Field
from typing import Optional
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.change_request import ChangeRequest, CRStatus
from app.core.config import settings
from app.services.cr_service import process_new_cr, process_cr_approval

logger = logging.getLogger(__name__)
router = APIRouter()


class SNWebhookPayload(BaseModel):
    model_config = {"populate_by_name": True}
    event_type: str = Field(alias="event", default="unknown")         # "cr.created" | "cr.approved"
    cr_number: str
    sys_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    requested_by: Optional[str] = None
    approver_name: Optional[str] = None
    approver_email: Optional[str] = None
    change_window_start: Optional[str] = None
    change_window_end: Optional[str] = None
    change_window_timezone: Optional[str] = "UTC"
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    # SN attachment metadata
    attachment_url: Optional[str] = None


def verify_webhook_signature(request: Request, body: bytes) -> bool:
    """Simple shared-secret verification — matches ServiceNow HTTP header"""
    if not settings.WEBHOOK_SECRET:
        logger.warning("WEBHOOK_SECRET not set — skipping signature verification")
        return True
    # ServiceNow sends the raw secret in X-ServiceNow-Webhook-Secret header
    incoming = request.headers.get("X-ServiceNow-Webhook-Secret", "")
    return hmac.compare_digest(incoming, settings.WEBHOOK_SECRET)


@router.post("/servicenow")
async def servicenow_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()
    if not verify_webhook_signature(request, body):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        import json
        data = json.loads(body)
        payload = SNWebhookPayload(**data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid payload: {e}")

    logger.info(f"Webhook received: {payload.event_type} for {payload.cr_number}")

    # Normalise: accept both "cr.created" and "cr_created" formats
    event = payload.event_type.replace(".", "_")

    if event == "cr_created":
        background_tasks.add_task(process_new_cr, payload)
        return {"status": "accepted", "message": "CR queued for classification"}

    elif event == "cr_approved":
        background_tasks.add_task(process_cr_approval, payload)
        return {"status": "accepted", "message": "Approval processing queued"}

    else:
        logger.warning(f"Unknown event type: {payload.event_type}")
        return {"status": "ignored", "message": f"Unknown event type: {payload.event_type}"}

@router.post("/test")
async def test_webhook(
    payload: SNWebhookPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Test endpoint — simulate ServiceNow webhook without signature check"""
    logger.info(f"Test webhook: {payload.event_type} for {payload.cr_number}")

    # Normalise: accept both "cr.created" and "cr_created" formats
    event = payload.event_type.replace(".", "_")

    if event == "cr_created":
        background_tasks.add_task(process_new_cr, payload)
        return {"status": "accepted", "message": "CR queued for classification"}

    elif event == "cr_approved":
        background_tasks.add_task(process_cr_approval, payload)
        return {"status": "accepted", "message": "Approval processing queued"}

    else:
        logger.warning(f"Unknown event type: {payload.event_type}")
        return {"status": "ignored", "message": f"Unknown event type: {payload.event_type}"}
