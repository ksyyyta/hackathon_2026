# PsyTests — платформа психологических опросников

Система создания, распространения и анализа психологических тестов. Роли: **администратор**, **психолог**, **клиент**.

## Архитектура

```
┌─────────────┐     REST API      ┌──────────────┐     SQLAlchemy     ┌─────────────┐
│   Next.js   │ ◄──────────────►  │   FastAPI    │ ◄──────────────►  │  PostgreSQL │
│  (React)    │  JWT + cookies    │  (Python)    │                   │             │
└─────────────┘                   └──────────────┘                   └─────────────┘
       │                                    │
       │                                    ├── формулы (simpleeval)
       │                                    ├── отчёты ПрофДНК (Jinja2 HTML + python-docx)
       │                                    └── график в DOCX (matplotlib PNG, опционально)
       │
       └── конструктор тестов, Drag-and-Drop, предпросмотр
```

- **Frontend**: Next.js 16, React 19, Tailwind, Radix UI.
- **Backend**: FastAPI, SQLAlchemy, Alembic, JWT (access + refresh cookie).
- **Отчёты**: два типа (клиент / психолог), генерация по запросу без хранения файлов. Контекст Jinja2: `client_name`, `metrics`, `metrics_ascii_bars`, `answers`, `chart_labels` / `chart_values` (HTML + Chart.js), сырые и нормированные баллы. Импорт/экспорт конфигурации теста: `GET /tests/{id}/export-config`, `PUT /tests/{id}/import-config`.

## Быстрый старт (Docker)

```bash
# Запуск PostgreSQL + backend
docker compose up -d --build

# Backend: http://localhost:8000
# Swagger:  http://localhost:8000/docs
```

Демо-пользователи (после первого старта):

- **Админ**: `admin@admin.com` / `admin123`
- **Психолог**: `psycho@psycho.com` / `psycho123`

Примеры публичных тестов (Next.js JSON DB или сид FastAPI):

- **`/test/demo`** и **`/test/demo-proforientation`** — один большой тест профориентации (13 вопросов, разные типы)
- **`/test/demo-team`** — короткий тест про стиль работы и коммуникацию

Если ссылки не открываются, удалите `data/app-db.json` и перезапустите приложение (пересоздастся сид).

## Запуск фронтенда локально

```bash
# Установка зависимостей
npm install

# Рекомендуется: не задавать NEXT_PUBLIC_API_URL (по умолчанию /api).
# Next.js проксирует /api → http://127.0.0.1:8000 только для путей без своих route handlers (переменная API_INTERNAL_URL).
# Вход: access JWT в localStorage; refresh в HttpOnly cookie восстанавливает сессию после F5. Кабинет защищён layout + API.

# Разработка (backend должен слушать порт 8000)
npm run dev

# Сборка
npm run build
npm run start
```

## Запуск backend без Docker

1. PostgreSQL на `localhost:5432` (или настройте `DATABASE_URL`).
2. В каталоге `backend`:

```bash
pip install -r requirements.txt
cp .env.example .env   # при необходимости отредактируйте
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API (Swagger)

- Документация: **http://localhost:8000/docs**
- ReDoc: **http://localhost:8000/redoc**

## Роли и права

| Роль        | Возможности                                                                 |
|-------------|-----------------------------------------------------------------------------|
| Администратор | Создание/блокировка психологов, просмотр активности                         |
| Психолог    | Личный кабинет, конструктор тестов, ссылки, прохождения, отчёты DOCX/HTML   |
| Клиент      | Прохождение по ссылке без регистрации, результаты, автосохранение ответов  |

## Структура проекта

```
├── app/                    # Next.js App Router (страницы)
├── components/             # React-компоненты, в т.ч. test-editor
├── lib/                    # API-клиент, типы, контексты
├── backend/                # FastAPI
│   ├── app/
│   │   ├── api/            # эндпоинты auth, profile, tests, attempts, public, admin
│   │   ├── core/           # JWT, bcrypt
│   │   ├── models/         # SQLAlchemy
│   │   ├── services/       # формулы, отчёты
│   │   └── seed_demo.py    # демо-тест
│   └── alembic/
├── docker-compose.yml
└── nginx.conf              # для профиля full (nginx + frontend)
```

## Полный стек в Docker (nginx + frontend)

```bash
docker compose --profile full up -d --build
# Приложение: http://localhost:8080
```
