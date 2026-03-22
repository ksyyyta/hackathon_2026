from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.serializers import user_public

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfilePatch(BaseModel):
    name: str | None = None
    email: str | None = None
    avatar: str | None = None


@router.get("")
def get_profile(user: User = Depends(get_current_user)):
    return user_public(user)


@router.patch("")
def patch_profile(
    body: ProfilePatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.email is not None:
        other = db.scalars(select(User).where(User.email == str(body.email).lower(), User.id != user.id)).first()
        if other:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email уже занят")
        user.email = str(body.email).lower()
    if body.name is not None:
        nm = (body.name or "").strip()
        if len(nm.split()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Укажите фамилию, имя и отчество",
            )
        user.name = nm
    if "avatar" in body.model_fields_set:
        # We store data-urls or a small base64 string directly into DB.
        # Keep validation lightweight here; frontend should limit size.
        user.avatar = body.avatar
    db.commit()
    db.refresh(user)
    return user_public(user)
