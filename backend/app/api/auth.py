import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models.user import User, UserRole
from app.serializers import user_public

router = APIRouter(tags=["auth"])

REFRESH_COOKIE = "refreshToken"


class LoginBody(BaseModel):
    email: str
    password: str


class RegisterBody(BaseModel):
    name: str
    email: str
    password: str


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        max_age=settings.refresh_token_expire_days * 86400,
        samesite="lax",
        path="/",
        secure=False,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path="/")


@router.post("/auth/login")
def login(body: LoginBody, response: Response, db: Session = Depends(get_db)):
    email = str(body.email).strip().lower()
    user = db.scalars(select(User).where(User.email == email)).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный email или пароль")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт заблокирован")
    if getattr(user, "access_expires_at", None):
        if user.access_expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Срок доступа истёк")
    access = create_access_token(user.id, user.role.value)
    refresh = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh)
    return {"user": user_public(user), "token": access}


@router.post("/auth/refresh")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get(REFRESH_COOKIE)
    if not raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    try:
        payload = decode_refresh_token(raw)
        uid = uuid.UUID(payload["sub"])
    except Exception:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    user = db.get(User, uid)
    if not user or not user.is_active:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    if getattr(user, "access_expires_at", None):
        if user.access_expires_at < datetime.now(timezone.utc):
            _clear_refresh_cookie(response)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Срок доступа истёк")
    access = create_access_token(user.id, user.role.value)
    return {"token": access}


@router.post("/auth/register")
def register(body: RegisterBody, response: Response, db: Session = Depends(get_db)):
    email = str(body.email).strip().lower()
    if db.scalars(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Пользователь с таким email уже зарегистрирован")
    name = (body.name or "").strip() or "Психолог"
    if len(name.split()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите фамилию, имя и отчество полностью",
        )
    if len(body.password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пароль должен быть минимум 6 символов")
    u = User(
        email=email,
        name=name,
        hashed_password=hash_password(body.password),
        role=UserRole.psychologist,
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    access = create_access_token(u.id, u.role.value)
    refresh = create_refresh_token(u.id)
    _set_refresh_cookie(response, refresh)
    return {"user": user_public(u), "token": access}


@router.post("/auth/logout")
def logout(response: Response):
    _clear_refresh_cookie(response)
    return {}
