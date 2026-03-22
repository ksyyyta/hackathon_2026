import uuid
from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.attempt import Attempt
from app.models.test import Test
from app.models.user import User, UserRole
from app.serializers import attempt_out, merge_config
from app.services.report_service import generate_docx_in_memory, generate_html

router = APIRouter(prefix="/psychologist/attempts", tags=["psychologist-attempts"])
logger = logging.getLogger("psytests.psychologist_attempts")


def _can_access(user: User, attempt: Attempt, test: Test) -> bool:
    if user.role == UserRole.admin:
        return True
    return test.owner_id == user.id


def _get_attempt_and_test(db: Session, user: User, attempt_id: uuid.UUID) -> tuple[Attempt, Test]:
    a = db.get(Attempt, attempt_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    t = db.get(Test, a.test_id)
    if not t or not _can_access(user, a, t):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return a, t


@router.get("")
def list_attempts(
    test_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(Attempt).order_by(Attempt.started_at.desc())
    if user.role != UserRole.admin:
        q = q.where(Attempt.owner_id == user.id)
    if test_id:
        q = q.where(Attempt.test_id == test_id)
    rows = db.scalars(q).all()
    out = []
    for a in rows:
        t = db.get(Test, a.test_id)
        if not t:
            continue
        out.append(attempt_out(a, t.title, include_answers=False, include_metrics=True))
    return out


@router.get("/{attempt_id}")
def get_attempt(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a, t = _get_attempt_and_test(db, user, attempt_id)
    return attempt_out(a, t.title, include_answers=True, include_metrics=True)


@router.post("/{attempt_id}/generate-report")
def generate_report(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a, _ = _get_attempt_and_test(db, user, attempt_id)
    if a.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Тест не завершен")
    a.report_generated_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "reportGeneratedAt": a.report_generated_at.isoformat()}


@router.post("/{attempt_id}/send-report")
def send_report(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a, _ = _get_attempt_and_test(db, user, attempt_id)
    if a.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Тест не завершен")
    now = datetime.now(timezone.utc)
    if not a.report_generated_at:
        a.report_generated_at = now
    a.report_sent_at = now
    db.commit()
    return {"ok": True, "reportSentAt": a.report_sent_at.isoformat()}


@router.get("/{attempt_id}/report/docx")
def report_docx(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a, t = _get_attempt_and_test(db, user, attempt_id)
    if a.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Тест не завершен")
    c = merge_config(t.config)
    try:
        content = generate_docx_in_memory(
            a,
            t,
            c.get("professionalReportTemplate"),
            "Профессиональный отчет",
            kind="professional",
        )
    except Exception as exc:
        logger.exception("DOCX generation failed for attempt %s: %s", attempt_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не удалось сформировать DOCX отчет")
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": 'attachment; filename="report.docx"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/{attempt_id}/report/html", response_class=HTMLResponse)
def report_html(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a, t = _get_attempt_and_test(db, user, attempt_id)
    c = merge_config(t.config)
    html = generate_html(
        a,
        t,
        c.get("professionalReportHtmlTemplate"),
        "Профессиональный отчет",
        kind="professional",
    )
    return HTMLResponse(content=html or "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><p>Отчёт пуст</p></body></html>")


@router.get("/{attempt_id}/client-report/html", response_class=HTMLResponse)
def client_report_html(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a, t = _get_attempt_and_test(db, user, attempt_id)
    c = merge_config(t.config)
    html = generate_html(
        a,
        t,
        c.get("clientReportHtmlTemplate"),
        "Отчет для клиента",
        kind="client",
    )
    return HTMLResponse(content=html or "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><p>Отчёт пуст</p></body></html>")
