"""Server registry routes"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.session import get_db
from app.models.server import Server
from app.core.security import get_current_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def list_servers(
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(Server).where(Server.is_active == True).order_by(Server.hostname)
    if search:
        q = q.where(Server.hostname.ilike(f"%{search}%"))
    result = await db.execute(q)
    servers = result.scalars().all()
    return [
        {
            "id": s.id,
            "hostname": s.hostname,
            "ip_address": s.ip_address,
            "environment": s.environment,
            "os_version": s.os_version,
            "timezone": s.timezone,
            "team": s.team,
            "application": s.application,
            "status": s.status,
            "last_seen_at": s.last_seen_at.isoformat() if s.last_seen_at else None,
            "last_reboot_at": s.last_reboot_at.isoformat() if s.last_reboot_at else None,
        }
        for s in servers
    ]
