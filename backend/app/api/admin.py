import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import get_db
from app.deps import require_admin
from app.models.attempt import Attempt
from app.models.test import Test
from app.models.user import User, UserRole
from app.serializers import psychologist_out

router = APIRouter(prefix="/admin", tags=["admin"])


class CreatePsychologistBody(BaseModel):
    email: str
    name: str
    password: str
    accessDays: int | None = None


class BlockBody(BaseModel):
    blocked: bool
    reason: str | None = None


class UpdatePsychologistBody(BaseModel):
    name: str | None = None
    email: str | None = None
    accessDays: int | None = None


class AccessBody(BaseModel):
    accessDays: int | None = None


def _calc_access_expiry(days: int | None) -> datetime | None:
    if days is None or days <= 0:
        return None
    return datetime.now(timezone.utc) + timedelta(days=days)


@router.get("/psychologists")
def list_psychologists(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    rows = db.scalars(select(User).where(User.role == UserRole.psychologist).order_by(User.created_at.desc())).all()
    out = []
    for u in rows:
        n = db.scalar(select(func.count()).select_from(Test).where(Test.owner_id == u.id)) or 0
        out.append(psychologist_out(u, int(n)))
    return {"data": out, "total": len(out), "page": 1, "pageSize": max(1, len(out))}


@router.post("/psychologists")
def create_psychologist(
    body: CreatePsychologistBody,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    email = str(body.email).lower()
    if db.scalars(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Пользователь с таким email уже есть")
    nm = body.name.strip()
    if len(nm.split()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите фамилию, имя и отчество",
        )
    u = User(
        email=email,
        name=nm,
        hashed_password=hash_password(body.password),
        role=UserRole.psychologist,
        is_active=True,
        access_expires_at=_calc_access_expiry(body.accessDays),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return psychologist_out(u, 0)


@router.patch("/psychologists/{user_id}")
def update_psychologist(
    user_id: uuid.UUID,
    body: UpdatePsychologistBody,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя изменить свой аккаунт")
    u = db.get(User, user_id)
    if not u or u.role != UserRole.psychologist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    if body.name is not None:
        nm = body.name.strip()
        if len(nm.split()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Укажите фамилию, имя и отчество",
            )
        u.name = nm
    if body.email is not None:
        email = str(body.email).lower()
        existing = db.scalars(select(User).where(User.email == email, User.id != user_id)).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email уже занят")
        u.email = email
    if body.accessDays is not None:
        u.access_expires_at = _calc_access_expiry(body.accessDays)
    db.commit()
    db.refresh(u)
    n = db.scalar(select(func.count()).select_from(Test).where(Test.owner_id == u.id)) or 0
    return psychologist_out(u, int(n))


@router.patch("/psychologists/{user_id}/block")
def block_psychologist(
    user_id: uuid.UUID,
    body: BlockBody,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя изменить свой аккаунт")
    u = db.get(User, user_id)
    if not u or u.role != UserRole.psychologist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    u.is_active = not body.blocked
    if body.blocked:
        u.blocked_at = datetime.now(timezone.utc)
        u.blocked_reason = (body.reason or "").strip() or None
    else:
        u.blocked_at = None
        u.blocked_reason = None
    db.commit()
    return {}


@router.patch("/psychologists/{user_id}/access")
def set_access_period(
    user_id: uuid.UUID,
    body: AccessBody,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя изменить свой аккаунт")
    u = db.get(User, user_id)
    if not u or u.role != UserRole.psychologist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    u.access_expires_at = _calc_access_expiry(body.accessDays)
    db.commit()
    db.refresh(u)
    n = db.scalar(select(func.count()).select_from(Test).where(Test.owner_id == u.id)) or 0
    return psychologist_out(u, int(n))


@router.delete("/psychologists/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_psychologist(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя удалить самого себя")
    u = db.get(User, user_id)
    if not u or u.role != UserRole.psychologist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    db.delete(u)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
