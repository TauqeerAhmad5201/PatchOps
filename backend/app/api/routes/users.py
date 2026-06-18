"""User management routes"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.db.session import get_db
from app.models.user import User, UserRole
from app.core.security import get_current_user, require_admin, hash_password

router = APIRouter()


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.user
    team: Optional[str] = None
    timezone: str = "UTC"
    avatar_color: str = "#6366F1"


@router.get("")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin),
):
    result = await db.execute(select(User).order_by(User.full_name))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "team": u.team,
            "timezone": u.timezone,
            "is_active": u.is_active,
            "avatar_color": u.avatar_color,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if u.last_login else None,
        }
        for u in users
    ]


@router.post("", dependencies=[Depends(require_admin)])
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=body.role,
        team=body.team,
        timezone=body.timezone,
        avatar_color=body.avatar_color,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "message": "User created"}


@router.put("/{user_id}/role", dependencies=[Depends(require_admin)])
async def update_role(user_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = body.get("role", user.role)
    await db.commit()
    return {"status": "updated"}


@router.put("/{user_id}/deactivate", dependencies=[Depends(require_admin)])
async def deactivate_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await db.commit()
    return {"status": "deactivated"}

@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    return {"status": "deleted"}