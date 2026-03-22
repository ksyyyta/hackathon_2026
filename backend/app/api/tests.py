import secrets
import uuid
from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models.attempt import Attempt
from app.models.test import Test
from app.models.test_link import TestLink
from app.models.user import User, UserRole
from app.serializers import attempt_out, merge_config, test_out
from app.schemas import MetricsPayload
from app.services.metrics_service import extract_metrics_list, wrap_metrics

router = APIRouter(prefix="/tests", tags=["tests"])
logger = logging.getLogger("psytests.tests")


def _public_base(request: Request) -> str:
    return settings.app_base_url.rstrip("/")


def _can_access_test(user: User, test: Test) -> bool:
    if user.role == UserRole.admin:
        return True
    return test.owner_id == user.id


def _attempts_count(db: Session, test_id: uuid.UUID) -> int:
    return db.scalar(select(func.count()).select_from(Attempt).where(Attempt.test_id == test_id)) or 0


class TestCreateBody(BaseModel):
    title: str | None = None
    description: str | None = None
    instruction: str | None = None
    questions: list | None = None
    formulas: list | None = None
    clientReportTemplate: str | None = None
    professionalReportTemplate: str | None = None
    clientReportHtmlTemplate: str | None = None
    professionalReportHtmlTemplate: str | None = None
    scaleInterpretations: list | None = None
    requiresPersonalData: bool | None = None
    showClientReport: bool | None = None
    showResultsImmediately: bool | None = None
    metrics: list | dict | None = None


class TestImportConfigBody(BaseModel):
    title: str | None = None
    description: str | None = None
    instruction: str | None = None
    config: dict | None = None


_CONFIG_EXPORT_KEYS = frozenset(
    {
        "questions",
        "formulas",
        "clientReportTemplate",
        "professionalReportTemplate",
        "clientReportHtmlTemplate",
        "professionalReportHtmlTemplate",
        "scaleInterpretations",
        "requiresPersonalData",
        "showClientReport",
        "demoVersion",
    }
)


def _generate_public_slug(db: Session, size: int = 8) -> str:
    for _ in range(20):
        slug = secrets.token_urlsafe(size).lower().replace("_", "").replace("-", "")[:12]
        if len(slug) < 8:
            continue
        existing = db.scalars(select(Test).where(Test.public_slug == slug)).first()
        if not existing:
            return slug
    fallback = f"t{uuid.uuid4().hex[:11]}"
    logger.warning("Fallback public slug generated: %s", fallback)
    return fallback


@router.get("")
def list_tests(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == UserRole.admin:
        tests = db.scalars(select(Test).order_by(Test.updated_at.desc())).all()
    else:
        tests = db.scalars(select(Test).where(Test.owner_id == user.id).order_by(Test.updated_at.desc())).all()
    return [test_out(t, _attempts_count(db, t.id)) for t in tests]


@router.post("")
def create_test(
    body: TestCreateBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role not in (UserRole.psychologist, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    cfg = merge_config({})
    if body.questions is not None:
        cfg["questions"] = body.questions
    if body.formulas is not None:
        cfg["formulas"] = body.formulas
    if body.clientReportTemplate is not None:
        cfg["clientReportTemplate"] = body.clientReportTemplate
    if body.professionalReportTemplate is not None:
        cfg["professionalReportTemplate"] = body.professionalReportTemplate
    if body.requiresPersonalData is not None:
        cfg["requiresPersonalData"] = body.requiresPersonalData
    if body.clientReportHtmlTemplate is not None:
        cfg["clientReportHtmlTemplate"] = body.clientReportHtmlTemplate
    if body.professionalReportHtmlTemplate is not None:
        cfg["professionalReportHtmlTemplate"] = body.professionalReportHtmlTemplate
    if body.scaleInterpretations is not None:
        cfg["scaleInterpretations"] = body.scaleInterpretations
    if body.showClientReport is not None:
        cfg["showClientReport"] = body.showClientReport
    now = datetime.now(timezone.utc)
    metrics_value = body.metrics if body.metrics is not None else {"metrics": []}
    if isinstance(metrics_value, list):
        metrics_value = wrap_metrics(metrics_value)
    t = Test(
        owner_id=user.id,
        title=(body.title or "Новый тест").strip(),
        public_slug=_generate_public_slug(db),
        show_results_immediately=bool(body.showResultsImmediately) if body.showResultsImmediately is not None else False,
        description=body.description or "",
        instruction=body.instruction or "",
        metrics=metrics_value,
        config=cfg,
        created_at=now,
        updated_at=now,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return test_out(t, 0)


@router.get("/{test_id}/export-config")
def export_test_config(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = db.get(Test, test_id)
    if not t or not _can_access_test(user, t):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    c = merge_config(t.config)
    inner = {k: c[k] for k in _CONFIG_EXPORT_KEYS if k in c}
    return {
        "format": "profdnk-test-config",
        "version": 1,
        "title": t.title,
        "description": t.description or "",
        "instruction": t.instruction or "",
        "config": inner,
    }


@router.put("/{test_id}/import-config")
def import_test_config(
    test_id: uuid.UUID,
    body: TestImportConfigBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = db.get(Test, test_id)
    if not t or not _can_access_test(user, t):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    cfg = merge_config(t.config)
    inner = body.config or {}
    for k in _CONFIG_EXPORT_KEYS:
        if k in inner:
            cfg[k] = inner[k]
    if body.title is not None:
        t.title = body.title.strip() or t.title
    if body.description is not None:
        t.description = body.description
    if body.instruction is not None:
        t.instruction = body.instruction
    t.config = cfg
    t.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(t)
    return test_out(t, _attempts_count(db, t.id))


@router.get("/{test_id}")
def get_test(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = db.get(Test, test_id)
    if not t or not _can_access_test(user, t):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    return test_out(t, _attempts_count(db, t.id))


@router.put("/{test_id}")
def update_test(
    test_id: uuid.UUID,
    body: TestCreateBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = db.get(Test, test_id)
    if not t or not _can_access_test(user, t):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    cfg = merge_config(t.config)
    if body.title is not None:
        t.title = body.title
    if body.description is not None:
        t.description = body.description
    if body.instruction is not None:
        t.instruction = body.instruction
    if body.questions is not None:
        cfg["questions"] = body.questions
    if body.formulas is not None:
        cfg["formulas"] = body.formulas
    if body.clientReportTemplate is not None:
        cfg["clientReportTemplate"] = body.clientReportTemplate
    if body.professionalReportTemplate is not None:
        cfg["professionalReportTemplate"] = body.professionalReportTemplate
    if body.requiresPersonalData is not None:
        cfg["requiresPersonalData"] = body.requiresPersonalData
    if body.clientReportHtmlTemplate is not None:
        cfg["clientReportHtmlTemplate"] = body.clientReportHtmlTemplate
    if body.professionalReportHtmlTemplate is not None:
        cfg["professionalReportHtmlTemplate"] = body.professionalReportHtmlTemplate
    if body.scaleInterpretations is not None:
        cfg["scaleInterpretations"] = body.scaleInterpretations
    if body.showClientReport is not None:
        cfg["showClientReport"] = body.showClientReport
    if body.showResultsImmediately is not None:
        t.show_results_immediately = body.showResultsImmediately
    if body.metrics is not None:
        t.metrics = wrap_metrics(body.metrics) if isinstance(body.metrics, list) else body.metrics
    t.config = cfg
    t.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(t)
    return test_out(t, _attempts_count(db, t.id))


@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = db.get(Test, test_id)
    if not t or not _can_access_test(user, t):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    db.delete(t)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{test_id}/clone")
def clone_test(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    src = db.get(Test, test_id)
    if not src or not _can_access_test(user, src):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    now = datetime.now(timezone.utc)
    cfg = dict(src.config or {})
    t = Test(
        owner_id=user.id,
        title=f"{src.title} (копия)",
        public_slug=_generate_public_slug(db),
        show_results_immediately=bool(getattr(src, "show_results_immediately", False)),
        description=src.description,
        instruction=src.instruction,
        metrics=src.metrics if isinstance(src.metrics, dict) else wrap_metrics(extract_metrics_list(src.metrics)),
        config=cfg,
        created_at=now,
        updated_at=now,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return test_out(t, 0)


@router.post("/{test_id}/link")
def create_link(
    test_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = db.get(Test, test_id)
    if not t or not _can_access_test(user, t):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    token = secrets.token_hex(24)
    link = TestLink(test_id=t.id, token=token)
    db.add(link)
    db.commit()
    base = _public_base(request)
    if request.headers.get("x-forwarded-host"):
        proto = request.headers.get("x-forwarded-proto", "https")
        host = request.headers.get("x-forwarded-host")
        base = f"{proto}://{host}"
    elif request.headers.get("host"):
        proto = "https" if request.url.scheme == "https" else "http"
        base = f"{proto}://{request.headers.get('host')}"
    return {"token": token, "url": f"{base}/client/{t.public_slug}"}


@router.get("/{test_id}/metrics")
def get_test_metrics(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = db.get(Test, test_id)
    if not t or not _can_access_test(user, t):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    return extract_metrics_list(t.metrics)


@router.post("/{test_id}/metrics")
def save_metrics(
    test_id: uuid.UUID,
    body: MetricsPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = db.get(Test, test_id)
    if not t or not _can_access_test(user, t):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    t.metrics = wrap_metrics([m.model_dump() for m in body.metrics])
    t.updated_at = datetime.now(timezone.utc)
    db.commit()
    return extract_metrics_list(t.metrics)


@router.put("/{test_id}/metrics/{metric_id}")
def update_metric(
    test_id: uuid.UUID,
    metric_id: str,
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = db.get(Test, test_id)
    if not t or not _can_access_test(user, t):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    metrics = list(extract_metrics_list(t.metrics))
    for i, m in enumerate(metrics):
        if str(m.get("id")) == metric_id:
            metrics[i] = {
                **m,
                **body,
                "id": metric_id,
            }
            t.metrics = wrap_metrics(metrics)
            t.updated_at = datetime.now(timezone.utc)
            db.commit()
            return metrics[i]
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Метрика не найдена")


@router.delete("/{test_id}/metrics/{metric_id}")
def delete_metric(
    test_id: uuid.UUID,
    metric_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = db.get(Test, test_id)
    if not t or not _can_access_test(user, t):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    metrics = [m for m in extract_metrics_list(t.metrics) if str(m.get("id")) != metric_id]
    t.metrics = wrap_metrics(metrics)
    t.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.get("/{test_id}/attempts")
def list_attempts_for_test(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = db.get(Test, test_id)
    if not t or not _can_access_test(user, t):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    rows = db.scalars(select(Attempt).where(Attempt.test_id == test_id).order_by(Attempt.started_at.desc())).all()
    return [attempt_out(a, t.title, include_answers=False, include_metrics=True) for a in rows]
