import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.attempt import Attempt
from app.models.test import Test
from app.models.user import User, UserRole
from app.serializers import attempt_out, merge_config
from app.services.reports import build_report_context, build_report_docx, build_report_html

router = APIRouter(prefix="/attempts", tags=["attempts"])


def _can_access_attempt(user: User, attempt: Attempt, test: Test) -> bool:
    if user.role == UserRole.admin:
        return True
    return attempt.owner_id == user.id


@router.get("/{attempt_id}")
def get_attempt_detail(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a = db.get(Attempt, attempt_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    t = db.get(Test, a.test_id)
    if not t or not _can_access_attempt(user, a, t):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return attempt_out(a, t.title, include_answers=True, include_metrics=True)


@router.get("/{attempt_id}/reports/client")
def client_report(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a = db.get(Attempt, attempt_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    t = db.get(Test, a.test_id)
    if not t or not _can_access_attempt(user, a, t):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    c = merge_config(t.config)
    ctx = build_report_context(a, t)
    doc = build_report_docx("Отчёт для клиента", c.get("clientReportTemplate"), ctx, "client")
    return Response(
        content=doc,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="report-client-{attempt_id}.docx"',
        },
    )


@router.get("/{attempt_id}/reports/professional")
def professional_report(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a = db.get(Attempt, attempt_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    t = db.get(Test, a.test_id)
    if not t or not _can_access_attempt(user, a, t):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    c = merge_config(t.config)
    ctx = build_report_context(a, t)
    doc = build_report_docx("Профессиональный отчёт", c.get("professionalReportTemplate"), ctx, "professional")
    return Response(
        content=doc,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="report-professional-{attempt_id}.docx"',
        },
    )


@router.get("/{attempt_id}/reports/client/html", response_class=HTMLResponse)
def client_report_html(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a = db.get(Attempt, attempt_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    t = db.get(Test, a.test_id)
    if not t or not _can_access_attempt(user, a, t):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    c = merge_config(t.config)
    ctx = build_report_context(a, t)
    html = build_report_html("Отчёт для клиента", c.get("clientReportHtmlTemplate"), ctx, "client")
    return HTMLResponse(content=html or "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><p>Отчёт пуст</p></body></html>")


@router.get("/{attempt_id}/reports/professional/html", response_class=HTMLResponse)
def professional_report_html(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a = db.get(Attempt, attempt_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    t = db.get(Test, a.test_id)
    if not t or not _can_access_attempt(user, a, t):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    c = merge_config(t.config)
    ctx = build_report_context(a, t)
    html = build_report_html(
        "Профессиональный отчёт",
        c.get("professionalReportHtmlTemplate"),
        ctx,
        "professional",
    )
    return HTMLResponse(content=html or "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><p>Отчёт пуст</p></body></html>")
