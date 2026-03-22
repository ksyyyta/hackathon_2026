from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.attempt import Attempt
from app.models.test import Test
from app.models.user import User, UserRole
from app.serializers import attempt_out

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == UserRole.admin:
        tests = db.scalars(select(Test)).all()
    else:
        tests = db.scalars(select(Test).where(Test.owner_id == user.id)).all()

    test_ids = [t.id for t in tests]
    if not test_ids:
        attempts = []
    else:
        attempts = db.scalars(select(Attempt).where(Attempt.test_id.in_(test_ids))).all()

    completed = [a for a in attempts if a.status == "completed"]
    recent = sorted(attempts, key=lambda x: x.started_at or "", reverse=True)[:10]
    titles = {t.id: t.title for t in tests}
    all_titles = {t.id: t.title for t in db.scalars(select(Test)).all()}

    recent_out = []
    for a in recent:
        title = titles.get(a.test_id) or all_titles.get(a.test_id, "Тест")
        recent_out.append(attempt_out(a, title, include_answers=False, include_metrics=False))

    out = {
        "totalTests": len(test_ids),
        "totalAttempts": len(attempts),
        "completedAttempts": len(completed),
        "recentAttempts": recent_out,
    }
    if user.role == UserRole.admin:
        n_psy = db.scalar(
            select(func.count()).select_from(User).where(User.role == UserRole.psychologist)
        ) or 0
        out["totalPsychologists"] = int(n_psy)
    return out
