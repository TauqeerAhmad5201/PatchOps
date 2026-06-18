"""Authentication routes"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
import secrets

from app.db.session import get_db
from app.models.user import User
from app.core.security import (
    verify_password, create_access_token, get_current_user, hash_password, require_admin
)
from app.core.config import settings
from app.services.email_service import send_email

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "user"
    team: Optional[str] = None


class AcceptInviteRequest(BaseModel):
    token: str
    full_name: str
    password: str


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return LoginResponse(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "team": user.team,
            "timezone": user.timezone,
            "avatar_color": user.avatar_color,
        },
    )

@router.post("/invite", dependencies=[Depends(require_admin)])
async def invite_user(body: InviteRequest, db: AsyncSession = Depends(get_db)):
    # Check not already registered
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate invite token (store as hashed_password temporarily with prefix)
    token = secrets.token_urlsafe(32)
    invite_marker = f"INVITE:{token}"

    user = User(
        email=body.email,
        full_name="",
        hashed_password=invite_marker,
        role=body.role,
        team=body.team,
        is_active=False,
    )
    db.add(user)
    await db.commit()

    # Send invite email
    app_url = getattr(settings, 'APP_URL', 'http://localhost:3000')
    invite_url = f"{app_url}/accept-invite?token={token}&email={body.email}"
    await send_email(
        to=body.email,
        subject="You've been invited to PatchOps",
        body_html=f"""
<html><body style="font-family:Arial,sans-serif;max-width:480px;margin:40px auto;">
<div style="background:#0F1225;padding:32px;border-radius:12px;border:1px solid #1C2038;">
  <h2 style="color:#818CF8;margin:0 0 8px;">Welcome to PatchOps</h2>
  <p style="color:#8B91BE;">You've been invited to join PatchOps — the agentic CR management platform.</p>
  <a href="{invite_url}" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#6366F1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
    Accept Invitation
  </a>
  <p style="color:#454C75;font-size:12px;margin-top:24px;">This link expires in 48 hours. If you didn't expect this email, you can ignore it.</p>
</div>
</body></html>
""",
    )
    return {"message": "Invitation sent", "email": body.email}


@router.post("/accept-invite")
async def accept_invite(body: AcceptInviteRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.token).where(User.is_active == False))
    # Find user by token stored in hashed_password
    all_inactive = await db.execute(select(User).where(User.is_active == False))
    user = None
    for u in all_inactive.scalars().all():
        if u.hashed_password == f"INVITE:{body.token}":
            user = u
            break

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired invite token")

    if not body.full_name or not body.password:
        raise HTTPException(status_code=400, detail="Name and password are required")

    user.full_name = body.full_name
    user.hashed_password = hash_password(body.password)
    user.is_active = True
    await db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "team": user.team,
        }
    }

@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "team": current_user.team,
        "timezone": current_user.timezone,
        "avatar_color": current_user.avatar_color,
    }
