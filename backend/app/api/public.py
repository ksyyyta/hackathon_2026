import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attempt import Attempt
from app.models.test import Test
from app.models.test_link import TestLink
from app.serializers import merge_config, public_test_out
from app.services.score_service import calculate_attempt_results
from app.services.metrics_service import calculate_metrics, extract_metrics_list

router = APIRouter(prefix="/public", tags=["public"])


def _get_link(db: Session, token: str) -> TestLink | None:
    return db.scalars(select(TestLink).where(TestLink.token == token)).first()


def _get_test_by_slug(db: Session, slug: str) -> Test | None:
    return db.scalars(select(Test).where(Test.public_slug == slug)).first()


class StartBody(BaseModel):
    name: str | None = None
    email: str | None = None
    age: int | None = None


class AnswersBody(BaseModel):
    answers: list[dict]


class SlugAnswersBody(BaseModel):
    attemptId: str
    answers: list[dict]


class SlugCompleteBody(BaseModel):
    attemptId: str


@router.get("/test/{token}")
def get_public_test(token: str, db: Session = Depends(get_db)):
    link = _get_link(db, token)
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Ссылка недействительна")
    t = db.get(Test, link.test_id)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    return public_test_out(t)


@router.get("/tests/{slug}")
def get_public_test_by_slug(slug: str, db: Session = Depends(get_db)):
    t = _get_test_by_slug(db, slug)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    return public_test_out(t)


@router.post("/test/{token}/start")
def start_attempt(token: str, body: StartBody, db: Session = Depends(get_db)):
    link = _get_link(db, token)
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Ссылка недействительна")
    t = db.get(Test, link.test_id)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    c = merge_config(t.config)
    requires = c.get("requiresPersonalData", True)
    name = (body.name or "").strip() or "Гость"
    if requires and len(name.split()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Введите фамилию, имя и отчество",
        )
    now = datetime.now(timezone.utc)
    qs = c.get("questions", [])
    a = Attempt(
        test_id=t.id,
        owner_id=t.owner_id,
        link_token=token,
        client_data={
            "name": name,
            "email": str(body.email) if body.email else None,
            "age": body.age,
        },
        answers=[],
        question_snapshot=qs,
        status="in_progress",
        started_at=now,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"attemptId": str(a.id)}


@router.post("/tests/{slug}/start")
def start_attempt_by_slug(slug: str, body: StartBody, db: Session = Depends(get_db)):
    t = _get_test_by_slug(db, slug)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    c = merge_config(t.config)
    requires = c.get("requiresPersonalData", True)
    name = (body.name or "").strip() or "Гость"
    if requires and len(name.split()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Введите имя и фамилию",
        )
    now = datetime.now(timezone.utc)
    qs = c.get("questions", [])
    a = Attempt(
        test_id=t.id,
        owner_id=t.owner_id,
        link_token=t.public_slug,
        client_data={
            "name": name,
            "email": str(body.email) if body.email else None,
            "age": body.age,
        },
        answers=[],
        question_snapshot=qs,
        status="in_progress",
        started_at=now,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"attemptId": str(a.id)}


def _question_visible(q: dict, by_q: dict) -> bool:
    sf = q.get("showIf") or {}
    parent = sf.get("questionId")
    option_ids = sf.get("optionIds") or []
    if not parent:
        return True
    if not option_ids:
        return False
    v = by_q.get(parent)
    if v is None:
        return False
    ids = set(option_ids)
    if isinstance(v, str):
        return v in ids
    if isinstance(v, list):
        return any(str(x) in ids for x in v)
    return False


@router.post("/test/attempt/{attempt_id}/answers")
def save_answers(attempt_id: uuid.UUID, body: AnswersBody, db: Session = Depends(get_db)):
    a = db.get(Attempt, attempt_id)
    if not a or a.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Прохождение недоступно")
    by_id = {x["questionId"]: x for x in (a.answers or [])}
    for x in body.answers or []:
        qid = x.get("questionId")
        if qid:
            by_id[qid] = {"questionId": qid, "value": x.get("value")}
    a.answers = list(by_id.values())
    db.commit()
    return {}


@router.post("/tests/{slug}/answers")
def save_answers_by_slug(slug: str, body: SlugAnswersBody, db: Session = Depends(get_db)):
    t = _get_test_by_slug(db, slug)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    try:
        attempt_uuid = uuid.UUID(body.attemptId)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный attemptId")
    a = db.get(Attempt, attempt_uuid)
    if not a or a.test_id != t.id or a.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Прохождение недоступно")
    by_id = {x["questionId"]: x for x in (a.answers or [])}
    for x in body.answers or []:
        qid = x.get("questionId")
        if qid:
            by_id[qid] = {"questionId": qid, "value": x.get("value")}
    a.answers = list(by_id.values())
    db.commit()
    return {}


@router.get("/test/attempt/{attempt_id}/progress")
def progress(attempt_id: uuid.UUID, db: Session = Depends(get_db)):
    a = db.get(Attempt, attempt_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    t = db.get(Test, a.test_id)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    c = merge_config(t.config)
    qs = c.get("questions", [])
    by_q = {x["questionId"]: x.get("value") for x in (a.answers or []) if x.get("questionId")}
    visible = [q for q in qs if _question_visible(q, by_q)]
    total = max(1, len(visible))
    answered_ids = {x["questionId"] for x in (a.answers or [])}
    answered = len([q for q in visible if q.get("id") in answered_ids])
    pct = round((answered / total) * 100)
    return {"progress": pct, "answers": a.answers or []}


def _answer_present(q: dict, value) -> bool:
    if value is None:
        return False
    if isinstance(value, str) and not value.strip():
        return False
    if isinstance(value, list) and len(value) == 0:
        return False
    return True


def _check_required_answered(questions: list[dict], answers: list[dict]) -> None:
    by_q = {a["questionId"]: a.get("value") for a in answers if a.get("questionId")}
    for q in questions or []:
        if not q.get("required"):
            continue
        if not _question_visible(q, by_q):
            continue
        qid = q.get("id")
        if not qid or not _answer_present(q, by_q.get(qid)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Заполните все обязательные вопросы перед завершением",
            )


@router.post("/test/attempt/{attempt_id}/complete")
def complete(attempt_id: uuid.UUID, db: Session = Depends(get_db)):
    a = db.get(Attempt, attempt_id)
    if not a or a.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Прохождение недоступно")
    t = db.get(Test, a.test_id)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    c = merge_config(t.config)
    _check_required_answered(c.get("questions", []), a.answers or [])
    scored = calculate_attempt_results(
        c.get("questions", []),
        c.get("formulas", []),
        a.answers or [],
        c.get("scaleInterpretations"),
    )
    metrics = scored.get("metrics", [])
    interpretation = scored.get("interpretation")
    now = datetime.now(timezone.utc)
    a.status = "completed"
    a.completed_at = now
    a.metrics = metrics
    a.interpretation = interpretation
    configured_metrics = extract_metrics_list(t.metrics)
    simple_metrics = calculate_metrics(configured_metrics, a.answers or [])
    a.results = {
        "metrics": metrics or [],
        "simpleMetrics": simple_metrics,
        "interpretation": interpretation,
    }
    db.commit()
    return {}


@router.post("/tests/{slug}/complete")
def complete_by_slug(slug: str, body: SlugCompleteBody, db: Session = Depends(get_db)):
    t = _get_test_by_slug(db, slug)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    try:
        attempt_uuid = uuid.UUID(body.attemptId)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный attemptId")
    a = db.get(Attempt, attempt_uuid)
    if not a or a.test_id != t.id or a.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Прохождение недоступно")
    c = merge_config(t.config)
    _check_required_answered(c.get("questions", []), a.answers or [])
    scored = calculate_attempt_results(
        c.get("questions", []),
        c.get("formulas", []),
        a.answers or [],
        c.get("scaleInterpretations"),
    )
    metrics = scored.get("metrics", [])
    interpretation = scored.get("interpretation")
    now = datetime.now(timezone.utc)
    a.status = "completed"
    a.completed_at = now
    a.metrics = metrics
    a.interpretation = interpretation
    configured_metrics = extract_metrics_list(t.metrics)
    simple_metrics = calculate_metrics(configured_metrics, a.answers or [])
    a.results = {
        "metrics": metrics or [],
        "simpleMetrics": simple_metrics,
        "interpretation": interpretation,
    }
    db.commit()
    return {"message": "Спасибо! Результаты будут отправлены вам после обработки."}


@router.get("/test/attempt/{attempt_id}/result")
def result(attempt_id: uuid.UUID, db: Session = Depends(get_db)):
    a = db.get(Attempt, attempt_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    if a.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Тест не завершён")
    t = db.get(Test, a.test_id)
    c = merge_config(t.config) if t else {}
    if not getattr(t, "show_results_immediately", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Результаты скрыты психологом")
    return {
        "metrics": a.metrics or [],
        "interpretation": a.interpretation,
        "canDownloadReport": c.get("showClientReport", True),
    }


@router.get("/test/attempt/{attempt_id}/report/client")
def public_client_report_docx(attempt_id: uuid.UUID, db: Session = Depends(get_db)):
    from fastapi.responses import Response

    from app.services.reports import build_report_context, build_report_docx

    a = db.get(Attempt, attempt_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    if a.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Тест не завершён")
    t = db.get(Test, a.test_id)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    c = merge_config(t.config)
    if not c.get("showClientReport", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Отчёт недоступен")
    try:
        ctx = build_report_context(a, t)
        doc = build_report_docx("Отчёт для клиента", c.get("clientReportTemplate"), ctx, "client")
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не удалось сформировать DOCX")
    return Response(
        content=doc,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="report-client-{attempt_id}.docx"',
        },
    )


@router.get("/test/attempt/{attempt_id}/report/client/html")
def public_client_report_html(attempt_id: uuid.UUID, db: Session = Depends(get_db)):
    from fastapi.responses import HTMLResponse

    from app.services.reports import build_report_context, build_report_html

    a = db.get(Attempt, attempt_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    if a.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Тест не завершён")
    t = db.get(Test, a.test_id)
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найдено")
    c = merge_config(t.config)
    if not c.get("showClientReport", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Отчёт недоступен")
    try:
        ctx = build_report_context(a, t)
        html = build_report_html("Отчёт для клиента", c.get("clientReportHtmlTemplate"), ctx, "client")
    except Exception:
        html = "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><p>Ошибка формирования отчёта</p></body></html>"
    return HTMLResponse(content=html or "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><p>Отчёт пуст</p></body></html>")
